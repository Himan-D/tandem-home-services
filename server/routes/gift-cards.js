const express = require('express');
const crypto = require('crypto');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

function generateGiftCode() {
  const buf = crypto.randomBytes(6);
  const part1 = buf.readUInt16BE(0).toString(16).toUpperCase().padStart(4, '0');
  const part2 = buf.readUInt16BE(2).toString(16).toUpperCase().padStart(4, '0');
  const part3 = buf.readUInt16BE(4).toString(16).toUpperCase().padStart(4, '0');
  return `GIFT-${part1}-${part2}-${part3}`;
}

module.exports = function (prisma, io, services) {
  const router = express.Router();
  const { notifyUser } = services;

  router.get('/', authenticateToken, asyncHandler(async (req, res) => {
    const cards = await prisma.$queryRawUnsafe(
      `SELECT id, code, initial_balance, remaining_balance,
              recipient_email, recipient_name, message, status,
              expires_at, redeemed_at, created_at
       FROM gift_cards WHERE purchaser_id = $1 ORDER BY created_at DESC`,
      req.user.id
    );
    res.json(cards);
  }));

  router.get('/received', authenticateToken, asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true },
    });
    if (!user?.email) return res.json([]);
    const cards = await prisma.$queryRawUnsafe(
      `SELECT gc.id, gc.code, gc.initial_balance, gc.remaining_balance,
              gc.message, gc.status, gc.expires_at, gc.created_at,
              u.name AS purchaser_name
       FROM gift_cards gc
       JOIN users u ON u.id = gc.purchaser_id
       WHERE gc.recipient_email = $1 AND gc.status != 'cancelled'
       ORDER BY gc.created_at DESC`,
      user.email
    );
    res.json(cards);
  }));

  router.post('/check', authenticateToken, asyncHandler(async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Gift card code required' });

    const cards = await prisma.$queryRawUnsafe(
      `SELECT id, code, remaining_balance, status, expires_at FROM gift_cards WHERE code = $1`,
      code.toUpperCase()
    );
    if (cards.length === 0) return res.status(404).json({ error: 'Gift card not found' });

    const card = cards[0];
    if (card.status === 'expired' || new Date(card.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Gift card has expired' });
    }
    if (card.status === 'redeemed' || card.status === 'cancelled') {
      return res.status(400).json({ error: `Gift card is ${card.status}` });
    }
    if (card.remaining_balance <= 0) {
      return res.status(400).json({ error: 'Gift card has no remaining balance' });
    }

    res.json({
      id: card.id,
      code: card.code,
      remainingBalance: card.remaining_balance,
      status: card.status,
      expiresAt: card.expires_at,
    });
  }));

  router.post('/', authenticateToken, asyncHandler(async (req, res) => {
    const { amount, recipientEmail, recipientName, message } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (!recipientEmail) return res.status(400).json({ error: 'Recipient email required' });
    if (amount < 5) return res.status(400).json({ error: 'Minimum gift card amount is $5' });
    if (amount > 500) return res.status(400).json({ error: 'Maximum gift card amount is $500' });

    const code = generateGiftCode();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await prisma.$executeRawUnsafe(
      `INSERT INTO gift_cards (code, initial_balance, remaining_balance, purchaser_id, recipient_email, recipient_name, message, status, expires_at)
       VALUES ($1, $2, $2, $3, $4, $5, $6, 'active', $7)`,
      code, amount, req.user.id, recipientEmail, recipientName || null, message || null, expiresAt
    );

    const purchaser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true, email: true },
    });

    const recipient = await prisma.user.findFirst({
      where: { email: recipientEmail },
      select: { id: true, name: true },
    });
    if (recipient) {
      await notifyUser(recipient.id, 'email', 'Gift Card Received',
        `You received a $${amount} gift card from ${purchaser?.name || 'a friend'}! Code: ${code}`,
        {}
      );
    }

    await notifyUser(req.user.id, 'email', 'Gift Card Purchased',
      `Your $${amount} gift card for ${recipientEmail} has been purchased. Code: ${code}`,
      {}
    );

    res.status(201).json({
      code,
      initialBalance: amount,
      remainingBalance: amount,
      recipientEmail,
      recipientName: recipientName || null,
      message: message || null,
      expiresAt,
    });
  }));

  router.post('/redeem', authenticateToken, asyncHandler(async (req, res) => {
    const { code, bookingId, amount: redeemAmount } = req.body;
    if (!code || !bookingId || !redeemAmount) {
      return res.status(400).json({ error: 'code, bookingId, and amount required' });
    }

    const cards = await prisma.$queryRawUnsafe(
      `SELECT id, remaining_balance, status, expires_at FROM gift_cards WHERE code = $1`,
      code.toUpperCase()
    );
    if (cards.length === 0) return res.status(404).json({ error: 'Gift card not found' });

    const card = cards[0];
    if (card.status === 'expired' || new Date(card.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Gift card has expired' });
    }
    if (card.remaining_balance <= 0) {
      return res.status(400).json({ error: 'Gift card has no remaining balance' });
    }

    const deductAmount = Math.min(redeemAmount, card.remaining_balance);

    await prisma.$executeRawUnsafe(
      `INSERT INTO gift_card_redemptions (gift_card_id, booking_id, amount, redeemed_by)
       VALUES ($1, $2, $3, $4)`,
      card.id, bookingId, deductAmount, req.user.id
    );

    const newBalance = card.remaining_balance - deductAmount;
    const newStatus = newBalance <= 0 ? 'redeemed' : 'partially_redeemed';

    if (newStatus === 'redeemed') {
      await prisma.$executeRawUnsafe(
        `UPDATE gift_cards SET remaining_balance = $1, status = $2, redeemed_at = NOW() WHERE id = $3`,
        newBalance, newStatus, card.id
      );
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE gift_cards SET remaining_balance = $1, status = $2 WHERE id = $3`,
        newBalance, newStatus, card.id
      );
    }

    res.json({ success: true, deducted: deductAmount, remainingBalance: newBalance });
  }));

  return router;
};
