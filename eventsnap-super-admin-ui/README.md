# EventSnap.ai Admin — Super Admin Panel

Platform-level control — manage all photographers, subscriptions, payments, and system.

Built with **React 18**, **TypeScript**, **Vite 6**, **Tailwind CSS 4**, **React Router 7**, **Recharts**, and **Lucide** icons.

## Getting started

Requires Node.js 20 or later and the API from the sibling project [`eventsnap-super-admin-backend`](../eventsnap-super-admin-backend/README.md).

```bash
# 1. Start the API (separate terminal). With no MongoDB installed, use the in-memory demo database:
cd ../eventsnap-super-admin-backend
npm install
npm run dev:memory        # or: npm run seed && npm run dev   (needs MONGODB_URI)

# 2. Start the UI
cd ../eventsnap-super-admin-ui
npm install
npm run dev
```

Then open the URL printed in the terminal (default `http://localhost:5173`). The Vite dev and preview servers proxy `/api` to `http://localhost:4000`; set `API_PROXY_TARGET` to point elsewhere.

> On Windows PowerShell, if `npm` is blocked by the script execution policy, use `npm.cmd` instead (e.g. `npm.cmd run dev`).

### Demo credentials

Available after `npm run seed` or `npm run dev:memory` in the backend:

| Field    | Value                                                                  |
| -------- | ---------------------------------------------------------------------- |
| Email    | `admin@eventsnap.ai` (any seeded admin, e.g. `raj.patel@eventsnap.ai`) |
| Password | `admin123` (the backend's `SEED_ADMIN_PASSWORD`)                       |
| 2FA code | any 6 digits — authenticator (TOTP) enrolment is not implemented yet   |

### Environment variables

| Variable            | Used by          | Default                 | Description                                   |
| ------------------- | ---------------- | ----------------------- | --------------------------------------------- |
| `VITE_API_BASE_URL` | browser bundle   | `/api`                  | API base URL, if the API is on another origin |
| `API_PROXY_TARGET`  | dev/preview only | `http://localhost:4000` | Where the Vite server proxies `/api`          |

## Scripts

| Command             | Description                                 |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Start the development server                |
| `npm run build`     | Type-check and build for production (`dist/`) |
| `npm run preview`   | Preview the production build locally        |
| `npm run lint`      | Lint the project with ESLint                |
| `npm run typecheck` | Run the TypeScript compiler without emitting |

## Project structure

```text
src/
├── main.tsx                  # Application entry point
├── App.tsx                   # Root component (providers + router)
├── components/
│   ├── common/               # App-level helpers: PageLoader, ErrorState, AsyncBoundary
│   ├── layout/               # Sidebar and TopBar
│   └── ui/                   # Reusable UI primitives: Button, Badge, PageHeader,
│                             #   SearchInput, TableHead, TablePagination
├── config/
│   ├── routes.ts             # Route path constants
│   └── navigation.ts         # Sidebar navigation groups and page titles
├── context/                  # React context (authentication session)
├── hooks/                    # Custom hooks (useAuth, useAsync)
├── layouts/
│   └── AdminLayout.tsx       # Authenticated shell: sidebar + top bar + page outlet
├── pages/                    # One component per route (lazy-loaded)
├── routes/
│   ├── router.tsx            # Route definitions
│   ├── ProtectedRoute.tsx    # Verifies the session; redirects unauthenticated users to /login
│   └── PublicOnlyRoute.tsx   # Redirects authenticated users away from /login
├── services/                 # Data access layer: apiClient.ts + one module per domain
├── styles/                   # Tailwind entry and theme tokens
├── types/                    # Domain models and API payload types, one module per domain
└── utils/                    # Pure helpers (class-name joining, date formatting)
```

The `@/` import alias resolves to `src/`. New pages should compose the primitives in `components/ui/` rather than re-creating headers, buttons, badges, or table chrome.

## Data flow

```text
page ──useAsync──▶ services/*Service.ts ──apiRequest──▶ /api/* (eventsnap-super-admin-backend)
```

Each page loads its data with `useAsync(serviceFunction)` and renders it through `<AsyncBoundary>`, which shows a loader while the request is pending and an error state with a **Try again** button if it fails. Pages never call `fetch` directly; they go through `src/services/`.

`services/apiClient.ts` attaches the access token, turns API errors (`{ "error": { "message" } }`) into `ApiError`s whose message is shown to the user, and signals the auth context on any `401`, which signs the admin out. The return types in `src/types/` (e.g. `DashboardData`, `PaymentsData`) describe each endpoint's payload; the backend's tests assert the same shapes.

### Authentication

1. `POST /api/auth/login` checks the email and password and returns a short-lived 2FA challenge.
2. `POST /api/auth/2fa` exchanges the challenge and 6-digit code for an access token (JWT, 8 h by default) and the admin profile.
3. The token is kept in `localStorage`; on page load `GET /api/auth/me` verifies it and restores the signed-in admin shown in the sidebar and top bar.

### What the API persists

Besides reads, these UI actions are saved through the API (and recorded in the audit log where noted):

| UI action                                      | Endpoint                                                          | Who                |
| ---------------------------------------------- | ----------------------------------------------------------------- | ------------------ |
| Mark notification read / mark all / dismiss    | `PATCH /notifications/:id/read`, `POST /notifications/read-all`, `DELETE /notifications/:id` | any admin |
| Platform Settings → Save Changes (audited)     | `PUT /settings`                                                   | Super Admin        |
| Admin Users → Send Invite (audited)            | `POST /admin-users`                                               | Super Admin        |

Other buttons (exports, row action menus, plan editing, ticket replies) are still UI-only.

## Routes

| Path             | Page                     |
| ---------------- | ------------------------ |
| `/login`         | Admin sign-in            |
| `/dashboard`     | Dashboard overview       |
| `/photographers` | Photographer management  |
| `/clients`       | Client management        |
| `/bookings`      | Booking management       |
| `/payments`      | Payments & revenue       |
| `/subscriptions` | Subscriptions & plans    |
| `/analytics`     | Analytics & reports      |
| `/gallery`       | Gallery & storage        |
| `/activity-logs` | Activity / audit logs    |
| `/support`       | Support tickets          |
| `/notifications` | Notifications            |
| `/settings`      | Platform settings        |
| `/admin-users`   | Admin users & roles      |

All routes except `/login` require authentication.

## Notes

- **Frontend only.** This repository contains no server code, database, or secrets. The API lives in [`eventsnap-super-admin-backend`](../eventsnap-super-admin-backend/README.md).
- **Token storage.** The access token is stored in `localStorage`, which any script running on the page can read. Keep the app free of untrusted scripts, or move to an `HttpOnly` cookie session before production.
- **2FA.** The second step is enforced, but codes are not yet checked against an authenticator app (see the backend README).
- **Deployment.** The app uses client-side routing; configure your host to serve `index.html` for all unknown paths (SPA fallback), and either serve the API under `/api` on the same origin or build with `VITE_API_BASE_URL` (and add the UI origin to the backend's `CORS_ORIGIN`).