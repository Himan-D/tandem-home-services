const helmet = require('helmet');
const logger = require('../lib/logger');
const config = require('../config');

function setupSecurity(app) {
  app.use(helmet({
    contentSecurityPolicy: config.isProd ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
}

function auditLog(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400 || req.path.startsWith('/api/')) {
      logger.info({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        userId: req.user?.id,
        role: req.user?.role,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      }, 'audit');
    }
  });
  next();
}

function requestId(req, res, next) {
  req.reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('X-Request-Id', req.reqId);
  next();
}

module.exports = { setupSecurity, auditLog, requestId };
