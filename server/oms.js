const crypto = require('crypto');
const { Queue, Worker } = require('bullmq');
const config = require('./config');
const logger = require('./lib/logger');
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
  constructor(prisma, io, redisConnection) {
    this.prisma = prisma;
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
        const order = await this.prisma.orderStateMachine.findUnique({
          where: { id: orderId },
          select: { id: true, serviceId: true, lat: true, lng: true, status: true },
        });
        if (!order || order.status !== STATES.PENDING) return { skipped: true };

        const store = await this._findNearestStore(order.serviceId, order.lat, order.lng);
        if (!store) {
          await this._transition(orderId, STATES.FAILED, { reason: 'No dark store available' });
          return { status: 'failed', reason: 'No store' };
        }

        const reserved = await this._reserveInventory(orderId, store.id, order.serviceId);
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
        const order = await this.prisma.orderStateMachine.findUnique({
          where: { id: orderId },
          select: { id: true, status: true },
        });
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
    const stores = await this.prisma.$queryRaw`
      SELECT ds.id, ds.name, ds.lat, ds.lng,
             ST_DistanceSphere(ST_MakePoint(ds.lng, ds.lat), ST_MakePoint(${lng}, ${lat})) / 1000 as distance_km
      FROM dark_stores ds
      WHERE ds.is_active = 1
        AND ST_DWithin(ST_MakePoint(ds.lng, ds.lat)::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})
        AND EXISTS (
          SELECT 1 FROM inventory i
          WHERE i.dark_store_id = ds.id AND i.service_id = ${serviceId} AND i.quantity > 0
        )
      ORDER BY distance_km ASC LIMIT 1
    `;
    return stores[0] || null;
  }

  async _reserveInventory(orderId, darkStoreId, serviceId) {
    const result = await this.prisma.$executeRaw`
      UPDATE inventory
      SET quantity = quantity - 1, reserved = reserved + 1, updated_at = NOW()
      WHERE dark_store_id = ${darkStoreId} AND service_id = ${serviceId} AND quantity > 0
    `;
    return result > 0;
  }

  generateIdempotencyKey() {
    return `ik_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  generateOrderId() {
    return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  async createOrder({ customerId, serviceId, amount, location, lat, lng, idempotencyKey }) {
    const key = idempotencyKey || this.generateIdempotencyKey();

    const existing = await this.prisma.orderStateMachine.findUnique({
      where: { idempotencyKey: key },
    });
    if (existing) return { order: existing, idempotent: true };

    const orderId = this.generateOrderId();
    await this.prisma.orderStateMachine.create({
      data: {
        id: orderId,
        idempotencyKey: key,
        customerId,
        serviceId,
        status: STATES.PENDING,
        amount,
        location,
        lat,
        lng,
      },
    });

    const order = await this.prisma.orderStateMachine.findUnique({
      where: { id: orderId },
    });

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
      const order = await this.prisma.orderStateMachine.findUnique({
        where: { id: orderId },
      });
      if (!order) throw new Error(`Order ${orderId} not found`);
      if (!VALID_TRANSITIONS[order.status]?.includes(newState)) {
        throw new Error(`Invalid transition: ${order.status} -> ${newState}`);
      }

      const data = { status: newState, updatedAt: new Date() };

      if (newState === STATES.RIDER_ASSIGNED && meta.riderId) {
        data.riderId = meta.riderId;
        data.assignedAt = new Date();
      }
      if (newState === STATES.INVENTORY_VALIDATED && meta.darkStoreId) {
        data.darkStoreId = meta.darkStoreId;
      }
      if (newState === STATES.PICKED_UP) data.pickedUpAt = new Date();
      if (newState === STATES.DELIVERED) data.deliveredAt = new Date();

      const result = await this.prisma.orderStateMachine.updateMany({
        where: { id: orderId, status: order.status },
        data,
      });
      if (result.count === 0) throw new Error(`Concurrent modification: order ${orderId} status changed`);

      const updated = await this.prisma.orderStateMachine.findUnique({
        where: { id: orderId },
      });

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
    this.io.to(`user:${order.customerId}`).emit('order:updated', {
      id: order.id,
      status: order.status,
      riderId: order.riderId,
      storeId: order.darkStoreId,
    });
    if (order.riderId) {
      this.io.to(`user:${order.riderId}`).emit('order:status', {
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
    const order = await this.prisma.orderStateMachine.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new Error('Order not found');
    await this._transition(orderId, STATES.CANCELLED);

    if (order.darkStoreId && order.status === STATES.INVENTORY_VALIDATED) {
      await this.prisma.$executeRaw`
        UPDATE inventory
        SET quantity = quantity + 1, reserved = GREATEST(reserved - 1, 0), updated_at = NOW()
        WHERE dark_store_id = ${order.darkStoreId} AND service_id = ${order.serviceId}
      `;
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
    return this.prisma.orderStateMachine.findUnique({ where: { id: orderId } });
  }

  getOrdersForCustomer(customerId) {
    return this.prisma.orderStateMachine.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  getOrdersForRider(riderId) {
    return this.prisma.orderStateMachine.findMany({
      where: { riderId, status: { notIn: ['completed', 'cancelled'] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  getActiveJobs() {
    return this.prisma.orderStateMachine.findMany({
      where: { status: { notIn: ['completed', 'cancelled', 'failed'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getStuckOrders(minutesOld = 30) {
    const someDate = new Date(Date.now() - minutesOld * 60 * 1000);
    return this.prisma.orderStateMachine.findMany({
      where: { status: 'pending', createdAt: { lt: someDate } },
      orderBy: { createdAt: 'asc' },
    });
  }
}

module.exports = { OrderManagementSystem, STATES, VALID_TRANSITIONS };
