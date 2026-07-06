const express = require('express');
const crypto = require('crypto');
const logger = require('../lib/logger');
const config = require('../config');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter, rateLimit } = require('../middleware/rateLimit');

module.exports = function (prisma, io, services) {
  const router = express.Router();
  const { notifyUser } = services;

  function generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  router.post('/send-email', authenticateToken, rateLimit(authLimiter), async (req, res) => {
    try {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.$executeRawUnsafe(`
        INSERT INTO verification_tokens (user_id, token, type, expires_at)
        VALUES ($1, $2, 'email', $3)
        ON CONFLICT (user_id, type) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, used = 0
      `, req.user.id, token, expiresAt);
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true, email: true } });
      if (user) {
        const verifyUrl = `${config.corsOrigin[0] || 'http://localhost:5173'}/verify-email?token=${token}`;
        await notifyUser(req.user.id, 'email', 'Verify Your Email', `Click to verify: ${verifyUrl}`);
      }
      res.json({ success: true, message: 'Verification email sent' });
    } catch (err) {
      logger.error({ err: err.message }, 'Send email verification failed');
      res.status(500).json({ error: 'Failed to send verification email' });
    }
  });

  router.post('/verify-email', async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: 'Token required' });
      const rows = await prisma.$queryRawUnsafe(
        `SELECT user_id FROM verification_tokens WHERE token = $1 AND type = 'email' AND used = 0 AND expires_at > NOW()`, token
      );
      if (rows.length === 0) return res.status(400).json({ error: 'Invalid or expired token' });
      await prisma.$executeRawUnsafe(`UPDATE verification_tokens SET used = 1 WHERE token = $1`, token);
      await prisma.$executeRawUnsafe(`UPDATE users SET email_verified = 1 WHERE id = $1`, rows[0].user_id);
      res.json({ success: true, message: 'Email verified' });
    } catch (err) {
      logger.error({ err: err.message }, 'Verify email failed');
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  router.post('/send-phone', authenticateToken, rateLimit(authLimiter), async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { phone: true } });
      if (!user?.phone) return res.status(400).json({ error: 'No phone number on file' });
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60000);
      await prisma.$executeRawUnsafe(`
        INSERT INTO verification_tokens (user_id, token, type, expires_at)
        VALUES ($1, $2, 'phone', $3)
        ON CONFLICT (user_id, type) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, used = 0
      `, req.user.id, code, expiresAt);
      const { sendSMS } = require('../lib/sms');
      await sendSMS({ to: user.phone, message: `Your Tandem verification code is: ${code}` });
      res.json({ success: true, message: 'Verification code sent' });
    } catch (err) {
      logger.error({ err: err.message }, 'Send phone verification failed');
      res.status(500).json({ error: 'Failed to send code' });
    }
  });

  router.post('/verify-phone', authenticateToken, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Code required' });
      const rows = await prisma.$queryRawUnsafe(
        `SELECT user_id FROM verification_tokens WHERE user_id = $1 AND token = $2 AND type = 'phone' AND used = 0 AND expires_at > NOW()`,
        req.user.id, code
      );
      if (rows.length === 0) return res.status(400).json({ error: 'Invalid or expired code' });
      await prisma.$executeRawUnsafe(`UPDATE verification_tokens SET used = 1 WHERE token = $1`, code);
      await prisma.$executeRawUnsafe(`UPDATE users SET phone_verified = 1 WHERE id = $1`, req.user.id);
      res.json({ success: true, message: 'Phone verified' });
    } catch (err) {
      logger.error({ err: err.message }, 'Verify phone failed');
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  router.get('/status', authenticateToken, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { email_verified: true, phone_verified: true, email: true, phone: true },
      });
      res.json({
        email: { address: user?.email, verified: !!user?.email_verified },
        phone: { number: user?.phone, verified: !!user?.phone_verified },
      });
    } catch (err) {
      logger.error({ err: err.message }, 'Verification status failed');
      res.status(500).json({ error: 'Failed' });
    }
  });

  return router;
};
