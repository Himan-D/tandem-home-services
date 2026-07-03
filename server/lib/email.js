const nodemailer = require('nodemailer');
const logger = require('./logger');
const config = require('../config');

let transporter = null;

function getTransport() {
  if (transporter) return transporter;
  if (config.email.host && config.email.user) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: { user: config.email.user, pass: config.email.pass },
    });
  } else {
    transporter = {
      sendMail: async (opts) => {
        logger.info({ to: opts.to, subject: opts.subject }, 'Email (dev transport — set SMTP env vars for real sending)');
        return { messageId: `dev-${Date.now()}` };
      },
    };
  }
  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  const transport = getTransport();
  return transport.sendMail({ from: config.email.from, to, subject, text, html });
}

module.exports = { sendEmail };
