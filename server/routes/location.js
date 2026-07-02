const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { validate, locationUpdateSchema } = require('../middleware/validate');
const geo = require('../lib/geo');
const bus = require('../event-bus');

module.exports = function (db, io, services) {
  const router = express.Router();
  const { onlinePartners } = services;

  router.post('/update', authenticateToken, validate(locationUpdateSchema), asyncHandler(async (req, res) => {
    const { lat, lng } = req.body;
    await db.execute('UPDATE users SET lat = ?, lng = ? WHERE id = ?', [lat, lng, req.user.id]);
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

    const partners = await db.query(`
      SELECT u.id, u.name, u.lat, u.lng, u.rating_avg, u.jobs_completed,
        ${geo.distanceSphereKmExpr(lat, lng, 'u.lat', 'u.lng')} as distance_km
      FROM users u
      WHERE u.role = 'partner'
        AND u.lat IS NOT NULL AND u.lng IS NOT NULL
        AND ${geo.dWithinExpr(lat, lng, 'u.lat', 'u.lng', radiusKm * 1000)}
      ORDER BY distance_km ASC
      LIMIT 50
    `);

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
