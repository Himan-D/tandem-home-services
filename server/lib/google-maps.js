const {
  Client,
  RoadsClient,
  PlacesClient,
  GeocodeClient,
  DirectionsClient,
  DistanceMatrixClient,
} = require('@googlemaps/google-maps-services-js');
const config = require('../config');
const logger = require('./logger');
const routing = require('./routing');

const client = new Client({});
const hasKey = config.googleMaps.hasKey;

if (hasKey) {
  logger.info('Google Maps APIs enabled (Roads, Distance Matrix, Geocoding, Places, Directions)');
} else {
  logger.warn('GOOGLE_MAPS_API_KEY not set — using OSRM/haversine fallback for all geo features');
}

const API_KEY = config.googleMaps.apiKey;

async function snapToRoads(points) {
  if (!hasKey || points.length === 0) return points;

  try {
    const path = points.map((p) => `${p.lat},${p.lng}`).join('|');
    const response = await client.snapToRoads({
      params: {
        path,
        interpolate: true,
        key: API_KEY,
      },
      timeout: 5000,
    });

    return response.data.snappedPoints.map((sp) => ({
      lat: sp.location.latitude,
      lng: sp.location.longitude,
      placeId: sp.placeId || null,
      originalIndex: sp.originalIndex !== undefined ? sp.originalIndex : null,
    }));
  } catch (err) {
    logger.warn({ err: err.message, count: points.length }, 'Google snapToRoads failed');
    return points;
  }
}

async function nearestRoad(lat, lng) {
  if (!hasKey) return { lat, lng };

  try {
    const response = await client.nearestRoads({
      params: {
        points: [{ latitude: lat, longitude: lng }],
        key: API_KEY,
      },
      timeout: 5000,
    });

    if (response.data.snappedPoints && response.data.snappedPoints.length > 0) {
      const sp = response.data.snappedPoints[0];
      return { lat: sp.location.latitude, lng: sp.location.longitude, placeId: sp.placeId };
    }
    return { lat, lng };
  } catch (err) {
    logger.warn({ err: err.message }, 'Google nearestRoads failed');
    return { lat, lng };
  }
}

async function distanceMatrix(origins, destinations) {
  if (!hasKey || origins.length === 0 || destinations.length === 0) {
    return routing.getTable(origins[0], destinations);
  }

  try {
    const response = await client.distancematrix({
      params: {
        origins: origins.map((o) => `${o.lat},${o.lng}`),
        destinations: destinations.map((d) => `${d.lat},${d.lng}`),
        departure_time: 'now',
        traffic_model: 'best_guess',
        units: 'metric',
        key: API_KEY,
      },
      timeout: 5000,
    });

    const rows = response.data.rows || [];
    return origins.map((_, originIdx) => {
      const elements = rows[originIdx]?.elements || [];
      return destinations.map((_, destIdx) => {
        const el = elements[destIdx];
        if (!el || el.status !== 'OK') return { durationMin: null, distanceKm: null, source: 'google' };
        return {
          durationMin: el.duration_in_traffic ? el.duration_in_traffic.value / 60 : el.duration.value / 60,
          distanceKm: el.distance.value / 1000,
          source: 'google_traffic',
        };
      });
    });
  } catch (err) {
    logger.warn({ err: err.message }, 'Google DistanceMatrix failed, using OSRM');
    const results = [];
    for (const origin of origins) {
      results.push(await routing.getTable(origin, destinations));
    }
    return results;
  }
}

async function getETA(origin, destination) {
  if (!hasKey) return routing.getETA(origin, destination);

  const matrix = await distanceMatrix([origin], [destination]);
  const result = matrix[0]?.[0];
  if (!result || !result.durationMin) return routing.getETA(origin, destination);
  return {
    distanceKm: Math.round(result.distanceKm * 100) / 100,
    durationMin: Math.round(result.durationMin),
    source: result.source,
  };
}

async function geocode(address) {
  if (!hasKey) {
    throw new Error('GOOGLE_MAPS_API_KEY required for geocoding');
  }

  const response = await client.geocode({
    params: { address, key: API_KEY },
    timeout: 5000,
  });

  if (!response.data.results || response.data.results.length === 0) {
    return null;
  }

  const result = response.data.results[0];
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
    components: result.address_components,
  };
}

async function reverseGeocode(lat, lng) {
  if (!hasKey) {
    throw new Error('GOOGLE_MAPS_API_KEY required for reverse geocoding');
  }

  const response = await client.reverseGeocode({
    params: { latlng: { latitude: lat, longitude: lng }, key: API_KEY },
    timeout: 5000,
  });

  if (!response.data.results || response.data.results.length === 0) return null;
  const result = response.data.results[0];
  return {
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
    components: result.address_components,
  };
}

async function placeAutocomplete(input, sessionToken) {
  if (!hasKey) {
    throw new Error('GOOGLE_MAPS_API_KEY required for Places Autocomplete');
  }

  const response = await client.placeAutocomplete({
    params: {
      input,
      types: 'address',
      components: ['country:us'],
      sessiontoken: sessionToken || undefined,
      key: API_KEY,
    },
    timeout: 5000,
  });

  return (response.data.predictions || []).map((p) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text || '',
    secondaryText: p.structured_formatting?.secondary_text || '',
  }));
}

async function placeDetails(placeId) {
  if (!hasKey) {
    throw new Error('GOOGLE_MAPS_API_KEY required for Place Details');
  }

  const response = await client.placeDetails({
    params: {
      place_id: placeId,
      fields: ['formatted_address', 'geometry', 'name', 'address_components'],
      key: API_KEY,
    },
    timeout: 5000,
  });

  const result = response.data.result;
  if (!result) return null;

  return {
    name: result.name,
    formattedAddress: result.formatted_address,
    lat: result.geometry?.location?.lat,
    lng: result.geometry?.location?.lng,
    components: result.address_components,
  };
}

async function directions(origin, destination, waypoints) {
  if (!hasKey) {
    return routing.getRoute([origin, ...waypoints, destination]);
  }

  try {
    const response = await client.directions({
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        waypoints: waypoints && waypoints.length > 0
          ? waypoints.map((w) => `${w.lat},${w.lng}`).join('|')
          : undefined,
        departure_time: 'now',
        traffic_model: 'best_guess',
        key: API_KEY,
      },
      timeout: 5000,
    });

    const route = response.data.routes?.[0]?.legs?.[0];
    if (!route) return routing.getRoute([origin, destination]);

    return {
      distanceKm: route.distance.value / 1000,
      durationMin: route.duration_in_traffic ? route.duration_in_traffic.value / 60 : route.duration.value / 60,
      steps: route.steps ? route.steps.map((s) => ({
        instruction: s.html_instructions?.replace(/<[^>]+>/g, '') || '',
        distanceKm: s.distance.value / 1000,
        durationMin: s.duration.value / 60,
      })) : [],
      source: 'google_traffic',
    };
  } catch (err) {
    logger.warn({ err: err.message }, 'Google Directions failed, using OSRM');
    return routing.getRoute([origin, destination]);
  }
}

module.exports = {
  snapToRoads,
  nearestRoad,
  distanceMatrix,
  getETA,
  geocode,
  reverseGeocode,
  placeAutocomplete,
  placeDetails,
  directions,
  isAvailable: hasKey,
};
