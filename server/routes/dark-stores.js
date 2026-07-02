const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../lib/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const createStoreSchema = z.object({
  name: z.string().min(2).max(200),
  location: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  isActive: z.number().int().min(0).max(1).optional().default(1),
});

const updateStoreSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  location: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  isActive: z.number().int().min(0).max(1).optional(),
});

const upsertInventorySchema = z.object({
  serviceId: z.string().min(1),
  quantity: z.number().int().min(0),
  minThreshold: z.number().int().min(0).optional(),
});

module.exports = function (prisma) {
  const router = express.Router();

  router.get('/', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const stores = await prisma.$queryRaw`
      SELECT ds.*,
        (SELECT COUNT(*) FROM inventory i WHERE i.dark_store_id = ds.id AND i.quantity > 0) as active_skus,
        (SELECT COALESCE(SUM(quantity), 0) FROM inventory i WHERE i.dark_store_id = ds.id) as total_stock
      FROM dark_stores ds ORDER BY ds.created_at DESC
    `;
    res.json(stores);
  }));

  router.get('/nearby', authenticateToken, asyncHandler(async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = parseFloat(req.query.radius || '10');
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat and lng required' });

    const stores = await prisma.$queryRaw`
      SELECT ds.id, ds.name, ds.location, ds.lat, ds.lng,
        ST_DistanceSphere(ST_MakePoint(ds.lng, ds.lat), ST_MakePoint(${lng}, ${lat})) / 1000 as distance_km,
        (SELECT COUNT(*) FROM inventory i WHERE i.dark_store_id = ds.id AND i.quantity > 0) as active_skus
      FROM dark_stores ds
      WHERE ds.is_active = 1
        AND ST_DWithin(ST_MakePoint(ds.lng, ds.lat)::geography, ST_MakePoint(${lng}, ${lat})::geography, ${radiusKm * 1000})
      ORDER BY distance_km ASC
    `;
    res.json(stores);
  }));

  router.get('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const store = await prisma.darkStore.findUnique({ where: { id } });
    if (!store) return res.status(404).json({ error: 'Dark store not found' });
    const totalStock = await prisma.inventory.aggregate({
      _sum: { quantity: true },
      where: { darkStoreId: id },
    });
    res.json({ ...store, total_stock: totalStock._sum.quantity || 0 });
  }));

  router.post('/', authenticateToken, requireRole('admin'), validate(createStoreSchema), asyncHandler(async (req, res) => {
    const { name, location, lat, lng, isActive } = req.body;
    const store = await prisma.darkStore.create({
      data: { name, location, lat, lng, isActive },
    });
    res.status(201).json(store);
  }));

  router.put('/:id', authenticateToken, requireRole('admin'), validate(updateStoreSchema), asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await prisma.darkStore.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Dark store not found' });

    const data = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.location !== undefined) data.location = req.body.location;
    if (req.body.lat !== undefined) data.lat = req.body.lat;
    if (req.body.lng !== undefined) data.lng = req.body.lng;
    if (req.body.isActive !== undefined) data.isActive = req.body.isActive;
    if (Object.keys(data).length === 0) return res.json(existing);

    const store = await prisma.darkStore.update({ where: { id }, data });
    res.json(store);
  }));

  router.delete('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    try {
      await prisma.darkStore.delete({ where: { id: parseInt(req.params.id) } });
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Dark store not found' });
      throw err;
    }
  }));

  router.get('/:id/inventory', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const items = await prisma.$queryRaw`
      SELECT i.*, s.title as service_title, s.category
      FROM inventory i JOIN services s ON i.service_id = s.id
      WHERE i.dark_store_id = ${parseInt(req.params.id)}
      ORDER BY s.category, s.title
    `;
    res.json(items);
  }));

  router.put('/:id/inventory', authenticateToken, requireRole('admin'), validate(upsertInventorySchema), asyncHandler(async (req, res) => {
    const darkStoreId = parseInt(req.params.id);
    const { serviceId, quantity, minThreshold } = req.body;
    const result = await prisma.inventory.upsert({
      where: {
        darkStoreId_serviceId: { darkStoreId, serviceId },
      },
      update: {
        quantity,
        minThreshold: minThreshold || 5,
        updatedAt: new Date(),
      },
      create: {
        darkStoreId,
        serviceId,
        quantity,
        minThreshold: minThreshold || 5,
      },
    });
    res.json(result);
  }));

  router.get('/:id/inventory/low', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const items = await prisma.$queryRaw`
      SELECT i.*, s.title as service_title
      FROM inventory i JOIN services s ON i.service_id = s.id
      WHERE i.dark_store_id = ${parseInt(req.params.id)} AND i.quantity <= i.min_threshold
      ORDER BY i.quantity ASC
    `;
    res.json(items);
  }));

  return router;
};
