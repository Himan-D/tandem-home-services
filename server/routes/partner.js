const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate, partnerServicesSchema } = require('../middleware/validate');

module.exports = function (prisma, io, services) {
  const router = express.Router();
  const { onlinePartners, notifyUser, shiftManager } = services;

  router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, role: true, walletBalance: true,
        isPlusMember: true, phone: true, location: true, lat: true, lng: true,
        servicesOffered: true, ratingAvg: true, jobsCompleted: true, responseTimeMins: true,
      },
    });
    res.json(user);
  }));

  router.post('/me/onboard', authenticateToken, asyncHandler(async (req, res) => {
    const { phone, location, lat, lng } = req.body;
    const existing = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { phone: true, walletBalance: true },
    });
    if (existing?.phone) return res.status(400).json({ error: 'Already onboarded' });

    const bonus = existing.walletBalance === 0 ? { increment: 100 } : undefined;
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        phone,
        location,
        lat: lat || null,
        lng: lng || null,
        ...(bonus ? { walletBalance: bonus } : {}),
      },
    });
    if (bonus) {
      await notifyUser(req.user.id, 'both', 'Onboarding Complete', 'Welcome bonus: $100 credited to wallet.');
    }
    res.json({ success: true });
  }));

  router.post('/plus/subscribe', authenticateToken, asyncHandler(async (req, res) => {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { isPlusMember: 1 },
    });
    res.json({ success: true, isPlusMember: 1 });
  }));

  router.get('/jobs', authenticateToken, asyncHandler(async (req, res) => {
    const partner = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { servicesOffered: true },
    });
    let offered = [];
    try { offered = JSON.parse(partner?.servicesOffered || '[]'); } catch {}

    const declinedIds = await prisma.declinedBooking.findMany({
      where: { partnerId: req.user.id },
      select: { bookingId: true },
    });
    const declinedSet = new Set(declinedIds.map((d) => d.bookingId));

    const allPending = await prisma.booking.findMany({
      where: { status: 'pending' },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const pendingJobs = allPending
      .filter((job) => !declinedSet.has(job.id))
      .map((job) => ({
        id: job.id, service_id: job.serviceId, service_title: job.serviceTitle,
        customer_id: job.customerId, partner_id: job.partnerId,
        location: job.location, lat: job.lat, lng: job.lng,
        time: job.time, payout: job.payout, status: job.status,
        rated: job.rated, matched_by: job.matchedBy, match_score: job.matchScore,
        created_at: job.createdAt, customer_name: job.customer?.name || null,
      }));

    const matchedJobs = pendingJobs.filter((job) => offered.includes(job.service_id) || offered.length === 0);

    const rawMyJobs = await prisma.booking.findMany({
      where: { partnerId: req.user.id, status: { in: ['accepted', 'completed'] } },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const myJobs = rawMyJobs.map((job) => ({
      id: job.id, service_id: job.serviceId, service_title: job.serviceTitle,
      customer_id: job.customerId, partner_id: job.partnerId,
      location: job.location, lat: job.lat, lng: job.lng,
      time: job.time, payout: job.payout, status: job.status,
      rated: job.rated, matched_by: job.matchedBy, match_score: job.matchScore,
      created_at: job.createdAt, customer_name: job.customer?.name || null,
    }));

    res.json({ available: matchedJobs, active: myJobs, myServices: offered });
  }));

  router.post('/partner/services', authenticateToken, validate(partnerServicesSchema), asyncHandler(async (req, res) => {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { servicesOffered: JSON.stringify(req.body.services) },
    });
    if (onlinePartners.has(req.user.id)) {
      onlinePartners.set(req.user.id, { ...onlinePartners.get(req.user.id), services: req.body.services });
    }
    res.json({ success: true });
  }));

  router.patch('/jobs/:id', authenticateToken, asyncHandler(async (req, res) => {
    const { status } = req.body;
    const jobId = req.params.id;
    const job = await prisma.booking.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (status === 'accepted') {
      if (job.status !== 'pending') return res.status(409).json({ error: 'Booking no longer available' });
      const result = await prisma.booking.updateMany({
        where: { id: jobId, status: 'pending' },
        data: { status: 'accepted', partnerId: req.user.id },
      });
      if (result.count === 0) return res.status(409).json({ error: 'Another partner accepted' });
      await notifyUser(job.customerId, 'in_app', 'Job Accepted', `${req.user.name} accepted your ${job.serviceTitle} request.`);
      io.to(`user:${job.customerId}`).emit('booking:updated', { id: jobId, status: 'accepted', partnerId: req.user.id });
    } else if (status === 'completed') {
      await prisma.booking.updateMany({
        where: { id: jobId, partnerId: req.user.id },
        data: { status: 'completed' },
      });
      await prisma.user.update({
        where: { id: req.user.id },
        data: { jobsCompleted: { increment: 1 } },
      });
      await notifyUser(job.customerId, 'email', 'Job Completed', `${job.serviceTitle} complete! Please rate.`);
      io.to(`user:${job.customerId}`).emit('booking:updated', { id: jobId, status: 'completed' });
    } else if (status === 'declined') {
      await prisma.declinedBooking.upsert({
        where: { bookingId_partnerId: { bookingId: jobId, partnerId: req.user.id } },
        update: {},
        create: { bookingId: jobId, partnerId: req.user.id },
      });
    }
    res.json({ success: true });
  }));

  router.get('/shifts', authenticateToken, asyncHandler(async (req, res) => {
    const shifts = await shiftManager.getShifts(req.user.id);
    res.json(shifts);
  }));

  router.put('/shifts', authenticateToken, asyncHandler(async (req, res) => {
    const { shifts } = req.body;
    if (!Array.isArray(shifts)) return res.status(400).json({ error: 'shifts array required' });
    await shiftManager.upsertShifts(req.user.id, shifts);
    res.json({ success: true });
  }));

  router.get('/shifts/check', authenticateToken, asyncHandler(async (req, res) => {
    const onShift = await shiftManager.isOnShift(req.user.id);
    res.json({ onShift });
  }));

  router.post('/shift/break', authenticateToken, asyncHandler(async (req, res) => {
    const { action } = req.body;
    if (!['start', 'end'].includes(action)) {
      return res.status(400).json({ error: 'action must be start or end' });
    }
    io.to(`user:${req.user.id}`).emit('shift:break', { action });
    res.json({ success: true, action });
  }));

  router.get('/notifications', authenticateToken, asyncHandler(async (req, res) => {
    const notifs = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifs);
  }));

  router.patch('/notifications/:id/read', authenticateToken, asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: parseInt(req.params.id), userId: req.user.id },
      data: { read: 1 },
    });
    res.json({ success: true });
  }));

  return router;
};
