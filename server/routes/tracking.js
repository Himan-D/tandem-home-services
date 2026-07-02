const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

module.exports = function (db, io, services) {
  const router = express.Router();
  const { trackingService, oms } = services;

  router.post('/location', authenticateToken, asyncHandler(async (req, res) => {
    const { lat, lng, accuracy, speed, timestamp } = req.body;
    const smoothed = await trackingService.processLocationUpdate(
      req.user.id,
      parseFloat(lat),
      parseFloat(lng),
      { accuracy, speed, timestamp, source: 'http' }
    );
    if (!smoothed) return res.json({ accepted: false });
    res.json({ accepted: true, smoothed });
  }));

  router.get('/orders/:orderId/eta', authenticateToken, asyncHandler(async (req, res) => {
    const eta = await trackingService.getETA(req.params.orderId);
    res.json(eta);
  }));

  router.post('/orders/:orderId/arrive', authenticateToken, asyncHandler(async (req, res) => {
    const { lat, lng } = req.body;
    if (req.user.role !== 'partner') return res.status(403).json({ error: 'Partner only' });
    const result = await trackingService.confirmArrivalManual(
      req.params.orderId,
      req.user.id,
      parseFloat(lat),
      parseFloat(lng)
    );
    res.json(result);
  }));

  router.post('/orders/:orderId/otp', authenticateToken, asyncHandler(async (req, res) => {
    const order = await db.queryOne(
      'SELECT id, customer_id, rider_id, status FROM order_state_machine WHERE id = ?',
      [req.params.orderId]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const canGenerate =
      (req.user.role === 'admin') ||
      (req.user.id === order.rider_id) ||
      (req.user.id === order.customer_id);

    if (!canGenerate) return res.status(403).json({ error: 'Not authorized' });

    if (!['arrived'].includes(order.status)) {
      return res.status(400).json({ error: `Cannot generate OTP in status: ${order.status}` });
    }

    const otp = trackingService.generateOtp(req.params.orderId);

    if (req.user.id === order.customer_id) {
      res.json({ otp, message: 'Share this code with your service provider' });
    } else {
      res.json({ generated: true, message: 'OTP sent to customer' });
      io.to(`user:${order.customer_id}`).emit('otp:share', {
        orderId: order.id,
        otp,
      });
    }
  }));

  router.post('/orders/:orderId/verify-otp', authenticateToken, asyncHandler(async (req, res) => {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: 'OTP required' });

    const order = await db.queryOne(
      'SELECT id, customer_id, rider_id, status FROM order_state_machine WHERE id = ?',
      [req.params.orderId]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.id !== order.rider_id) return res.status(403).json({ error: 'Partner only' });
    if (order.status !== 'arrived') {
      return res.status(400).json({ error: `Order must be arrived first, current: ${order.status}` });
    }

    const result = trackingService.verifyOtp(req.params.orderId, otp.toString());
    if (!result.valid) {
      return res.status(400).json({ error: result.reason, attemptsLeft: result.attemptsLeft });
    }

    await db.execute(
      `UPDATE order_state_machine SET status = 'service_started', updated_at = NOW() WHERE id = ?`,
      [req.params.orderId]
    );

    trackingService.clearOtp(req.params.orderId);

    io.to(`user:${order.customer_id}`).emit('service:started', {
      orderId: order.id,
      startedAt: new Date().toISOString(),
    });

    res.json({ verified: true, message: 'Service started' });
  }));

  router.post('/orders/:orderId/complete', authenticateToken, asyncHandler(async (req, res) => {
    const { photoProofUrl } = req.body;
    const order = await db.queryOne(
      'SELECT id, customer_id, rider_id, status FROM order_state_machine WHERE id = ?',
      [req.params.orderId]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.id !== order.rider_id) return res.status(403).json({ error: 'Partner only' });

    if (!['service_started', 'arrived'].includes(order.status)) {
      return res.status(400).json({ error: `Cannot complete in status: ${order.status}` });
    }

    await db.execute(
      `UPDATE order_state_machine
       SET status = 'completed', delivered_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [req.params.orderId]
    );

    io.to(`user:${order.customer_id}`).emit('service:completed', {
      orderId: order.id,
      photoProofUrl,
      completedAt: new Date().toISOString(),
    });

    res.json({ completed: true });
  }));

  router.post('/snap-trail', authenticateToken, asyncHandler(async (req, res) => {
    const { points } = req.body;
    if (!Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ error: 'points array required' });
    }
    const googleMaps = require('../lib/google-maps');
    const snapped = await googleMaps.snapToRoads(points);
    res.json({ snapped, count: snapped.length });
  }));

  return router;
};
