const express = require('express');
const crypto = require('crypto');
const logger = require('../lib/logger');
const { authenticateToken } = require('../middleware/auth');

module.exports = function (prisma) {
  const router = express.Router();

  async function ensureTable() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS email_unsubscribe_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      )
    `);
  }

  async function generateToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.$executeRawUnsafe(`
      INSERT INTO email_unsubscribe_tokens (user_id, token, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '1 year')
      ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, created_at = NOW()
    `, userId, token);
    return token;
  }

  async function getOrCreateToken(userId) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT token FROM email_unsubscribe_tokens WHERE user_id = $1 AND expires_at > NOW()`, userId
    );
    if (rows.length > 0) return rows[0].token;
    return generateToken(userId);
  }

  router.post('/token', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const token = await getOrCreateToken(req.user.id);
      res.json({ token, unsubscribeUrl: `${process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173'}/email/unsubscribe?token=${token}` });
    } catch (err) {
      logger.error({ err: err.message }, 'Generate unsubscribe token failed');
      res.status(500).json({ error: 'Failed' });
    }
  });

  router.get('/unsubscribe', async (req, res) => {
    try {
      await ensureTable();
      const { token } = req.query;
      if (!token) return res.status(400).send('Missing token');

      const rows = await prisma.$queryRawUnsafe(
        `SELECT user_id FROM email_unsubscribe_tokens WHERE token = $1 AND expires_at > NOW()`, token
      );
      if (rows.length === 0) return res.status(400).send('Invalid or expired token');

      const userId = rows[0].user_id;
      await prisma.$executeRawUnsafe(`
        INSERT INTO notification_preferences (user_id, email_bookings, email_promotions, email_payouts, email_chat, updated_at)
        VALUES ($1, 0, 0, 0, 0, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          email_bookings = 0, email_promotions = 0, email_payouts = 0, email_chat = 0, updated_at = NOW()
      `, userId);

      res.send(`
        <!DOCTYPE html>
        <html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f4f6f9">
        <div style="background:#fff;padding:2rem;border-radius:12px;text-align:center;max-width:400px">
          <h2 style="color:#05ac5f;margin:0 0 1rem">Unsubscribed</h2>
          <p style="color:#374151">You've been unsubscribed from all marketing emails. To manage specific preferences, log in to your account.</p>
        </div>
        </body></html>
      `);
    } catch (err) {
      logger.error({ err: err.message }, 'Unsubscribe failed');
      res.status(500).send('Failed to unsubscribe');
    }
  });

  return router;
};
