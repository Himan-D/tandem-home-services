const express = require('express');
const logger = require('../lib/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

module.exports = function (prisma, io, sharedServices) {
  const router = express.Router();
  const { notifyUser } = sharedServices || {};

  async function ensureTable() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS payout_transactions (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        fee INTEGER DEFAULT 0,
        net_amount INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected', 'failed')),
        payment_method TEXT DEFAULT 'wallet',
        notes TEXT,
        requested_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  router.get('/earnings-summary', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const partnerId = req.user.id;
      const completed = await prisma.booking.findMany({
        where: { partnerId, status: 'completed' },
        select: { payout: true, createdAt: true, id: true, serviceTitle: true },
        orderBy: { createdAt: 'desc' },
      });

      const total = completed.reduce((sum, b) => sum + (b.payout || 0), 0);
      const paidRes = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(net_amount), 0) as paid FROM payout_transactions WHERE partner_id = $1 AND status = 'paid'`,
        partnerId
      );
      const paid = Number(paidRes[0]?.paid || 0);
      const pendingPayouts = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(net_amount), 0) as pending FROM payout_transactions WHERE partner_id = $1 AND status IN ('pending', 'approved')`,
        partnerId
      );
      const pendingAmount = Number(pendingPayouts[0]?.pending || 0);
      const available = total - paid - pendingAmount;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = completed
        .filter(b => new Date(b.createdAt) >= startOfMonth)
        .reduce((sum, b) => sum + (b.payout || 0), 0);

      res.json({ total, paid, pendingAmount, available, thisMonth, completedJobs: completed.length });
    } catch (err) {
      logger.error({ err: err.message }, 'Earnings summary failed');
      res.status(500).json({ error: 'Failed to load earnings summary' });
    }
  });

  router.get('/history', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM payout_transactions WHERE partner_id = $1 ORDER BY created_at DESC LIMIT 50`,
        req.user.id
      );
      res.json(rows);
    } catch (err) {
      logger.error({ err: err.message }, 'Payout history failed');
      res.status(500).json({ error: 'Failed to load payout history' });
    }
  });

  router.post('/request', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const partnerId = req.user.id;
      const { amount } = req.body;
      if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid amount' });

      const completed = await prisma.booking.findMany({
        where: { partnerId, status: 'completed' },
        select: { payout: true },
      });
      const total = completed.reduce((sum, b) => sum + (b.payout || 0), 0);
      const paidRes = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(net_amount), 0) as paid FROM payout_transactions WHERE partner_id = $1 AND status = 'paid'`,
        partnerId
      );
      const paid = Number(paidRes[0]?.paid || 0);
      const pendingPayouts = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(net_amount), 0) as pending FROM payout_transactions WHERE partner_id = $1 AND status IN ('pending', 'approved')`,
        partnerId
      );
      const pendingAmount = Number(pendingPayouts[0]?.pending || 0);
      const available = total - paid - pendingAmount;

      if (Number(amount) > available) {
        return res.status(400).json({ error: `Insufficient available balance.` });
      }

      const fee = Math.floor(Number(amount) * 0.02);
      const netAmount = Number(amount) - fee;

      await prisma.$executeRawUnsafe(
        `INSERT INTO payout_transactions (partner_id, amount, fee, net_amount, status) VALUES ($1, $2, $3, $4, 'pending')`,
        partnerId, Number(amount), fee, netAmount
      );

      if (notifyUser) {
        await notifyUser(partnerId, 'email', 'Payout Requested',
          `Your payout of $${(netAmount / 100).toFixed(2)} (fee: $${(fee / 100).toFixed(2)}) has been submitted.`);
      }

      res.status(201).json({ success: true, message: 'Payout requested', amount: Number(amount), fee, netAmount });
    } catch (err) {
      logger.error({ err: err.message }, 'Payout request failed');
      res.status(500).json({ error: 'Failed to request payout' });
    }
  });

  router.get('/admin/all', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      await ensureTable();
      const rows = await prisma.$queryRawUnsafe(`
        SELECT pt.*, u.name as partner_name, u.email as partner_email
        FROM payout_transactions pt
        JOIN users u ON u.id = pt.partner_id
        ORDER BY pt.created_at DESC LIMIT 100
      `);
      res.json(rows);
    } catch (err) {
      logger.error({ err: err.message }, 'Admin payouts failed');
      res.status(500).json({ error: 'Failed to load payouts' });
    }
  });

  router.patch('/admin/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      await ensureTable();
      const { id } = req.params;
      const { status, notes } = req.body;
      if (!['approved', 'paid', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      await prisma.$executeRawUnsafe(
        `UPDATE payout_transactions SET status = $1, notes = COALESCE($2, notes), processed_at = CASE WHEN $1 IN ('paid','rejected') THEN NOW() ELSE processed_at END WHERE id = $3`,
        status, notes || null, Number(id)
      );
      const tx = await prisma.$queryRawUnsafe(`SELECT partner_id, net_amount FROM payout_transactions WHERE id = $1`, Number(id));
      if (tx.length > 0 && notifyUser) {
        await notifyUser(tx[0].partner_id, 'email', `Payout ${status}`,
          `Your payout of $${(tx[0].net_amount / 100).toFixed(2)} has been ${status}.`);
      }
      res.json({ success: true });
    } catch (err) {
      logger.error({ err: err.message }, 'Admin payout update failed');
      res.status(500).json({ error: 'Failed to update payout' });
    }
  });

  return router;
};
