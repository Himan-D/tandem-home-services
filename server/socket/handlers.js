const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../lib/logger');
const bus = require('../event-bus');

function setupSocketHandlers(io, prisma, services) {
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
      const row = await prisma.user.findUnique({
        where: { id: user.id },
        select: { servicesOffered: true, location: true },
      });
      let parsedServices = [];
      try {
        parsedServices = JSON.parse(row?.servicesOffered || '[]');
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
      await prisma.proAvailability.upsert({
        where: { partnerId: user.id },
        update: { isAvailable: 1, lat: data.lat, lng: data.lng, updatedAt: new Date() },
        create: { partnerId: user.id, isAvailable: 1, lat: data.lat, lng: data.lng },
      });
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
      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, status: 'pending' },
      });
      if (!booking) return socket.emit('error', { message: 'Booking not available' });

      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'accepted', partnerId: user.id },
      });
      await notifyUser(booking.customerId, 'in_app', 'Job Accepted', `${user.name} has accepted your request.`);
      io.to(`user:${booking.customerId}`).emit('booking:updated', {
        id: bookingId,
        status: 'accepted',
        partnerId: user.id,
        partnerName: user.name,
      });
      socket.emit('booking:accepted', { id: bookingId });
    });

    socket.on('partner:decline', async (bookingId) => {
      await prisma.declinedBooking.upsert({
        where: { bookingId_partnerId: { bookingId, partnerId: user.id } },
        update: {},
        create: { bookingId, partnerId: user.id },
      });
      socket.emit('booking:declined', { id: bookingId });
    });

    socket.on('partner:complete', async (bookingId) => {
      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, partnerId: user.id },
      });
      if (!booking) return socket.emit('error', { message: 'Not authorized' });
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'completed' },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { jobsCompleted: { increment: 1 } },
      });
      await notifyUser(booking.customerId, 'email', 'Service Complete!', 'Please rate your experience.');
      io.to(`user:${booking.customerId}`).emit('booking:updated', { id: bookingId, status: 'completed' });
      socket.emit('booking:completed', { id: bookingId });
    });

    socket.on('chat:send', async (data) => {
      const { bookingId, message } = data;
      await prisma.chatMessage.create({
        data: { bookingId, senderId: user.id, message },
      });
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
