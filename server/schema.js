const bcrypt = require('bcrypt');
const logger = require('./lib/logger');
const geo = require('./lib/geo');
const config = require('./config');

const SCHEMA_SQL = `
  CREATE EXTENSION IF NOT EXISTS postgis;

  ${geo.geomTriggerSQL}

  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT, email TEXT UNIQUE, password TEXT, role TEXT,
    wallet_balance REAL DEFAULT 0,
    is_plus_member INTEGER DEFAULT 0,
    services_offered TEXT, phone TEXT, location TEXT,
    lat DOUBLE PRECISION, lng DOUBLE PRECISION,
    geom geometry(Point, 4326),
    rating_avg REAL DEFAULT 4.5,
    jobs_completed INTEGER DEFAULT 0,
    response_time_mins REAL DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY, title TEXT, base_price REAL, category TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY, service_id TEXT, service_title TEXT,
    customer_id INTEGER, partner_id INTEGER,
    location TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION,
    time TEXT, payout INTEGER, status TEXT,
    rated INTEGER DEFAULT 0, matched_by TEXT, match_score REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY, user_id INTEGER,
    title TEXT, message TEXT, type TEXT,
    read INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY, booking_id TEXT,
    customer_id INTEGER, partner_id INTEGER,
    rating INTEGER, review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY, booking_id TEXT,
    customer_id INTEGER, reason TEXT, description TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY, booking_id TEXT,
    sender_id INTEGER, message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS auth_tokens (
    id SERIAL PRIMARY KEY, user_id INTEGER,
    token TEXT, type TEXT,
    expires_at TIMESTAMP,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS declined_bookings (
    booking_id TEXT, partner_id INTEGER,
    PRIMARY KEY (booking_id, partner_id)
  );

  CREATE TABLE IF NOT EXISTS user_interactions (
    id SERIAL PRIMARY KEY, user_id INTEGER,
    service_id TEXT, rating REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pro_availability (
    partner_id INTEGER PRIMARY KEY,
    is_available INTEGER DEFAULT 1,
    lat DOUBLE PRECISION, lng DOUBLE PRECISION,
    geom geometry(Point, 4326),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS promo_codes (
    id SERIAL PRIMARY KEY, code TEXT UNIQUE,
    discount_percent INTEGER DEFAULT 10,
    max_uses INTEGER DEFAULT 100,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS location_history (
    id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL,
    lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
    geom geometry(Point, 4326),
    source TEXT DEFAULT 'gps',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dark_stores (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL,
    location TEXT, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
    geom geometry(Point, 4326),
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    dark_store_id INTEGER REFERENCES dark_stores(id) ON DELETE CASCADE,
    service_id TEXT REFERENCES services(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    reserved INTEGER DEFAULT 0,
    min_threshold INTEGER DEFAULT 5,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dark_store_id, service_id)
  );

  CREATE TABLE IF NOT EXISTS order_state_machine (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL, service_id TEXT NOT NULL,
    dark_store_id INTEGER, rider_id INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    amount REAL NOT NULL, location TEXT,
    lat DOUBLE PRECISION, lng DOUBLE PRECISION,
    assigned_at TIMESTAMP, picked_up_at TIMESTAMP, delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rider_tasks (
    id SERIAL PRIMARY KEY, rider_id INTEGER NOT NULL,
    order_id TEXT NOT NULL, task_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    lat DOUBLE PRECISION, lng DOUBLE PRECISION,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_geom ON users USING GIST (geom);
  CREATE INDEX IF NOT EXISTS idx_dark_stores_geom ON dark_stores USING GIST (geom);
  CREATE INDEX IF NOT EXISTS idx_pro_avail_geom ON pro_availability USING GIST (geom);
  CREATE INDEX IF NOT EXISTS idx_location_hist_geom ON location_history USING GIST (geom);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON order_state_machine (status);
  CREATE INDEX IF NOT EXISTS idx_orders_customer ON order_state_machine (customer_id);
  CREATE INDEX IF NOT EXISTS idx_orders_rider ON order_state_machine (rider_id);
  CREATE INDEX IF NOT EXISTS idx_rider_tasks_rider ON rider_tasks (rider_id, status);
  CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
  CREATE INDEX IF NOT EXISTS idx_inventory_store ON inventory (dark_store_id, service_id);

  ${geo.createGeomTrigger('users')}
  ${geo.createGeomTrigger('dark_stores')}
  ${geo.createGeomTrigger('pro_availability')}
  ${geo.createGeomTrigger('location_history')}
`;

async function runSchema(db) {
  await db.exec(SCHEMA_SQL);
  logger.info('Schema initialized (PostGIS enabled, geom triggers active)');
}

async function bootstrapAdmin(db) {
  const userCount = await db.queryOne('SELECT COUNT(*) as count FROM users');
  if (userCount.count > 0) return;

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@lumina.app';
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'changeme123';
  const hash = await bcrypt.hash(adminPassword, 10);

  await db.execute(
    'INSERT INTO users (name, email, password, role, rating_avg, jobs_completed, response_time_mins) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['Admin', adminEmail, hash, 'admin', 5.0, 0, 5]
  );

  logger.warn(
    { email: adminEmail },
    'Bootstrap admin created — change the password immediately via PUT /api/me/password'
  );
}

module.exports = { runSchema, bootstrapAdmin };
