const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireRole } = require('../middleware/auth');
const geo = require('../lib/geo');

module.exports = function (db, io, services) {
  const router = express.Router();
  const { onlinePartners, oms, spatialIndex } = services;

  router.use(authenticateToken, requireRole('admin'));

  router.get('/stats', asyncHandler(async (req, res) => {
    const [pros, jobs, revenue, ratings, partners, darkStores, orders, lowStock] = await Promise.all([
      db.queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'partner'"),
      db.queryOne('SELECT COUNT(*) as count FROM bookings'),
      db.queryOne('SELECT COALESCE(SUM(payout), 0) as sum FROM bookings WHERE status = ? AND created_at > NOW() - INTERVAL \'30 days\'', ['completed']),
      db.queryOne('SELECT AVG(rating) as avg FROM ratings'),
      db.query("SELECT id, name, lat, lng FROM users WHERE role = 'partner' AND lat IS NOT NULL"),
      db.queryOne('SELECT COUNT(*) as count, COALESCE(SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END), 0) as active FROM dark_stores'),
      db.queryOne("SELECT COUNT(*) as count FROM order_state_machine WHERE status NOT IN ('completed', 'cancelled', 'failed')"),
      db.query('SELECT i.dark_store_id, ds.name, s.title FROM inventory i JOIN dark_stores ds ON i.dark_store_id = ds.id JOIN services s ON i.service_id = s.id WHERE i.quantity <= i.min_threshold'),
    ]);

    res.json({
      activePros: pros.count,
      onlinePros: onlinePartners.size,
      jobsToday: jobs.count,
      avgRating: ratings.avg ? parseFloat(ratings.avg).toFixed(1) : null,
      revenue30d: Math.round(revenue.sum * 1.33),
      darkStores: darkStores.count,
      activeDarkStores: darkStores.active,
      activeOrders: orders.count,
      lowStockAlerts: lowStock,
    });
  }));

  router.get('/partners', asyncHandler(async (req, res) => {
    const partners = await db.query(`
      SELECT u.id, u.name, u.email, u.phone, u.location, u.lat, u.lng, u.rating_avg,
             u.jobs_completed, u.is_plus_member, u.services_offered, u.created_at,
             (u.lat IS NOT NULL AND u.lng IS NOT NULL) as has_location
      FROM users u WHERE u.role = 'partner' ORDER BY u.created_at DESC
    `);
    res.json(partners.map((p) => ({
      ...p,
      services_offered: (() => { try { return JSON.parse(p.services_offered || '[]'); } catch { return []; } })(),
      online: onlinePartners.has(p.id),
    })));
  }));

  router.get('/customers', asyncHandler(async (req, res) => {
    const customers = await db.query(`
      SELECT u.id, u.name, u.email, u.phone, u.location, u.wallet_balance,
             u.is_plus_member, u.created_at,
             (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id) as total_bookings
      FROM users u WHERE u.role = 'consumer' ORDER BY u.created_at DESC
    `);
    res.json(customers);
  }));

  router.get('/complaints', asyncHandler(async (req, res) => {
    const complaints = await db.query(`
      SELECT c.*, u.name as customer_name, b.service_title
      FROM complaints c
      LEFT JOIN users u ON c.customer_id = u.id
      LEFT JOIN bookings b ON c.booking_id = b.id
      ORDER BY c.created_at DESC
    `);
    res.json(complaints);
  }));

  router.patch('/complaints/:id/resolve', asyncHandler(async (req, res) => {
    const result = await db.execute("UPDATE complaints SET status = 'resolved' WHERE id = ? RETURNING *", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Complaint not found' });
    res.json(result.rows[0]);
  }));

  router.get('/notifications', asyncHandler(async (req, res) => {
    const notifs = await db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(notifs);
  }));

  router.patch('/notifications/:id/read', asyncHandler(async (req, res) => {
    await db.execute('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  }));

  router.get('/spatial/nearby', asyncHandler(async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = parseFloat(req.query.radius || '10');
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat and lng required' });
    const nearby = spatialIndex.findNearby(lat, lng, radiusKm);
    res.json(nearby);
  }));

  router.post('/spatial-index/rebuild', asyncHandler(async (req, res) => {
    const partners = await db.query("SELECT id, name, lat, lng FROM users WHERE role = 'partner' AND lat IS NOT NULL AND lng IS NOT NULL");
    spatialIndex.load(partners);
    res.json({ success: true, count: partners.length });
  }));

  router.get('/orders', asyncHandler(async (req, res) => {
    const orders = await db.query(`
      SELECT os.*, u.name as customer_name, u2.name as rider_name, ds.name as store_name
      FROM order_state_machine os
      LEFT JOIN users u ON os.customer_id = u.id
      LEFT JOIN users u2 ON os.rider_id = u2.id
      LEFT JOIN dark_stores ds ON os.dark_store_id = ds.id
      ORDER BY os.created_at DESC LIMIT 100
    `);
    res.json(orders);
  }));

  return router;
};
