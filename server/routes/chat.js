const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { validate, chatMessageSchema } = require('../middleware/validate');

module.exports = function (db, io) {
  const router = express.Router();

  router.get('/:bookingId', authenticateToken, asyncHandler(async (req, res) => {
    const messages = await db.query(`
      SELECT c.*, u.name as sender_name
      FROM chat_messages c JOIN users u ON c.sender_id = u.id
      WHERE c.booking_id = ? ORDER BY c.created_at ASC
    `, [req.params.bookingId]);
    res.json(messages);
  }));

  router.post('/:bookingId', authenticateToken, validate(chatMessageSchema), asyncHandler(async (req, res) => {
    const { message } = req.body;
    const result = await db.execute(
      'INSERT INTO chat_messages (booking_id, sender_id, message) VALUES (?, ?, ?) RETURNING *',
      [req.params.bookingId, req.user.id, message]
    );
    const msg = {
      ...result.rows[0],
      senderId: req.user.id,
      senderName: req.user.name,
      createdAt: new Date().toISOString(),
    };
    io.to(`booking:${req.params.bookingId}`).emit('chat:message', msg);
    res.status(201).json(msg);
  }));

  return router;
};
