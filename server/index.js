const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { RecommendationClient } = require('./recommendation');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'tandem-super-secret-key-2026';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const ml = new RecommendationClient(ML_SERVICE_URL);
const onlinePartners = new Map();

let db;

async function setupDB() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT,
      walletBalance REAL DEFAULT 0,
      isPlusMember BOOLEAN DEFAULT 0,
      servicesOffered TEXT,
      phone TEXT,
      location TEXT,
      rating_avg REAL DEFAULT 4.5,
      jobs_completed INTEGER DEFAULT 0,
      response_time_mins REAL DEFAULT 30
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      title TEXT,
      basePrice REAL,
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      serviceId TEXT,
      serviceTitle TEXT,
      customerId INTEGER,
      partnerId INTEGER,
      location TEXT,
      lat REAL,
      lng REAL,
      time TEXT,
      payout INTEGER,
      status TEXT,
      rated INTEGER DEFAULT 0,
      matched_by TEXT,
      match_score REAL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      title TEXT,
      message TEXT,
      type TEXT,
      read INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bookingId TEXT,
      customerId INTEGER,
      partnerId INTEGER,
      rating INTEGER,
      review TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bookingId TEXT,
      customerId INTEGER,
      reason TEXT,
      description TEXT,
      status TEXT DEFAULT 'open',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bookingId TEXT,
      senderId INTEGER,
      message TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      token TEXT,
      type TEXT,
      expiresAt DATETIME,
      used INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS declined_bookings (
      bookingId TEXT,
      partnerId INTEGER,
      PRIMARY KEY (bookingId, partnerId)
    );

    CREATE TABLE IF NOT EXISTS user_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      service_id TEXT,
      rating REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pro_availability (
      partnerId INTEGER PRIMARY KEY,
      is_available INTEGER DEFAULT 1,
      lat REAL,
      lng REAL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  for (const col of ['servicesOffered', 'phone', 'location', 'rating_avg', 'jobs_completed', 'response_time_mins']) {
    try { await db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT`); } catch(e) {}
  }

  const count = await db.get('SELECT COUNT(*) as count FROM services');
  if (count.count === 0) {
    const defaultServices = [
      ['hourly', 'Hourly bookings', 40, 'cleaning'],
      ['bathroom', 'Bathroom Cleaning', 60, 'cleaning'],
      ['fridge', 'Fridge Cleaning', 45, 'cleaning'],
      ['packing', 'Packing or Unpacking', 50, 'moving'],
      ['kitchen', 'Kitchen Prep', 55, 'cleaning'],
      ['dusting', 'Dusting & Wiping', 40, 'cleaning'],
      ['wardrobe', 'Wardrobe Cleaning', 70, 'cleaning'],
      ['car', 'Car Cleaning', 35, 'automotive'],
      ['plumber', 'Plumbing Service', 80, 'repair'],
      ['electrician', 'Electrician', 85, 'repair'],
      ['ac_repair', 'AC Service & Repair', 90, 'repair'],
      ['pest_control', 'Pest Control', 120, 'specialty'],
      ['painting', 'Home Painting', 250, 'improvement'],
      ['handyman', 'Handyman / Carpentry', 60, 'repair'],
    ];
    for (const s of defaultServices) {
      await db.run('INSERT INTO services (id, title, basePrice, category) VALUES (?, ?, ?, ?)', s);
    }
  }

  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    const hash = await bcrypt.hash('password123', 10);
    await db.run('INSERT INTO users (name, email, password, role, rating_avg, jobs_completed, response_time_mins) VALUES (?, ?, ?, ?, ?, ?, ?)', ['Admin User', 'admin@tandem.com', hash, 'admin', 5.0, 0, 5]);
    await db.run('INSERT INTO users (name, email, password, role, servicesOffered, rating_avg, jobs_completed, response_time_mins) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['Tandem Pro', 'pro@tandem.com', hash, 'partner', '["plumber","electrician","handyman"]', 4.9, 142, 12]);
    await db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Consumer Test', 'user@tandem.com', hash, 'consumer']);
  }
}

// --- Socket.IO ---
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Invalid token'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', async (socket) => {
  const user = socket.user;

  socket.join(`user:${user.id}`);
  socket.join(`role:${user.role}`);

  if (user.role === 'partner') {
    const row = await db.get('SELECT servicesOffered, location FROM users WHERE id = ?', user.id);
    let services = [];
    try { services = JSON.parse(row?.servicesOffered || '[]'); } catch(e) {}
    onlinePartners.set(user.id, { socketId: socket.id, services, location: row?.location || '' });
    io.to('role:admin').emit('partner:online', { partnerId: user.id, name: user.name });
  }

  socket.on('partner:location', async (data) => {
    if (user.role !== 'partner') return;
    await db.run('INSERT OR REPLACE INTO pro_availability (partnerId, is_available, lat, lng, updated_at) VALUES (?, 1, ?, ?, CURRENT_TIMESTAMP)', [user.id, data.lat, data.lng]);
    onlinePartners.set(user.id, { ...(onlinePartners.get(user.id) || {}), lat: data.lat, lng: data.lng });
  });

  socket.on('partner:accept', async (bookingId) => {
    const booking = await db.get('SELECT * FROM bookings WHERE id = ? AND status = ?', [bookingId, 'pending']);
    if (!booking) return socket.emit('error', 'Booking not available');

    await db.run('UPDATE bookings SET status = ?, partnerId = ? WHERE id = ?', ['accepted', user.id, bookingId]);
    await notifyUser(booking.customerId, 'in_app', 'Job Accepted', `${user.name} has accepted your request. Track them live!`);

    io.to(`user:${booking.customerId}`).emit('booking:updated', { id: bookingId, status: 'accepted', partnerId: user.id, partnerName: user.name });
    io.to(`user:${booking.customerId}`).emit('notification', { title: 'Job Accepted', message: `${user.name} is on their way!` });
    socket.emit('booking:accepted', { id: bookingId });
  });

  socket.on('partner:decline', async (bookingId) => {
    await db.run('INSERT OR IGNORE INTO declined_bookings (bookingId, partnerId) VALUES (?, ?)', [bookingId, user.id]);
    socket.emit('booking:declined', { id: bookingId });
    matchBooking(bookingId);
  });

  socket.on('partner:complete', async (bookingId) => {
    const booking = await db.get('SELECT * FROM bookings WHERE id = ? AND partnerId = ?', [bookingId, user.id]);
    if (!booking) return socket.emit('error', 'Not authorized');
    await db.run('UPDATE bookings SET status = ? WHERE id = ?', ['completed', bookingId]);
    await db.run('UPDATE users SET jobs_completed = jobs_completed + 1 WHERE id = ?', user.id);
    await notifyUser(booking.customerId, 'in_app', 'Service Complete!', 'Your Tandem service is complete! Please review and rate.');

    io.to(`user:${booking.customerId}`).emit('booking:updated', { id: bookingId, status: 'completed' });
    io.to(`user:${booking.customerId}`).emit('notification', { title: 'Service Complete!', message: 'Please rate your experience.' });
    socket.emit('booking:completed', { id: bookingId });
  });

  socket.on('chat:send', async (data) => {
    const { bookingId, message } = data;
    await db.run('INSERT INTO chat_messages (bookingId, senderId, message) VALUES (?, ?, ?)', [bookingId, user.id, message]);
    const msg = { id: Date.now(), bookingId, senderId: user.id, senderName: user.name, message, createdAt: new Date().toISOString() };
    io.to(`booking:${bookingId}`).emit('chat:message', msg);
  });

  socket.on('booking:join', (bookingId) => {
    socket.join(`booking:${bookingId}`);
  });

  socket.on('disconnect', () => {
    if (user.role === 'partner') {
      onlinePartners.delete(user.id);
      io.to('role:admin').emit('partner:offline', { partnerId: user.id });
    }
  });
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403);
    req.user = decoded;
    next();
  });
}

async function notifyUser(userId, method, title, message) {
  await db.run('INSERT INTO notifications (userId, title, message, type) VALUES (?, ?, ?, ?)', [userId, title, message, method]);
  const user = await db.get('SELECT email, name FROM users WHERE id = ?', userId);
  if (user) {
    if (method === 'email' || method === 'both') console.log(`[EMAIL to ${user.email}] ${title}: ${message}`);
    if (method === 'sms' || method === 'both') console.log(`[SMS to ${user.name}] ${title}: ${message}`);
  }
  io.to(`user:${userId}`).emit('notification', { title, message });
}

// --- Real Matching Engine ---
async function matchBooking(bookingId) {
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', bookingId);
  if (!booking || booking.status !== 'pending') return;

  const customer = await db.get('SELECT * FROM users WHERE id = ?', booking.customerId);
  if (!customer) return;

  const allPartners = await db.all("SELECT id, name, rating_avg, jobs_completed, response_time_mins, servicesOffered, location, isPlusMember FROM users WHERE role = 'partner'");

  const declined = await db.all('SELECT partnerId FROM declined_bookings WHERE bookingId = ?', bookingId);
  const declinedIds = new Set(declined.map(d => d.partnerId));

  const candidates = [];
  for (const partner of allPartners) {
    if (declinedIds.has(partner.id)) continue;

    let offeredServices = [];
    try { offeredServices = JSON.parse(partner.servicesOffered || '[]'); } catch(e) {}
    const skillsMatch = offeredServices.includes(booking.serviceId) ? 1.0 : 0.0;
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
      is_plus_member: partner.isPlusMember === 1,
    });
  }

  if (candidates.length === 0) return;

  try {
    const ranked = await ml.rankPros(candidates);
    const topMatch = ranked[0];

    const partner = allPartners.find(p => p.id === topMatch.pro_id);
    if (!partner) return;

    await db.run('UPDATE bookings SET status = ?, partnerId = ?, match_score = ?, matched_by = ? WHERE id = ?', ['accepted', partner.id, topMatch.score, 'ml_engine', bookingId]);
    await notifyUser(booking.customerId, 'both', 'Job Accepted', `${partner.name} has been matched to your request!`);

    io.to(`user:${booking.customerId}`).emit('booking:updated', { id: bookingId, status: 'accepted', partnerId: partner.id, partnerName: partner.name, matchScore: topMatch.score });
    io.to(`user:${partner.id}`).emit('booking:assigned', { id: bookingId, serviceTitle: booking.serviceTitle, customerName: customer.name, location: booking.location, time: booking.time });
  } catch (err) {
    console.error('ML service unavailable, using fallback matching:', err.message);
    const fallback = allPartners.find(p => !declinedIds.has(p.id) && p.servicesOffered?.includes(booking.serviceId));
    if (fallback) {
      await db.run('UPDATE bookings SET status = ?, partnerId = ? WHERE id = ?', ['accepted', fallback.id, bookingId]);
      await notifyUser(booking.customerId, 'both', 'Job Accepted', `${fallback.name} has been matched to your request!`);
      io.to(`user:${booking.customerId}`).emit('booking:updated', { id: bookingId, status: 'accepted', partnerId: fallback.id, partnerName: fallback.name });
      io.to(`user:${fallback.id}`).emit('booking:assigned', { id: bookingId, serviceTitle: booking.serviceTitle, customerName: customer.name, location: booking.location, time: booking.time });
    }
  }
}

// --- Auth Routes ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE email = ?', email);
  if (!user) return res.status(400).json({ error: 'User not found' });
  if (await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } else {
    res.status(400).json({ error: 'Invalid password' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hash, role || 'consumer']);
    await notifyUser(result.lastID, 'email', 'Welcome to Tandem', 'Thanks for joining! Your account is ready.');
    const token = jwt.sign({ id: result.lastID, role: role || 'consumer', name }, JWT_SECRET);
    res.status(201).json({ token, user: { id: result.lastID, name, role: role || 'consumer' } });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/api/auth/magic-link', async (req, res) => {
  const { email } = req.body;
  const user = await db.get('SELECT * FROM users WHERE email = ?', email);
  if (!user) return res.status(400).json({ error: 'User not found' });
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
  await db.run('INSERT INTO auth_tokens (userId, token, type, expiresAt) VALUES (?, ?, ?, ?)', [user.id, otp, 'magic_link', expiresAt]);
  await notifyUser(user.id, 'email', 'Your Tandem Magic Link', `Your one-time login code is: ${otp}. It expires in 15 minutes.`);
  res.json({ success: true, message: 'Magic link sent' });
});

app.post('/api/auth/verify-magic-link', async (req, res) => {
  const { email, token } = req.body;
  const user = await db.get('SELECT * FROM users WHERE email = ?', email);
  if (!user) return res.status(400).json({ error: 'User not found' });
  const authRecord = await db.get('SELECT * FROM auth_tokens WHERE userId = ? AND token = ? AND type = ? AND used = 0 AND expiresAt > ?', [user.id, token, 'magic_link', new Date().toISOString()]);
  if (!authRecord) return res.status(400).json({ error: 'Invalid or expired magic link' });
  await db.run('UPDATE auth_tokens SET used = 1 WHERE id = ?', authRecord.id);
  const jwtToken = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
  res.json({ token: jwtToken, user: { id: user.id, name: user.name, role: user.role } });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await db.get('SELECT * FROM users WHERE email = ?', email);
  if (!user) return res.status(400).json({ error: 'User not found' });
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
  await db.run('INSERT INTO auth_tokens (userId, token, type, expiresAt) VALUES (?, ?, ?, ?)', [user.id, otp, 'password_reset', expiresAt]);
  await notifyUser(user.id, 'sms', 'Password Reset Request', `Your password reset code is: ${otp}. Ignore if you didn't request this.`);
  res.json({ success: true, message: 'Reset code sent via SMS/Email' });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;
  const user = await db.get('SELECT * FROM users WHERE email = ?', email);
  if (!user) return res.status(400).json({ error: 'User not found' });
  const authRecord = await db.get('SELECT * FROM auth_tokens WHERE userId = ? AND token = ? AND type = ? AND used = 0 AND expiresAt > ?', [user.id, token, 'password_reset', new Date().toISOString()]);
  if (!authRecord) return res.status(400).json({ error: 'Invalid or expired reset code' });
  const hash = await bcrypt.hash(newPassword, 10);
  await db.run('UPDATE users SET password = ? WHERE id = ?', [hash, user.id]);
  await db.run('UPDATE auth_tokens SET used = 1 WHERE id = ?', authRecord.id);
  await notifyUser(user.id, 'email', 'Password Changed', 'Your Tandem password was successfully reset.');
  res.json({ success: true, message: 'Password reset successful' });
});

// --- User Routes ---
app.get('/api/me', authenticateToken, async (req, res) => {
  const user = await db.get('SELECT id, name, email, role, walletBalance, isPlusMember, phone, location, servicesOffered, rating_avg, jobs_completed, response_time_mins FROM users WHERE id = ?', req.user.id);
  res.json(user);
});

app.post('/api/me/onboard', authenticateToken, async (req, res) => {
  const { phone, location } = req.body;
  await db.run('UPDATE users SET phone = ?, location = ?, walletBalance = walletBalance + 100 WHERE id = ?', [phone, location, req.user.id]);
  await notifyUser(req.user.id, 'both', 'Onboarding Complete', 'Thanks for completing onboarding! We have credited $100 to your Tandem wallet.');
  res.json({ success: true });
});

app.post('/api/plus/subscribe', authenticateToken, async (req, res) => {
  await db.run('UPDATE users SET isPlusMember = 1 WHERE id = ?', req.user.id);
  res.json({ success: true, isPlusMember: 1 });
});

// --- Services ---
app.get('/api/services', async (req, res) => {
  const services = await db.all('SELECT * FROM services');
  res.json(services);
});

// --- Recommendations ---
app.get('/api/recommendations', authenticateToken, async (req, res) => {
  try {
    const interactions = await db.all('SELECT user_id, service_id, rating FROM user_interactions');
    if (interactions.length > 0) {
      await ml.train(interactions);
    }
    const recs = await ml.recommend(req.user.id, 6);
    const services = await db.all('SELECT * FROM services');
    const enriched = recs.map(r => ({ ...services.find(s => s.id === String(r.service_id) || s.id === `service_${r.service_id}`), score: r.score })).filter(Boolean);
    res.json(enriched.length > 0 ? enriched : services.slice(0, 6));
  } catch (err) {
    console.error('Recs unavailable, returning default:', err.message);
    const services = await db.all('SELECT * FROM services LIMIT 6');
    res.json(services);
  }
});

// --- Bookings ---
app.post('/api/bookings', authenticateToken, async (req, res) => {
  const { serviceId, location, time, amount, walletDeduction, preferredPartnerId, lat, lng } = req.body;

  if (walletDeduction && walletDeduction > 0) {
    const user = await db.get('SELECT walletBalance FROM users WHERE id = ?', req.user.id);
    if (!user || user.walletBalance < walletDeduction) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }
    await db.run('UPDATE users SET walletBalance = walletBalance - ? WHERE id = ?', [walletDeduction, req.user.id]);
  }

  const service = await db.get('SELECT * FROM services WHERE id = ?', serviceId);
  const title = service ? service.title : 'Custom Service';
  const jobId = `JOB-${Math.floor(1000 + Math.random() * 9000)}`;
  const payout = Math.floor((amount || 50) * 0.75);

  let partnerId = null;
  let status = 'pending';

  if (preferredPartnerId) {
    partnerId = preferredPartnerId;
    status = 'accepted';
  }

  await db.run(
    'INSERT INTO bookings (id, serviceId, serviceTitle, customerId, partnerId, location, lat, lng, time, payout, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [jobId, serviceId, title, req.user.id, partnerId, location, lat || null, lng || null, time, payout, status]
  );

  await db.run('INSERT INTO user_interactions (user_id, service_id, rating) VALUES (?, ?, ?)', [req.user.id, serviceId, 1.0]);

  await notifyUser(req.user.id, 'in_app', 'Booking Confirmed', `Your booking for ${title} has been received. We're finding a pro!`);

  res.status(201).json({ id: jobId, serviceId, serviceTitle: title, location, time, payout, status, partnerId });

  if (status === 'pending') {
    setTimeout(() => matchBooking(jobId), 2000);
  }
});

app.get('/api/my-bookings', authenticateToken, async (req, res) => {
  const myBookings = await db.all(`
    SELECT b.*, u.name as partnerName 
    FROM bookings b 
    LEFT JOIN users u ON b.partnerId = u.id 
    WHERE b.customerId = ? 
    ORDER BY b.id DESC
  `, req.user.id);
  res.json(myBookings);
});

app.get('/api/jobs', authenticateToken, async (req, res) => {
  const partner = await db.get('SELECT servicesOffered FROM users WHERE id = ?', req.user.id);
  let offeredServices = [];
  try { offeredServices = JSON.parse(partner.servicesOffered || '[]'); } catch(e) { offeredServices = []; }

  const pendingJobs = await db.all(`
    SELECT b.*, u.name as customerName FROM bookings b
    LEFT JOIN users u ON b.customerId = u.id
    WHERE b.status = 'pending'
    AND b.id NOT IN (SELECT bookingId FROM declined_bookings WHERE partnerId = ?)
  `, req.user.id);

  const matchedJobs = pendingJobs.filter(job => offeredServices.includes(job.serviceId) || offeredServices.length === 0);

  const myJobs = await db.all(`
    SELECT b.*, u.name as customerName 
    FROM bookings b 
    LEFT JOIN users u ON b.customerId = u.id 
    WHERE b.partnerId = ? AND b.status IN (?, ?)
  `, [req.user.id, 'accepted', 'completed']);

  res.json({ available: matchedJobs, active: myJobs, myServices: offeredServices });
});

app.post('/api/partner/services', authenticateToken, async (req, res) => {
  const { services } = req.body;
  await db.run('UPDATE users SET servicesOffered = ? WHERE id = ?', [JSON.stringify(services), req.user.id]);
  if (onlinePartners.has(req.user.id)) {
    onlinePartners.set(req.user.id, { ...onlinePartners.get(req.user.id), services });
  }
  res.json({ success: true });
});

app.patch('/api/jobs/:id', authenticateToken, async (req, res) => {
  const { status } = req.body;
  const jobId = req.params.id;
  const job = await db.get('SELECT * FROM bookings WHERE id = ?', jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  if (status === 'accepted') {
    await db.run('UPDATE bookings SET status = ?, partnerId = ? WHERE id = ?', ['accepted', req.user.id, jobId]);
    await notifyUser(job.customerId, 'in_app', 'Job Accepted', `A professional has accepted your request for ${job.serviceTitle}. Track them live!`);
    io.to(`user:${job.customerId}`).emit('booking:updated', { id: jobId, status: 'accepted', partnerId: req.user.id, partnerName: req.user.name });
  } else if (status === 'completed') {
    await db.run('UPDATE bookings SET status = ? WHERE id = ? AND partnerId = ?', ['completed', jobId, req.user.id]);
    await db.run('UPDATE users SET jobs_completed = jobs_completed + 1 WHERE id = ?', req.user.id);
    await notifyUser(job.customerId, 'email', 'Job Completed', `Your service ${job.serviceTitle} is complete! Please leave a rating on your dashboard.`);
    io.to(`user:${job.customerId}`).emit('booking:updated', { id: jobId, status: 'completed' });
  } else if (status === 'declined') {
    await db.run('INSERT OR IGNORE INTO declined_bookings (bookingId, partnerId) VALUES (?, ?)', [jobId, req.user.id]);
  }

  res.json({ success: true });
});

// --- Notifications ---
app.get('/api/notifications', authenticateToken, async (req, res) => {
  const notifs = await db.all('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC', req.user.id);
  res.json(notifs);
});

app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  await db.run('UPDATE notifications SET read = 1 WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
  res.json({ success: true });
});

// --- Ratings ---
app.post('/api/ratings', authenticateToken, async (req, res) => {
  const { bookingId, rating, review } = req.body;
  const job = await db.get('SELECT * FROM bookings WHERE id = ? AND customerId = ?', [bookingId, req.user.id]);
  if (!job) return res.status(403).json({ error: 'Invalid job' });

  await db.run('INSERT INTO ratings (bookingId, customerId, partnerId, rating, review) VALUES (?, ?, ?, ?, ?)', [bookingId, req.user.id, job.partnerId, rating, review]);
  await db.run('UPDATE bookings SET rated = 1 WHERE id = ?', bookingId);
  await db.run('INSERT INTO user_interactions (user_id, service_id, rating) VALUES (?, ?, ?)', [req.user.id, job.serviceId, rating]);

  const partnerRatings = await db.get('SELECT AVG(rating) as avg FROM ratings WHERE partnerId = ?', job.partnerId);
  if (partnerRatings.avg) {
    await db.run('UPDATE users SET rating_avg = ? WHERE id = ?', [partnerRatings.avg, job.partnerId]);
  }

  await notifyUser(job.partnerId, 'both', 'New Rating Received', `You received a ${rating}-star rating for ${job.serviceTitle}.`);
  res.json({ success: true });
});

// --- Complaints ---
app.post('/api/complaints', authenticateToken, async (req, res) => {
  const { bookingId, reason, description } = req.body;
  await db.run('INSERT INTO complaints (bookingId, customerId, reason, description) VALUES (?, ?, ?, ?)', [bookingId, req.user.id, reason, description]);
  const admin = await db.get('SELECT id FROM users WHERE role = ? LIMIT 1', 'admin');
  if (admin) {
    await notifyUser(admin.id, 'email', 'New Complaint Filed', `A complaint was filed for job ${bookingId}. Reason: ${reason}`);
  }
  res.json({ success: true });
});

app.get('/api/admin/complaints', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const complaints = await db.all(`
    SELECT c.*, u.name as customerName 
    FROM complaints c
    LEFT JOIN users u ON c.customerId = u.id
    ORDER BY c.createdAt DESC
  `);
  res.json(complaints);
});

app.patch('/api/admin/complaints/:id/resolve', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  await db.run('UPDATE complaints SET status = ? WHERE id = ?', ['resolved', req.params.id]);
  res.json({ success: true });
});

// --- Chat ---
app.get('/api/chat/:bookingId', authenticateToken, async (req, res) => {
  const messages = await db.all(`
    SELECT c.*, u.name as senderName 
    FROM chat_messages c
    JOIN users u ON c.senderId = u.id
    WHERE bookingId = ?
    ORDER BY c.createdAt ASC
  `, req.params.bookingId);
  res.json(messages);
});

app.post('/api/chat/:bookingId', authenticateToken, async (req, res) => {
  const { message } = req.body;
  const result = await db.run('INSERT INTO chat_messages (bookingId, senderId, message) VALUES (?, ?, ?)', [req.params.bookingId, req.user.id, message]);
  const msg = { id: result.lastID, bookingId: req.params.bookingId, senderId: req.user.id, senderName: req.user.name, message, createdAt: new Date().toISOString() };
  io.to(`booking:${req.params.bookingId}`).emit('chat:message', msg);
  res.json({ success: true });
});

// --- Admin ---
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const pros = await db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', 'partner');
  const jobs = await db.get('SELECT COUNT(*) as count FROM bookings');
  const revenue = await db.get('SELECT SUM(payout) as sum FROM bookings WHERE status = ?', 'completed');
  const ratings = await db.get('SELECT AVG(rating) as avg FROM ratings');
  const onlineCount = onlinePartners.size;
  res.json({
    activePros: pros.count || 0,
    onlinePros: onlineCount,
    jobsToday: jobs.count || 0,
    avgRating: ratings.avg ? ratings.avg.toFixed(1) : 4.8,
    revenue30d: (revenue.sum || 0) * 1.33,
  });
});

setupDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (Socket.IO ready)`);
  });
});
