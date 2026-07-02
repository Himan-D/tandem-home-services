const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate, partnerServicesSchema } = require('../middleware/validate');

module.exports = function (db, io, services) {
  const router = express.Router();
  const { onlinePartners, notifyUser } = services;

  router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
    const user = await db.queryOne(`
      SELECT id, name, email, role, wallet_balance, is_plus_member, phone, location,
             lat, lng, services_offered, rating_avg, jobs_completed, response_time_mins
      FROM users WHERE id = ?
    `, [req.user.id]);
    res.json(user);
  }));

  router.post('/me/onboard', authenticateToken, asyncHandler(async (req, res) => {
    const { phone, location, lat, lng } = req.body;
    await db.execute(
      'UPDATE users SET phone = ?, location = ?, lat = ?, lng = ?, wallet_balance = wallet_balance + 100 WHERE id = ?',
      [phone, location, lat || null, lng || null, req.user.id]
    );
    await notifyUser(req.user.id, 'both', 'Onboarding Complete', 'Welcome bonus: $100 credited to wallet.');
    res.json({ success: true });
  }));

  router.post('/plus/subscribe', authenticateToken, asyncHandler(async (req, res) => {
    await db.execute('UPDATE users SET is_plus_member = 1 WHERE id = ?', [req.user.id]);
    res.json({ success: true, isPlusMember: 1 });
  }));

  router.get('/jobs', authenticateToken, asyncHandler(async (req, res) => {
    const partner = await db.queryOne('SELECT services_offered FROM users WHERE id = ?', [req.user.id]);
    let offered = [];
    try { offered = JSON.parse(partner?.services_offered || '[]'); } catch {}

    const pendingJobs = await db.query(`
      SELECT b.*, u.name as customer_name FROM bookings b
      LEFT JOIN users u ON b.customer_id = u.id
      WHERE b.status = 'pending'
        AND b.id NOT IN (SELECT booking_id FROM declined_bookings WHERE partner_id = ?)
    `, [req.user.id]);

    const matchedJobs = pendingJobs.filter((job) => offered.includes(job.service_id) || offered.length === 0);

    const myJobs = await db.query(`
      SELECT b.*, u.name as customer_name FROM bookings b
      LEFT JOIN users u ON b.customer_id = u.id
      WHERE b.partner_id = ? AND b.status IN ('accepted', 'completed')
    `, [req.user.id]);

    res.json({ available: matchedJobs, active: myJobs, myServices: offered });
  }));

  router.post('/partner/services', authenticateToken, validate(partnerServicesSchema), asyncHandler(async (req, res) => {
    await db.execute('UPDATE users SET services_offered = ? WHERE id = ?', [JSON.stringify(req.body.services), req.user.id]);
    if (onlinePartners.has(req.user.id)) {
      onlinePartners.set(req.user.id, { ...onlinePartners.get(req.user.id), services: req.body.services });
    }
    res.json({ success: true });
  }));

  router.patch('/jobs/:id', authenticateToken, asyncHandler(async (req, res) => {
    const { status } = req.body;
    const jobId = req.params.id;
    const job = await db.queryOne('SELECT * FROM bookings WHERE id = ?', [jobId]);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (status === 'accepted') {
      if (job.status !== 'pending') return res.status(409).json({ error: 'Booking no longer available' });
      await db.execute(
        'UPDATE bookings SET status = ?, partner_id = ? WHERE id = ? AND status = ?',
        ['accepted', req.user.id, jobId, 'pending']
      );
      const updated = await db.queryOne('SELECT status FROM bookings WHERE id = ?', [jobId]);
      if (updated.status !== 'accepted') return res.status(409).json({ error: 'Another partner accepted' });
      await notifyUser(job.customer_id, 'in_app', 'Job Accepted', `${req.user.name} accepted your ${job.service_title} request.`);
      io.to(`user:${job.customer_id}`).emit('booking:updated', { id: jobId, status: 'accepted', partnerId: req.user.id });
    } else if (status === 'completed') {
      await db.execute('UPDATE bookings SET status = ? WHERE id = ? AND partner_id = ?', ['completed', jobId, req.user.id]);
      await db.execute('UPDATE users SET jobs_completed = jobs_completed + 1 WHERE id = ?', [req.user.id]);
      await notifyUser(job.customer_id, 'email', 'Job Completed', `${job.service_title} complete! Please rate.`);
      io.to(`user:${job.customer_id}`).emit('booking:updated', { id: jobId, status: 'completed' });
    } else if (status === 'declined') {
      await db.execute(
        'INSERT INTO declined_bookings (booking_id, partner_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
        [jobId, req.user.id]
      );
    }
    res.json({ success: true });
  }));

  return router;
};
