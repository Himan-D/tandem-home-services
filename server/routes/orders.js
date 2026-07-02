const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { validate, createOrderSchema } = require('../middleware/validate');
const { orderLimiter, rateLimit } = require('../middleware/rateLimit');

module.exports = function (prisma, io, services) {
  const router = express.Router();
  const { oms } = services;

  router.post('/', authenticateToken, rateLimit(orderLimiter), validate(createOrderSchema), asyncHandler(async (req, res) => {
    const { serviceId, amount, location, lat, lng, idempotencyKey } = req.body;
    const { order, idempotent } = await oms.createOrder({
      customerId: req.user.id,
      serviceId,
      amount,
      location,
      lat,
      lng,
      idempotencyKey,
    });
    res.status(idempotent ? 200 : 201).json({ order, idempotent });
  }));

  router.get('/my', authenticateToken, asyncHandler(async (req, res) => {
    const orders = await oms.getOrdersForCustomer(req.user.id);
    res.json(orders);
  }));

  router.get('/active', authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.role === 'admin') {
      return res.json(await oms.getActiveJobs());
    }
    if (req.user.role === 'partner') {
      return res.json(await oms.getOrdersForRider(req.user.id));
    }
    res.json(await oms.getOrdersForCustomer(req.user.id));
  }));

  router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
    const order = await oms.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'admin' && order.customer_id !== req.user.id && order.rider_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    res.json(order);
  }));

  router.post('/:id/pickup', authenticateToken, asyncHandler(async (req, res) => {
    const order = await oms.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'admin' && order.rider_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const updated = await oms.markPickedUp(req.params.id);
    res.json(updated);
  }));

  router.post('/:id/transit', authenticateToken, asyncHandler(async (req, res) => {
    const order = await oms.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'admin' && order.rider_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const updated = await oms.markInTransit(req.params.id);
    res.json(updated);
  }));

  router.post('/:id/deliver', authenticateToken, asyncHandler(async (req, res) => {
    const order = await oms.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'admin' && order.rider_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const updated = await oms.markDelivered(req.params.id);
    res.json(updated);
  }));

  router.post('/:id/complete', authenticateToken, asyncHandler(async (req, res) => {
    const order = await oms.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'admin' && order.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const updated = await oms.complete(req.params.id);
    res.json(updated);
  }));

  router.post('/:id/cancel', authenticateToken, asyncHandler(async (req, res) => {
    const order = await oms.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'admin' && order.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const updated = await oms.cancel(req.params.id);
    res.json(updated);
  }));

  router.post('/:id/retry', authenticateToken, asyncHandler(async (req, res) => {
    const order = await oms.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await oms.retry(req.params.id);
    res.json({ success: true });
  }));

  router.get('/:id/timeline', authenticateToken, asyncHandler(async (req, res) => {
    const { riderAssignment } = services;
    const timeline = await riderAssignment.getOrderTimeline(req.params.id);
    res.json(timeline);
  }));

  return router;
};
