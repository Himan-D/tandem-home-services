const express = require('express');
const logger = require('../lib/logger');
const { authenticateToken } = require('../middleware/auth');

module.exports = function (prisma) {
  const router = express.Router();

  router.get('/', authenticateToken, async (req, res) => {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
      const offset = (page - 1) * limit;
      const type = req.query.type;
      const where = ['user_id = $1'];
      const params = [req.user.id];
      if (type) { where.push('type = $' + (params.length + 1)); params.push(type); }
      const whereClause = where.join(' AND ');

      const countResult = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as cnt FROM notifications WHERE ${whereClause}`, ...params
      );
      const total = Number(countResult[0]?.cnt || 0);

      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, title, message, type, read, created_at FROM notifications WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        ...params, limit, offset
      );

      res.json({
        notifications: rows.map(r => ({ ...r, read: !!r.read })),
        total,
        page,
        pages: Math.ceil(total / limit),
      });
    } catch (err) {
      logger.error({ err: err.message }, 'Get notifications failed');
      res.status(500).json({ error: 'Failed to load notifications' });
    }
  });

  router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
      const result = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as cnt FROM notifications WHERE user_id = $1 AND read = 0`, req.user.id
      );
      res.json({ count: Number(result[0]?.cnt || 0) });
    } catch (err) {
      logger.error({ err: err.message }, 'Unread count failed');
      res.status(500).json({ error: 'Failed' });
    }
  });

  router.patch('/:id/read', authenticateToken, async (req, res) => {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE notifications SET read = 1 WHERE id = $1 AND user_id = $2`,
        parseInt(req.params.id, 10), req.user.id
      );
      res.json({ success: true });
    } catch (err) {
      logger.error({ err: err.message }, 'Mark read failed');
      res.status(500).json({ error: 'Failed' });
    }
  });

  router.post('/read-all', authenticateToken, async (req, res) => {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE notifications SET read = 1 WHERE user_id = $1 AND read = 0`, req.user.id
      );
      res.json({ success: true });
    } catch (err) {
      logger.error({ err: err.message }, 'Mark all read failed');
      res.status(500).json({ error: 'Failed' });
    }
  });

  return router;
};
