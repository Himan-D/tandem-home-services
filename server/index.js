const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const config = require('./config');
const logger = require('./lib/logger');
const db = require('./db');
const redis = require('./lib/redis');
const SpatialIndex = require('./spatial-index');
const LocationHistory = require('./location-history');
const { OrderManagementSystem } = require('./oms');
const RiderAssignment = require('./rider-assignment');
const { RecommendationClient } = require('./recommendation');
const TrackingService = require('./services/tracking');
const { runSchema, bootstrapAdmin } = require('./schema');
const { setupAdapter } = require('./socket/adapter');
const { setupSocketHandlers } = require('./socket/handlers');
const { createMatchingEngine } = require('./matching');
const { setupScheduledTasks } = require('./scheduler');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter, rateLimit } = require('./middleware/rateLimit');

async function boot() {
  await db.connect();
  await runSchema(db);
  await bootstrapAdmin(db);
  const { pub, sub, bull } = await redis.connect();

  require('./event-bus');

  const app = express();
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.use(rateLimit(apiLimiter));

  app.use((req, res, next) => {
    req.log = logger.child({ reqId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, path: req.path });
    next();
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] },
  });
  setupAdapter(io);

  const onlinePartners = new Map();
  const spatialIndex = new SpatialIndex();
  const ml = new RecommendationClient(config.ml.url);
  const locationHistory = new LocationHistory(db);
  const riderAssignment = new RiderAssignment(db, io, spatialIndex);
  const oms = new OrderManagementSystem(db, io, bull || null);
  oms.setRiderAssignment(riderAssignment);
  const trackingService = new TrackingService(db, io);

  const partners = await db.query(
    "SELECT id, name, lat, lng FROM users WHERE role = 'partner' AND lat IS NOT NULL AND lng IS NOT NULL"
  );
  spatialIndex.load(partners);
  logger.info({ count: partners.length }, 'Spatial index loaded');

  async function notifyUser(userId, method, title, message) {
    await db.execute(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [userId, title, message, method]
    );
    const user = await db.queryOne('SELECT email, name FROM users WHERE id = ?', [userId]);
    if (user) {
      if (method === 'email' || method === 'both') {
        logger.info({ to: user.email, title }, 'Email notification (stub)');
      }
      if (method === 'sms' || method === 'both') {
        logger.info({ to: user.name, title }, 'SMS notification (stub)');
      }
    }
    io.to(`user:${userId}`).emit('notification', { title, message });
  }

  const sharedServices = {
    db, io, onlinePartners, spatialIndex, ml, locationHistory,
    oms, riderAssignment, notifyUser, trackingService,
  };

  const matchingEngine = createMatchingEngine(db, io, {
    ...sharedServices,
    matchBooking: undefined,
  });
  sharedServices.matchBooking = matchingEngine.matchBooking;

  setupSocketHandlers(io, db, sharedServices);
  setupScheduledTasks(db, sharedServices);

  app.use('/api/auth', require('./routes/auth')(db, io, sharedServices));
  app.use('/api/services', require('./routes/services')(db));
  app.use('/api/dark-stores', require('./routes/dark-stores')(db));
  app.use('/api/promos', require('./routes/promos')(db));
  app.use('/api/bookings', require('./routes/bookings')(db, io, sharedServices));
  app.use('/api/orders', require('./routes/orders')(db, io, sharedServices));
  app.use('/api/location', require('./routes/location')(db, io, sharedServices));
  app.use('/api/chat', require('./routes/chat')(db, io));
  app.use('/api', require('./routes/partner')(db, io, sharedServices));
  app.use('/api/admin', require('./routes/admin')(db, io, sharedServices));
  app.use('/api/recommendations', require('./routes/recommendations')(db, io, sharedServices));
  app.use('/api/tracking', require('./routes/tracking')(db, io, sharedServices));
  app.use('/api/places', require('./routes/places')());

  app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  app.use(notFound);
  app.use(errorHandler);

  server.listen(config.port, () => {
    logger.info(
      { port: config.port, env: config.nodeEnv, redis: !!pub, osrm: config.osrm.url },
      'Lumina server running'
    );
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down...');
    server.close();
    locationHistory.stop();
    await db.close();
    process.exit(0);
  });
}

boot().catch((err) => {
  logger.error({ err: err.message, stack: err.stack }, 'Fatal boot error');
  process.exit(1);
});
