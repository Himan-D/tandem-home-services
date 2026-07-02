const { createAdapter } = require('@socket.io/redis-adapter');
const { getPub, getSub } = require('../lib/redis');
const logger = require('../lib/logger');

function setupAdapter(io) {
  const pub = getPub();
  const sub = getSub();
  if (pub && sub) {
    io.adapter(createAdapter(pub, sub));
    logger.info('Socket.IO Redis adapter active');
  } else {
    logger.warn('Socket.IO running without Redis adapter (single-instance only)');
  }
}

module.exports = { setupAdapter };
