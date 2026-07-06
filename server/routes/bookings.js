const express = require('express');
const crypto = require('crypto');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { validate, createBookingSchema, ratingSchema, complaintSchema } = require('../middleware/validate');

module.exports = function (prisma, io, services) {
  const router = express.Router();
  const { notifyUser, matchBooking, ml } = services;

  router.post('/', authenticateToken, validate(createBookingSchema), asyncHandler(async (req, res) => {
    const { serviceId, location, time, amount, walletDeduction, preferredPartnerId, lat, lng, promoCode, giftCardCode, giftCardAmount } = req.body;

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

    if (giftCardCode) {
      const cards = await prisma.$queryRawUnsafe(
        `SELECT id, remaining_balance, status, expires_at FROM gift_cards WHERE code = $1`,
        giftCardCode.toUpperCase()
      );
      if (cards.length === 0) return res.status(400).json({ error: 'Gift card not found' });
      const card = cards[0];
      if (card.status === 'expired' || new Date(card.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Gift card has expired' });
      }
      if (card.remaining_balance <= 0) {
        return res.status(400).json({ error: 'Gift card has no remaining balance' });
      }
      const deductAmount = Math.min(giftCardAmount || 0, card.remaining_balance);
      if (deductAmount <= 0) {
        return res.status(400).json({ error: 'Gift card amount required' });
      }
      await prisma.$executeRawUnsafe(
        `INSERT INTO gift_card_redemptions (gift_card_id, booking_id, amount, redeemed_by)
         VALUES ($1, $2, $3, $4)`,
        card.id, jobId, deductAmount, req.user.id
      );
      const newBalance = card.remaining_balance - deductAmount;
      const newStatus = newBalance <= 0 ? 'redeemed' : 'partially_redeemed';
      if (newStatus === 'redeemed') {
        await prisma.$executeRawUnsafe(
          `UPDATE gift_cards SET remaining_balance = $1, status = $2, redeemed_at = NOW() WHERE id = $3`,
          newBalance, newStatus, card.id
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE gift_cards SET remaining_balance = $1, status = $2 WHERE id = $3`,
          newBalance, newStatus, card.id
        );
      }
    }

    const svc = await prisma.service.findUnique({ where: { id: String(serviceId) } });
    const title = svc ? svc.title : 'Custom Service';
    const jobId = `JOB-${crypto.randomUUID().slice(0, 8)}`;
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
    await notifyUser(req.user.id, 'in_app', 'Booking Confirmed', `Your booking for ${title} has been received.`, { bookingId: jobId });

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
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancellation_reason') THEN
          ALTER TABLE bookings ADD COLUMN cancellation_reason TEXT;
          ALTER TABLE bookings ADD COLUMN cancelled_at TIMESTAMP;
          ALTER TABLE bookings ADD COLUMN cancelled_by INTEGER REFERENCES users(id);
        END IF;
      END $$;
    `);

    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, customerId: req.user.id },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'completed') return res.status(400).json({ error: 'Cannot cancel completed booking' });
    if (booking.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });

    let refundPercent = 0;
    if (booking.status === 'pending') refundPercent = 100;
    else if (booking.status === 'accepted') refundPercent = 75;

    const reason = req.body.reason || 'Not specified';

    await prisma.$executeRawUnsafe(
      `UPDATE bookings SET status = 'cancelled', cancellation_reason = $1, cancelled_at = NOW(), cancelled_by = $2 WHERE id = $3`,
      reason, req.user.id, req.params.id
    );

    if (refundPercent > 0) {
      const paidAmount = Math.floor(booking.payout / 0.75);
      const refundValue = Math.floor((paidAmount * refundPercent) / 100);
      await prisma.user.update({
        where: { id: req.user.id },
        data: { walletBalance: { increment: refundValue } },
      });
      await notifyUser(req.user.id, 'both', 'Booking Cancelled', `$${refundValue} refunded to wallet. Reason: ${reason}`, { bookingId: Number(req.params.id) });
    }

    if (booking.partnerId) {
      await notifyUser(booking.partnerId, 'in_app', 'Booking Cancelled', `Booking ${booking.serviceTitle} cancelled. Reason: ${reason}`, { bookingId: Number(req.params.id) });
      io.to(`user:${booking.partnerId}`).emit('booking:cancelled', { id: req.params.id, reason });
    }

    res.json({ success: true, refundPercent, reason });
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

    await notifyUser(job.partnerId, 'both', 'New Rating', `You received a ${rating}-star rating.`, { bookingId });
    res.json({ success: true });
  }));

  router.post('/:id/rebook', authenticateToken, asyncHandler(async (req, res) => {
    const prev = await prisma.booking.findFirst({
      where: { id: req.params.id, customerId: req.user.id },
    });
    if (!prev) return res.status(404).json({ error: 'Previous booking not found' });
    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const booking = await prisma.booking.create({
      data: {
        id: jobId,
        serviceId: prev.serviceId,
        serviceTitle: prev.serviceTitle,
        customerId: req.user.id,
        location: prev.location,
        lat: prev.lat,
        lng: prev.lng,
        time: prev.time,
        payout: prev.payout,
        status: 'pending',
      },
    });
    await notifyUser(req.user.id, 'in_app', 'Booking Confirmed', `Rebooked ${prev.serviceTitle}`, { bookingId: jobId });
    res.status(201).json({ id: jobId, serviceId: prev.serviceId, location: prev.location, payout: prev.payout, status: 'pending' });
    setTimeout(() => matchBooking(jobId), 2000);
  }));

  router.post('/:id/complaint', authenticateToken, validate(complaintSchema), asyncHandler(async (req, res) => {
    const { bookingId, reason, description } = req.body;
    await prisma.complaint.create({
      data: { bookingId, customerId: req.user.id, reason, description },
    });
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { partnerId: true },
    });
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true },
    });
    if (admin) {
      await notifyUser(admin.id, 'email', 'New Complaint', `Complaint for job ${bookingId}: ${reason}`, { bookingId });
    }
    if (booking.partnerId) {
      await notifyUser(booking.partnerId, 'in_app', 'New Complaint',
        `A complaint has been filed for job ${bookingId}. We'll review it shortly.`, { bookingId });
    }
    res.json({ success: true });
  }));

  return router;
};
