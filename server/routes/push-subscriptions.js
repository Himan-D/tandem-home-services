const express = require('express');
const logger = require('../lib/logger');
const { authenticateToken } = require('../middleware/auth');

module.exports = function (prisma) {
  const router = express.Router();

  async function ensureTable() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, endpoint)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id)
    `);
  }

  router.post('/', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: 'Invalid subscription object' });
      }
      await prisma.$executeRawUnsafe(`
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, endpoint) DO UPDATE SET
          p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
      `, req.user.id, endpoint, keys.p256dh, keys.auth);
      res.json({ success: true });
    } catch (err) {
      logger.error({ err: err.message }, 'Save push subscription failed');
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  });

  router.delete('/', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const { endpoint } = req.body;
      if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });
      await prisma.$executeRawUnsafe(
        `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
        req.user.id, endpoint
      );
      res.json({ success: true });
    } catch (err) {
      logger.error({ err: err.message }, 'Delete push subscription failed');
      res.status(500).json({ error: 'Failed to delete subscription' });
    }
  });

  return router;
};
