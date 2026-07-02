const http = require('http');
const config = require('../config');
const logger = require('./logger');

const OSRM_URL = config.osrm.url;
const TIMEOUT = config.osrm.timeout;

function osrmRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, OSRM_URL);
    const opts = {
      method: 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { Accept: 'application/json' },
      timeout: TIMEOUT,
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.code !== 'Ok') {
            reject(new Error(`OSRM error: ${parsed.message || parsed.code}`));
            return;
          }
          resolve(parsed);
        } catch (err) {
          reject(new Error('OSRM returned non-JSON response'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('OSRM request timeout'));
    });
    req.end();
  });
}

function haversineKm(lat1, lng1, lat2, lng2) {
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

async function getRoute(coords) {
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(';');
  try {
    const result = await osrmRequest(
      `/route/v1/driving/${coordStr}?overview=false&annotations=true`
    );
    const route = result.routes[0];
    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      source: 'osrm',
    };
  } catch (err) {
    logger.warn({ err: err.message }, 'OSRM route failed, using haversine fallback');
    let totalKm = 0;
    for (let i = 1; i < coords.length; i++) {
      totalKm += haversineKm(
        coords[i - 1].lat,
        coords[i - 1].lng,
        coords[i].lat,
        coords[i].lng
      );
    }
    return {
      distanceKm: Math.round(totalKm * 100) / 100,
      durationMin: (totalKm / config.rider.avgSpeedKph) * 60,
      source: 'haversine',
    };
  }
}

async function getTable(source, destinations) {
  const allCoords = [source, ...destinations];
  const coordStr = allCoords.map((c) => `${c.lng},${c.lat}`).join(';');
  const srcIdx = '0';
  const dstIdx = destinations.map((_, i) => i + 1).join(';');
  try {
    const result = await osrmRequest(
      `/table/v1/driving/${coordStr}?sources=${srcIdx}&destinations=${dstIdx}&annotations=duration,distance`
    );
    const durations = result.durations?.[0] || [];
    const distances = result.distances?.[0] || [];
    return destinations.map((_, i) => ({
      durationMin: durations[i] ? durations[i] / 60 : null,
      distanceKm: distances[i] ? distances[i] / 1000 : null,
    }));
  } catch (err) {
    logger.warn({ err: err.message }, 'OSRM table failed, using haversine fallback');
    return destinations.map((d) => {
      const km = haversineKm(source.lat, source.lng, d.lat, d.lng);
      return {
        durationMin: (km / config.rider.avgSpeedKph) * 60,
        distanceKm: Math.round(km * 100) / 100,
      };
    });
  }
}

async function getETA(from, to) {
  const route = await getRoute([from, to]);
  return {
    distanceKm: route.distanceKm,
    durationMin: Math.round(route.durationMin),
    source: route.source,
  };
}

async function isAvailable() {
  try {
    await osrmRequest('/');
    return true;
  } catch {
    return false;
  }
}

module.exports = { getRoute, getTable, getETA, haversineKm, isAvailable };
