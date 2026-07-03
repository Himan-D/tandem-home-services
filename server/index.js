const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const config = require('./config');
const logger = require('./lib/logger');
const { connect, close, prisma } = require('./db');
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
const { setupSecurity, auditLog, requestId } = require('./middleware/security');
const { liveness, readiness } = require('./middleware/health');
const { setupSwagger } = require('./swagger');
const { ShiftManager } = require('./services/shifts');

async function boot() {
  await connect();
  await runSchema();
  await bootstrapAdmin();
  const { pub, sub, bull } = await redis.connect();

  require('./event-bus');

  const app = express();

  setupSecurity(app);

  app.use(cors({
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
    maxAge: 86400,
  }));
  app.use(express.json({
    limit: '1mb',
    verify: (req, _res, buf) => { req.rawBody = buf; },
  }));
  app.use(rateLimit(apiLimiter));
  app.use(requestId);
  app.use(auditLog);

  app.use((req, res, next) => {
    req.log = logger.child({ reqId: req.reqId, path: req.path });
    next();
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: config.corsOrigin, methods: ['GET', 'POST'], credentials: true },
  });
  setupAdapter(io);

  const onlinePartners = new Map();
  const spatialIndex = new SpatialIndex();
  const ml = new RecommendationClient(config.ml.url);
  const locationHistory = new LocationHistory(prisma);
  const riderAssignment = new RiderAssignment(prisma, io, spatialIndex);
  const oms = new OrderManagementSystem(prisma, io, bull || null);
  oms.setRiderAssignment(riderAssignment);
  const trackingService = new TrackingService(prisma, io);
  const shiftManager = new ShiftManager(prisma);

  const partners = await prisma.user.findMany({
    where: { role: 'partner', lat: { not: null }, lng: { not: null } },
    select: { id: true, name: true, lat: true, lng: true },
  });
  spatialIndex.load(partners);
  logger.info({ count: partners.length }, 'Spatial index loaded');

  const { sendEmail } = require('./lib/email');
  const { sendSMS } = require('./lib/sms');

  async function notifyUser(userId, method, title, message) {
    await prisma.notification.create({
      data: { userId, title, message, type: method },
    });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, phone: true } });
    if (user) {
      if ((method === 'email' || method === 'both') && user.email) {
        sendEmail({ to: user.email, subject: title, text: message }).catch((err) =>
          logger.error({ err: err.message, userId }, 'Email send failed')
        );
      }
      if ((method === 'sms' || method === 'both') && user.phone) {
        sendSMS({ to: user.phone, message }).catch((err) =>
          logger.error({ err: err.message, userId }, 'SMS send failed')
        );
      }
    }
    io.to(`user:${userId}`).emit('notification', { title, message });
  }

  const sharedServices = {
    prisma, io, onlinePartners, spatialIndex, ml, locationHistory,
    oms, riderAssignment, notifyUser, trackingService, shiftManager,
  };

  const matchingEngine = createMatchingEngine(prisma, io, {
    ...sharedServices,
    matchBooking: undefined,
  });
  sharedServices.matchBooking = matchingEngine.matchBooking;

  setupSocketHandlers(io, prisma, sharedServices);
  setupScheduledTasks(prisma, sharedServices);
  setupSwagger(app);

  app.use('/api/auth', require('./routes/auth')(prisma, io, sharedServices));
  app.use('/api/services', require('./routes/services')(prisma));
  app.use('/api/dark-stores', require('./routes/dark-stores')(prisma));
  app.use('/api/promos', require('./routes/promos')(prisma));
  app.use('/api/bookings', require('./routes/bookings')(prisma, io, sharedServices));
  app.use('/api/orders', require('./routes/orders')(prisma, io, sharedServices));
  app.use('/api/location', require('./routes/location')(prisma, io, sharedServices));
  app.use('/api/chat', require('./routes/chat')(prisma, io));
  app.use('/api', require('./routes/partner')(prisma, io, sharedServices));
  app.use('/api/admin', require('./routes/admin')(prisma, io, sharedServices));
  app.use('/api/recommendations', require('./routes/recommendations')(prisma, io, sharedServices));
  app.use('/api/tracking', require('./routes/tracking')(prisma, io, sharedServices));
  app.use('/api/places', require('./routes/places')());
  app.use('/api/service-areas', require('./routes/service-areas')(prisma));
  app.use('/api/payments', require('./routes/payments')(prisma));
  app.use('/api/ai', require('./routes/ai')(prisma));
  app.use('/api/sos', require('./routes/sos')(prisma, io, sharedServices));

  app.get('/health', liveness);
  app.get('/healthz', liveness);
  app.get('/readyz', readiness);

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
    await close();
    process.exit(0);
  });
}

boot().catch((err) => {
  logger.error({ err: err.message, stack: err.stack }, 'Fatal boot error');
  process.exit(1);
});
