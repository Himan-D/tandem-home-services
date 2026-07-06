const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../lib/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const createServiceSchema = z.object({
  id: z.string().min(1).max(50).optional(),
  title: z.string().min(2).max(200),
  basePrice: z.number().positive(),
  category: z.string().min(1).max(50),
  isActive: z.number().int().min(0).max(1).optional().default(1),
});

const updateServiceSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  basePrice: z.number().positive().optional(),
  category: z.string().min(1).max(50).optional(),
  isActive: z.number().int().min(0).max(1).optional(),
});

module.exports = function (prisma) {
  const router = express.Router();

  router.get('/estimate', asyncHandler(async (req, res) => {
    const { serviceId, lat, lng } = req.query;
    if (!serviceId) return res.status(400).json({ error: 'serviceId required' });
    const service = await prisma.service.findUnique({ where: { id: String(serviceId) } });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    let priceZone = 1.0;
    if (lat && lng) {
      const areas = await prisma.$queryRawUnsafe(
        `SELECT price_zone FROM service_areas WHERE is_active = 1 AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326)) LIMIT 1`,
        parseFloat(lng), parseFloat(lat)
      );
      if (areas.length > 0) priceZone = areas[0].price_zone;
    }
    const base = service.basePrice;
    const estimated = Math.round(base * priceZone);
    res.json({
      serviceId: service.id,
      serviceTitle: service.title,
      basePrice: base,
      priceZone,
      estimatedPrice: estimated,
      rangeLow: estimated,
      rangeHigh: Math.round(estimated * 1.3),
      currency: 'USD',
    });
  }));

  router.get('/', asyncHandler(async (req, res) => {
    const { category, active } = req.query;
    const where = {};
    if (category) where.category = category;
    if (active !== undefined) where.isActive = active === 'true' ? 1 : 0;
    const services = await prisma.service.findMany({
      where,
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    });
    res.json(services);
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const service = await prisma.service.findUnique({ where: { id: String(req.params.id) } });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  }));

  router.get('/:id/reviews', asyncHandler(async (req, res) => {
    const serviceId = String(req.params.id);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const [reviews, agg] = await Promise.all([
      prisma.rating.findMany({
        where: { booking: { serviceId } },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.rating.aggregate({
        where: { booking: { serviceId } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    res.json({
      average: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : null,
      count: agg._count._all,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        review: r.review,
        customerName: r.customer?.name || 'Anonymous',
        createdAt: r.createdAt,
      })),
    });
  }));

  router.post('/', authenticateToken, requireRole('admin'), validate(createServiceSchema), asyncHandler(async (req, res) => {
    const { id, title, basePrice, category, isActive } = req.body;
    const serviceId = id || title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    try {
      const service = await prisma.service.create({
        data: { id: serviceId, title, basePrice, category, isActive },
      });
      res.status(201).json(service);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Service ID already exists' });
      logger.error({ err: err.message }, 'Create service failed');
      res.status(500).json({ error: 'Failed to create service' });
    }
  }));

  router.put('/:id', authenticateToken, requireRole('admin'), validate(updateServiceSchema), asyncHandler(async (req, res) => {
    const existing = await prisma.service.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Service not found' });

    const data = {};
    if (req.body.title !== undefined) data.title = req.body.title;
    if (req.body.basePrice !== undefined) data.basePrice = req.body.basePrice;
    if (req.body.category !== undefined) data.category = req.body.category;
    if (req.body.isActive !== undefined) data.isActive = req.body.isActive;
    if (Object.keys(data).length === 0) return res.json(existing);

    const service = await prisma.service.update({
      where: { id: String(req.params.id) },
      data,
    });
    res.json(service);
  }));

  router.delete('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    try {
      await prisma.service.delete({ where: { id: String(req.params.id) } });
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Service not found' });
      throw err;
    }
  }));

  return router;
};
