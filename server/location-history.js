const bus = require('./event-bus');
const logger = require('./lib/logger');

const BATCH_INTERVAL_MS = 5000;
const MAX_BATCH_SIZE = 50;

class LocationHistory {
  constructor(prisma) {
    this.prisma = prisma;
    this.buffer = [];

    bus.on('location:update', (data) => {
      this.buffer.push(data);
      if (this.buffer.length >= MAX_BATCH_SIZE) {
        this.flush();
      }
    });

    this.timer = setInterval(() => this.flush(), BATCH_INTERVAL_MS);
  }

  async flush() {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0);

    try {
      await this.prisma.locationHistory.createMany({
        data: batch.map(row => ({
          userId: row.userId,
          lat: row.lat,
          lng: row.lng,
          source: row.source || 'gps',
        })),
      });
    } catch (err) {
      logger.error({ err: err.message, count: batch.length }, 'LocationHistory flush failed');
      this.buffer.unshift(...batch);
    }
  }

  getRecent(userId, limit = 10) {
    return this.prisma.locationHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  getLatestPerUser() {
    return this.prisma.$queryRaw`
      SELECT lh.* FROM location_history lh
      INNER JOIN (
        SELECT user_id, MAX(created_at) as max_ct
        FROM location_history GROUP BY user_id
      ) latest ON lh.user_id = latest.user_id AND lh.created_at = latest.max_ct
    `;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}

module.exports = LocationHistory;
