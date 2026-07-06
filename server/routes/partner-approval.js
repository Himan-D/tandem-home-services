const express = require('express');
const logger = require('../lib/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

module.exports = function (prisma, io, sharedServices) {
  const router = express.Router();
  const { notifyUser } = sharedServices || {};

  async function ensureColumns() {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'application_status') THEN
          ALTER TABLE users ADD COLUMN application_status TEXT DEFAULT 'approved' CHECK (application_status IN ('pending', 'approved', 'rejected'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'application_note') THEN
          ALTER TABLE users ADD COLUMN application_note TEXT;
        END IF;
      END $$;
    `);
  }

  async function record(prismaClient, userId, userName, action, entityType, entityId, details) {
    try {
      await prismaClient.$executeRawUnsafe(
        `INSERT INTO audit_logs (admin_id, admin_name, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6)`,
        userId, userName || 'Admin', action, entityType, entityId ? String(entityId) : null, details || null
      );
    } catch {}
  }

  router.get('/applications', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      await ensureColumns();
      const rows = await prisma.$queryRawUnsafe(`
        SELECT id, name, email, phone, location, lat, lng, application_status, application_note, created_at
        FROM users WHERE role = 'partner' ORDER BY created_at DESC
      `);
      res.json(rows);
    } catch (err) {
      logger.error({ err: err.message }, 'Applications fetch failed');
      res.status(500).json({ error: 'Failed to load applications' });
    }
  });

  router.patch('/applications/:userId/status', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      await ensureColumns();
      const { userId } = req.params;
      const { status, note } = req.body;
      if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

      const user = await prisma.user.findUnique({ where: { id: Number(userId) }, select: { name: true } });
      await prisma.$executeRawUnsafe(
        `UPDATE users SET application_status = $1, application_note = $2 WHERE id = $3`,
        status, note || null, Number(userId)
      );
      await record(prisma, req.user.id, req.user.name, `partner_${status}`, 'user', userId, note || null);

      if (notifyUser) {
        await notifyUser(Number(userId), 'email', `Application ${status}`,
          status === 'approved'
            ? 'Congratulations! Your partner application has been approved. You can now start accepting jobs.'
            : `Your partner application has been reviewed. Note: ${note || 'No reason provided.'}`);
      }

      res.json({ success: true });
    } catch (err) {
      logger.error({ err: err.message }, 'Application status update failed');
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  router.patch('/register-with-review', async (req, res) => {
    try {
      await ensureColumns();
      const { name, email, password, phone, location } = req.body;
      const { registerUser } = require('./auth');
      const bcrypt = require('bcryptjs');
      const hashed = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: { name, email, password: hashed, role: 'partner', phone, location, application_status: 'pending', walletBalance: 0 },
      });
      res.status(201).json({ success: true, message: 'Application submitted for review' });
    } catch (err) {
      logger.error({ err: err.message }, 'Partner register with review failed');
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  return router;
};
