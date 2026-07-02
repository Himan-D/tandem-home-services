const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

module.exports = function (prisma, io) {
  const router = express.Router();

  router.get('/:bookingId/messages', authenticateToken, asyncHandler(async (req, res) => {
    const messages = await prisma.chatMessage.findMany({
      where: { bookingId: req.params.bookingId },
      include: { sender: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const mapped = messages.map((m) => ({
      id: m.id,
      bookingId: m.bookingId,
      senderId: m.senderId,
      senderName: m.sender?.name || 'Unknown',
      message: m.message,
      createdAt: m.createdAt,
    }));
    res.json(mapped);
  }));

  router.post('/:bookingId/messages', authenticateToken, asyncHandler(async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const msg = await prisma.chatMessage.create({
      data: {
        bookingId: req.params.bookingId,
        senderId: req.user.id,
        message,
      },
      include: { sender: { select: { name: true } } },
    });
    io.to(`booking:${req.params.bookingId}`).emit('chat:message', {
      id: msg.id,
      bookingId: msg.bookingId,
      senderId: msg.senderId,
      senderName: msg.sender?.name || 'Unknown',
      message: msg.message,
      createdAt: msg.createdAt,
    });
    res.status(201).json(msg);
  }));

  return router;
};
