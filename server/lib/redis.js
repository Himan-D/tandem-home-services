const Redis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

let pubClient = null;
let subClient = null;
let bullClient = null;

function createClient(role, opts = {}) {
  if (!config.redis.url) return null;
  const maxRetries = opts.hasOwnProperty('maxRetries')
    ? opts.maxRetries
    : config.redis.maxRetries;
  const client = new Redis(config.redis.url, {
    maxRetriesPerRequest: maxRetries,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    lazyConnect: true,
    name: `lumina-${role}`,
  });
  client.on('error', (err) => logger.error({ role, err: err.message }, 'Redis error'));
  client.on('connect', () => logger.info({ role }, 'Redis connected'));
  return client;
}

async function connect() {
  if (!config.redis.url) {
    logger.warn('REDIS_URL not set — running in single-process mode');
    return { pub: null, sub: null, bull: null };
  }

  pubClient = createClient('pub');
  subClient = createClient('sub');
  bullClient = createClient('bullmq', { maxRetries: null });

  try {
    await Promise.all([
      pubClient.connect(),
      subClient.connect(),
      bullClient.connect(),
    ]);
    logger.info('Redis clients connected (pub + sub + bullmq)');
  } catch (err) {
    logger.error({ err: err.message }, 'Redis connection failed — falling back to single-process');
    pubClient = null;
    subClient = null;
    bullClient = null;
  }

  return { pub: pubClient, sub: subClient, bull: bullClient };
}

function getPub() {
  return pubClient;
}

function getSub() {
  return subClient;
}

function getBull() {
  return bullClient;
}

module.exports = { connect, getPub, getSub, getBull, createClient };
