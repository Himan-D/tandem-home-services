const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../..', '.env') });

const env = process.env;

function required(key) {
  const val = env[key];
  if (!val) {
    console.error(`[config] Missing required env var: ${key}`);
    process.exit(1);
  }
  return val;
}

const config = {
  port: parseInt(env.PORT || '3005', 10),
  nodeEnv: env.NODE_ENV || 'development',
  isProd: env.NODE_ENV === 'production',
  corsOrigin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : '*',

  database: {
    url: env.DATABASE_URL || '',
    schema: env.DB_SCHEMA || 'public',
    poolMin: parseInt(env.POOL_MIN || '2', 10),
    poolMax: parseInt(env.POOL_MAX || '20', 10),
  },

  redis: {
    url: env.REDIS_URL || '',
    maxRetries: 3,
  },

  osrm: {
    url: env.OSRM_URL || 'http://localhost:5000',
    timeout: 5000,
  },

  ml: {
    url: env.ML_SERVICE_URL || 'http://localhost:8000',
  },

  auth: {
    jwtSecret: env.JWT_SECRET || 'change-me-in-production',
    jwtExpiry: env.JWT_EXPIRY || '24h',
  },

  rider: {
    avgSpeedKph: parseFloat(env.RIDER_AVG_SPEED_KPH || '20'),
    maxConcurrent: parseInt(env.RIDER_MAX_CONCURRENT || '3', 10),
    searchRadiusKm: parseFloat(env.RIDER_SEARCH_RADIUS_KM || '5'),
  },

  darkStore: {
    searchRadiusKm: parseFloat(env.DARK_STORE_SEARCH_RADIUS_KM || '10'),
  },

  rateLimit: {
    authPerMin: parseInt(env.RATE_LIMIT_AUTH_PER_MIN || '5', 10),
    apiPerMin: parseInt(env.RATE_LIMIT_API_PER_MIN || '100', 10),
    orderPerMin: parseInt(env.RATE_LIMIT_ORDER_PER_MIN || '30', 10),
  },

  logging: {
    level: env.LOG_LEVEL || 'info',
  },

  googleMaps: {
    apiKey: env.GOOGLE_MAPS_API_KEY || '',
    hasKey: !!env.GOOGLE_MAPS_API_KEY,
  },

  gps: {
    minAccuracyM: parseFloat(env.GPS_MIN_ACCURACY_M || '50'),
    maxSpeedKph: parseFloat(env.GPS_MAX_SPEED_KPH || '200'),
    snapIntervalMs: parseInt(env.GPS_SNAP_INTERVAL_MS || '10000'),
    snapBatchSize: parseInt(env.GPS_SNAP_BATCH_SIZE || '100'),
    kalmanProcessNoise: parseFloat(env.GPS_KALMAN_PROCESS_NOISE || '3'),
    kalmanMeasurementNoise: parseFloat(env.GPS_KALMAN_MEASUREMENT_NOISE || '10'),
  },

  geofence: {
    radiusM: parseFloat(env.GEOFENCE_RADIUS_M || '75'),
    exitRadiusM: parseFloat(env.GEOFENCE_EXIT_RADIUS_M || '120'),
    dwellSec: parseInt(env.GEOFENCE_DWELL_SEC || '30'),
    approachingM: parseFloat(env.GEOFENCE_APPROACHING_M || '500'),
  },
};

module.exports = config;
