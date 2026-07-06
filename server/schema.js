const bcrypt = require('bcrypt');
const logger = require('./lib/logger');
const config = require('./config');
const { prisma } = require('./db');

const TABLES = [
  `CREATE EXTENSION IF NOT EXISTS postgis`,
  `CREATE TABLE IF NOT EXISTS users (
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
  )`,
  `CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY, title TEXT, base_price REAL, category TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY, service_id TEXT, service_title TEXT,
    customer_id INTEGER, partner_id INTEGER,
    location TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION,
    time TEXT, payout INTEGER, status TEXT,
    rated INTEGER DEFAULT 0, matched_by TEXT, match_score REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY, user_id INTEGER,
    title TEXT, message TEXT, type TEXT,
    read INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY, booking_id TEXT,
    customer_id INTEGER, partner_id INTEGER,
    rating INTEGER, review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY, booking_id TEXT,
    customer_id INTEGER, reason TEXT, description TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY, booking_id TEXT,
    sender_id INTEGER, message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS auth_tokens (
    id SERIAL PRIMARY KEY, user_id INTEGER,
    token TEXT, type TEXT,
    expires_at TIMESTAMP,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS declined_bookings (
    booking_id TEXT, partner_id INTEGER,
    PRIMARY KEY (booking_id, partner_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_interactions (
    id SERIAL PRIMARY KEY, user_id INTEGER,
    service_id TEXT, rating REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS pro_availability (
    partner_id INTEGER PRIMARY KEY,
    is_available INTEGER DEFAULT 1,
    lat DOUBLE PRECISION, lng DOUBLE PRECISION,
    geom geometry(Point, 4326),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS promo_codes (
    id SERIAL PRIMARY KEY, code TEXT UNIQUE,
    discount_percent INTEGER DEFAULT 10,
    max_uses INTEGER DEFAULT 100,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS location_history (
    id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL,
    lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
    geom geometry(Point, 4326),
    source TEXT DEFAULT 'gps',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS dark_stores (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL,
    location TEXT, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
    geom geometry(Point, 4326),
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    dark_store_id INTEGER REFERENCES dark_stores(id) ON DELETE CASCADE,
    service_id TEXT REFERENCES services(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    reserved INTEGER DEFAULT 0,
    min_threshold INTEGER DEFAULT 5,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dark_store_id, service_id)
  )`,
  `CREATE TABLE IF NOT EXISTS order_state_machine (
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
  )`,
  `CREATE TABLE IF NOT EXISTS rider_tasks (
    id SERIAL PRIMARY KEY, rider_id INTEGER NOT NULL,
    order_id TEXT NOT NULL, task_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    lat DOUBLE PRECISION, lng DOUBLE PRECISION,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    family TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS partner_shifts (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    break_start TEXT,
    break_end TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_areas (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    boundary geometry(Polygon, 4326) NOT NULL,
    price_zone REAL DEFAULT 1.0,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS partner_response TEXT`,
  `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS customer_followup TEXT`,
  `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS admin_notes TEXT`,
  `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolved_by INTEGER REFERENCES users(id)`,
  `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP`,
  `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolution_type TEXT`,
  `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolution_notes TEXT`,
  `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_id TEXT`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified INTEGER DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified INTEGER DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS background_check_status TEXT DEFAULT 'not_started'`,
  `CREATE TABLE IF NOT EXISTS background_checks (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'pending', 'in_progress', 'clear', 'disputed', 'suspended', 'failed')),
    provider TEXT DEFAULT 'checkr',
    external_id TEXT,
    report_url TEXT,
    consent_given INTEGER DEFAULT 0,
    consent_at TIMESTAMP,
    initiated_by INTEGER REFERENCES users(id),
    initiated_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(partner_id)
  )`,
  `CREATE TABLE IF NOT EXISTS verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    type TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, type)
  )`,
  `CREATE TABLE IF NOT EXISTS saved_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    address TEXT NOT NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    is_default INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS gift_cards (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    initial_balance REAL NOT NULL,
    remaining_balance REAL NOT NULL,
    purchaser_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_email TEXT,
    recipient_name TEXT,
    message TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'partially_redeemed', 'redeemed', 'expired', 'cancelled')),
    expires_at TIMESTAMP NOT NULL,
    redeemed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS gift_card_redemptions (
    id SERIAL PRIMARY KEY,
    gift_card_id INTEGER NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    redeemed_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS recurring_bookings (
    id TEXT PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id TEXT NOT NULL,
    service_title TEXT,
    location TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    time TEXT,
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
    payout INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    next_date TEXT,
    end_date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
];

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_users_geom ON users USING GIST (geom)`,
  `CREATE INDEX IF NOT EXISTS idx_dark_stores_geom ON dark_stores USING GIST (geom)`,
  `CREATE INDEX IF NOT EXISTS idx_pro_avail_geom ON pro_availability USING GIST (geom)`,
  `CREATE INDEX IF NOT EXISTS idx_location_hist_geom ON location_history USING GIST (geom)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON order_state_machine (status)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_customer ON order_state_machine (customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_rider ON order_state_machine (rider_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rider_tasks_rider ON rider_tasks (rider_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_store ON inventory (dark_store_id, service_id)`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens (token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_partner_shifts_partner ON partner_shifts (partner_id, day_of_week)`,
  `CREATE INDEX IF NOT EXISTS idx_service_areas_boundary ON service_areas USING GIST (boundary)`,
];

const GEOM_TRIGGER_FN = `
  CREATE OR REPLACE FUNCTION update_geom_from_latlng()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
      NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql
`;

const GEOM_TRIGGERS = ['users', 'dark_stores', 'pro_availability', 'location_history'].map((table) => `
  DROP TRIGGER IF EXISTS trg_${table}_geom ON ${table};
  CREATE TRIGGER trg_${table}_geom
  BEFORE INSERT OR UPDATE OF lat, lng ON ${table}
  FOR EACH ROW EXECUTE FUNCTION update_geom_from_latlng()
`);

async function runSchema() {
  for (const sql of TABLES) await prisma.$executeRawUnsafe(sql);
  await prisma.$executeRawUnsafe(GEOM_TRIGGER_FN);
  for (const sql of GEOM_TRIGGERS) await prisma.$executeRawUnsafe(sql);
  for (const sql of INDEXES) await prisma.$executeRawUnsafe(sql);
  logger.info('Schema initialized via Prisma');
}

async function bootstrapAdmin() {
  const count = await prisma.user.count();
  if (count > 0) return;

  const hash = await bcrypt.hash(config.auth.bootstrapPassword, 10);
  await prisma.user.create({
    data: {
      name: 'Admin',
      email: config.auth.bootstrapEmail,
      password: hash,
      role: 'admin',
      ratingAvg: 5.0,
      jobsCompleted: 0,
      responseTimeMins: 5,
    },
  });
  logger.warn({ email: config.auth.bootstrapEmail }, 'Bootstrap admin created');
}

module.exports = { runSchema, bootstrapAdmin };
