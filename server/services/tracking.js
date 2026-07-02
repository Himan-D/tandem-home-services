const crypto = require('crypto');
const config = require('../config');
const logger = require('../lib/logger');
const googleMaps = require('../lib/google-maps');
const GeofenceEngine = require('../lib/geofence');
const { GpsFilter } = require('../lib/gps-filter');
const bus = require('../event-bus');

const gpsFilter = new GpsFilter();
const geofence = new GeofenceEngine();

const otpStore = new Map();

class TrackingService {
  constructor(db, io) {
    this.db = db;
    this.io = io;
    this.snapTimers = new Map();

    bus.on('location:update', ({ userId, lat, lng, source, accuracy, speed, timestamp }) => {
      this.processLocationUpdate(userId, lat, lng, { source, accuracy, speed, timestamp: timestamp || Date.now() });
    });
  }

  async processLocationUpdate(userId, lat, lng, meta = {}) {
    const validation = gpsFilter.validate(userId, {
      lat,
      lng,
      accuracy: meta.accuracy,
      speed: meta.speed,
      timestamp: meta.timestamp || Date.now(),
    });

    if (!validation.valid) {
      logger.debug({ userId, reason: validation.reason }, 'GPS reading rejected');
      return null;
    }

    const { smoothed } = validation;

    gpsFilter.addToBuffer(userId, smoothed);
    this._scheduleSnap(userId);

    const assignedOrders = await this._getActiveOrdersForRider(userId);

    for (const order of assignedOrders) {
      this._checkGeofence(order, smoothed);
    }

    return smoothed;
  }

  _scheduleSnap(userId) {
    if (this.snapTimers.has(userId)) return;

    const timer = setTimeout(async () => {
      this.snapTimers.delete(userId);
      await this._flushSnap(userId);
    }, config.gps.snapIntervalMs);

    this.snapTimers.set(userId, timer);
  }

  async _flushSnap(userId) {
    const buffer = gpsFilter.getBuffer(userId);
    if (buffer.length < 2) return;

    const batch = gpsFilter.clearBuffer(userId);
    const snapped = await googleMaps.snapToRoads(batch);

    if (this.io) {
      const lastPoint = snapped[snapped.length - 1] || batch[batch.length - 1];
      this.io.to(`partner:${userId}:trail`).emit('partner:trail_snapped', {
        partnerId: userId,
        points: snapped,
        lastPoint,
      });
    }
  }

  _checkGeofence(order, point) {
    const fenceId = `order:${order.id}`;

    if (!geofence.getFence(fenceId)) {
      geofence.createFence(fenceId, parseFloat(order.lat), parseFloat(order.lng));
    }

    const callbacks = {
      onApproaching: ({ entityId, distanceM }) => {
        logger.info({ entityId, distanceM }, 'Partner approaching geofence');
        this.io.to(`user:${order.customer_id}`).emit('partner:approaching', {
          orderId: order.id,
          distanceM,
        });
      },
      onEnter: ({ entityId, distanceM }) => {
        logger.info({ entityId, distanceM }, 'Partner entered geofence');
        this.io.to(`user:${order.customer_id}`).emit('partner:nearby', {
          orderId: order.id,
          distanceM,
        });
      },
      onArrived: async ({ entityId }) => {
        logger.info({ entityId }, 'Partner arrived (dwell confirmed)');
        await this.db.execute(
          `UPDATE order_state_machine SET status = 'arrived', updated_at = NOW()
           WHERE id = ? AND status IN ('rider_assigned', 'picked_up')`,
          [order.id]
        );
        this.io.to(`user:${order.customer_id}`).emit('partner:arrived', {
          orderId: order.id,
        });
        this.io.to(`user:${order.rider_id}`).emit('arrival:confirmed', {
          orderId: order.id,
          message: 'Arrival auto-confirmed by geofence + dwell',
        });
      },
      onExit: ({ entityId, distanceM }) => {
        logger.info({ entityId, distanceM }, 'Partner left geofence');
        this.io.to(`user:${order.customer_id}`).emit('partner:left_geofence', {
          orderId: order.id,
        });
      },
    };

    geofence.check(fenceId, point.lat, point.lng, callbacks);
  }

  async _getActiveOrdersForRider(riderId) {
    return this.db.query(
      `SELECT id, customer_id, rider_id, lat, lng, status
       FROM order_state_machine
       WHERE rider_id = ? AND status IN ('rider_assigned', 'picked_up', 'in_transit')
       AND lat IS NOT NULL AND lng IS NOT NULL`,
      [riderId]
    );
  }

  async getETA(orderId) {
    const order = await this.db.queryOne(
      `SELECT os.id, os.lat, os.lng, os.status, os.rider_id,
              ds.lat as store_lat, ds.lng as store_lng
       FROM order_state_machine os
       LEFT JOIN dark_stores ds ON os.dark_store_id = ds.id
       WHERE os.id = ?`,
      [orderId]
    );
    if (!order) throw new Error('Order not found');

    const rider = order.rider_id
      ? await this.db.queryOne('SELECT lat, lng FROM users WHERE id = ?', [order.rider_id])
      : null;

    if (!rider || !rider.lat || !rider.lng) {
      return { eta: null, reason: 'rider_location_unknown' };
    }

    const eta = await googleMaps.getETA(
      { lat: rider.lat, lng: rider.lng },
      { lat: order.lat, lng: order.lng }
    );

    this.io.to(`user:${order.customer_id || 0}`).emit('eta:update', {
      orderId: order.id,
      ...eta,
      timestamp: Date.now(),
    });

    return { orderId, ...eta };
  }

  generateOtp(orderId) {
    const otp = crypto.randomInt(1000, 9999).toString();
    otpStore.set(`otp:${orderId}`, {
      otp,
      attempts: 0,
      expiresAt: Date.now() + 10 * 60 * 1000,
      verified: false,
    });
    return otp;
  }

  getOtp(orderId) {
    return otpStore.get(`otp:${orderId}`);
  }

  verifyOtp(orderId, code) {
    const record = otpStore.get(`otp:${orderId}`);
    if (!record) return { valid: false, reason: 'no_otp_generated' };
    if (Date.now() > record.expiresAt) {
      otpStore.delete(`otp:${orderId}`);
      return { valid: false, reason: 'expired' };
    }

    record.attempts++;

    if (record.attempts > 5) {
      otpStore.delete(`otp:${orderId}`);
      return { valid: false, reason: 'max_attempts' };
    }

    if (record.otp !== code) {
      return { valid: false, reason: 'wrong_code', attemptsLeft: 5 - record.attempts };
    }

    record.verified = true;
    return { valid: true };
  }

  clearOtp(orderId) {
    otpStore.delete(`otp:${orderId}`);
  }

  async confirmArrivalManual(orderId, riderId, lat, lng) {
    const order = await this.db.queryOne(
      'SELECT id, customer_id, lat, lng, rider_id, status FROM order_state_machine WHERE id = ?',
      [orderId]
    );
    if (!order) throw new Error('Order not found');
    if (order.rider_id !== riderId) throw new Error('Not authorized');
    if (!['rider_assigned', 'picked_up'].includes(order.status)) {
      throw new Error(`Cannot confirm arrival in status: ${order.status}`);
    }

    const fenceId = `order:${orderId}`;
    const check = geofence.check(fenceId, lat, lng);
    if (!check.insideGeofence) {
      return {
        confirmed: false,
        reason: 'outside_geofence',
        distanceM: check.distanceM,
        fenceRadiusM: config.geofence.radiusM,
      };
    }

    geofence.forceArrived(fenceId);

    await this.db.execute(
      `UPDATE order_state_machine SET status = 'arrived', updated_at = NOW() WHERE id = ?`,
      [orderId]
    );

    this.io.to(`user:${order.customer_id}`).emit('partner:arrived', {
      orderId,
      manual: true,
    });

    return { confirmed: true };
  }
}

module.exports = TrackingService;
