const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../lib/logger');

module.exports = function (db, io, services) {
  const router = express.Router();
  const { ml } = services;

  router.get('/', authenticateToken, asyncHandler(async (req, res) => {
    try {
      const interactions = await db.query('SELECT user_id, service_id, rating FROM user_interactions');
      const serviceIds = await db.query('SELECT id FROM services WHERE is_active = 1');
      const allIds = serviceIds.map((s) => s.id);

      if (interactions.length > 0) {
        await ml.train(interactions);
      }

      const recs = await ml.recommend(req.user.id, 6, allIds);
      const servicesData = await db.query('SELECT * FROM services WHERE is_active = 1');
      const enriched = recs
        .map((r) => {
          const svc = servicesData.find((s) => s.id === r.service_id);
          return svc ? { ...svc, score: r.score } : null;
        })
        .filter(Boolean);

      res.json(enriched.length > 0 ? enriched : servicesData.slice(0, 6));
    } catch (err) {
      logger.warn({ err: err.message }, 'Recommendation service unavailable');
      const fallback = await db.query('SELECT * FROM services WHERE is_active = 1 LIMIT 6');
      res.json(fallback);
    }
  }));

  return router;
};
