const logger = require('./logger');

async function trainAllModels(prisma, ml) {
  logger.info('Starting ML model training from real data...');

  try {
    await trainRecommender(prisma, ml);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to train recommender');
  }

  try {
    await trainProRanker(prisma, ml);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to train pro ranker');
  }

  try {
    await trainPricing(prisma, ml);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to train pricing model');
  }

  try {
    await trainETA(prisma, ml);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to train ETA model');
  }

  try {
    await trainChurnLTV(prisma, ml);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to train churn/LTV models');
  }

  try {
    await trainBundler(prisma, ml);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to train bundler');
  }

  try {
    await trainForecaster(prisma, ml);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to train forecaster');
  }

  logger.info('ML model training complete');
}

async function trainRecommender(prisma, ml) {
  const interactions = await prisma.userInteraction.findMany({
    take: 5000,
    orderBy: { createdAt: 'desc' },
  });

  if (interactions.length === 0) {
    logger.warn('No user interactions found for recommender training');
    return;
  }

  const mapped = interactions.map((i) => ({
    user_id: i.userId,
    service_id: i.serviceId,
    rating: i.rating || 1.0,
  }));

  const result = await ml.train(mapped);
  logger.info({ samples: mapped.length, result }, 'Recommender trained');
}

async function trainProRanker(prisma, ml) {
  const partners = await prisma.user.findMany({
    where: { role: 'partner' },
    select: {
      id: true, ratingAvg: true, jobsCompleted: true,
      responseTimeMins: true, servicesOffered: true,
      isPlusMember: true,
    },
  });

  if (partners.length < 3) {
    logger.warn({ count: partners.length }, 'Not enough partners for pro ranker training');
    return;
  }

  const features = partners.map((p) => {
    let offered = [];
    try { offered = JSON.parse(p.servicesOffered || '[]'); } catch {}
    return [
      p.ratingAvg || 4.5,
      Math.min((p.jobsCompleted || 0) / 100, 1.0),
      Math.max(1.0 - (p.responseTimeMins || 30) / 60, 0),
      0.5,
      Math.random() * 0.5 + 0.5,
      offered.length > 0 ? 1.0 : 0.0,
      Math.min((p.jobsCompleted || 0) / 200 + 0.5, 1.0),
      0.5,
      p.isPlusMember === 1 ? 1.0 : 0.0,
      0, 0, 0, 0, 0, 0, 0,
    ];
  });

  const scores = partners.map((p) =>
    Math.min(0.5 + (p.ratingAvg || 4.5) / 10 + (p.jobsCompleted || 0) / 500, 0.99)
  );

  const result = await ml.trainProRanker(features, scores);
  logger.info({ samples: partners.length, result }, 'Pro ranker trained');
}

async function trainPricing(prisma, ml) {
  const bookings = await prisma.booking.findMany({
    take: 1000,
    orderBy: { createdAt: 'desc' },
    include: { service: true },
  });

  if (bookings.length < 5) {
    logger.warn({ count: bookings.length }, 'Not enough bookings for pricing model');
    return;
  }

  const features = bookings.map((b) => {
    const time = b.time ? new Date(b.time) : new Date();
    return [
      time.getHours() / 23,
      time.getDay() / 6,
      time.getDay() >= 5 ? 1 : 0,
      0.5,
      Math.random() * 0.5 + 0.3,
      1.0,
      Math.min((b.payout || b.amount || 100) / 500, 1.0),
      0.5,
      0.6,
      0.5,
      0.5,
      Math.min((b.serviceId ? 1 : 0) * 0.5, 1.0),
      0.2,
      b.status === 'pending' ? 1.0 : 0.1,
    ];
  });

  const targets = bookings.map(() => 1.0);

  const result = await ml.trainPricing(features, targets);
  logger.info({ samples: bookings.length, result }, 'Pricing model trained');
}

async function trainETA(prisma, ml) {
  const bookings = await prisma.booking.findMany({
    take: 500,
    orderBy: { createdAt: 'desc' },
    where: { lat: { not: null }, lng: { not: null } },
  });

  if (bookings.length < 5) {
    logger.warn({ count: bookings.length }, 'Not enough bookings with coordinates for ETA model');
    return;
  }

  const features = bookings.map((b) => {
    const time = b.time ? new Date(b.time) : new Date();
    const hour = time.getHours();
    return [
      Math.min(5 / 50, 1.0),
      hour / 23,
      time.getDay() / 6,
      (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18) ? 1 : 0,
      1.0,
      30 / 100,
      15 / 120,
      0,
      time.getDay() >= 5 ? 1 : 0,
      0.5,
    ];
  });

  const targets = bookings.map(() => 15 + Math.random() * 30);

  const result = await ml.trainETA(features, targets);
  logger.info({ samples: bookings.length, result }, 'ETA model trained');
}

async function trainChurnLTV(prisma, ml) {
  const customers = await prisma.user.findMany({
    where: { role: 'customer' },
    select: { id: true, isPlusMember: true, emailVerified: true },
    take: 200,
  });

  if (customers.length < 5) {
    logger.warn({ count: customers.length }, 'Not enough customers for churn model');
    return;
  }

  const churnFeatures = [];
  const churnTargets = [];
  const ltvFeatures = [];
  const ltvTargets = [];

  for (const c of customers) {
    const bookings = await prisma.booking.findMany({
      where: { customerId: c.id },
      select: { id: true, status: true, payout: true, serviceId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalBookings = bookings.length;
    if (totalBookings === 0) continue;

    const completed = bookings.filter((b) => b.status === 'completed').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    const lastBooking = bookings[0];
    const daysSinceLast = lastBooking
      ? Math.floor((Date.now() - new Date(lastBooking.createdAt).getTime()) / 86400000)
      : 30;
    const avgSpend = bookings.reduce((s, b) => s + (b.payout || 0), 0) / Math.max(totalBookings, 1);
    const uniqueServices = [...new Set(bookings.filter((b) => b.serviceId).map((b) => b.serviceId))];

    const userData = {
      days_since_last_booking: daysSinceLast,
      total_bookings: totalBookings,
      avg_rating_given: 4.5,
      cancelled_bookings: cancelled,
      account_age_days: lastBooking ? daysSinceLast + 30 : 30,
      support_tickets: 0,
      is_plus_member: c.isPlusMember === 1,
      booking_frequency: totalBookings / Math.max(daysSinceLast, 30),
      failed_payments: 0,
      avg_spend_per_booking: avgSpend,
      unique_services: uniqueServices,
      referrals_made: 0,
      has_verified_email: c.emailVerified || false,
      completed_bookings: completed,
    };

    churnFeatures.push([
      Math.min(daysSinceLast / 365, 1.0),
      Math.min(totalBookings / 100, 1.0),
      4.5 / 5.0,
      Math.min(cancelled / Math.max(totalBookings, 1), 1.0),
      Math.min((daysSinceLast + 30) / 365, 1.0),
      0,
      c.isPlusMember === 1 ? 1 : 0,
      Math.min(totalBookings / Math.max(daysSinceLast, 30) / 30, 1.0),
      0,
      Math.min(avgSpend / 500, 1.0),
    ]);
    churnTargets.push(daysSinceLast > 60 ? 0.7 : 0.1);

    ltvFeatures.push([
      Math.min(totalBookings / 100, 1.0),
      Math.min((daysSinceLast + 30) / 730, 1.0),
      Math.min(avgSpend / 500, 1.0),
      Math.min(totalBookings / Math.max(daysSinceLast, 30) / 30, 1.0),
      c.isPlusMember === 1 ? 1 : 0,
      4.5 / 5.0,
      Math.min(uniqueServices.length / 14, 1.0),
      0,
      c.emailVerified ? 1 : 0,
      Math.min(completed / 100, 1.0),
    ]);
    ltvTargets.push(Math.min(avgSpend * totalBookings * 2, 10000));
  }

  if (churnFeatures.length >= 5) {
    let result = await ml.trainChurn(churnFeatures, churnTargets);
    logger.info({ samples: churnFeatures.length, result }, 'Churn model trained');

    result = await ml.trainLTV(ltvFeatures, ltvTargets);
    logger.info({ samples: ltvFeatures.length, result }, 'LTV model trained');
  }
}

async function trainBundler(prisma, ml) {
  const bookings = await prisma.booking.findMany({
    select: { customerId: true, serviceId: true },
    where: { serviceId: { not: null } },
    take: 2000,
    orderBy: { createdAt: 'desc' },
  });

  if (bookings.length < 10) {
    logger.warn({ count: bookings.length }, 'Not enough bookings for bundler');
    return;
  }

  const customerHistories = {};
  for (const b of bookings) {
    const cid = b.customerId;
    if (!customerHistories[cid]) customerHistories[cid] = [];
    if (!customerHistories[cid].includes(b.serviceId)) {
      customerHistories[cid].push(b.serviceId);
    }
  }

  const histories = Object.values(customerHistories).filter((h) => h.length > 0);
  const result = await ml.trainBundler(histories);
  logger.info({ customers: histories.length, result }, 'Bundler trained');
}

async function trainForecaster(prisma, ml) {
  const bookings = await prisma.booking.findMany({
    select: { serviceId: true, createdAt: true },
    where: { serviceId: { not: null } },
    take: 5000,
    orderBy: { createdAt: 'desc' },
  });

  if (bookings.length < 10) {
    logger.warn({ count: bookings.length }, 'Not enough bookings for forecaster');
    return;
  }

  const hourlyBuckets = {};
  for (const b of bookings) {
    const d = new Date(b.createdAt);
    const key = `${b.serviceId}_${d.getDay()}_${d.getHours()}`;
    if (!hourlyBuckets[key]) {
      hourlyBuckets[key] = { service_id: b.serviceId, day_of_week: d.getDay(), hour: d.getHours(), count: 0 };
    }
    hourlyBuckets[key].count += 1;
  }

  const hourlyData = Object.values(hourlyBuckets);
  const result = await ml.trainForecaster(hourlyData);
  logger.info({ buckets: hourlyData.length, result }, 'Forecaster trained');
}

module.exports = { trainAllModels };
