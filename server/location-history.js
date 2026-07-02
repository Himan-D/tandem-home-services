const bus = require('./event-bus');
const logger = require('./lib/logger');

const BATCH_INTERVAL_MS = 5000;
const MAX_BATCH_SIZE = 50;

class LocationHistory {
  constructor(db) {
    this.db = db;
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
      await this.db.transaction(async (tx) => {
        for (const row of batch) {
          await tx.execute(
            'INSERT INTO location_history (user_id, lat, lng, source) VALUES (?, ?, ?, ?)',
            [row.userId, row.lat, row.lng, row.source || 'gps']
          );
        }
      });
    } catch (err) {
      logger.error({ err: err.message, count: batch.length }, 'LocationHistory flush failed');
      this.buffer.unshift(...batch);
    }
  }

  getRecent(userId, limit = 10) {
    return this.db.query(
      'SELECT * FROM location_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
  }

  getLatestPerUser() {
    return this.db.query(`
      SELECT lh.* FROM location_history lh
      INNER JOIN (
        SELECT user_id, MAX(created_at) as max_ct
        FROM location_history GROUP BY user_id
      ) latest ON lh.user_id = latest.user_id AND lh.created_at = latest.max_ct
    `);
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
