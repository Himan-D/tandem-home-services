const express = require('express');
const logger = require('../lib/logger');
const { authenticateToken } = require('../middleware/auth');

module.exports = function (prisma) {
  const router = express.Router();

  async function ensureTable() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS booking_tips (
        id SERIAL PRIMARY KEY,
        booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        partner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  router.post('/', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const { bookingId, amount } = req.body;
      if (!bookingId || !amount || amount < 1) return res.status(400).json({ error: 'bookingId and amount required' });

      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, customerId: req.user.id, status: 'completed' },
      });
      if (!booking) return res.status(404).json({ error: 'Completed booking not found' });
      if (!booking.partnerId) return res.status(400).json({ error: 'No partner assigned' });

      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { walletBalance: true } });
      if (Number(user.walletBalance) < Number(amount)) return res.status(400).json({ error: 'Insufficient wallet balance' });

      await prisma.user.update({ where: { id: req.user.id }, data: { walletBalance: { decrement: Number(amount) } } });
      await prisma.user.update({ where: { id: booking.partnerId }, data: { walletBalance: { increment: Number(amount) } } });
      await prisma.$executeRawUnsafe(
        `INSERT INTO booking_tips (booking_id, customer_id, partner_id, amount) VALUES ($1, $2, $3, $4)`,
        bookingId, req.user.id, booking.partnerId, Number(amount)
      );

      res.status(201).json({ success: true, amount: Number(amount) });
    } catch (err) {
      logger.error({ err: err.message }, 'Tip failed');
      res.status(500).json({ error: 'Failed to send tip' });
    }
  });

  router.get('/total', authenticateToken, async (req, res) => {
    try {
      await ensureTable();
      const rows = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(amount), 0) as total_tips FROM booking_tips WHERE partner_id = $1`,
        req.user.id
      );
      res.json({ totalTips: Number(rows[0]?.total_tips || 0) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load tips' });
    }
  });

  return router;
};
