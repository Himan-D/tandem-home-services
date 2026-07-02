const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const { getPub } = require('../lib/redis');
const config = require('../config');

function createLimiter(key, points, durationSec) {
  const redisClient = getPub();
  const opts = {
    keyPrefix: key,
    points,
    duration: durationSec,
  };
  return redisClient
    ? new RateLimiterRedis({ ...opts, storeClient: redisClient })
    : new RateLimiterMemory(opts);
}

const authLimiter = createLimiter('auth', config.rateLimit.authPerMin, 60);
const apiLimiter = createLimiter('api', config.rateLimit.apiPerMin, 60);
const orderLimiter = createLimiter('order', config.rateLimit.orderPerMin, 60);

function rateLimit(limiter) {
  return async (req, res, next) => {
    try {
      const key = req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
      await limiter.consume(key);
      next();
    } catch (err) {
      res.set('Retry-After', Math.ceil((err.msBeforeNext || 1000) / 1000) || 1);
      res.status(429).json({ error: 'Too many requests' });
    }
  };
}

module.exports = { authLimiter, apiLimiter, orderLimiter, rateLimit };
