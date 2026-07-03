const logger = require('./logger');
const config = require('../config');

async function sendSMS({ to, message }) {
  if (config.twilio.accountSid && config.twilio.authToken) {
    try {
      const twilio = require('twilio');
      const client = twilio(config.twilio.accountSid, config.twilio.authToken);
      const result = await client.messages.create({
        body: message,
        from: config.twilio.fromNumber,
        to,
      });
      logger.info({ sid: result.sid, to }, 'SMS sent via Twilio');
      return result;
    } catch (err) {
      logger.error({ err: err.message, to }, 'SMS send failed');
      throw err;
    }
  }
  logger.info({ to, message }, 'SMS (dev — set TWILIO_* env vars for real sending)');
  return { sid: `dev-${Date.now()}` };
}

module.exports = { sendSMS };
