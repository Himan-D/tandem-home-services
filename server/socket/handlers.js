const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../lib/logger');
const bus = require('../event-bus');

function setupSocketHandlers(io, db, services) {
  const { onlinePartners, spatialIndex, oms, riderAssignment, notifyUser } = services;

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    jwt.verify(token, config.auth.jwtSecret, (err, decoded) => {
      if (err) return next(new Error('Invalid token'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', async (socket) => {
    const user = socket.user;

    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);

    logger.info({ userId: user.id, role: user.role, socketId: socket.id }, 'Socket connected');

    if (user.role === 'partner') {
      const row = await db.queryOne(
        'SELECT services_offered, location FROM users WHERE id = ?',
        [user.id]
      );
      let parsedServices = [];
      try {
        parsedServices = JSON.parse(row?.services_offered || '[]');
      } catch {}

      onlinePartners.set(user.id, {
        socketId: socket.id,
        services: parsedServices,
        location: row?.location || '',
      });
      io.to('role:admin').emit('partner:online', { partnerId: user.id, name: user.name });
    }

    socket.on('partner:location', async (data) => {
      if (user.role !== 'partner') return;
      await db.execute(
        `INSERT INTO pro_availability (partner_id, is_available, lat, lng, updated_at)
         VALUES (?, 1, ?, ?, NOW())
         ON CONFLICT (partner_id) DO UPDATE
         SET is_available = 1, lat = EXCLUDED.lat, lng = EXCLUDED.lng, updated_at = NOW()`,
        [user.id, data.lat, data.lng]
      );
      onlinePartners.set(user.id, { ...(onlinePartners.get(user.id) || {}), lat: data.lat, lng: data.lng });
      spatialIndex.upsert({ id: user.id, lat: data.lat, lng: data.lng });

      bus.emit('location:update', {
        userId: user.id,
        lat: data.lat,
        lng: data.lng,
        accuracy: data.accuracy,
        speed: data.speed,
        timestamp: data.timestamp || Date.now(),
        source: 'socket',
      });

      io.to('role:consumer').emit('partner:location_update', {
        partnerId: user.id,
        lat: data.lat,
        lng: data.lng,
        accuracy: data.accuracy,
        timestamp: Date.now(),
      });
    });

    socket.on('rider:location', async (data) => {
      if (user.role !== 'partner') return;
      bus.emit('location:update', { userId: user.id, lat: data.lat, lng: data.lng, source: 'rider' });

      const activeTasks = await riderAssignment.getRiderActiveTasks(user.id);
      for (const task of activeTasks) {
        io.to(`user:${task.customer_id || task.order_id}`).emit('rider:location_update', {
          orderId: task.order_id,
          riderId: user.id,
          lat: data.lat,
          lng: data.lng,
          timestamp: Date.now(),
        });
      }
    });

    socket.on('rider:task_status', async (data) => {
      if (user.role !== 'partner' || !data.taskId) return;
      try {
        await riderAssignment.updateTaskStatus(data.taskId, data.status, { lat: data.lat, lng: data.lng });
        if (data.orderId && oms) {
          if (data.status === 'en_route') await oms.markPickedUp(data.orderId);
          if (data.status === 'delivered') await oms.markDelivered(data.orderId);
        }
      } catch (err) {
        logger.error({ err: err.message }, 'rider:task_status failed');
      }
    });

    socket.on('partner:accept', async (bookingId) => {
      const booking = await db.queryOne(
        'SELECT * FROM bookings WHERE id = ? AND status = ?',
        [bookingId, 'pending']
      );
      if (!booking) return socket.emit('error', { message: 'Booking not available' });

      await db.execute(
        'UPDATE bookings SET status = ?, partner_id = ? WHERE id = ?',
        ['accepted', user.id, bookingId]
      );
      await notifyUser(booking.customer_id, 'in_app', 'Job Accepted', `${user.name} has accepted your request.`);
      io.to(`user:${booking.customer_id}`).emit('booking:updated', {
        id: bookingId,
        status: 'accepted',
        partnerId: user.id,
        partnerName: user.name,
      });
      socket.emit('booking:accepted', { id: bookingId });
    });

    socket.on('partner:decline', async (bookingId) => {
      await db.execute(
        'INSERT INTO declined_bookings (booking_id, partner_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
        [bookingId, user.id]
      );
      socket.emit('booking:declined', { id: bookingId });
    });

    socket.on('partner:complete', async (bookingId) => {
      const booking = await db.queryOne(
        'SELECT * FROM bookings WHERE id = ? AND partner_id = ?',
        [bookingId, user.id]
      );
      if (!booking) return socket.emit('error', { message: 'Not authorized' });
      await db.execute('UPDATE bookings SET status = ? WHERE id = ?', ['completed', bookingId]);
      await db.execute(
        'UPDATE users SET jobs_completed = jobs_completed + 1 WHERE id = ?',
        [user.id]
      );
      await notifyUser(booking.customer_id, 'email', 'Service Complete!', 'Please rate your experience.');
      io.to(`user:${booking.customer_id}`).emit('booking:updated', { id: bookingId, status: 'completed' });
      socket.emit('booking:completed', { id: bookingId });
    });

    socket.on('chat:send', async (data) => {
      const { bookingId, message } = data;
      await db.execute(
        'INSERT INTO chat_messages (booking_id, sender_id, message) VALUES (?, ?, ?)',
        [bookingId, user.id, message]
      );
      io.to(`booking:${bookingId}`).emit('chat:message', {
        id: Date.now(),
        bookingId,
        senderId: user.id,
        senderName: user.name,
        message,
        createdAt: new Date().toISOString(),
      });
    });

    socket.on('booking:join', (bookingId) => {
      socket.join(`booking:${bookingId}`);
    });

    socket.on('trail:join', (partnerId) => {
      socket.join(`partner:${partnerId}:trail`);
    });

    socket.on('trail:leave', (partnerId) => {
      socket.leave(`partner:${partnerId}:trail`);
    });

    socket.on('disconnect', () => {
      if (user.role === 'partner') {
        onlinePartners.delete(user.id);
        io.to('role:admin').emit('partner:offline', { partnerId: user.id });
      }
      logger.info({ userId: user.id, socketId: socket.id }, 'Socket disconnected');
    });
  });
}

module.exports = { setupSocketHandlers };
