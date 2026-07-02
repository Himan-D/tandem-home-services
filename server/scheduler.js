const cron = require('node-cron');
const logger = require('./lib/logger');

function setupScheduledTasks(db, services) {
  const { oms } = services;

  cron.schedule('*/15 * * * *', async () => {
    try {
      const stuck = await oms.getStuckOrders(30);
      if (stuck.length === 0) return;
      logger.info({ count: stuck.length }, 'Found stuck orders, marking as failed');
      for (const order of stuck) {
        try {
          await oms._transition(order.id, 'failed', { reason: 'Stuck in pending > 30 min' });
        } catch (err) {
          logger.error({ orderId: order.id, err: err.message }, 'Failed to mark stuck order');
        }
      }
    } catch (err) {
      logger.error({ err: err.message }, 'Stuck-order cleanup task failed');
    }
  });

  cron.schedule('0 * * * *', async () => {
    try {
      const lowStock = await db.query(`
        SELECT i.*, ds.name as store_name, s.title as service_title
        FROM inventory i
        JOIN dark_stores ds ON i.dark_store_id = ds.id
        JOIN services s ON i.service_id = s.id
        WHERE i.quantity <= i.min_threshold
      `);
      if (lowStock.length === 0) return;
      logger.warn({ count: lowStock.length, items: lowStock.slice(0, 10) }, 'Low stock detected');
    } catch (err) {
      logger.error({ err: err.message }, 'Low-stock check task failed');
    }
  });

  cron.schedule('0 2 * * *', async () => {
    try {
      const result = await db.execute('DELETE FROM auth_tokens WHERE expires_at < NOW()');
      logger.info({ deleted: result.rowCount }, 'Expired auth tokens cleaned up');
    } catch (err) {
      logger.error({ err: err.message }, 'Auth token cleanup failed');
    }
  });

  logger.info('Scheduled tasks registered (stuck-orders/15min, low-stock/hourly, token-cleanup/daily)');
}

module.exports = { setupScheduledTasks };
