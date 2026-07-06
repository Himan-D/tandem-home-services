const express = require('express');
const crypto = require('crypto');
const logger = require('../lib/logger');
const { authenticateToken } = require('../middleware/auth');

module.exports = function (prisma) {
  const router = express.Router();

  async function ensureTable() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS referral_codes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        code TEXT NOT NULL UNIQUE,
        total_referred INTEGER DEFAULT 0,
        total_earned INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  function generateCode(name) {
    const prefix = (name || 'user').substring(0, 4).toUpperCase();
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}${suffix}`;
  }

  async function getOrCreateCode(userId, name) {
    const existing = await prisma.$queryRawUnsafe(
      `SELECT * FROM referral_codes WHERE user_id = $1`, userId
    );
    if (existing.length > 0) return existing[0];
    const code = generateCode(name);
    await prisma.$executeRawUnsafe(
      `INSERT INTO referral_codes (user_id, code) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING`,
      userId, code
    );
    const row = await prisma.$queryRawUnsafe(`SELECT * FROM referral_codes WHERE user_id = $1`, userId);
    return row.length > 0 ? row[0] : { code };
  }

  router.get('/my-code', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const rc = await getOrCreateCode(req.user.id, req.user.name);
      const count = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM referral_codes WHERE referred_by_code = $1`, rc.code
      );
      res.json({ code: rc.code, totalReferred: Number(count[0]?.count || 0) + (rc.total_referred || 0), totalEarned: rc.total_earned || 0 });
    } catch (err) {
      logger.error({ err: err.message }, 'Referral code fetch failed');
      res.status(500).json({ error: 'Failed to get referral code' });
    }
  });

  router.post('/claim', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Referral code required' });

      const rc = await prisma.$queryRawUnsafe(
        `SELECT * FROM referral_codes WHERE code = $1`, code.toUpperCase()
      );
      if (rc.length === 0) return res.status(400).json({ error: 'Invalid referral code' });
      if (rc[0].user_id === req.user.id) return res.status(400).json({ error: 'Cannot use your own code' });

      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { referredByCode: true, walletBalance: true } });
      if (user.referredByCode) return res.status(400).json({ error: 'Already used a referral code' });

      const reward = 500;
      await prisma.user.update({ where: { id: req.user.id }, data: { referredByCode: code.toUpperCase(), walletBalance: { increment: reward } } });
      await prisma.user.update({ where: { id: rc[0].user_id }, data: { walletBalance: { increment: reward } } });
      await prisma.$executeRawUnsafe(
        `UPDATE referral_codes SET total_referred = total_referred + 1, total_earned = total_earned + $1 WHERE user_id = $2`,
        reward, rc[0].user_id
      );

      res.json({ success: true, reward, message: `$${(reward / 100).toFixed(2)} credited to your wallet!` });
    } catch (err) {
      logger.error({ err: err.message }, 'Referral claim failed');
      res.status(500).json({ error: 'Failed to claim referral' });
    }
  });

  return router;
};
