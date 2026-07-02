const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: config.logging.level,
  base: { service: 'lumina-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.jwtSecret',
    ],
    censor: '[REDACTED]',
  },
  transport: config.isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname,service',
        },
      },
});

module.exports = logger;
