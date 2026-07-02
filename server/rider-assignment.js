const bus = require('./event-bus');
const config = require('./config');
const logger = require('./lib/logger');
const routing = require('./lib/routing');
const geo = require('./lib/geo');

class RiderAssignment {
  constructor(db, io, spatialIndex) {
    this.db = db;
    this.io = io;
    this.spatialIndex = spatialIndex;
  }

  async findBestRider(darkStoreId) {
    const darkStore = await this.db.queryOne(
      'SELECT id, name, lat, lng FROM dark_stores WHERE id = ? AND is_active = 1',
      [darkStoreId]
    );
    if (!darkStore) throw new Error(`Dark store ${darkStoreId} not found or inactive`);

    const radiusMeters = config.rider.searchRadiusKm * 1000;

    const riders = await this.db.query(
      `SELECT u.id, u.name, u.lat, u.lng, u.rating_avg, u.jobs_completed, u.response_time_mins, u.is_plus_member,
        ${geo.distanceSphereKmExpr(darkStore.lat, darkStore.lng, 'u.lat', 'u.lng')} as distance_km,
        (SELECT COUNT(*) FROM rider_tasks rt WHERE rt.rider_id = u.id AND rt.status IN ('pending', 'en_route')) as active_tasks
       FROM users u
       WHERE u.role = 'partner'
         AND u.lat IS NOT NULL AND u.lng IS NOT NULL
         AND ${geo.dWithinExpr(darkStore.lat, darkStore.lng, 'u.lat', 'u.lng', radiusMeters)}
       ORDER BY distance_km ASC
       LIMIT 50`,
      []
    );

    const candidates = [];
    for (const rider of riders) {
      if (rider.active_tasks >= config.rider.maxConcurrent) continue;

      const eta = await routing.getETA(
        { lat: rider.lat, lng: rider.lng },
        { lat: darkStore.lat, lng: darkStore.lng }
      );

      candidates.push({
        riderId: rider.id,
        name: rider.name,
        distanceKm: Math.round(rider.distance_km * 100) / 100,
        etaMinutes: eta.durationMin,
        etaSource: eta.source,
        activeTasks: rider.active_tasks,
        rating: rider.rating_avg || 4.5,
        jobsCompleted: rider.jobs_completed || 0,
        isPlus: rider.is_plus_member === 1,
        score: 0,
      });
    }

    if (candidates.length === 0) return null;

    const maxEta = Math.max(...candidates.map((c) => c.etaMinutes), 1);
    const maxTasks = Math.max(...candidates.map((c) => c.activeTasks), 1);
    const maxRating = Math.max(...candidates.map((c) => c.rating), 4.5);

    for (const c of candidates) {
      const etaScore = 1 - c.etaMinutes / maxEta;
      const taskScore = 1 - c.activeTasks / maxTasks;
      const ratingScore = c.rating / maxRating;
      const plusBonus = c.isPlus ? 0.1 : 0;
      c.score = Math.round((etaScore * 0.4 + taskScore * 0.25 + ratingScore * 0.25 + plusBonus) * 10000) / 10000;
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
  }

  async assignRider(orderId, riderId, darkStoreId) {
    const order = await this.db.queryOne(
      'SELECT id, lat, lng, location, service_id FROM order_state_machine WHERE id = ?',
      [orderId]
    );
    if (!order) throw new Error(`Order ${orderId} not found`);

    const existing = await this.db.queryOne(
      'SELECT * FROM rider_tasks WHERE order_id = ? AND rider_id = ?',
      [orderId, riderId]
    );
    if (existing) return existing;

    const result = await this.db.execute(
      'INSERT INTO rider_tasks (rider_id, order_id, task_type, status) VALUES (?, ?, ?, ?) RETURNING *',
      [riderId, orderId, 'pickup', 'pending']
    );
    const task = result.rows[0] || await this.db.queryOne(
      'SELECT * FROM rider_tasks WHERE order_id = ? AND rider_id = ?',
      [orderId, riderId]
    );

    const darkStore = await this.db.queryOne(
      'SELECT name, lat, lng FROM dark_stores WHERE id = ?',
      [darkStoreId]
    );

    bus.emit('rider:assigned', { orderId, riderId, taskId: task.id, darkStoreId });

    if (this.io) {
      this.io.to(`user:${riderId}`).emit('rider:task_assigned', {
        taskId: task.id,
        orderId,
        pickup: { lat: darkStore?.lat, lng: darkStore?.lng, name: darkStore?.name },
        dropoff: { lat: order.lat, lng: order.lng, location: order.location },
      });
    }

    if (darkStore) {
      this.spatialIndex.upsert({ id: riderId, lat: darkStore.lat, lng: darkStore.lng });
    }

    logger.info({ orderId, riderId, taskId: task.id }, 'Rider assigned');
    return task;
  }

  async updateTaskStatus(taskId, status, meta = {}) {
    const task = await this.db.queryOne('SELECT * FROM rider_tasks WHERE id = ?', [taskId]);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const updates = ['status = ?'];
    const params = [status];

    if (status === 'completed' || status === 'en_route') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    }
    if (meta.lat != null && meta.lng != null) {
      updates.push('lat = ?');
      params.push(meta.lat);
      updates.push('lng = ?');
      params.push(meta.lng);
    }

    params.push(taskId);
    await this.db.execute(
      `UPDATE rider_tasks SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    bus.emit('rider:task_updated', { taskId, orderId: task.order_id, status });
    logger.info({ taskId, status }, 'Task updated');

    return this.db.queryOne('SELECT * FROM rider_tasks WHERE id = ?', [taskId]);
  }

  async getRiderActiveTasks(riderId) {
    return this.db.query(
      `SELECT rt.*, os.service_id, os.location, os.lat, os.lng, os.amount
       FROM rider_tasks rt
       JOIN order_state_machine os ON rt.order_id = os.id
       WHERE rt.rider_id = ? AND rt.status IN ('pending', 'en_route')
       ORDER BY rt.assigned_at ASC`,
      [riderId]
    );
  }

  async getOrderTimeline(orderId) {
    return this.db.query(
      'SELECT * FROM rider_tasks WHERE order_id = ? ORDER BY assigned_at ASC',
      [orderId]
    );
  }
}

module.exports = RiderAssignment;
