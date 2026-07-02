const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { authLimiter, rateLimit } = require('../middleware/rateLimit');
const { validate, loginSchema, registerSchema } = require('../middleware/validate');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiry }
  );
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = function (db, io, services) {
  const router = express.Router();
  const { notifyUser } = services;

  router.post('/login', rateLimit(authLimiter), validate(loginSchema), asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid password' });
    }
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  }));

  router.post('/register', rateLimit(authLimiter), validate(registerSchema), asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
      const hash = await bcrypt.hash(password, 10);
      const result = await db.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?) RETURNING id, name, role',
        [name, email, hash, role]
      );
      const user = result.rows[0];
      await notifyUser(user.id, 'email', 'Welcome to Lumina', 'Your account is ready.');
      const token = signToken(user);
      res.status(201).json({ token, user });
    } catch {
      res.status(400).json({ error: 'Email already exists' });
    }
  }));

  router.post('/magic-link', rateLimit(authLimiter), asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ error: 'User not found' });
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
    await db.execute(
      'INSERT INTO auth_tokens (user_id, token, type, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, otp, 'magic_link', expiresAt]
    );
    await notifyUser(user.id, 'email', 'Your Lumina Code', `Login code: ${otp}. Expires in 15 minutes.`);
    res.json({ success: true, message: 'Magic link sent' });
  }));

  router.post('/verify-magic-link', asyncHandler(async (req, res) => {
    const { email, token } = req.body;
    const user = await db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ error: 'User not found' });
    const authRecord = await db.queryOne(
      `SELECT * FROM auth_tokens WHERE user_id = ? AND token = ? AND type = ? AND used = 0 AND expires_at > NOW()`,
      [user.id, token, 'magic_link']
    );
    if (!authRecord) return res.status(400).json({ error: 'Invalid or expired magic link' });
    await db.execute('UPDATE auth_tokens SET used = 1 WHERE id = ?', [authRecord.id]);
    res.json({ token: signToken(user), user: { id: user.id, name: user.name, role: user.role } });
  }));

  router.post('/forgot-password', rateLimit(authLimiter), asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ error: 'User not found' });
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
    await db.execute(
      'INSERT INTO auth_tokens (user_id, token, type, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, otp, 'password_reset', expiresAt]
    );
    await notifyUser(user.id, 'sms', 'Password Reset', `Reset code: ${otp}`);
    res.json({ success: true, message: 'Reset code sent' });
  }));

  router.post('/reset-password', rateLimit(authLimiter), asyncHandler(async (req, res) => {
    const { email, token: resetToken, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const user = await db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ error: 'User not found' });
    const authRecord = await db.queryOne(
      `SELECT * FROM auth_tokens WHERE user_id = ? AND token = ? AND type = ? AND used = 0 AND expires_at > NOW()`,
      [user.id, resetToken, 'password_reset']
    );
    if (!authRecord) return res.status(400).json({ error: 'Invalid or expired reset code' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hash, user.id]);
    await db.execute('UPDATE auth_tokens SET used = 1 WHERE id = ?', [authRecord.id]);
    await notifyUser(user.id, 'email', 'Password Changed', 'Your password was successfully reset.');
    res.json({ success: true, message: 'Password reset successful' });
  }));

  router.put('/me/password', authenticateToken, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const user = await db.queryOne('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ error: 'Current password incorrect' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ success: true });
  }));

  return router;
};
