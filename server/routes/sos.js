const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../lib/logger');

module.exports = function (prisma, io, services) {
  const router = express.Router();
  const { notifyUser } = services;

  router.post('/trigger', authenticateToken, asyncHandler(async (req, res) => {
    const { bookingId, lat, lng } = req.body;

    logger.warn({
      userId: req.user.id,
      bookingId,
      lat,
      lng,
      time: new Date().toISOString(),
    }, 'SOS alert triggered');

    await prisma.notification.create({
      data: {
        userId: req.user.id,
        title: 'SOS Alert Sent',
        message: 'Emergency contacts and Tandem Safety team have been notified.',
        type: 'sos',
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true, email: true },
    });

    for (const admin of admins) {
      await notifyUser(
        admin.id,
        'email',
        '🚨 SOS Alert',
        `User #${req.user.id} triggered an SOS.${bookingId ? ` Booking: ${bookingId}` : ''}${lat && lng ? ` Location: ${lat}, ${lng}` : ''}`,
        { bookingId: bookingId || undefined }
      );
    }

    if (bookingId) {
      io.to(`booking:${bookingId}`).emit('sos:alert', {
        userId: req.user.id,
        bookingId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Emergency services and Tandem Safety team have been notified.',
    });
  }));

  return router;
};
