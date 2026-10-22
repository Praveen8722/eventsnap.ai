# EventSnap.ai Admin — API

Express 5 + MongoDB (Mongoose) API for the [EventSnap.ai Super Admin Panel](../eventsnap-super-admin-ui/README.md). Every response matches the payload types in `eventsnap-super-admin-ui/src/types`.

It uses two databases:

| Database | Variable | Access | Holds |
| -------- | -------- | ------ | ----- |
| **Admin** | `MONGODB_URI` | read/write | admin accounts & roles, settings, support tickets, notifications, audit log |
| **EventSnap platform** (the photographer dashboard's DB) | `PLATFORM_MONGO_URL` | **read-only** | users (photographers), bookings, portfolios, event galleries, storage usage |

Platform data is queried live and never copied or changed: the platform connection has no models, and only `find`, `findOne`, `aggregate`, `countDocuments` and `distinct` are exposed (`src/config/platformDb.js`). Use a MongoDB user with only the `read` role on the platform database as well.

## Getting started

Requires Node.js 22 or later.

```bash
npm install
cp .env.example .env          # then set JWT_SECRET and PLATFORM_MONGO_URL
```

| Command              | Admin database | Platform database |
| -------------------- | -------------- | ----------------- |
| `npm run dev:memory` | Temporary in-memory, seeded with demo admins on every start | `PLATFORM_MONGO_URL` if set, otherwise an empty in-memory one (pages show zeros) |
| `npm run seed` then `npm run dev` | `MONGODB_URI` | `PLATFORM_MONGO_URL` |
| `npm start`          | `MONGODB_URI`, no file watching (production) | `PLATFORM_MONGO_URL` |

The API listens on `http://localhost:4000/api`. Start the UI (`npm run dev` in `eventsnap-super-admin-ui`), which proxies `/api` here. Sign in with `admin@eventsnap.ai` and `SEED_ADMIN_PASSWORD` (email and password only).

### First-time setup (creating the first Super Admin)

While the admin database has **no admin at all**, the login page shows **Create your Super Admin account** (`GET/POST /api/auth/setup`). It creates one active Super Admin (password hashed with bcrypt), creates the roles and settings, and signs them straight in. As soon as that account exists, setup is closed for good — it stays closed even if admin accounts are later removed by hand — and further admins can only be invited by a Super Admin. In production, setup also needs `ADMIN_SETUP_TOKEN` (entered as the "Setup Code"); without it, setup is disabled there. `npm run seed` is an alternative that creates the first Super Admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

> On Windows PowerShell, use `npm.cmd` if `npm` is blocked by the script execution policy. The first `dev:memory` or `test` run downloads a MongoDB binary (~70 MB) into the user cache.

## Scripts

| Command              | Description |
| -------------------- | ----------- |
| `npm run dev`        | Start with `node --watch` |
| `npm run dev:memory` | Start with an in-memory admin database (resets on restart) |
| `npm start`          | Start without watching |
| `npm run seed`       | **Wipe the admin database** at `MONGODB_URI` and create roles, settings and the first Super Admin (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). `-- --demo` adds demo admin accounts (not allowed in production). `-- --force` is required when `NODE_ENV=production`. Never touches the platform database. |
| `npm test`           | Integration tests (in-memory admin + fixture platform database) |

## Configuration

See [`.env.example`](./.env.example). In production, `JWT_SECRET` (≥ 32 characters) is required and the in-memory database is refused.

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `PORT` | `4000` | HTTP port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/eventsnap_admin` | Admin database |
| `PLATFORM_MONGO_URL` | — | Platform database, read-only (must differ from `MONGODB_URI`) |
| `PLATFORM_STORAGE_QUOTA_GB` | `3` | Per-photographer quota (match the dashboard backend's `STORAGE_QUOTA_GB`) |
| `PLATFORM_CACHE_SECONDS` | `30` | How long platform figures are reused between requests |
| `REPORT_TIMEZONE` | `Asia/Kolkata` | Timezone for calendar months in charts |
| `JWT_SECRET` | insecure dev value (warning logged) | HMAC secret for access tokens |
| `JWT_EXPIRES_IN` | `8h` | Access-token lifetime |
| `LOGIN_MAX_FAILURES` / `LOGIN_LOCKOUT_MINUTES` | `5` / `15` | Sign-in lockout per email and per IP |
| `ADMIN_UI_URL` | `http://localhost:5173` | Used to build invite links |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:5174` | Allowed browser origins |
| `TRUST_PROXY` | `false` | Honour `X-Forwarded-For` (set `true` behind Render/NGINX so lockouts and audit IPs use the real client IP) |
| `ADMIN_SETUP_TOKEN` | — | One-time code for first-time setup; required in production |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | `admin@eventsnap.ai` / `admin123` | First Super Admin created by the seed |
| `USE_MEMORY_DB` | `false` | Same as passing `--memory` |

## What the platform pages show

| Page | Source (platform collections) |
| ---- | ----------------------------- |
| Photographers | `users` + `portfolios` (location, specialty, rating) + `bookings` + `createevents` + `storageusages`. "Active" = used EventSnap in the last 30 days. |
| Clients | `bookings`, grouped **per photographer** by phone (last 10 digits), else email, else name. Emails and phones are masked (`r***@gmail.com`, `98****3210`). |
| Bookings | `bookings`; statuses Inquiry / Confirmed / In Progress·Editing·Ready for Delivery / Delivered / Cancelled. Bookings without an owner show as "Unassigned". |
| Payments & Revenue | Booking volume = payments photographers recorded (advance + later payments). **EventSnap income is ₹0** — there is no billing. Balances due = price − paid on committed bookings. |
| Subscriptions | One **Free** plan with every photographer (no billing dates). |
| Analytics | Growth, event types, locations, retention and health computed from the above; `?period=7d|30d|90d|1y|all`. |
| Gallery & Storage | `storageusages` ledger (or event photo sizes) against the quota. |
| Notifications | Admin notifications plus alerts derived from the platform (new signups, storage near/over quota) and critical tickets. |

## API

All routes are under `/api`. Errors are JSON: `{ "error": { "message": "..." } }`. Everything except `health` and the `auth/setup`, `auth/login`, `auth/invite`, `auth/accept-invite` routes requires `Authorization: Bearer <token>` for an **active** admin, and each area a role that may open it (`src/config/permissions.js`).

| Method & path | Who | Notes |
| ------------- | --- | ----- |
| `GET /auth/setup`, `POST /auth/setup` | — | First-time setup: `{ setupRequired, setupTokenRequired, setupDisabled }` / `{ name, email, password, setupToken? }` → `{ token, user }`; `403` once any admin exists |
| `POST /auth/login` | — | `{ email, password }` → `{ token, user }` (`user.access` lists the role's areas) |
| `POST /auth/invite` / `POST /auth/accept-invite` | — | `{ token }` → who it's for / `{ token, password }` sets the password (≥ 12 chars) |
| `GET /auth/me`, `POST /auth/logout` | any | Logout invalidates every token of the admin |
| `GET /system/status` | any | Whether the platform database is connected |
| `GET /dashboard` | all roles | |
| `GET /photographers` | Super, Platform, Support, Read Only | |
| `GET /clients` | Super, Platform | |
| `GET /bookings` | Super, Platform, Support | |
| `GET /payments`, `GET /subscriptions` | Super, Finance | |
| `GET /analytics?period=` | Super, Platform, Finance, Read Only | |
| `GET /gallery` | Super, Platform, Support | |
| `GET /activity-logs` | Super, Platform | newest first (latest 5,000) |
| `GET/POST /support-tickets`, `GET /support-tickets/meta`, `GET/PATCH /support-tickets/:id`, `POST /support-tickets/:id/messages` | Super, Platform, Support | audited |
| `GET /notifications`, `GET /notifications/alerts`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`, `DELETE /notifications/:id` | all roles | |
| `GET /settings` / `PUT /settings` | Super, Platform / Super | audited |
| `GET/POST /admin-users`, `PATCH/DELETE /admin-users/:id`, `POST /admin-users/:id/invite` | Super | audited; can't change or remove yourself; one active Super Admin always remains |

## Security

- **Sign-in** is email + password (bcrypt, cost 10); unknown emails take the same time as wrong passwords. There is no second factor, so use long, unique passwords for admin accounts.
- **Lockout.** 5 failed passwords or invite tokens per email / IP in 15 minutes → `429`. Kept in memory (per instance).
- **Sessions.** Access tokens carry a version; sign-out, deactivation and role change bump it, so old tokens stop working at once.
- **Invites.** One-time token (stored as SHA-256), valid 72 hours, returned once to the inviting Super Admin as a link to `ADMIN_UI_URL/accept-invite`.
- Passwords and invite hashes are never returned; platform passwords, notes, photos and face data are never read.

## Project layout

```text
src/
├── app.js            # Express app factory (CORS, JSON, security headers, routes, errors)
├── config/           # env, admin DB connection, read-only platform DB, role permissions
├── controllers/      # HTTP handlers: input parsing → service → JSON
├── middlewares/      # requireAuth / requireAccess, 404 + error handler
├── models/           # Mongoose schemas (admin database only)
├── routes/           # /api route table
├── seed/             # seedDatabase() + CLI (roles, settings, admins)
├── services/         # business logic; platformData.js reads the platform, platformService.js builds the pages
└── utils/            # formatting (₹), masking, token hashing, JWT helpers, validation
```

## Known limitations

- **No email delivery.** Invite links are shown to the inviting Super Admin to send; nothing is emailed.
- **Lockout is in memory**, per API instance; run one instance or put a rate-limiting proxy in front when scaling out.
- **Platform data is read in full** per request (cached `PLATFORM_CACHE_SECONDS`); fine for thousands of bookings, but very large platforms will want pre-aggregated reports.
- **Settings toggles** are stored preferences only; they don't change platform behaviour.
