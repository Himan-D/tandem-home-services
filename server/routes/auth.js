const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { authLimiter, rateLimit } = require('../middleware/rateLimit');
const { validate, loginSchema, registerSchema } = require('../middleware/validate');
const {
  generateRefreshToken, hashToken, signAccessToken, signRefreshToken, verifyRefreshToken,
} = require('../middleware/authRefresh');

function signToken(user) {
  return signAccessToken(user);
}

async function persistRefreshToken(prisma, userId) {
  const rawToken = generateRefreshToken();
  const tokenHash = hashToken(rawToken);
  const family = `${userId}-${Date.now()}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId, tokenHash, family, expiresAt },
  });
  return { refreshToken: rawToken, expiresAt: expiresAt.toISOString() };
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = function (prisma, io, services) {
  const router = express.Router();
  const { notifyUser } = services;

  /**
   * @openapi
   * /api/auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Login with email and password
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string }
   *               password: { type: string }
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token: { type: string }
   *                 refreshToken: { type: string }
   *                 user: { type: object, properties: { id: { type: integer }, name: { type: string }, role: { type: string } } }
   *       400: { description: Invalid credentials }
   */
  router.post('/login', rateLimit(authLimiter), validate(loginSchema), asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid password' });
    }
    const token = signToken(user);
    const { refreshToken } = await persistRefreshToken(prisma, user.id);
    res.json({ token, refreshToken, user: { id: user.id, name: user.name, role: user.role } });
  }));

  /**
   * @openapi
   * /api/auth/register:
   *   post:
   *     tags: [Auth]
   *     summary: Register a new user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, email, password, role]
   *             properties:
   *               name: { type: string }
   *               email: { type: string }
   *               password: { type: string }
   *               role: { type: string, enum: [consumer, partner] }
   *     responses:
   *       201: { description: User registered }
   *       400: { description: Email already exists }
   */
  router.post('/register', rateLimit(authLimiter), validate(registerSchema), asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { name, email, password: hash, role },
        select: { id: true, name: true, role: true },
      });
      await notifyUser(user.id, 'email', 'Welcome to Lumina', 'Your account is ready.');
      const token = signToken(user);
      const { refreshToken } = await persistRefreshToken(prisma, user.id);
      res.status(201).json({ token, refreshToken, user });
    } catch {
      res.status(400).json({ error: 'Email already exists' });
    }
  }));

  router.post('/magic-link', rateLimit(authLimiter), asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'User not found' });
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60000);
    await prisma.authToken.create({
      data: { userId: user.id, token: otp, type: 'magic_link', expiresAt },
    });
    await notifyUser(user.id, 'email', 'Your Lumina Code', `Login code: ${otp}. Expires in 15 minutes.`);
    res.json({ success: true, message: 'Magic link sent' });
  }));

  router.post('/verify-magic-link', asyncHandler(async (req, res) => {
    const { email, token } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'User not found' });
    const authRecord = await prisma.authToken.findFirst({
      where: {
        userId: user.id,
        token,
        type: 'magic_link',
        used: 0,
        expiresAt: { gt: new Date() },
      },
    });
    if (!authRecord) return res.status(400).json({ error: 'Invalid or expired magic link' });
    await prisma.authToken.update({
      where: { id: authRecord.id },
      data: { used: 1 },
    });
    const { refreshToken } = await persistRefreshToken(prisma, user.id);
    res.json({ token: signToken(user), refreshToken, user: { id: user.id, name: user.name, role: user.role } });
  }));

  router.post('/forgot-password', rateLimit(authLimiter), asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'User not found' });
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60000);
    await prisma.authToken.create({
      data: { userId: user.id, token: otp, type: 'password_reset', expiresAt },
    });
    await notifyUser(user.id, 'sms', 'Password Reset', `Reset code: ${otp}`);
    res.json({ success: true, message: 'Reset code sent' });
  }));

  router.post('/reset-password', rateLimit(authLimiter), asyncHandler(async (req, res) => {
    const { email, token: resetToken, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'User not found' });
    const authRecord = await prisma.authToken.findFirst({
      where: {
        userId: user.id,
        token: resetToken,
        type: 'password_reset',
        used: 0,
        expiresAt: { gt: new Date() },
      },
    });
    if (!authRecord) return res.status(400).json({ error: 'Invalid or expired reset code' });
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash },
    });
    await prisma.authToken.update({
      where: { id: authRecord.id },
      data: { used: 1 },
    });
    await notifyUser(user.id, 'email', 'Password Changed', 'Your password was successfully reset.');
    res.json({ success: true, message: 'Password reset successful' });
  }));

  router.put('/me/password', authenticateToken, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true },
    });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ error: 'Current password incorrect' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hash },
    });
    await prisma.refreshToken.updateMany({
      where: { userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.json({ success: true, message: 'Password changed, all sessions invalidated' });
  }));

  /**
   * @openapi
   * /api/auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Rotate refresh token
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               refreshToken: { type: string }
   *     responses:
   *       200: { description: New access + refresh token pair issued }
   *       401: { description: Invalid or revoked refresh token }
   */
  router.post('/refresh', rateLimit(authLimiter), asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) return res.status(401).json({ error: 'Invalid refresh token' });

    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!stored) return res.status(401).json({ error: 'Refresh token revoked or expired' });

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, role: true },
    });
    if (!user) return res.status(401).json({ error: 'User not found' });

    const token = signToken(user);
    const newRefresh = await persistRefreshToken(prisma, user.id);
    res.json({ token, refreshToken: newRefresh.refreshToken });
  }));

  router.post('/revoke', authenticateToken, asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      });
    } else {
      await prisma.refreshToken.updateMany({
        where: { userId: req.user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    res.json({ success: true });
  }));

  router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
    await prisma.refreshToken.updateMany({
      where: { userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.json({ success: true });
  }));

  return router;
};
