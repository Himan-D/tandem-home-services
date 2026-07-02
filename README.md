# Tandem (Lumina) — Home Services Platform

Full-stack marketplace connecting consumers with home service professionals. Book services, track partners in real time, manage orders via a formal state machine, and leverage ML-powered recommendations — all on a PostGIS + Redis + Socket.IO backbone with graceful degradation at every layer.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React 19 (Vite) SPA                      │
│  Consumer App  ·  Partner Dashboard  ·  Admin Panel         │
│  Leaflet Maps  ·  Socket.IO Client  ·  AI Assistant (mock)  │
└────────────────────┬────────────────────────────────────────┘
                     │  HTTP / WS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Express 5 API Server                         │
│                                                              │
│  Middleware:  Helmet · CORS · Rate Limit · Audit · Auth JWT  │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  Routes  │  │Services  │  │Socket.IO  │  │  Cron Tasks │ │
│  │  (14)    │  │ (OMS,    │  │ (track,   │  │ (15min /    │ │
│  │          │  │  shifts, │  │  chat,    │  │  hourly /   │ │
│  │ auth,    │  │  areas,  │  │  notify)  │  │  daily)     │ │
│  │ bookings │  │  track)  │  │           │  │             │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│PostgreSQL │  │  Redis   │  │  ML Service  │
│ + PostGIS │  │Queues +  │  │  (FastAPI +  │
│           │  │  Pub/Sub │  │   PyTorch)   │
│ Prisma    │  │  BullMQ  │  │ Port 8000    │
│ Port 5432 │  │ Port 6379│  │              │
└──────────┘  └──────────┘  └──────────────┘
                    │
                    ▼
            ┌──────────────┐
            │  OSRM (opt.) │
            │  Road Router │
            │  Port 5000   │
            └──────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, react-router-dom 7, Leaflet, Lucide |
| Backend | Express 5, Prisma ORM 5, Pino, Zod |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Cache & Queue | Redis 7, BullMQ, Socket.IO Redis adapter |
| Geospatial | PostGIS, RBush (R-tree), Google Maps API, OSRM, haversine |
| ML | FastAPI, PyTorch (separate `ml-service/`) |
| Auth | JWT (15m access + 7d refresh with SHA-256 rotation), magic link OTP |
| Real-time | Socket.IO (tracking, chat, notifications, order updates) |
| Docs | Swagger UI at `/api-docs` |

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.10+ (for ML service)
- Docker + Docker Compose (for PostGIS, Redis, and optionally OSRM)

### 1. Infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (PostGIS), Redis, and optionally OSRM. The server degrades gracefully if Redis or OSRM are unavailable.

### 2. Backend

```bash
# Install server dependencies
cd server && npm install && cd ..

# Copy and edit environment
cp .env.example .env
# Edit .env — DATABASE_URL must match docker-compose.yml

# Run schema migration + start server
npm run dev:server
```

On first boot, the server creates all tables (via `server/schema.js`) and bootstraps an admin user:
- **Email:** `admin@lumina.app`
- **Password:** `changeme123`

*Change the password immediately after first login.*

### 3. Frontend

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to `localhost:3005`.

### 4. ML Service (optional)

```bash
cd ml-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000
```

The API falls back to listing active services if the ML service is unavailable.

### 5. Everything at once

```bash
npm run dev:all
```

## Environment Variables

Key variables (full list in `.env.example` and `server/config/index.js`):

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string (e.g. `postgresql://lumina:lumina@localhost:5433/lumina`) |
| `REDIS_URL` | — | Redis connection string |
| `JWT_SECRET` | `change-me-in-production` | Secret for signing access + refresh tokens |
| `GOOGLE_MAPS_API_KEY` | — | Enables Google Roads, Places, Directions, Geocoding (falls back to OSRM + haversine) |
| `CORS_ORIGIN` | `*` | Comma-separated allowed origins |
| `PORT` | `3005` | Server listen port |
| `BOOTSTRAP_ADMIN_EMAIL` | `admin@lumina.app` | Initial admin email |
| `BOOTSTRAP_ADMIN_PASSWORD` | `changeme123` | Initial admin password |

## Project Structure

```
├── server/                          # Express API (CommonJS)
│   ├── index.js                     # Boot sequence, middleware, route mounting
│   ├── config/index.js              # Env var parsing
│   ├── db.js                        # Prisma connect/close wrapper
│   ├── schema.js                    # Raw SQL schema bootstrap (tables, triggers, indexes)
│   ├── oms.js                       # Order Management System (state machine + BullMQ)
│   ├── matching.js                  # ML-drive n booking matching engine
│   ├── rider-assignment.js          # Rider scoring and task dispatch
│   ├── location-history.js          # Batched GPS persistence
│   ├── spatial-index.js             # In-memory RBush R-tree
│   ├── scheduler.js                 # Cron jobs
│   ├── swagger.js                   # OpenAPI 3 docs
│   ├── event-bus.js                 # Redis-backed event emitter
│   ├── feature-flags.js             # A/B test flags
│   ├── routes/                      # 14 route modules
│   │   ├── auth.js                  # Login, register, magic link, forgot/reset, refresh/revoke/logout
│   │   ├── services.js              # Service catalog CRUD
│   │   ├── bookings.js              # Create, cancel, rate, complaint
│   │   ├── orders.js                # Order lifecycle (CRUD + state transitions)
│   │   ├── location.js              # GPS update, nearby partners, history
│   │   ├── chat.js                  # Booking-scoped messaging
│   │   ├── partner.js               # Profile, shifts, jobs, notifications
│   │   ├── admin.js                 # Dashboard stats, partners, customers, orders
│   │   ├── tracking.js              # ETA, OTP, arrival, completion
│   │   ├── dark-stores.js           # Fulfillment centers + inventory
│   │   ├── promos.js                # Discount codes
│   │   ├── service-areas.js         # PostGIS polygon zones
│   │   ├── recommendations.js       # ML service proxy
│   │   └── places.js                # Google Places proxy
│   ├── services/
│   │   ├── tracking.js              # Kalman filter, geofence, snap-to-road, OTP
│   │   ├── shifts.js                # Partner shift scheduling + auto-offline
│   │   └── service-areas.js         # Polygon containment queries
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification, role guard
│   │   ├── authRefresh.js           # Refresh token generation, hashing, JWT signing
│   │   ├── security.js              # Helmet, request ID, audit logging
│   │   ├── health.js                # Liveness / readiness probes
│   │   ├── rateLimit.js             # Redis-backed rate limiter
│   │   ├── validate.js              # Zod schema validation
│   │   └── errorHandler.js          # Async wrapper, 404, global handler
│   ├── socket/
│   │   ├── adapter.js               # Socket.IO Redis adapter
│   │   └── handlers.js              # All real-time event handlers
│   └── lib/
│       ├── prisma.js                # PrismaClient singleton + spatial helpers
│       ├── redis.js                 # Redis pub/sub/bullmq clients
│       ├── logger.js                # Pino with pino-pretty (dev)
│       ├── routing.js               # OSRM client + haversine fallback
│       ├── google-maps.js           # Google Maps API client
│       ├── gps-filter.js            # Kalman filter, accuracy/speed validation
│       └── geofence.js              # Geofence engine with dwell detection
├── prisma/
│   └── schema.prisma                # 20 models, PostGIS columns, relations
├── src/                             # React 19 frontend
│   ├── App.jsx                      # Router + providers + all routes
│   ├── context/
│   │   ├── AuthContext.jsx          # Auth state + login/logout
│   │   └── SocketContext.jsx        # Socket.IO connection + event registry
│   ├── components/
│   │   ├── Navbar.jsx               # Top nav
│   │   ├── ConsumerBottomNav.jsx    # Mobile bottom nav
│   │   ├── NotificationBell.jsx     # Dropdown notifications
│   │   ├── ChatBox.jsx              # Booking messaging
│   │   ├── AIAssistant.jsx          # Floating AI widget (mock)
│   │   └── ErrorBoundary.jsx
│   └── pages/
│       ├── ConsumerHome.jsx         # Landing page
│       ├── ConsumerBooking.jsx      # Booking flow
│       ├── ConsumerDashboard.jsx    # My bookings
│       ├── BookingStatus.jsx        # Booking tracking
│       ├── LiveTracking.jsx         # Live partner map
│       ├── PartnerDashboard.jsx     # Partner job queue + calendar
│       ├── JobNavigation.jsx        # Turn-by-turn nav
│       ├── AdminDashboard.jsx       # Admin panel
│       ├── Login.jsx / Signup.jsx
│       ├── MagicLink.jsx / ForgotPassword.jsx / ResetPassword.jsx
│       └── Account.jsx / TandemPlus.jsx
├── ml-service/                      # Python ML microservice
│   ├── main.py                      # FastAPI app
│   ├── models/recommendation.py     # PyTorch recommender + ProRanker
│   └── models/train.py              # Training loop
├── scripts/
│   └── setup-osrm.sh                # OSRM NYC data download + process
├── docker-compose.yml               # PostGIS, Redis, OSRM
└── .env.example
```

## Key Features

### Consumer
- Browse service catalog, book with date/time/location, apply promo codes, pay with wallet
- Real-time partner tracking on Leaflet map with ETA
- In-app chat, post-service ratings and reviews, complaint filing
- Tandem Plus subscription

### Partner
- Receive matched job offers, accept/decline with reason tracking
- Shift scheduling (per-day-of-week with break windows), auto-offline enforcement
- GPS location streaming, turn-by-turn navigation, OTP verification at arrival
- Photo proof of completion, job history with earnings

### Admin
- Dashboard with real-time KPIs (active pros, orders, revenue, ratings)
- Partner/customer management with location visibility
- Service catalog, dark store inventory, promo code management
- PostGIS service area polygons with configurable price zones
- Spatial index management and complaint resolution

### Platform
- **Graceful degradation:** Redis down → in-memory fallback; Google Maps missing → OSRM → haversine; ML down → active services list
- **Refresh token rotation:** SHA-256 hashed tokens with family-based revocation chains; password change invalidates all sessions
- **Order state machine:** Formal state transitions (`PENDING → INVENTORY_VALIDATED → RIDER_ASSIGNED → ... → COMPLETED`) with idempotency keys and BullMQ queues
- **GPS pipeline:** Raw coordinates → Kalman filter smoothing → accuracy/speed validation → geofence (approach, dwell, arrival) → snap-to-roads
- **Rate limiting:** Tiered (5/min auth, 100/min API, 30/min orders) with Redis or in-memory backing
- **Swagger docs:** Auto-generated from JSDoc annotations at `/api-docs`
- **Health probes:** `/healthz` (liveness), `/readyz` (DB + Redis + OSRM checks)

## API Documentation

With the server running, visit:

- **Swagger UI:** http://localhost:3005/api-docs
- **OpenAPI JSON:** http://localhost:3005/api-docs.json

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Email + password login |
| `POST` | `/api/auth/register` | — | User registration |
| `POST` | `/api/auth/refresh` | — | Rotate refresh token |
| `POST` | `/api/auth/magic-link` | — | Send magic link OTP |
| `GET` | `/api/services` | — | List services |
| `POST` | `/api/bookings` | JWT | Create booking |
| `GET` | `/api/bookings/my` | JWT | My bookings |
| `GET` | `/api/jobs` | JWT (partner) | Available + active jobs |
| `GET` | `/api/partner/shifts` | JWT (partner) | Get shift schedule |
| `PUT` | `/api/partner/shifts` | JWT (partner) | Set shift schedule |
| `GET` | `/api/notifications` | JWT | User notifications |
| `GET` | `/api/admin/stats` | JWT (admin) | Dashboard KPIs |
| `POST` | `/api/tracking/location` | JWT | Send GPS location |
| `GET` | `/api/tracking/eta/:orderId` | JWT | Get order ETA |
| `POST` | `/api/service-areas/check` | — | Check point in service area |

## Database

Tables are bootstrapped on first server start (`server/schema.js`). The Prisma schema at `prisma/schema.prisma` defines 20 models matching the SQL. After edits to the Prisma schema, run:

```bash
npx prisma generate
```

Spatial queries (ST_DWithin, ST_Contains, ST_DistanceSphere) use `prisma.$queryRaw` tagged templates — Prisma has no native PostGIS support.

## Development

```bash
# Lint
npm run lint

# Run all services
npm run dev:all

# Run just the server
npm run dev:server

# Run just the ML service
npm run dev:ml
```

## License

Proprietary. All rights reserved.
