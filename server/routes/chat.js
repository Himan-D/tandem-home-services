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

  // PUT /api/chat/messages/:id - Edit message
  router.put('/messages/:id', authenticateToken, asyncHandler(async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const existingMessage = await prisma.chatMessage.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!existingMessage) return res.status(404).json({ error: 'Message not found' });
    if (existingMessage.senderId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    // Check if message is within 5 minutes of creation
    const fiveMinutes = 5 * 60 * 1000;
    const messageAge = Date.now() - new Date(existingMessage.createdAt).getTime();
    if (messageAge > fiveMinutes) {
      return res.status(403).json({ error: 'Can only edit messages within 5 minutes of sending' });
    }

    const updatedMessage = await prisma.chatMessage.update({
      where: { id: parseInt(req.params.id) },
      data: { message },
      include: { sender: { select: { name: true } } },
    });

    io.to(`booking:${existingMessage.bookingId}`).emit('chat:message:edited', {
      id: updatedMessage.id,
      bookingId: updatedMessage.bookingId,
      senderId: updatedMessage.senderId,
      message: updatedMessage.message,
      createdAt: updatedMessage.createdAt,
    });

    res.json(updatedMessage);
  }));

  // DELETE /api/chat/messages/:id - Delete message
  router.delete('/messages/:id', authenticateToken, asyncHandler(async (req, res) => {
    const existingMessage = await prisma.chatMessage.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!existingMessage) return res.status(404).json({ error: 'Message not found' });
    if (existingMessage.senderId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    // Check if message is within 5 minutes of creation
    const fiveMinutes = 5 * 60 * 1000;
    const messageAge = Date.now() - new Date(existingMessage.createdAt).getTime();
    if (messageAge > fiveMinutes) {
      return res.status(403).json({ error: 'Can only delete messages within 5 minutes of sending' });
    }

    await prisma.chatMessage.delete({
      where: { id: parseInt(req.params.id) },
    });

    io.to(`booking:${existingMessage.bookingId}`).emit('chat:message:deleted', {
      id: parseInt(req.params.id),
      bookingId: existingMessage.bookingId,
    });

    res.status(204).send();
  }));

  return router;
};
