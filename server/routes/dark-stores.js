const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const geo = require('../lib/geo');

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

module.exports = function (db) {
  const router = express.Router();

  router.get('/', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const stores = await db.query(`
      SELECT ds.*,
        (SELECT COUNT(*) FROM inventory i WHERE i.dark_store_id = ds.id AND i.quantity > 0) as active_skus,
        (SELECT COALESCE(SUM(quantity), 0) FROM inventory i WHERE i.dark_store_id = ds.id) as total_stock
      FROM dark_stores ds ORDER BY ds.created_at DESC
    `);
    res.json(stores);
  }));

  router.get('/nearby', authenticateToken, asyncHandler(async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = parseFloat(req.query.radius || '10');
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat and lng required' });

    const stores = await db.query(`
      SELECT ds.id, ds.name, ds.location, ds.lat, ds.lng,
        ${geo.distanceSphereKmExpr(lat, lng, 'ds.lat', 'ds.lng')} as distance_km,
        (SELECT COUNT(*) FROM inventory i WHERE i.dark_store_id = ds.id AND i.quantity > 0) as active_skus
      FROM dark_stores ds
      WHERE ds.is_active = 1
        AND ${geo.dWithinExpr(lat, lng, 'ds.lat', 'ds.lng', radiusKm * 1000)}
      ORDER BY distance_km ASC
    `);
    res.json(stores);
  }));

  router.get('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const store = await db.queryOne(`
      SELECT ds.*,
        (SELECT COALESCE(SUM(quantity), 0) FROM inventory i WHERE i.dark_store_id = ds.id) as total_stock
      FROM dark_stores ds WHERE ds.id = ?
    `, [req.params.id]);
    if (!store) return res.status(404).json({ error: 'Dark store not found' });
    res.json(store);
  }));

  router.post('/', authenticateToken, requireRole('admin'), validate(createStoreSchema), asyncHandler(async (req, res) => {
    const { name, location, lat, lng, isActive } = req.body;
    const result = await db.execute(
      'INSERT INTO dark_stores (name, location, lat, lng, is_active) VALUES (?, ?, ?, ?, ?) RETURNING *',
      [name, location, lat, lng, isActive]
    );
    res.status(201).json(result.rows[0]);
  }));

  router.put('/:id', authenticateToken, requireRole('admin'), validate(updateStoreSchema), asyncHandler(async (req, res) => {
    const existing = await db.queryOne('SELECT * FROM dark_stores WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Dark store not found' });

    const sets = [];
    const params = [];
    if (req.body.name !== undefined) { sets.push('name = ?'); params.push(req.body.name); }
    if (req.body.location !== undefined) { sets.push('location = ?'); params.push(req.body.location); }
    if (req.body.lat !== undefined) { sets.push('lat = ?'); params.push(req.body.lat); }
    if (req.body.lng !== undefined) { sets.push('lng = ?'); params.push(req.body.lng); }
    if (req.body.isActive !== undefined) { sets.push('is_active = ?'); params.push(req.body.isActive); }
    if (sets.length === 0) return res.json(existing);

    params.push(req.params.id);
    const result = await db.execute(
      `UPDATE dark_stores SET ${sets.join(', ')} WHERE id = ? RETURNING *`,
      params
    );
    res.json(result.rows[0]);
  }));

  router.delete('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const result = await db.execute('DELETE FROM dark_stores WHERE id = ? RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Dark store not found' });
    res.json({ success: true });
  }));

  router.get('/:id/inventory', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const items = await db.query(`
      SELECT i.*, s.title as service_title, s.category
      FROM inventory i JOIN services s ON i.service_id = s.id
      WHERE i.dark_store_id = ?
      ORDER BY s.category, s.title
    `, [req.params.id]);
    res.json(items);
  }));

  router.put('/:id/inventory', authenticateToken, requireRole('admin'), validate(upsertInventorySchema), asyncHandler(async (req, res) => {
    const { serviceId, quantity, minThreshold } = req.body;
    const result = await db.execute(`
      INSERT INTO inventory (dark_store_id, service_id, quantity, min_threshold, updated_at)
      VALUES (?, ?, ?, ?, NOW())
      ON CONFLICT (dark_store_id, service_id)
      DO UPDATE SET quantity = EXCLUDED.quantity,
        min_threshold = COALESCE(EXCLUDED.min_threshold, inventory.min_threshold),
        updated_at = NOW()
      RETURNING *
    `, [req.params.id, serviceId, quantity, minThreshold || 5]);
    res.json(result.rows[0]);
  }));

  router.get('/:id/inventory/low', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const items = await db.query(`
      SELECT i.*, s.title as service_title
      FROM inventory i JOIN services s ON i.service_id = s.id
      WHERE i.dark_store_id = ? AND i.quantity <= i.min_threshold
      ORDER BY i.quantity ASC
    `, [req.params.id]);
    res.json(items);
  }));

  return router;
};
