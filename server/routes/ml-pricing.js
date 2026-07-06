const { Router } = require('express');

module.exports = function mlPricingRoutes(prisma, ml) {
  const router = Router();

  router.post('/estimate-price', async (req, res) => {
    try {
      const { serviceId, location, lat, lng, time } = req.body;
      if (!serviceId) return res.status(400).json({ error: 'serviceId required' });

      const service = await prisma.service.findUnique({ where: { id: serviceId } });
      if (!service) return res.status(404).json({ error: 'Service not found' });

      const now = time ? new Date(time) : new Date();
      const hourOfDay = now.getHours();
      const dayOfWeek = now.getDay();
      const basePrice = service.basePrice || 100;

      const recentBookings = await prisma.booking.count({
        where: {
          serviceId,
          createdAt: { gte: new Date(Date.now() - 3600000) },
        },
      });
      const demandScore = Math.min(recentBookings / 10, 1.0);

      const availablePartners = await prisma.proAvailability.count({
        where: { isAvailable: true },
      });
      const totalPartners = await prisma.user.count({ where: { role: 'partner' } });
      const supplyScore = totalPartners > 0 ? Math.min(availablePartners / totalPartners, 1.0) : 0.3;

      const surgeData = { demand_ratio: demandScore > 0.5 ? 1.5 : 1.0, supply_ratio: supplyScore };
      const surgeMultiplier = demandScore > 0.7 && supplyScore < 0.4 ? 1.4 : 1.0;

      const prices = await ml.predictPrice([{
        booking_id: 'estimate',
        hour_of_day: hourOfDay,
        day_of_week: dayOfWeek,
        is_weekend: dayOfWeek >= 5,
        demand_score: demandScore,
        supply_score: supplyScore,
        surge_multiplier: surgeMultiplier,
        base_price: basePrice,
        customer_tier: req.user ? 0.7 : 0.3,
        location_density: lat && lng ? 0.7 : 0.5,
        season_factor: 0.5,
        historical_conv_rate: 0.6,
        service_category_encoded: 0,
        customer_lifetime_value: 0,
        urgent_hours: 48,
      }]);

      const mlPrice = prices[0];
      const multiplier = mlPrice?.price_multiplier ?? surgeMultiplier;

      const surge = await ml.detectSurge([{
        service_id: serviceId,
        bookings_last_hour: recentBookings,
        available_partners: availablePartners,
      }]);

      res.json({
        serviceId,
        basePrice,
        multiplier,
        finalPrice: Math.round(basePrice * multiplier * 100) / 100,
        demandScore,
        supplyScore,
        surgeStatus: surge[serviceId] || { surge: false, severity: 'none', multiplier: 1.0 },
        mlModel: 'tabnet',
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/recommend-bundles', async (req, res) => {
    try {
      const { selectedServices } = req.body;
      if (!selectedServices || !Array.isArray(selectedServices)) {
        return res.status(400).json({ error: 'selectedServices array required' });
      }

      const bundles = await ml.recommendBundles(selectedServices);
      res.json({ bundles });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/frequently-bought-together', async (req, res) => {
    try {
      const { serviceId } = req.body;
      if (!serviceId) return res.status(400).json({ error: 'serviceId required' });

      const recommendations = await ml.frequentlyBoughtTogether(serviceId);
      res.json({ serviceId, recommendations });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/eta', async (req, res) => {
    try {
      const { originLat, originLng, destLat, destLng, serviceId } = req.body;
      if (originLat == null || originLng == null || destLat == null || destLng == null) {
        return res.status(400).json({ error: 'origin and destination coordinates required' });
      }

      const now = new Date();
      const routes = [{
        route_id: 1,
        distance_km: haversine(originLat, originLng, destLat, destLng),
        hour_of_day: now.getHours(),
        day_of_week: now.getDay(),
        is_rush_hour: [7, 8, 9, 16, 17, 18].includes(now.getHours()),
        traffic_factor: 1.0,
        historical_avg_speed: 30,
        service_prep_time: 10,
        num_stops: 0,
        is_weekend: now.getDay() >= 5,
        weather_factor: 1.0,
      }];

      const etas = await ml.predictETA(routes);
      res.json({ eta: etas[0] || { eta_minutes: 20 } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/forecast', async (req, res) => {
    try {
      const { serviceId } = req.body;
      const now = new Date();

      const forecasts = await ml.forecast(now.getDay(), now.getHours(), serviceId || undefined);
      res.json({ forecasts });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
