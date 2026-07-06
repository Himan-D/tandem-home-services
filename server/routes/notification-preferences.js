const express = require('express');
const logger = require('../lib/logger');
const { authenticateToken } = require('../middleware/auth');

module.exports = function (prisma) {
  const router = express.Router();

  async function ensureTable() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        email_bookings INTEGER DEFAULT 1,
        email_promotions INTEGER DEFAULT 1,
        email_payouts INTEGER DEFAULT 1,
        email_chat INTEGER DEFAULT 1,
        sms_bookings INTEGER DEFAULT 1,
        sms_offers INTEGER DEFAULT 1,
        sms_payouts INTEGER DEFAULT 1,
        push_bookings INTEGER DEFAULT 1,
        push_chat INTEGER DEFAULT 1,
        push_reminders INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  async function getDefaultPrefs(userId) {
    await ensureTable();
    const existing = await prisma.$queryRawUnsafe(
      `SELECT * FROM notification_preferences WHERE user_id = $1`, userId
    );
    if (existing.length > 0) {
      const p = existing[0];
      return {
        email: { bookings: !!p.email_bookings, promotions: !!p.email_promotions, payouts: !!p.email_payouts, chat: !!p.email_chat },
        sms: { bookings: !!p.sms_bookings, offers: !!p.sms_offers, payouts: !!p.sms_payouts },
        push: { bookings: !!p.push_bookings, chat: !!p.push_chat, reminders: !!p.push_reminders },
      };
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO notification_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, userId
    );
    return { email: { bookings: true, promotions: true, payouts: true, chat: true }, sms: { bookings: true, offers: true, payouts: true }, push: { bookings: true, chat: true, reminders: true } };
  }

  router.get('/', authenticateToken, async (req, res) => {
    try {
      const prefs = await getDefaultPrefs(req.user.id);
      res.json(prefs);
    } catch (err) {
      logger.error({ err: err.message }, 'Get prefs failed');
      res.status(500).json({ error: 'Failed to load preferences' });
    }
  });

  router.put('/', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const userId = req.user.id;
      const { email, sms, push } = req.body;

      await prisma.$executeRawUnsafe(`
        INSERT INTO notification_preferences (user_id, email_bookings, email_promotions, email_payouts, email_chat, sms_bookings, sms_offers, sms_payouts, push_bookings, push_chat, push_reminders, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          email_bookings = COALESCE($2, notification_preferences.email_bookings),
          email_promotions = COALESCE($3, notification_preferences.email_promotions),
          email_payouts = COALESCE($4, notification_preferences.email_payouts),
          email_chat = COALESCE($5, notification_preferences.email_chat),
          sms_bookings = COALESCE($6, notification_preferences.sms_bookings),
          sms_offers = COALESCE($7, notification_preferences.sms_offers),
          sms_payouts = COALESCE($8, notification_preferences.sms_payouts),
          push_bookings = COALESCE($9, notification_preferences.push_bookings),
          push_chat = COALESCE($10, notification_preferences.push_chat),
          push_reminders = COALESCE($11, notification_preferences.push_reminders),
          updated_at = NOW()
      `,
        userId,
        email?.bookings ? 1 : 0, email?.promotions ? 1 : 0, email?.payouts ? 1 : 0, email?.chat ? 1 : 0,
        sms?.bookings ? 1 : 0, sms?.offers ? 1 : 0, sms?.payouts ? 1 : 0,
        push?.bookings ? 1 : 0, push?.chat ? 1 : 0, push?.reminders ? 1 : 0
      );

      res.json({ success: true, message: 'Preferences updated' });
    } catch (err) {
      logger.error({ err: err.message }, 'Update prefs failed');
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  return router;
};
