const logger = require('../lib/logger');

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    logger.error({ err: err.message, stack: err.stack, path: req.path }, 'Unhandled error');
  } else {
    logger.warn({ err: err.message, path: req.path }, 'Client error');
  }
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
  });
}

module.exports = { asyncHandler, notFound, errorHandler };
