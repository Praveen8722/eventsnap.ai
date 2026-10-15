# EventSnap.ai Admin — API

Express 5 + MongoDB (Mongoose) API for the [EventSnap.ai Super Admin Panel](../eventsnap-super-admin-ui/README.md). Every response matches the payload types in `eventsnap-super-admin-ui/src/types`.

## Getting started

Requires Node.js 22 or later.

```bash
npm install
cp .env.example .env          # then set JWT_SECRET (see the comment in the file)
```

Pick one way to run it:

| Command              | Database                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `npm run dev:memory` | Temporary in-memory MongoDB, seeded with demo data on every start. No install needed.      |
| `npm run seed` then `npm run dev` | The MongoDB at `MONGODB_URI` (default `mongodb://127.0.0.1:27017/eventsnap_admin`). |
| `npm start`          | `MONGODB_URI`, no file watching (production).                                              |

The API listens on `http://localhost:4000/api`. Then start the UI (`npm run dev` in `eventsnap-super-admin-ui`), which proxies `/api` here. Sign in with `admin@eventsnap.ai` / `admin123` and any 6-digit 2FA code.

> On Windows PowerShell, use `npm.cmd` if `npm` is blocked by the script execution policy. The first `dev:memory` or `test` run downloads a MongoDB binary (~70 MB) into the user cache.

## Scripts

| Command              | Description                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`        | Start with `node --watch` against `MONGODB_URI`                                      |
| `npm run dev:memory` | Start with an in-memory, auto-seeded MongoDB (data resets on restart)                |
| `npm start`          | Start without watching                                                               |
| `npm run seed`       | **Wipe** the database at `MONGODB_URI` and load the demo data (`-- --force` required when `NODE_ENV=production`) |
| `npm test`           | Run the integration tests (in-memory MongoDB)                                        |

## Configuration

See [`.env.example`](./.env.example). In production, `JWT_SECRET` (≥ 32 characters) is required and the in-memory database is refused.

| Variable              | Default                                       | Description                                       |
| --------------------- | --------------------------------------------- | ------------------------------------------------- |
| `PORT`                | `4000`                                        | HTTP port                                         |
| `MONGODB_URI`         | `mongodb://127.0.0.1:27017/eventsnap_admin`   | MongoDB connection string                         |
| `JWT_SECRET`          | insecure dev value (warning logged)           | HMAC secret for access and 2FA challenge tokens   |
| `JWT_EXPIRES_IN`      | `8h`                                          | Access-token lifetime                             |
| `CORS_ORIGIN`         | `http://localhost:5173,http://localhost:5174` | Comma-separated allowed browser origins           |
| `TRUST_PROXY`         | `false`                                       | Honour `X-Forwarded-For` for audit-log IPs        |
| `SEED_ADMIN_PASSWORD` | `admin123`                                    | Password given to every seeded admin              |
| `USE_MEMORY_DB`       | `false`                                       | Same as passing `--memory`                        |

## API

All routes are under `/api`. Errors are JSON: `{ "error": { "message": "..." } }`. Everything except `health`, `auth/login`, and `auth/2fa` requires `Authorization: Bearer <token>` for an **active** admin.

| Method & path                       | Returns (UI type)                  | Notes                                       |
| ----------------------------------- | ---------------------------------- | ------------------------------------------- |
| `GET /health`                       | `{ status: "ok" }`                 |                                             |
| `POST /auth/login`                  | `LoginResult`                      | `{ email, password }` → 2FA challenge (or a token if 2FA is off for the admin and platform) |
| `POST /auth/2fa`                    | `AuthSession`                      | `{ challengeToken, code }`                  |
| `GET /auth/me`                      | `{ user: AdminUser }`              |                                             |
| `GET /dashboard`                    | `DashboardData`                    |                                             |
| `GET /photographers`                | `Photographer[]`                   |                                             |
| `GET /clients`                      | `Client[]`                         |                                             |
| `GET /bookings`                     | `Booking[]`                        | newest first                                |
| `GET /payments`                     | `PaymentsData`                     |                                             |
| `GET /subscriptions`                | `SubscriptionsData`                |                                             |
| `GET /analytics`                    | `AnalyticsData`                    |                                             |
| `GET /gallery`                      | `GalleryStorageData`               |                                             |
| `GET /support-tickets`              | `Ticket[]`                         |                                             |
| `GET /activity-logs`                | `AuditLog[]`                       | newest first                                |
| `GET /notifications`                | `NotificationsData`                |                                             |
| `GET /notifications/alerts`         | `NotificationAlert[]`              | latest 5, for the top bar                   |
| `PATCH /notifications/:id/read`     | `AdminNotification`                |                                             |
| `POST /notifications/read-all`      | `{ updated: number }`              |                                             |
| `DELETE /notifications/:id`         | `204`                              |                                             |
| `GET /settings`                     | `PlatformSettingsData`             |                                             |
| `PUT /settings`                     | `PlatformSettingsData`             | Super Admin. `{ generalSettings?, toggles?: { [key]: boolean } }`; validated, audited |
| `GET /admin-users`                  | `AdminUsersData`                   |                                             |
| `POST /admin-users`                 | `AdminUser` (`201`)                | Super Admin. `{ name, email, role }`; creates an inactive invite; audited |

Logins (successful and failed), settings changes, and admin invites are written to the audit log (`GET /activity-logs`) with the client IP.

## Data model

```text
src/
├── app.js            # Express app factory (CORS, JSON, routes, errors)
├── config/           # env parsing, MongoDB connection (incl. in-memory mode)
├── controllers/      # HTTP handlers: input parsing → service → JSON
├── middlewares/      # requireAuth / requireRole, 404 + error handler
├── models/           # Mongoose schemas
├── routes/           # /api route table
├── seed/             # seedDatabase() + CLI; data/ is generated from the UI's former mocks
├── services/         # business logic and mappers to the UI payload shapes
└── utils/            # formatting, JWT helpers, validation, HttpError
```

- **Entities** (`AdminUser`, `Role`, `Photographer`, `Client`, `Booking`, `Transaction`, `SubscriptionPlan`, `Subscription`, `SupportTicket`, `Notification`, `ActivityEvent`, `AuditLog`, `PlatformSettings`) store raw values (numbers, dates); formatting such as `"$48,200"`, `"84.2 GB"`, or `"3 min ago"` happens in `services/mappers.js`.
- **Derived data:** dashboard top photographers and plan distribution, plan MRR (`subscribers × price`), gallery storage status (≥ 90 % of the plan limit = warning, over = exceeded), recent subscribers, notification categories, and top-bar alerts.
- **Reports** (`Report` collection) hold pre-aggregated platform metrics that the entity collections can't reproduce: revenue history, user growth, geography, event types, retention, health scores, and the storage overview. The seed loads them; a reporting job should refresh them in production.

## Known limitations

- **2FA codes are not verified.** The challenge step proves the password was correct, but any 6-digit code completes sign-in until TOTP enrolment is built.
- **Invites are records only.** `POST /admin-users` creates an inactive account with no password; there is no invite email or password-setup flow yet, so invited admins can't sign in.
- **No rate limiting or account lockout** on `/auth/login`. Put the API behind a rate-limiting proxy, or add middleware, before exposing it publicly.
- **Stateless sessions.** Signing out discards the token client-side; tokens stay valid until they expire, unless the admin is deactivated (checked on every request).
