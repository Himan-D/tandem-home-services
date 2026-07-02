const logger = require('./lib/logger');
const { prisma } = require('./lib/prisma');

async function connect() {
  await prisma.$connect();
  const result = await prisma.$queryRaw`SELECT version()`;
  logger.info({ version: result[0].version.split(',')[0] }, 'Prisma connected');
}

async function close() {
  await prisma.$disconnect();
}

module.exports = { connect, close, prisma };
