const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
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

module.exports = function (db) {
  const router = express.Router();

  router.get('/', asyncHandler(async (req, res) => {
    const { category, active } = req.query;
    let sql = 'SELECT * FROM services WHERE 1=1';
    const params = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (active !== undefined) { sql += ' AND is_active = ?'; params.push(active === 'true' ? 1 : 0); }
    sql += ' ORDER BY category, title';
    const services = await db.query(sql, params);
    res.json(services);
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const service = await db.queryOne('SELECT * FROM services WHERE id = ?', [req.params.id]);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  }));

  router.post('/', authenticateToken, requireRole('admin'), validate(createServiceSchema), asyncHandler(async (req, res) => {
    const { id, title, basePrice, category, isActive } = req.body;
    const serviceId = id || title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    try {
      const result = await db.execute(
        'INSERT INTO services (id, title, base_price, category, is_active) VALUES (?, ?, ?, ?, ?) RETURNING *',
        [serviceId, title, basePrice, category, isActive]
      );
      res.status(201).json(result.rows[0]);
    } catch {
      res.status(409).json({ error: 'Service ID already exists' });
    }
  }));

  router.put('/:id', authenticateToken, requireRole('admin'), validate(updateServiceSchema), asyncHandler(async (req, res) => {
    const existing = await db.queryOne('SELECT * FROM services WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Service not found' });

    const sets = [];
    const params = [];
    if (req.body.title !== undefined) { sets.push('title = ?'); params.push(req.body.title); }
    if (req.body.basePrice !== undefined) { sets.push('base_price = ?'); params.push(req.body.basePrice); }
    if (req.body.category !== undefined) { sets.push('category = ?'); params.push(req.body.category); }
    if (req.body.isActive !== undefined) { sets.push('is_active = ?'); params.push(req.body.isActive); }
    if (sets.length === 0) return res.json(existing);

    params.push(req.params.id);
    const result = await db.execute(
      `UPDATE services SET ${sets.join(', ')} WHERE id = ? RETURNING *`,
      params
    );
    res.json(result.rows[0]);
  }));

  router.delete('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const result = await db.execute('DELETE FROM services WHERE id = ? RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Service not found' });
    res.json({ success: true });
  }));

  return router;
};
