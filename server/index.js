const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const webPush = require('web-push');

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
const { trainAllModels } = require('./lib/ml-training');

async function boot() {
  await connect();
  await runSchema();
  await bootstrapAdmin();

  if (config.vapid.publicKey && config.vapid.privateKey) {
    webPush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);
  }
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
  const emailTemplates = require('./lib/email-templates');

  const CATEGORY_BY_TITLE = {
    'Welcome to Lumina': 'account',
    'Your Lumina Code': 'account',
    'Password Reset': 'account',
    'Password Changed': 'account',
    'Booking Confirmed': 'bookings',
    'Booking Cancelled': 'bookings',
    'New Rating': 'bookings',
    'New Complaint': 'bookings',
    'Onboarding Complete': 'payouts',
    'Job Accepted': 'bookings',
    'Job Completed': 'bookings',
    'Service Complete!': 'bookings',
    'Payout Requested': 'payouts',
    'SOS Alert': 'sos',
    'Gift Card Received': 'account',
    'Gift Card Purchased': 'account',
    'Partner Responded': 'bookings',
    'Customer Follow-up': 'bookings',
    'Dispute Resolved': 'bookings',
    'Background Check Needed': 'account',
    'Background Check In Progress': 'account',
    'Background Check Cleared': 'account',
    'Background Check Needs Review': 'account',
    'Background Check Dispute': 'account',
  };

  function inferCategory(title) {
    if (title?.startsWith('Application')) return 'payouts';
    if (title?.startsWith('Payout')) return 'payouts';
    return CATEGORY_BY_TITLE[title] || 'bookings';
  }

  async function getPrefs(userId) {
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM notification_preferences WHERE user_id = $1`, userId
      );
      if (rows.length > 0) return rows[0];
    } catch { }
    return null;
  }

  const CHANNEL_COLUMNS = {
    email: { bookings: 'email_bookings', promotions: 'email_promotions', payouts: 'email_payouts', chat: 'email_chat' },
    sms: { bookings: 'sms_bookings', promotions: 'sms_offers', payouts: 'sms_payouts' },
    push: { bookings: 'push_bookings', chat: 'push_chat', reminders: 'push_reminders', payouts: 'push_reminders', promotions: 'push_reminders' },
  };

  function prefAllows(prefs, channel, category) {
    if (!prefs) return true;
    const mapping = CHANNEL_COLUMNS[channel];
    if (!mapping) return true;
    const col = mapping[category] || `${channel}_${category}`;
    if (col in prefs) return !!prefs[col];
    return true;
  }

  async function sendPushNotification(userId, title, message, data = {}) {
    if (!config.vapid.publicKey || !config.vapid.privateKey) return;
    try {
      const subs = await prisma.$queryRawUnsafe(
        `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`, userId
      );
      for (const sub of subs) {
        const pushSub = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
        const payload = {
          title,
          body: message,
          tag: 'tandem',
          bookingId: data.bookingId,
          url: data.bookingId ? `/booking-status/${data.bookingId}` : data.url || '/',
        };
        webPush.sendNotification(pushSub, JSON.stringify(payload))
          .catch((err) => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              prisma.$executeRawUnsafe(
                `DELETE FROM push_subscriptions WHERE endpoint = $1`, sub.endpoint
              ).catch(() => {});
            }
            logger.error({ err: err.message, userId }, 'Push send failed');
          });
      }
    } catch (err) {
      logger.error({ err: err.message, userId }, 'Push send query failed');
    }
  }

  async function getUserUnsubscribeUrl(userId) {
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT token FROM email_unsubscribe_tokens WHERE user_id = $1 AND expires_at > NOW()`, userId
      );
      if (rows.length > 0) return `${config.corsOrigin[0] || 'http://localhost:5173'}/email/unsubscribe?token=${rows[0].token}`;
    } catch {}
    return '';
  }

  async function notifyUser(userId, method, title, message, data = {}) {
    await prisma.notification.create({
      data: { userId, title, message, type: method },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, phone: true },
    });

    const category = inferCategory(title);
    const prefs = await getPrefs(userId);

    if (user) {
      const unsubscribeUrl = await getUserUnsubscribeUrl(userId);
      if (unsubscribeUrl) emailTemplates.setUnsubscribeUrl(unsubscribeUrl);
      const html = emailTemplates.render(title, message, user.name);
      emailTemplates.setUnsubscribeUrl('');

      if ((method === 'email' || method === 'both') && user.email) {
        if (prefAllows(prefs, 'email', category) || category === 'account' || category === 'sos') {
          sendEmail({ to: user.email, subject: title, text: message, html }).catch((err) =>
            logger.error({ err: err.message, userId }, 'Email send failed')
          );
        }
      }
      if ((method === 'sms' || method === 'both') && user.phone) {
        if (prefAllows(prefs, 'sms', category) || category === 'account' || category === 'sos') {
          sendSMS({ to: user.phone, message }).catch((err) =>
            logger.error({ err: err.message, userId }, 'SMS send failed')
          );
        }
      }
    }

    if (method !== 'in_app') {
      if (prefAllows(prefs, 'push', category) || category === 'account' || category === 'sos') {
        sendPushNotification(userId, title, message, data);
      }
    }

    io.to(`user:${userId}`).emit('notification', { title, message, ...data });
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
  app.use('/api/admin', require('./routes/admin-email-preview')());
  app.use('/api/admin', require('./routes/admin')(prisma, io, sharedServices));
  app.use('/api/recommendations', require('./routes/recommendations')(prisma, io, sharedServices));
  app.use('/api/tracking', require('./routes/tracking')(prisma, io, sharedServices));
  app.use('/api/places', require('./routes/places')());
  app.use('/api/service-areas', require('./routes/service-areas')(prisma));
  app.use('/api/payments', require('./routes/payments')(prisma));
  app.use('/api/ai', require('./routes/ai')(prisma));
  app.use('/api/sos', require('./routes/sos')(prisma, io, sharedServices));
  app.use('/api/payouts', require('./routes/payouts')(prisma, io, sharedServices));
  app.use('/api/notification-preferences', require('./routes/notification-preferences')(prisma));
  app.use('/api/push-subscriptions', require('./routes/push-subscriptions')(prisma));
  app.use('/api/notifications', require('./routes/notifications')(prisma));
  app.use('/api/email', require('./routes/email-unsubscribe')(prisma));
  app.use('/api/verification', require('./routes/verification')(prisma, io, sharedServices));
  app.use('/api/addresses', require('./routes/addresses')(prisma));
  app.use('/api/gift-cards', require('./routes/gift-cards')(prisma, io, sharedServices));
  app.use('/api/disputes', require('./routes/disputes')(prisma, io, sharedServices));
  app.use('/api/background-checks', require('./routes/background-checks')(prisma, io, sharedServices));
  app.use('/api/ml', require('./routes/ml-pricing')(prisma, ml));

  app.get('/health', liveness);
  app.get('/healthz', liveness);
  app.get('/readyz', readiness);

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send('User-agent: *\nAllow: /\nSitemap: https://tandem.com/sitemap.xml');
  });

  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const services = await prisma.service.findMany({ select: { id: true } });
      const serviceUrls = services.map(s => `  <url><loc>https://tandem.com/service/${s.id}</loc></url>`).join('\n');
      res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://tandem.com/</loc></url>
  <url><loc>https://tandem.com/login</loc></url>
  <url><loc>https://tandem.com/signup</loc></url>
  <url><loc>https://tandem.com/partner/register</loc></url>
${serviceUrls}
</urlset>`);
    } catch {
      res.type('application/xml').status(500).send('<error>Failed to generate sitemap</error>');
    }
  });

  if (config.nodeEnv === 'production') {
    const { ssrMiddleware, loadProductionBundle } = require('./ssr');
    loadProductionBundle();
    app.use(express.static(path.resolve(__dirname, '../dist'), { index: false }));
    app.get('*', ssrMiddleware);
  }

  app.use(notFound);
  app.use(errorHandler);

  server.listen(config.port, () => {
    logger.info(
      { port: config.port, env: config.nodeEnv, redis: !!pub, osrm: config.osrm.url },
      'Lumina server running'
    );
    trainAllModels(prisma, ml);
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
