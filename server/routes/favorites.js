const express = require('express');
const logger = require('../lib/logger');
const { authenticateToken } = require('../middleware/auth');

module.exports = function (prisma) {
  const router = express.Router();

  async function ensureTable() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS favorite_pros (
        id SERIAL PRIMARY KEY,
        consumer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        partner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(consumer_id, partner_id)
      )
    `);
  }

  router.get('/', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const rows = await prisma.$queryRawUnsafe(`
        SELECT fp.*, u.name, u.rating_avg, u.jobs_completed, u.location, u.lat, u.lng
        FROM favorite_pros fp
        JOIN users u ON u.id = fp.partner_id
        WHERE fp.consumer_id = $1
        ORDER BY fp.created_at DESC
      `, req.user.id);
      res.json(rows);
    } catch (err) {
      logger.error({ err: err.message }, 'Favorites list failed');
      res.status(500).json({ error: 'Failed to load favorites' });
    }
  });

  router.post('/', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const { partnerId } = req.body;
      if (!partnerId) return res.status(400).json({ error: 'partnerId required' });
      await prisma.$executeRawUnsafe(
        `INSERT INTO favorite_pros (consumer_id, partner_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        req.user.id, Number(partnerId)
      );
      res.status(201).json({ success: true });
    } catch (err) {
      logger.error({ err: err.message }, 'Add favorite failed');
      res.status(500).json({ error: 'Failed to add favorite' });
    }
  });

  router.delete('/:partnerId', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      await prisma.$executeRawUnsafe(
        `DELETE FROM favorite_pros WHERE consumer_id = $1 AND partner_id = $2`,
        req.user.id, Number(req.params.partnerId)
      );
      res.json({ success: true });
    } catch (err) {
      logger.error({ err: err.message }, 'Remove favorite failed');
      res.status(500).json({ error: 'Failed to remove favorite' });
    }
  });

  router.get('/check/:partnerId', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id FROM favorite_pros WHERE consumer_id = $1 AND partner_id = $2`,
        req.user.id, Number(req.params.partnerId)
      );
      res.json({ isFavorite: rows.length > 0 });
    } catch (err) {
      res.status(500).json({ error: 'Check failed' });
    }
  });

  return router;
};
