const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../lib/logger');
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

module.exports = function (prisma) {
  const router = express.Router();

  router.get('/', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const promos = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(promos);
  }));

  router.post('/', authenticateToken, requireRole('admin'), validate(createPromoSchema), asyncHandler(async (req, res) => {
    const { code, discountPercent, maxUses, expiresAt } = req.body;
    try {
      const promo = await prisma.promoCode.create({
        data: { code, discountPercent, maxUses, expiresAt: expiresAt ? new Date(expiresAt) : null, isActive: 1 },
      });
      res.status(201).json(promo);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Promo code already exists' });
      logger.error({ err: err.message }, 'Create promo failed');
      res.status(500).json({ error: 'Failed to create promo' });
    }
  }));

  router.put('/:id', authenticateToken, requireRole('admin'), validate(updatePromoSchema), asyncHandler(async (req, res) => {
    const existing = await prisma.promoCode.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Promo not found' });

    const data = {};
    if (req.body.discountPercent !== undefined) data.discountPercent = req.body.discountPercent;
    if (req.body.maxUses !== undefined) data.maxUses = req.body.maxUses;
    if (req.body.expiresAt !== undefined) data.expiresAt = new Date(req.body.expiresAt);
    if (req.body.isActive !== undefined) data.isActive = req.body.isActive;
    if (Object.keys(data).length === 0) return res.json(existing);

    const promo = await prisma.promoCode.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    res.json(promo);
  }));

  router.delete('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    try {
      await prisma.promoCode.delete({ where: { id: parseInt(req.params.id) } });
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'Promo not found' });
      throw err;
    }
  }));

  router.post('/validate', asyncHandler(async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });
    const promo = await prisma.promoCode.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: 1,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });
    if (!promo) return res.status(400).json({ error: 'Invalid or expired promo code' });
    if (promo.usedCount >= promo.maxUses) return res.status(400).json({ error: 'Promo code fully redeemed' });
    res.json({ valid: true, discountPercent: promo.discountPercent, code: promo.code });
  }));

  return router;
};
