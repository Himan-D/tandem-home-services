const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const createPromoSchema = z.object({
  code: z.string().min(3).max(30).toUpperCase(),
  discountPercent: z.number().int().min(1).max(100),
  maxUses: z.number().int().min(1).max(100000),
  expiresAt: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

const updatePromoSchema = z.object({
  discountPercent: z.number().int().min(1).max(100).optional(),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().optional(),
  isActive: z.number().int().min(0).max(1).optional(),
});

module.exports = function (db) {
  const router = express.Router();

  router.get('/', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const promos = await db.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
    res.json(promos);
  }));

  router.post('/', authenticateToken, requireRole('admin'), validate(createPromoSchema), asyncHandler(async (req, res) => {
    const { code, discountPercent, maxUses, expiresAt } = req.body;
    try {
      const result = await db.execute(
        'INSERT INTO promo_codes (code, discount_percent, max_uses, expires_at, is_active) VALUES (?, ?, ?, ?, 1) RETURNING *',
        [code, discountPercent, maxUses, expiresAt || null]
      );
      res.status(201).json(result.rows[0]);
    } catch {
      res.status(409).json({ error: 'Promo code already exists' });
    }
  }));

  router.put('/:id', authenticateToken, requireRole('admin'), validate(updatePromoSchema), asyncHandler(async (req, res) => {
    const existing = await db.queryOne('SELECT * FROM promo_codes WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Promo not found' });

    const sets = [];
    const params = [];
    if (req.body.discountPercent !== undefined) { sets.push('discount_percent = ?'); params.push(req.body.discountPercent); }
    if (req.body.maxUses !== undefined) { sets.push('max_uses = ?'); params.push(req.body.maxUses); }
    if (req.body.expiresAt !== undefined) { sets.push('expires_at = ?'); params.push(req.body.expiresAt); }
    if (req.body.isActive !== undefined) { sets.push('is_active = ?'); params.push(req.body.isActive); }
    if (sets.length === 0) return res.json(existing);

    params.push(req.params.id);
    const result = await db.execute(
      `UPDATE promo_codes SET ${sets.join(', ')} WHERE id = ? RETURNING *`,
      params
    );
    res.json(result.rows[0]);
  }));

  router.delete('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const result = await db.execute('DELETE FROM promo_codes WHERE id = ? RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Promo not found' });
    res.json({ success: true });
  }));

  router.post('/validate', asyncHandler(async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });
    const promo = await db.queryOne(
      `SELECT * FROM promo_codes WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [code.toUpperCase()]
    );
    if (!promo) return res.status(400).json({ error: 'Invalid or expired promo code' });
    if (promo.used_count >= promo.max_uses) return res.status(400).json({ error: 'Promo code fully redeemed' });
    res.json({ valid: true, discountPercent: promo.discount_percent, code: promo.code });
  }));

  return router;
};
