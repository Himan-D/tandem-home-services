const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const googleMaps = require('../lib/google-maps');
const logger = require('../lib/logger');

const autocompleteSchema = z.object({
  input: z.string().min(2).max(200),
  sessionToken: z.string().optional(),
});

const geocodeSchema = z.object({
  address: z.string().min(3).max(300),
});

const placeDetailsSchema = z.object({
  placeId: z.string().min(3),
});

module.exports = function () {
  const router = express.Router();

  router.use((req, res, next) => {
    if (!googleMaps.isAvailable) {
      return res.status(503).json({
        error: 'Google Maps API not configured. Set GOOGLE_MAPS_API_KEY.',
      });
    }
    next();
  });

  router.get('/autocomplete', authenticateToken, asyncHandler(async (req, res) => {
    const input = req.query.input;
    if (!input || input.length < 2) {
      return res.status(400).json({ error: 'input parameter required (min 2 chars)' });
    }
    const sessionToken = req.query.sessionToken || undefined;
    const predictions = await googleMaps.placeAutocomplete(input, sessionToken);
    res.json({ predictions });
  }));

  router.get('/details/:placeId', authenticateToken, asyncHandler(async (req, res) => {
    const details = await googleMaps.placeDetails(req.params.placeId);
    if (!details) return res.status(404).json({ error: 'Place not found' });
    res.json(details);
  }));

  router.post('/geocode', authenticateToken, validate(geocodeSchema), asyncHandler(async (req, res) => {
    const result = await googleMaps.geocode(req.body.address);
    if (!result) return res.status(404).json({ error: 'Address not found' });
    res.json(result);
  }));

  router.get('/reverse-geocode', authenticateToken, asyncHandler(async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng required' });
    }
    const result = await googleMaps.reverseGeocode(lat, lng);
    if (!result) return res.status(404).json({ error: 'Address not found' });
    res.json(result);
  }));

  router.get('/directions', authenticateToken, asyncHandler(async (req, res) => {
    const originLat = parseFloat(req.query.originLat);
    const originLng = parseFloat(req.query.originLng);
    const destLat = parseFloat(req.query.destLat);
    const destLng = parseFloat(req.query.destLng);
    if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
      return res.status(400).json({ error: 'originLat, originLng, destLat, destLng required' });
    }
    const route = await googleMaps.directions(
      { lat: originLat, lng: originLng },
      { lat: destLat, lng: destLng }
    );
    res.json(route);
  }));

  return router;
};
