const config = require('../config');
const db = require('../db');
const redis = require('../lib/redis');
const routing = require('../lib/routing');

async function checkDB() {
  try {
    await db.query('SELECT 1');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function checkRedis() {
  const client = redis.getPub();
  if (!client) return { ok: false, error: 'Redis not configured' };
  try {
    await client.ping();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function checkOSRM() {
  try {
    const available = await routing.isAvailable();
    return { ok: available, error: available ? undefined : 'OSRM unreachable' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function liveness(req, res) {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
}

async function readiness(req, res) {
  const [dbStatus, redisStatus, osrmStatus] = await Promise.all([
    checkDB(),
    checkRedis(),
    checkOSRM(),
  ]);

  const allOk = dbStatus.ok && redisStatus.ok && osrmStatus.ok;
  const statusCode = allOk ? 200 : 503;

  res.status(statusCode).json({
    status: allOk ? 'ok' : 'degraded',
    checks: {
      database: dbStatus,
      redis: redisStatus,
      osrm: osrmStatus,
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

module.exports = { liveness, readiness, checkDB, checkRedis, checkOSRM };
