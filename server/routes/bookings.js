const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { validate, createBookingSchema, ratingSchema, complaintSchema } = require('../middleware/validate');

module.exports = function (prisma, io, services) {
  const router = express.Router();
  const { notifyUser, matchBooking, ml } = services;

  router.post('/', authenticateToken, validate(createBookingSchema), asyncHandler(async (req, res) => {
    const { serviceId, location, time, amount, walletDeduction, preferredPartnerId, lat, lng, promoCode } = req.body;

    let discountPercent = 0;
    if (promoCode) {
      const promo = await prisma.promoCode.findFirst({
        where: {
          code: promoCode.toUpperCase(),
          isActive: 1,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });
      if (promo && promo.usedCount < promo.maxUses) {
        discountPercent = promo.discountPercent;
        await prisma.promoCode.update({
          where: { id: promo.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    let finalAmount = amount || 50;
    if (discountPercent > 0) finalAmount = finalAmount * (1 - discountPercent / 100);

    if (walletDeduction && walletDeduction > 0) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { walletBalance: true },
      });
      if (!user || user.walletBalance < walletDeduction) {
        return res.status(400).json({ error: 'Insufficient wallet balance' });
      }
      await prisma.user.update({
        where: { id: req.user.id },
        data: { walletBalance: { decrement: walletDeduction } },
      });
    }

    const svc = await prisma.service.findUnique({ where: { id: String(serviceId) } });
    const title = svc ? svc.title : 'Custom Service';
    const jobId = `JOB-${Math.floor(1000 + Math.random() * 9000)}`;
    const payout = Math.floor(finalAmount * 0.75);

    let partnerId = null;
    let status = 'pending';
    if (preferredPartnerId) { partnerId = preferredPartnerId; status = 'accepted'; }

    await prisma.booking.create({
      data: {
        id: jobId,
        serviceId,
        serviceTitle: title,
        customerId: req.user.id,
        partnerId,
        location,
        lat: lat || null,
        lng: lng || null,
        time,
        payout,
        status,
      },
    });

    await prisma.userInteraction.create({
      data: { userId: req.user.id, serviceId, rating: 1.0 },
    });
    await notifyUser(req.user.id, 'in_app', 'Booking Confirmed', `Your booking for ${title} has been received.`);

    res.status(201).json({ id: jobId, serviceId, serviceTitle: title, location, time, payout, status, partnerId, discountPercent });

    if (status === 'pending') {
      setTimeout(() => matchBooking(jobId), 2000);
    }
  }));

  router.get('/my', authenticateToken, asyncHandler(async (req, res) => {
    const raw = await prisma.booking.findMany({
      where: { customerId: req.user.id },
      include: { partner: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const myBookings = raw.map((b) => ({
      id: b.id, service_id: b.serviceId, service_title: b.serviceTitle,
      customer_id: b.customerId, partner_id: b.partnerId,
      location: b.location, lat: b.lat, lng: b.lng,
      time: b.time, payout: b.payout, status: b.status,
      rated: b.rated, matched_by: b.matchedBy, match_score: b.matchScore,
      created_at: b.createdAt, partner_name: b.partner?.name || null,
    }));
    res.json(myBookings);
  }));

  router.post('/:id/cancel', authenticateToken, asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, customerId: req.user.id },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'completed') return res.status(400).json({ error: 'Cannot cancel completed booking' });
    if (booking.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });

    let refundPercent = 0;
    if (booking.status === 'pending') refundPercent = 100;
    else if (booking.status === 'accepted') refundPercent = 75;

    await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
    });

    if (refundPercent > 0) {
      const paidAmount = Math.floor(booking.payout / 0.75);
      const refundValue = Math.floor((paidAmount * refundPercent) / 100);
      await prisma.user.update({
        where: { id: req.user.id },
        data: { walletBalance: { increment: refundValue } },
      });
      await notifyUser(req.user.id, 'both', 'Booking Cancelled', `$${refundValue} refunded to wallet.`);
    }

    if (booking.partnerId) {
      await notifyUser(booking.partnerId, 'in_app', 'Booking Cancelled', `Booking ${booking.serviceTitle} cancelled.`);
      io.to(`user:${booking.partnerId}`).emit('booking:cancelled', { id: req.params.id });
    }

    res.json({ success: true, refundPercent });
  }));

  router.post('/:id/rate', authenticateToken, validate(ratingSchema), asyncHandler(async (req, res) => {
    const { bookingId, rating, review } = req.body;
    const job = await prisma.booking.findFirst({
      where: { id: bookingId, customerId: req.user.id },
    });
    if (!job) return res.status(403).json({ error: 'Invalid job' });

    await prisma.rating.create({
      data: {
        bookingId,
        customerId: req.user.id,
        partnerId: job.partnerId,
        rating,
        review,
      },
    });
    await prisma.booking.update({
      where: { id: bookingId },
      data: { rated: 1 },
    });
    await prisma.userInteraction.create({
      data: { userId: req.user.id, serviceId: job.serviceId, rating },
    });

    const avgResult = await prisma.rating.aggregate({
      _avg: { rating: true },
      where: { partnerId: job.partnerId },
    });
    if (avgResult._avg.rating) {
      await prisma.user.update({
        where: { id: job.partnerId },
        data: { ratingAvg: avgResult._avg.rating },
      });
    }

    await notifyUser(job.partnerId, 'both', 'New Rating', `You received a ${rating}-star rating.`);
    res.json({ success: true });
  }));

  router.post('/:id/complaint', authenticateToken, validate(complaintSchema), asyncHandler(async (req, res) => {
    const { bookingId, reason, description } = req.body;
    await prisma.complaint.create({
      data: { bookingId, customerId: req.user.id, reason, description },
    });
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true },
    });
    if (admin) {
      await notifyUser(admin.id, 'email', 'New Complaint', `Complaint for job ${bookingId}: ${reason}`);
    }
    res.json({ success: true });
  }));

  return router;
};
