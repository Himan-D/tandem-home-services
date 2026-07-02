const logger = require('./lib/logger');

function createMatchingEngine(prisma, io, services) {
  const { ml, onlinePartners, notifyUser } = services;

  async function matchBooking(bookingId) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.status !== 'pending') return;

    const customer = await prisma.user.findUnique({
      where: { id: booking.customerId },
      select: { name: true },
    });
    if (!customer) return;

    const declined = await prisma.declinedBooking.findMany({
      where: { bookingId },
      select: { partnerId: true },
    });
    const declinedIds = new Set(declined.map((d) => d.partnerId));

    const allPartners = await prisma.user.findMany({
      where: { role: 'partner' },
      select: {
        id: true, name: true, ratingAvg: true, jobsCompleted: true,
        responseTimeMins: true, servicesOffered: true, location: true,
        isPlusMember: true,
      },
    });

    const candidates = [];
    for (const partner of allPartners) {
      if (declinedIds.has(partner.id)) continue;

      let offeredServices = [];
      try { offeredServices = JSON.parse(partner.servicesOffered || '[]'); } catch {}
      const skillsMatch = offeredServices.includes(booking.serviceId) ? 1.0 : 0.0;
      if (skillsMatch === 0 && offeredServices.length > 0) continue;

      const online = onlinePartners.has(partner.id);

      candidates.push({
        pro_id: partner.id,
        rating_avg: partner.ratingAvg || 4.5,
        jobs_completed: partner.jobsCompleted || 0,
        response_time_mins: partner.responseTimeMins || 30,
        price_score: 0.5,
        location_score: Math.random() * 0.5 + 0.5,
        skills_match: skillsMatch,
        reliability_score: Math.min((partner.jobsCompleted || 0) / 200 + 0.5, 1.0),
        availability_score: online ? 1.0 : 0.3,
        is_plus_member: partner.isPlusMember === 1,
      });
    }

    if (candidates.length === 0) {
      logger.warn({ bookingId }, 'No matching partners found');
      return;
    }

    try {
      const ranked = await ml.rankPros(candidates);
      const topMatch = ranked[0];
      const partner = allPartners.find((p) => p.id === topMatch.pro_id);
      if (!partner) return;

      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'accepted', partnerId: partner.id, matchScore: topMatch.score, matchedBy: 'ml_engine' },
      });
      await notifyUser(booking.customerId, 'both', 'Job Matched', `${partner.name} matched to your request!`);
      io.to(`user:${booking.customerId}`).emit('booking:updated', {
        id: bookingId,
        status: 'accepted',
        partnerId: partner.id,
        partnerName: partner.name,
        matchScore: topMatch.score,
      });
      io.to(`user:${partner.id}`).emit('booking:assigned', {
        id: bookingId,
        serviceTitle: booking.serviceTitle,
        customerName: customer.name,
        location: booking.location,
        time: booking.time,
      });
      logger.info({ bookingId, partnerId: partner.id, score: topMatch.score }, 'Booking matched');
    } catch (err) {
      logger.error({ err: err.message, bookingId }, 'ML ranking failed, using fallback');
      const fallback = allPartners.find((p) => {
        if (declinedIds.has(p.id)) return false;
        let offered = [];
        try { offered = JSON.parse(p.servicesOffered || '[]'); } catch {}
        return offered.includes(booking.serviceId);
      });
      if (fallback) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'accepted', partnerId: fallback.id, matchedBy: 'fallback' },
        });
        await notifyUser(booking.customerId, 'both', 'Job Matched', `${fallback.name} matched to your request!`);
        io.to(`user:${booking.customerId}`).emit('booking:updated', {
          id: bookingId,
          status: 'accepted',
          partnerId: fallback.id,
          partnerName: fallback.name,
        });
      }
    }
  }

  return { matchBooking };
}

module.exports = { createMatchingEngine };
