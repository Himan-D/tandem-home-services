const express = require('express');
const logger = require('../lib/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

module.exports = function (prisma) {
  const router = express.Router();

  async function ensureTable() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id),
        admin_name TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  async function record(adminId, adminName, action, entityType, entityId, details) {
    try {
      await ensureTable();
      await prisma.$executeRawUnsafe(
        `INSERT INTO audit_logs (admin_id, admin_name, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6)`,
        adminId, adminName || 'Admin', action, entityType, entityId ? String(entityId) : null, details || null
      );
    } catch (err) {
      logger.error({ err: err.message }, 'Audit record failed');
    }
  }

  router.post('/log', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { action, entityType, entityId, details } = req.body;
      await record(req.user.id, req.user.name, action, entityType, entityId, details);
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to log' });
    }
  });

  router.get('/logs', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      await ensureTable();
      const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200`
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load audit logs' });
    }
  });

  return { router, record };
};
