const EventEmitter = require('events');
const { getPub, getSub } = require('./lib/redis');
const logger = require('./lib/logger');

const CHANNEL = 'lumina:events';

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200);
    this._redisReady = false;

    const sub = getSub();
    if (sub) {
      sub.subscribe(CHANNEL, (err) => {
        if (err) {
          logger.error({ err: err.message }, 'EventBus subscribe failed');
          return;
        }
        this._redisReady = true;
        logger.info({ channel: CHANNEL }, 'EventBus subscribed to Redis');
      });

      sub.on('message', (channel, message) => {
        if (channel !== CHANNEL) return;
        try {
          const { event, args } = JSON.parse(message);
          super.emit(event, ...args);
        } catch (err) {
          logger.error({ err: err.message }, 'EventBus deserialization failed');
        }
      });
    }
  }

  emit(event, ...args) {
    super.emit(event, ...args);

    const pub = getPub();
    if (pub) {
      pub.publish(
        CHANNEL,
        JSON.stringify({ event, args })
      ).catch((err) => {
        logger.error({ err: err.message, event }, 'EventBus publish failed');
      });
    }
  }
}

const bus = new EventBus();

module.exports = bus;
