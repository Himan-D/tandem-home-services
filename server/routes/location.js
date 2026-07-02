const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { validate, locationUpdateSchema } = require('../middleware/validate');
const bus = require('../event-bus');

module.exports = function (prisma, io, services) {
  const router = express.Router();
  const { onlinePartners } = services;

  router.post('/update', authenticateToken, validate(locationUpdateSchema), asyncHandler(async (req, res) => {
    const { lat, lng } = req.body;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { lat, lng },
    });
    bus.emit('location:update', { userId: req.user.id, lat, lng, source: 'http' });
    if (req.user.role === 'partner') {
      io.emit('partner:location_update', { partnerId: req.user.id, lat, lng, timestamp: Date.now() });
    }
    res.json({ success: true });
  }));

  router.get('/nearby-partners', authenticateToken, asyncHandler(async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = parseFloat(req.query.radius || '10');
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat and lng required' });

    const partners = await prisma.$queryRaw`
      SELECT u.id, u.name, u.lat, u.lng, u.rating_avg, u.jobs_completed,
        ST_DistanceSphere(ST_MakePoint(u.lng, u.lat), ST_MakePoint(${lng}, ${lat})) / 1000 as distance_km
      FROM users u
      WHERE u.role = 'partner'
        AND u.lat IS NOT NULL AND u.lng IS NOT NULL
        AND ST_DWithin(ST_MakePoint(u.lng, u.lat)::geography, ST_MakePoint(${lng}, ${lat})::geography, ${radiusKm * 1000})
      ORDER BY distance_km ASC
      LIMIT 50
    `;

    const enriched = partners.map((p) => ({
      ...p,
      online: onlinePartners.has(p.id),
    }));
    res.json(enriched);
  }));

  router.get('/history/:userId', authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { locationHistory } = services;
    const history = await locationHistory.getRecent(req.params.userId, 100);
    res.json(history);
  }));

  return router;
};
