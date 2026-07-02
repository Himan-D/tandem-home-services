const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { validate, createBookingSchema, ratingSchema, complaintSchema } = require('../middleware/validate');

module.exports = function (db, io, services) {
  const router = express.Router();
  const { notifyUser, matchBooking, ml } = services;

  router.post('/', authenticateToken, validate(createBookingSchema), asyncHandler(async (req, res) => {
    const { serviceId, location, time, amount, walletDeduction, preferredPartnerId, lat, lng, promoCode } = req.body;

    let discountPercent = 0;
    if (promoCode) {
      const promo = await db.queryOne(
        `SELECT * FROM promo_codes WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())`,
        [promoCode.toUpperCase()]
      );
      if (promo && promo.used_count < promo.max_uses) {
        discountPercent = promo.discount_percent;
        await db.execute('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?', [promo.id]);
      }
    }

    let finalAmount = amount || 50;
    if (discountPercent > 0) finalAmount = finalAmount * (1 - discountPercent / 100);

    if (walletDeduction && walletDeduction > 0) {
      const user = await db.queryOne('SELECT wallet_balance FROM users WHERE id = ?', [req.user.id]);
      if (!user || user.wallet_balance < walletDeduction) {
        return res.status(400).json({ error: 'Insufficient wallet balance' });
      }
      await db.execute('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?', [walletDeduction, req.user.id]);
    }

    const service = await db.queryOne('SELECT * FROM services WHERE id = ?', [serviceId]);
    const title = service ? service.title : 'Custom Service';
    const jobId = `JOB-${Math.floor(1000 + Math.random() * 9000)}`;
    const payout = Math.floor(finalAmount * 0.75);

    let partnerId = null;
    let status = 'pending';
    if (preferredPartnerId) { partnerId = preferredPartnerId; status = 'accepted'; }

    await db.execute(
      `INSERT INTO bookings (id, service_id, service_title, customer_id, partner_id, location, lat, lng, time, payout, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [jobId, serviceId, title, req.user.id, partnerId, location, lat || null, lng || null, time, payout, status]
    );

    await db.execute(
      'INSERT INTO user_interactions (user_id, service_id, rating) VALUES (?, ?, ?)',
      [req.user.id, serviceId, 1.0]
    );
    await notifyUser(req.user.id, 'in_app', 'Booking Confirmed', `Your booking for ${title} has been received.`);

    res.status(201).json({ id: jobId, serviceId, serviceTitle: title, location, time, payout, status, partnerId, discountPercent });

    if (status === 'pending') {
      setTimeout(() => matchBooking(jobId), 2000);
    }
  }));

  router.get('/my', authenticateToken, asyncHandler(async (req, res) => {
    const myBookings = await db.query(`
      SELECT b.*, u.name as partner_name
      FROM bookings b LEFT JOIN users u ON b.partner_id = u.id
      WHERE b.customer_id = ? ORDER BY b.created_at DESC
    `, [req.user.id]);
    res.json(myBookings);
  }));

  router.post('/:id/cancel', authenticateToken, asyncHandler(async (req, res) => {
    const booking = await db.queryOne(
      'SELECT * FROM bookings WHERE id = ? AND customer_id = ?',
      [req.params.id, req.user.id]
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'completed') return res.status(400).json({ error: 'Cannot cancel completed booking' });
    if (booking.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });

    let refundPercent = 0;
    if (booking.status === 'pending') refundPercent = 100;
    else if (booking.status === 'accepted') refundPercent = 75;

    await db.execute('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', req.params.id]);

    if (refundPercent > 0) {
      const paidAmount = Math.floor(booking.payout / 0.75);
      const refundValue = Math.floor((paidAmount * refundPercent) / 100);
      await db.execute('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [refundValue, req.user.id]);
      await notifyUser(req.user.id, 'both', 'Booking Cancelled', `$${refundValue} refunded to wallet.`);
    }

    if (booking.partner_id) {
      await notifyUser(booking.partner_id, 'in_app', 'Booking Cancelled', `Booking ${booking.service_title} cancelled.`);
      io.to(`user:${booking.partner_id}`).emit('booking:cancelled', { id: req.params.id });
    }

    res.json({ success: true, refundPercent });
  }));

  router.post('/:id/rate', authenticateToken, validate(ratingSchema), asyncHandler(async (req, res) => {
    const { bookingId, rating, review } = req.body;
    const job = await db.queryOne(
      'SELECT * FROM bookings WHERE id = ? AND customer_id = ?',
      [bookingId, req.user.id]
    );
    if (!job) return res.status(403).json({ error: 'Invalid job' });

    await db.execute(
      'INSERT INTO ratings (booking_id, customer_id, partner_id, rating, review) VALUES (?, ?, ?, ?, ?)',
      [bookingId, req.user.id, job.partner_id, rating, review]
    );
    await db.execute('UPDATE bookings SET rated = 1 WHERE id = ?', [bookingId]);
    await db.execute(
      'INSERT INTO user_interactions (user_id, service_id, rating) VALUES (?, ?, ?)',
      [req.user.id, job.service_id, rating]
    );

    const avgRating = await db.queryOne(
      'SELECT AVG(rating) as avg FROM ratings WHERE partner_id = ?',
      [job.partner_id]
    );
    if (avgRating.avg) {
      await db.execute('UPDATE users SET rating_avg = ? WHERE id = ?', [avgRating.avg, job.partner_id]);
    }

    await notifyUser(job.partner_id, 'both', 'New Rating', `You received a ${rating}-star rating.`);
    res.json({ success: true });
  }));

  router.post('/:id/complaint', authenticateToken, validate(complaintSchema), asyncHandler(async (req, res) => {
    const { bookingId, reason, description } = req.body;
    await db.execute(
      'INSERT INTO complaints (booking_id, customer_id, reason, description) VALUES (?, ?, ?, ?)',
      [bookingId, req.user.id, reason, description]
    );
    const admin = await db.queryOne("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (admin) {
      await notifyUser(admin.id, 'email', 'New Complaint', `Complaint for job ${bookingId}: ${reason}`);
    }
    res.json({ success: true });
  }));

  return router;
};
