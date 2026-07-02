const logger = require('./lib/logger');
const geo = require('./lib/geo');

function createMatchingEngine(db, io, services) {
  const { ml, onlinePartners, notifyUser } = services;

  async function matchBooking(bookingId) {
    const booking = await db.queryOne('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (!booking || booking.status !== 'pending') return;

    const customer = await db.queryOne('SELECT name FROM users WHERE id = ?', [booking.customer_id]);
    if (!customer) return;

    const declined = await db.query(
      'SELECT partner_id FROM declined_bookings WHERE booking_id = ?',
      [bookingId]
    );
    const declinedIds = new Set(declined.map((d) => d.partner_id));

    const allPartners = await db.query(`
      SELECT id, name, rating_avg, jobs_completed, response_time_mins, services_offered, location, is_plus_member
      FROM users WHERE role = 'partner'
    `);

    const candidates = [];
    for (const partner of allPartners) {
      if (declinedIds.has(partner.id)) continue;

      let offeredServices = [];
      try { offeredServices = JSON.parse(partner.services_offered || '[]'); } catch {}
      const skillsMatch = offeredServices.includes(booking.service_id) ? 1.0 : 0.0;
      if (skillsMatch === 0 && offeredServices.length > 0) continue;

      const online = onlinePartners.has(partner.id);

      candidates.push({
        pro_id: partner.id,
        rating_avg: partner.rating_avg || 4.5,
        jobs_completed: partner.jobs_completed || 0,
        response_time_mins: partner.response_time_mins || 30,
        price_score: 0.5,
        location_score: Math.random() * 0.5 + 0.5,
        skills_match: skillsMatch,
        reliability_score: Math.min((partner.jobs_completed || 0) / 200 + 0.5, 1.0),
        availability_score: online ? 1.0 : 0.3,
        is_plus_member: partner.is_plus_member === 1,
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

      await db.execute(
        'UPDATE bookings SET status = ?, partner_id = ?, match_score = ?, matched_by = ? WHERE id = ?',
        ['accepted', partner.id, topMatch.score, 'ml_engine', bookingId]
      );
      await notifyUser(booking.customer_id, 'both', 'Job Matched', `${partner.name} matched to your request!`);
      io.to(`user:${booking.customer_id}`).emit('booking:updated', {
        id: bookingId,
        status: 'accepted',
        partnerId: partner.id,
        partnerName: partner.name,
        matchScore: topMatch.score,
      });
      io.to(`user:${partner.id}`).emit('booking:assigned', {
        id: bookingId,
        serviceTitle: booking.service_title,
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
        try { offered = JSON.parse(p.services_offered || '[]'); } catch {}
        return offered.includes(booking.service_id);
      });
      if (fallback) {
        await db.execute(
          'UPDATE bookings SET status = ?, partner_id = ?, matched_by = ? WHERE id = ?',
          ['accepted', fallback.id, 'fallback', bookingId]
        );
        await notifyUser(booking.customer_id, 'both', 'Job Matched', `${fallback.name} matched to your request!`);
        io.to(`user:${booking.customer_id}`).emit('booking:updated', {
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
