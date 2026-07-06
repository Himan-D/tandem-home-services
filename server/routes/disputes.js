const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireRole } = require('../middleware/auth');

module.exports = function (prisma, io, services) {
  const router = express.Router();
  const { notifyUser } = services;

  function enrichComplaint(c) {
    return {
      id: c.id,
      bookingId: c.booking_id || c.bookingId,
      customerId: c.customer_id || c.customerId,
      reason: c.reason,
      description: c.description,
      status: c.status,
      partnerResponse: c.partner_response || c.partnerResponse,
      customerFollowup: c.customer_followup || c.customerFollowup,
      adminNotes: c.admin_notes || c.adminNotes,
      resolvedBy: c.resolved_by || c.resolvedBy,
      resolvedAt: c.resolved_at || c.resolvedAt,
      resolutionType: c.resolution_type || c.resolutionType,
      resolutionNotes: c.resolution_notes || c.resolutionNotes,
      createdAt: c.created_at || c.createdAt,
      updatedAt: c.updated_at || c.updatedAt,
      customerName: c.customerName || c.customer_name || null,
      partnerName: c.partnerName || c.partner_name || null,
      serviceTitle: c.serviceTitle || c.service_title || null,
      bookingTime: c.bookingTime || c.booking_time || null,
      bookingPayout: c.bookingPayout || c.booking_payout || null,
    };
  }

  const COMPLAINT_SELECT = {
    id: true, bookingId: true, customerId: true,
    reason: true, description: true, status: true,
    partnerResponse: true, customerFollowup: true, adminNotes: true,
    resolvedBy: true, resolvedAt: true,
    resolutionType: true, resolutionNotes: true,
    createdAt: true, updatedAt: true,
  };

  async function getDetail(complaint) {
    let serviceTitle = null;
    let partnerName = null;
    let bookingTime = null;
    let bookingPayout = null;
    if (complaint.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: complaint.bookingId },
        select: { serviceTitle: true, partnerId: true, time: true, payout: true,
          partner: { select: { name: true } } },
      });
      if (booking) {
        serviceTitle = booking.serviceTitle;
        partnerName = booking.partner?.name || null;
        bookingTime = booking.time;
        bookingPayout = booking.payout;
      }
    }
    return {
      ...complaint,
      serviceTitle,
      partnerName,
      bookingTime,
      bookingPayout,
    };
  }

  router.get('/', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const complaints = await prisma.complaint.findMany({
      where,
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const enriched = await Promise.all(complaints.map(async (c) => {
      const detail = await getDetail({
        id: c.id, bookingId: c.bookingId, customerId: c.customerId,
        reason: c.reason, description: c.description, status: c.status,
        partnerResponse: c.partnerResponse, customerFollowup: c.customerFollowup,
        adminNotes: c.adminNotes,
        resolvedBy: c.resolvedBy, resolvedAt: c.resolvedAt,
        resolutionType: c.resolutionType, resolutionNotes: c.resolutionNotes,
        createdAt: c.createdAt, updatedAt: c.updatedAt,
        customerName: c.customer?.name || 'Unknown',
      });
      return detail;
    }));
    res.json(enriched);
  }));

  router.get('/mine', authenticateToken, asyncHandler(async (req, res) => {
    const complaints = await prisma.complaint.findMany({
      where: { customerId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    const enriched = await Promise.all(complaints.map(getDetail));
    res.json(enriched);
  }));

  router.get('/partner', authenticateToken, requireRole('partner'), asyncHandler(async (req, res) => {
    const partnerBookings = await prisma.booking.findMany({
      where: { partnerId: req.user.id },
      select: { id: true },
    });
    const bookingIds = partnerBookings.map((b) => b.id);
    if (bookingIds.length === 0) return res.json([]);
    const complaints = await prisma.complaint.findMany({
      where: { bookingId: { in: bookingIds } },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const enriched = await Promise.all(complaints.map(async (c) => {
      const detail = await getDetail({
        id: c.id, bookingId: c.bookingId, customerId: c.customerId,
        reason: c.reason, description: c.description, status: c.status,
        partnerResponse: c.partnerResponse, customerFollowup: c.customerFollowup,
        adminNotes: c.adminNotes,
        resolvedBy: c.resolvedBy, resolvedAt: c.resolvedAt,
        resolutionType: c.resolutionType, resolutionNotes: c.resolutionNotes,
        createdAt: c.createdAt, updatedAt: c.updatedAt,
        customerName: c.customer?.name || 'Unknown',
      });
      return detail;
    }));
    res.json(enriched);
  }));

  router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
    const complaint = await prisma.complaint.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { customer: { select: { name: true } } },
    });
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const booking = await prisma.booking.findUnique({
      where: { id: complaint.bookingId },
      select: { customerId: true, partnerId: true, serviceTitle: true,
        time: true, payout: true, partner: { select: { name: true } } },
    });
    if (req.user.role !== 'admin' &&
        req.user.id !== complaint.customerId &&
        req.user.id !== booking?.partnerId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      ...complaint,
      customerName: complaint.customer?.name || 'Unknown',
      partnerName: booking?.partner?.name || null,
      serviceTitle: booking?.serviceTitle || null,
      bookingTime: booking?.time || null,
      bookingPayout: booking?.payout || null,
    });
  }));

  router.post('/:id/respond', authenticateToken, requireRole('partner'), asyncHandler(async (req, res) => {
    const { response } = req.body;
    if (!response || !response.trim()) {
      return res.status(400).json({ error: 'Response is required' });
    }
    const complaint = await prisma.complaint.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    if (complaint.status !== 'open') {
      return res.status(400).json({ error: 'Complaint is already resolved' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: complaint.bookingId },
      select: { partnerId: true, customerId: true },
    });
    if (booking?.partnerId !== req.user.id) {
      return res.status(403).json({ error: 'This complaint is not against you' });
    }

    await prisma.complaint.update({
      where: { id: complaint.id },
      data: { partnerResponse: response, updatedAt: new Date() },
    });

    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true },
    });
    if (admin) {
      await notifyUser(admin.id, 'in_app', 'Partner Responded',
        `Partner responded to complaint #${complaint.id}`, {});
    }

    res.json({ success: true });
  }));

  router.post('/:id/followup', authenticateToken, asyncHandler(async (req, res) => {
    const { followup } = req.body;
    if (!followup || !followup.trim()) {
      return res.status(400).json({ error: 'Follow-up is required' });
    }
    const complaint = await prisma.complaint.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    if (complaint.customerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the complainant can add a follow-up' });
    }
    if (complaint.status !== 'open') {
      return res.status(400).json({ error: 'Complaint is already resolved' });
    }

    await prisma.complaint.update({
      where: { id: complaint.id },
      data: { customerFollowup: followup, updatedAt: new Date() },
    });

    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true },
    });
    if (admin) {
      await notifyUser(admin.id, 'in_app', 'Customer Follow-up',
        `Customer added follow-up to complaint #${complaint.id}`, {});
    }

    res.json({ success: true });
  }));

  router.post('/:id/resolve', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const { resolutionType, resolutionNotes } = req.body;
    if (!resolutionType) return res.status(400).json({ error: 'Resolution type required' });
    const validTypes = ['refund_full', 'refund_partial', 'dismissed', 'credited_partner', 'other'];
    if (!validTypes.includes(resolutionType)) {
      return res.status(400).json({ error: `Invalid type. Must be: ${validTypes.join(', ')}` });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    await prisma.complaint.update({
      where: { id: complaint.id },
      data: {
        status: 'resolved', resolvedBy: req.user.id, resolvedAt: new Date(),
        resolutionType, resolutionNotes: resolutionNotes || null, updatedAt: new Date(),
      },
    });

    const booking = await prisma.booking.findUnique({
      where: { id: complaint.bookingId },
      select: { partnerId: true, customerId: true },
    });

    if (booking) {
      const typeLabel = resolutionType.replace(/_/g, ' ');
      if (booking.customerId) {
        await notifyUser(booking.customerId, 'both', 'Dispute Resolved',
          `Your complaint #${complaint.id} has been resolved. Resolution: ${typeLabel}.`, {});
      }
      if (booking.partnerId) {
        await notifyUser(booking.partnerId, 'both', 'Dispute Resolved',
          `Complaint #${complaint.id} has been resolved. Resolution: ${typeLabel}.`, {});
      }
    }

    res.json({ success: true, status: 'resolved', resolutionType });
  }));

  router.post('/:id/reopen', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const complaint = await prisma.complaint.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    if (complaint.status !== 'resolved') {
      return res.status(400).json({ error: 'Only resolved complaints can be reopened' });
    }

    await prisma.complaint.update({
      where: { id: complaint.id },
      data: { status: 'open', updatedAt: new Date() },
    });

    res.json({ success: true, status: 'open' });
  }));

  return router;
};
