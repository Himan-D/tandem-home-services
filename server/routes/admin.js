const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../lib/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

module.exports = function (prisma, io, services) {
  const router = express.Router();
  const { onlinePartners, oms, spatialIndex } = services;

  router.use(authenticateToken, requireRole('admin'));

  router.get('/stats', asyncHandler(async (req, res) => {
    const [prosCount, jobsCount, revenueAgg, ratingsAgg, totalDarkStores, activeDarkStores, ordersCount, lowStock] = await Promise.all([
      prisma.user.count({ where: { role: 'partner' } }),
      prisma.booking.count(),
      prisma.booking.aggregate({
        _sum: { payout: true },
        where: {
          status: 'completed',
          createdAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.rating.aggregate({ _avg: { rating: true } }),
      prisma.darkStore.count(),
      prisma.darkStore.count({ where: { isActive: 1 } }),
      prisma.orderStateMachine.count({
        where: { status: { notIn: ['completed', 'cancelled', 'failed'] } },
      }),
      prisma.$queryRaw`
        SELECT i.dark_store_id, ds.name, s.title FROM inventory i
        JOIN dark_stores ds ON i.dark_store_id = ds.id
        JOIN services s ON i.service_id = s.id
        WHERE i.quantity <= i.min_threshold
      `,
    ]);

    res.json({
      activePros: prosCount,
      onlinePros: onlinePartners.size,
      jobsToday: jobsCount,
      avgRating: ratingsAgg._avg.rating ? parseFloat(String(ratingsAgg._avg.rating)).toFixed(1) : null,
      revenue30d: Math.round((revenueAgg._sum.payout || 0) * 1.33),
      darkStores: totalDarkStores,
      activeDarkStores,
      activeOrders: ordersCount,
      lowStockAlerts: lowStock,
    });
  }));

  router.get('/partners', asyncHandler(async (req, res) => {
    const partners = await prisma.user.findMany({
      where: { role: 'partner' },
      select: {
        id: true, name: true, email: true, phone: true, location: true,
        lat: true, lng: true, ratingAvg: true, jobsCompleted: true,
        isPlusMember: true, servicesOffered: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(partners.map((p) => ({
      ...p,
      hasLocation: p.lat !== null && p.lng !== null,
      online: onlinePartners.has(p.id),
      servicesOffered: (() => { try { return JSON.parse(p.servicesOffered || '[]'); } catch (e) { return []; } })(),
    })));
  }));

  router.get('/customers', asyncHandler(async (req, res) => {
    const customers = await prisma.user.findMany({
      where: { role: 'consumer' },
      select: {
        id: true, name: true, email: true, phone: true, location: true,
        walletBalance: true, isPlusMember: true, createdAt: true,
        _count: { select: { bookingsAsCustomer: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(customers.map((c) => ({
      id: c.id, name: c.name, email: c.email, phone: c.phone,
      location: c.location, wallet_balance: c.walletBalance,
      is_plus_member: c.isPlusMember, created_at: c.createdAt,
      total_bookings: c._count.bookingsAsCustomer,
    })));
  }));

  router.get('/complaints', asyncHandler(async (req, res) => {
    const complaints = await prisma.complaint.findMany({
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const withBookingTitles = await Promise.all(
      complaints.map(async (c) => {
        let serviceTitle = null;
        if (c.bookingId) {
          const booking = await prisma.booking.findUnique({
            where: { id: c.bookingId },
            select: { serviceTitle: true },
          });
          serviceTitle = booking?.serviceTitle || null;
        }
        return {
          id: c.id, bookingId: c.bookingId, customerId: c.customerId,
          reason: c.reason, description: c.description, status: c.status,
          createdAt: c.createdAt, customer_name: c.customer?.name || 'Unknown',
          service_title: serviceTitle,
        };
      })
    );
    res.json(withBookingTitles);
  }));

  router.patch('/complaints/:id/resolve', asyncHandler(async (req, res) => {
    try {
      const complaint = await prisma.complaint.update({
        where: { id: parseInt(req.params.id) },
        data: { status: 'resolved' },
      });
      res.json(complaint);
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Complaint not found' });
      throw err;
    }
  }));

  router.get('/notifications', asyncHandler(async (req, res) => {
    const notifs = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifs);
  }));

  router.patch('/notifications/:id/read', asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: parseInt(req.params.id), userId: req.user.id },
      data: { read: 1 },
    });
    res.json({ success: true });
  }));

  router.get('/spatial/nearby', asyncHandler(async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = parseFloat(req.query.radius || '10');
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat and lng required' });
    const nearby = spatialIndex.findNearby(lat, lng, radiusKm);
    res.json(nearby);
  }));

  router.post('/spatial-index/rebuild', asyncHandler(async (req, res) => {
    const partners = await prisma.user.findMany({
      where: { role: 'partner', lat: { not: null }, lng: { not: null } },
      select: { id: true, name: true, lat: true, lng: true },
    });
    spatialIndex.load(partners);
    res.json({ success: true, count: partners.length });
  }));

  router.get('/orders', asyncHandler(async (req, res) => {
    const orders = await prisma.orderStateMachine.findMany({
      include: {
        customer: { select: { name: true } },
        rider: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const enriched = await Promise.all(
      orders.map(async (o) => {
        let storeName = null;
        if (o.darkStoreId) {
          const store = await prisma.darkStore.findUnique({
            where: { id: o.darkStoreId },
            select: { name: true },
          });
          storeName = store?.name || null;
        }
        return {
          id: o.id, idempotencyKey: o.idempotencyKey, customerId: o.customerId,
          serviceId: o.serviceId, darkStoreId: o.darkStoreId, riderId: o.riderId,
          status: o.status, amount: o.amount, location: o.location,
          lat: o.lat, lng: o.lng, createdAt: o.createdAt,
          customer_name: o.customer?.name || null,
          rider_name: o.rider?.name || null,
          store_name: storeName,
        };
      })
    );
    res.json(enriched);
  }));

  // User Management Endpoints
  router.post('/users', asyncHandler(async (req, res) => {
    const bcrypt = require('bcrypt');
    const { name, email, phone, password, role, location, status } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          password: hash,
          role: role || 'customer',
          location: location || null,
          status: status || 'active'
        },
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          location: true, status: true, isPlusMember: true, createdAt: true
        }
      });

      res.status(201).json(user);
    } catch (err) {
      if (err.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
      logger.error({ err: err.message }, 'User creation failed');
      res.status(500).json({ error: 'User creation failed' });
    }
  }));

  router.put('/users/:id', asyncHandler(async (req, res) => {
    const { name, email, phone, location, status, isPlusMember } = req.body;
    const userId = parseInt(req.params.id);

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(phone && { phone }),
          ...(location !== undefined && { location }),
          ...(status && { status }),
          ...(isPlusMember !== undefined && { isPlusMember: isPlusMember ? 1 : 0 })
        },
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          location: true, status: true, isPlusMember: true, createdAt: true
        }
      });

      res.json(user);
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
      if (err.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
      throw err;
    }
  }));

  router.delete('/users/:id', asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id);

    try {
      await prisma.user.delete({ where: { id: userId } });
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
      throw err;
    }
  }));

  // Partner Management Endpoints
  router.post('/partners', asyncHandler(async (req, res) => {
    const bcrypt = require('bcrypt');
    const { name, email, phone, password, location, status } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const hash = await bcrypt.hash(password, 10);
      const partner = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          password: hash,
          role: 'partner',
          location: location || null,
          status: status || 'active'
        },
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          location: true, status: true, isPlusMember: true, createdAt: true
        }
      });

      res.status(201).json(partner);
    } catch (err) {
      if (err.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
      logger.error({ err: err.message }, 'Partner creation failed');
      res.status(500).json({ error: 'Partner creation failed' });
    }
  }));

  router.put('/partners/:id', asyncHandler(async (req, res) => {
    const { name, email, phone, location, status, isPlusMember } = req.body;
    const partnerId = parseInt(req.params.id);

    try {
      const partner = await prisma.user.update({
        where: { id: partnerId },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(phone && { phone }),
          ...(location !== undefined && { location }),
          ...(status && { status }),
          ...(isPlusMember !== undefined && { isPlusMember: isPlusMember ? 1 : 0 })
        },
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          location: true, status: true, isPlusMember: true, createdAt: true
        }
      });

      res.json(partner);
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Partner not found' });
      if (err.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
      throw err;
    }
  }));

  router.delete('/partners/:id', asyncHandler(async (req, res) => {
    const partnerId = parseInt(req.params.id);

    try {
      await prisma.user.delete({ where: { id: partnerId } });
      res.json({ success: true, message: 'Partner deleted successfully' });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Partner not found' });
      throw err;
    }
  }));

  return router;
};
