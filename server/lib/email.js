const nodemailer = require('nodemailer');
const logger = require('./logger');
const config = require('../config');
const { prisma } = require('../db');

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

async function ensureLogTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        recipient TEXT NOT NULL,
        subject TEXT,
        status TEXT NOT NULL,
        error TEXT,
        message_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch {}
}

async function sendEmail({ to, subject, text, html }) {
  const transport = getTransport();
  let messageId = null;
  let status = 'sent';
  let error = null;
  try {
    const result = await transport.sendMail({ from: config.email.from, to, subject, text, html });
    messageId = result.messageId || `dev-${Date.now()}`;
  } catch (err) {
    status = 'failed';
    error = err.message;
    logger.error({ err: err.message, to, subject }, 'Email send failed');
  }
  ensureLogTable().then(() => {
    prisma.$executeRawUnsafe(
      `INSERT INTO email_logs (recipient, subject, status, error, message_id) VALUES ($1, $2, $3, $4, $5)`,
      to, subject, status, error, messageId
    ).catch(() => {});
  });
  return { messageId, status };
}

module.exports = { sendEmail };
