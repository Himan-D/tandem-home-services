const crypto = require('crypto');
const { Queue, Worker } = require('bullmq');
const config = require('./config');
const logger = require('./lib/logger');
const geo = require('./lib/geo');
const bus = require('./event-bus');
const { createClient } = require('./lib/redis');

const STATES = {
  PENDING: 'pending',
  INVENTORY_VALIDATED: 'inventory_validated',
  RIDER_ASSIGNED: 'rider_assigned',
  ARRIVED: 'arrived',
  SERVICE_STARTED: 'service_started',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

const VALID_TRANSITIONS = {
  [STATES.PENDING]: [STATES.INVENTORY_VALIDATED, STATES.FAILED, STATES.CANCELLED],
  [STATES.INVENTORY_VALIDATED]: [STATES.RIDER_ASSIGNED, STATES.FAILED, STATES.CANCELLED],
  [STATES.RIDER_ASSIGNED]: [STATES.ARRIVED, STATES.PICKED_UP, STATES.FAILED, STATES.CANCELLED],
  [STATES.ARRIVED]: [STATES.SERVICE_STARTED, STATES.PICKED_UP, STATES.FAILED, STATES.CANCELLED],
  [STATES.SERVICE_STARTED]: [STATES.COMPLETED, STATES.FAILED, STATES.CANCELLED],
  [STATES.PICKED_UP]: [STATES.IN_TRANSIT, STATES.ARRIVED, STATES.FAILED],
  [STATES.IN_TRANSIT]: [STATES.ARRIVED, STATES.DELIVERED, STATES.FAILED],
  [STATES.DELIVERED]: [STATES.COMPLETED, STATES.FAILED],
  [STATES.FAILED]: [STATES.PENDING],
  [STATES.CANCELLED]: [],
};

class OrderManagementSystem {
  constructor(db, io, redisConnection) {
    this.db = db;
    this.io = io;
    this.locks = new Map();
    this.riderAssignment = null;

    if (redisConnection) {
      this.orderQueue = new Queue('order-processing', {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      });
      this.dispatchQueue = new Queue('rider-dispatch', {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      });
      this._setupWorkers(redisConnection);
      logger.info('OMS initialized with BullMQ queues');
    } else {
      this.orderQueue = null;
      this.dispatchQueue = null;
      logger.warn('OMS initialized without Redis — synchronous processing only');
    }
  }

  setRiderAssignment(ra) {
    this.riderAssignment = ra;
  }

  _setupWorkers(connection) {
    const inventoryWorker = new Worker(
      'order-processing',
      async (job) => {
        const { orderId } = job.data;
        const order = await this.db.queryOne(
          'SELECT id, service_id, lat, lng, status FROM order_state_machine WHERE id = ?',
          [orderId]
        );
        if (!order || order.status !== STATES.PENDING) return { skipped: true };

        const store = await this._findNearestStore(order.service_id, order.lat, order.lng);
        if (!store) {
          await this._transition(orderId, STATES.FAILED, { reason: 'No dark store available' });
          return { status: 'failed', reason: 'No store' };
        }

        const reserved = await this._reserveInventory(orderId, store.id, order.service_id);
        if (!reserved) {
          await this._transition(orderId, STATES.FAILED, { reason: 'Out of stock' });
          return { status: 'failed', reason: 'Out of stock' };
        }

        await this._transition(orderId, STATES.INVENTORY_VALIDATED, { darkStoreId: store.id });
        return { status: 'inventory_validated', storeId: store.id };
      },
      { connection, concurrency: 10 }
    );

    inventoryWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err: err.message }, 'Inventory worker job failed');
    });

    const dispatchWorker = new Worker(
      'rider-dispatch',
      async (job) => {
        const { orderId, darkStoreId } = job.data;
        const order = await this.db.queryOne(
          'SELECT id, status FROM order_state_machine WHERE id = ?',
          [orderId]
        );
        if (!order || order.status !== STATES.INVENTORY_VALIDATED) return { skipped: true };

        if (!this.riderAssignment) {
          throw new Error('RiderAssignment not configured');
        }

        const rider = await this.riderAssignment.findBestRider(darkStoreId);
        if (!rider) throw new Error('No available rider');

        await this.riderAssignment.assignRider(orderId, rider.riderId, darkStoreId);
        await this._transition(orderId, STATES.RIDER_ASSIGNED, {
          riderId: rider.riderId,
          darkStoreId,
        });
        return { status: 'rider_assigned', riderId: rider.riderId };
      },
      { connection, concurrency: 5 }
    );

    dispatchWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err: err.message }, 'Dispatch worker job failed');
    });
  }

  async _findNearestStore(serviceId, lat, lng) {
    const radiusMeters = config.darkStore.searchRadiusKm * 1000;
    return this.db.queryOne(
      `SELECT ds.id, ds.name, ds.lat, ds.lng,
         ${geo.distanceSphereKmExpr(lat, lng, 'ds.lat', 'ds.lng')} as distance_km
       FROM dark_stores ds
       WHERE ds.is_active = 1
         AND ${geo.dWithinExpr(lat, lng, 'ds.lat', 'ds.lng', radiusMeters)}
         AND EXISTS (
           SELECT 1 FROM inventory i
           WHERE i.dark_store_id = ds.id AND i.service_id = ? AND i.quantity > 0
         )
       ORDER BY distance_km ASC LIMIT 1`,
      [serviceId]
    );
  }

  async _reserveInventory(orderId, darkStoreId, serviceId) {
    const result = await this.db.execute(
      `UPDATE inventory
       SET quantity = quantity - 1, reserved = reserved + 1, updated_at = NOW()
       WHERE dark_store_id = ? AND service_id = ? AND quantity > 0
       RETURNING quantity`,
      [darkStoreId, serviceId]
    );
    if (!result.rows || result.rows.length === 0) return false;
    return true;
  }

  generateIdempotencyKey() {
    return `ik_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  generateOrderId() {
    return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  async createOrder({ customerId, serviceId, amount, location, lat, lng, idempotencyKey }) {
    const key = idempotencyKey || this.generateIdempotencyKey();

    const existing = await this.db.queryOne(
      'SELECT * FROM order_state_machine WHERE idempotency_key = ?',
      [key]
    );
    if (existing) return { order: existing, idempotent: true };

    const orderId = this.generateOrderId();
    await this.db.execute(
      `INSERT INTO order_state_machine
        (id, idempotency_key, customer_id, service_id, status, amount, location, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, key, customerId, serviceId, STATES.PENDING, amount, location, lat, lng]
    );

    const order = await this.db.queryOne(
      'SELECT * FROM order_state_machine WHERE id = ?',
      [orderId]
    );

    if (this.orderQueue) {
      await this.orderQueue.add('inventory-check', { orderId }, { deduplication: { id: key } });
    } else {
      const store = await this._findNearestStore(serviceId, lat, lng);
      if (store && (await this._reserveInventory(orderId, store.id, serviceId))) {
        await this._transition(orderId, STATES.INVENTORY_VALIDATED, { darkStoreId: store.id });
        const rider = this.riderAssignment ? await this.riderAssignment.findBestRider(store.id) : null;
        if (rider) {
          await this.riderAssignment.assignRider(orderId, rider.riderId, store.id);
          await this._transition(orderId, STATES.RIDER_ASSIGNED, { riderId: rider.riderId, darkStoreId: store.id });
        }
      } else {
        await this._transition(orderId, STATES.FAILED, { reason: 'No store or out of stock' });
      }
    }

    return { order, idempotent: false };
  }

  async _transition(orderId, newState, meta = {}) {
    if (this.locks.has(orderId)) throw new Error(`Order ${orderId} is locked`);
    this.locks.set(orderId, true);

    try {
      const order = await this.db.queryOne(
        'SELECT * FROM order_state_machine WHERE id = ?',
        [orderId]
      );
      if (!order) throw new Error(`Order ${orderId} not found`);
      if (!VALID_TRANSITIONS[order.status]?.includes(newState)) {
        throw new Error(`Invalid transition: ${order.status} -> ${newState}`);
      }

      const sets = ['status = ?', 'updated_at = NOW()'];
      const params = [newState];

      if (newState === STATES.RIDER_ASSIGNED && meta.riderId) {
        sets.push('rider_id = ?');
        params.push(meta.riderId);
        sets.push('assigned_at = NOW()');
      }
      if (newState === STATES.INVENTORY_VALIDATED && meta.darkStoreId) {
        sets.push('dark_store_id = ?');
        params.push(meta.darkStoreId);
      }
      if (newState === STATES.PICKED_UP) sets.push('picked_up_at = NOW()');
      if (newState === STATES.DELIVERED) sets.push('delivered_at = NOW()');

      params.push(orderId);
      await this.db.execute(
        `UPDATE order_state_machine SET ${sets.join(', ')} WHERE id = ?`,
        params
      );

      const updated = await this.db.queryOne(
        'SELECT * FROM order_state_machine WHERE id = ?',
        [orderId]
      );

      if (
        newState === STATES.INVENTORY_VALIDATED &&
        meta.darkStoreId &&
        this.dispatchQueue
      ) {
        await this.dispatchQueue.add('assign-rider', { orderId, darkStoreId: meta.darkStoreId });
      }

      this._emitOrderUpdate(updated);
      bus.emit('order:transition', { order: updated, from: order.status, to: newState });
      return updated;
    } finally {
      this.locks.delete(orderId);
    }
  }

  _emitOrderUpdate(order) {
    if (!this.io) return;
    this.io.to(`user:${order.customer_id}`).emit('order:updated', {
      id: order.id,
      status: order.status,
      riderId: order.rider_id,
      storeId: order.dark_store_id,
    });
    if (order.rider_id) {
      this.io.to(`user:${order.rider_id}`).emit('order:status', {
        id: order.id,
        status: order.status,
      });
    }
  }

  async markPickedUp(orderId) { return this._transition(orderId, STATES.PICKED_UP); }
  async markInTransit(orderId) { return this._transition(orderId, STATES.IN_TRANSIT); }
  async markDelivered(orderId) { return this._transition(orderId, STATES.DELIVERED); }
  async complete(orderId) { return this._transition(orderId, STATES.COMPLETED); }

  async cancel(orderId) {
    const order = await this.db.queryOne(
      'SELECT * FROM order_state_machine WHERE id = ?',
      [orderId]
    );
    if (!order) throw new Error('Order not found');
    await this._transition(orderId, STATES.CANCELLED);

    if (order.dark_store_id && order.status === STATES.INVENTORY_VALIDATED) {
      await this.db.execute(
        `UPDATE inventory
         SET quantity = quantity + 1, reserved = GREATEST(reserved - 1, 0), updated_at = NOW()
         WHERE dark_store_id = ? AND service_id = ?`,
        [order.dark_store_id, order.service_id]
      );
    }
  }

  async retry(orderId) {
    return this._transition(orderId, STATES.PENDING).then(() => {
      if (this.orderQueue) {
        return this.orderQueue.add('inventory-check', { orderId });
      }
    });
  }

  getOrder(orderId) {
    return this.db.queryOne('SELECT * FROM order_state_machine WHERE id = ?', [orderId]);
  }

  getOrdersForCustomer(customerId) {
    return this.db.query(
      'SELECT * FROM order_state_machine WHERE customer_id = ? ORDER BY created_at DESC',
      [customerId]
    );
  }

  getOrdersForRider(riderId) {
    return this.db.query(
      `SELECT * FROM order_state_machine
       WHERE rider_id = ? AND status NOT IN ('completed', 'cancelled')
       ORDER BY created_at DESC`,
      [riderId]
    );
  }

  getActiveJobs() {
    return this.db.query(
      `SELECT * FROM order_state_machine
       WHERE status NOT IN ('completed', 'cancelled', 'failed')
       ORDER BY created_at DESC LIMIT 50`
    );
  }

  async getStuckOrders(minutesOld = 30) {
    return this.db.query(
      `SELECT * FROM order_state_machine
       WHERE status = 'pending' AND created_at < NOW() - INTERVAL '${parseInt(minutesOld)} minutes'
       ORDER BY created_at ASC`
    );
  }
}

module.exports = { OrderManagementSystem, STATES, VALID_TRANSITIONS };
