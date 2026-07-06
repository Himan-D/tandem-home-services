const express = require('express');
const logger = require('../lib/logger');
const { authenticateToken } = require('../middleware/auth');

module.exports = function (prisma) {
  const router = express.Router();

  async function ensureTable() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS saved_addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        address TEXT NOT NULL,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        is_default INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  router.get('/', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, label, address, lat, lng, is_default FROM saved_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
        req.user.id
      );
      res.json(rows.map(r => ({ ...r, is_default: !!r.is_default })));
    } catch (err) {
      logger.error({ err: err.message }, 'Get addresses failed');
      res.status(500).json({ error: 'Failed to load addresses' });
    }
  });

  router.post('/', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const { label, address, lat, lng, isDefault } = req.body;
      if (!label || !address) return res.status(400).json({ error: 'Label and address required' });
      if (isDefault) {
        await prisma.$executeRawUnsafe(
          `UPDATE saved_addresses SET is_default = 0 WHERE user_id = $1`, req.user.id
        );
      }
      const result = await prisma.$executeRawUnsafe(
        `INSERT INTO saved_addresses (user_id, label, address, lat, lng, is_default) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        req.user.id, label, address, lat || null, lng || null, isDefault ? 1 : 0
      );
      res.status(201).json({ success: true, id: result[0]?.id });
    } catch (err) {
      logger.error({ err: err.message }, 'Create address failed');
      res.status(500).json({ error: 'Failed to save address' });
    }
  });

  router.put('/:id', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const { label, address, lat, lng, isDefault } = req.body;
      if (isDefault) {
        await prisma.$executeRawUnsafe(
          `UPDATE saved_addresses SET is_default = 0 WHERE user_id = $1`, req.user.id
        );
      }
      await prisma.$executeRawUnsafe(`
        UPDATE saved_addresses SET label = COALESCE($1, label), address = COALESCE($2, address), lat = COALESCE($3, lat), lng = COALESCE($4, lng), is_default = COALESCE($5, is_default) WHERE id = $6 AND user_id = $7
      `, label || null, address || null, lat ?? null, lng ?? null, isDefault !== undefined ? (isDefault ? 1 : 0) : null, parseInt(req.params.id), req.user.id);
      res.json({ success: true });
    } catch (err) {
      logger.error({ err: err.message }, 'Update address failed');
      res.status(500).json({ error: 'Failed to update address' });
    }
  });

  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      await prisma.$executeRawUnsafe(
        `DELETE FROM saved_addresses WHERE id = $1 AND user_id = $2`, parseInt(req.params.id), req.user.id
      );
      res.json({ success: true });
    } catch (err) {
      logger.error({ err: err.message }, 'Delete address failed');
      res.status(500).json({ error: 'Failed to delete address' });
    }
  });

  return router;
};
