# EventSnap.ai Company Website — Backend

Backend API for the **EventSnap.ai marketing/company website**
(`eventsnap-website-ui`, the Vite + React site).

This is a **standalone project**, separate from the main `eventsnap-dashboard-backend`
product API and its `eventsnap-dashboard-ui` frontend. It has its own database, its own
port, and its own `.env`.

## Authentication

This project has **no login, signup, password, or JWT system of its own** —
`eventsnap-dashboard-backend` + `eventSnapDB` are the single source of truth for
authentication. The marketing site's Login/Sign Up buttons hand visitors off
to the real EventSnap app (`eventsnap-dashboard-ui`), which authenticates them exactly
as it always has.

After a successful signup/login there, `eventsnap-dashboard-backend` calls this
project's `POST /api/users/sync` endpoint, server-to-server, to mirror that
account's non-sensitive profile info (name, business name, email, phone,
location, website, description) into `eventSnapWebsiteDB` — keyed by the
account's stable `eventSnapUserId`. No password, JWT, or auth secret is ever
sent or stored here, and syncing the same user again updates their existing
record instead of creating a duplicate.

## Tech stack

Same stack and conventions as `eventsnap-dashboard-backend`:

- Node.js + Express 5
- MongoDB + Mongoose
- Plain `controllers/ routes/ models/ services/` structure under `src/`

## Setup

```bash
npm install
```

Create a `.env` file (see the one already in this folder for local defaults):

```
PORT = 8081
MONGO_URL = mongodb://localhost:27017/eventSnapWebsiteDB
```

Run in development (auto-restarts via nodemon):

```bash
npm run dev
```

## API

- `POST /api/contact` — submit the Contact page form (`name`, `email`, `subject`, `message`)
- `GET /api/contact` — list submitted contact messages
- `POST /api/users/sync` — upsert a synced user profile (`eventSnapUserId` required; called by `eventsnap-dashboard-backend`)
- `GET /api/users/sync/:eventSnapUserId` — look up a synced user profile

## Docker

Build (from this folder):

```sh
docker build -t eventsnap-website-backend .
```

Run:

```sh
docker run -d --name eventsnap-website-backend -p 8081:8081 \
  -v "$(pwd)/.env:/app/.env:ro" \
  -e MONGO_URL="mongodb://host.docker.internal:27017/<your-db>" \
  eventsnap-website-backend
```

- `.env` is never copied into the image (see `.dockerignore`); it is mounted
  read-only at runtime. Values passed with `-e` take priority over `.env`.
- `MONGO_URL`: inside a container `localhost` is the container itself, so a
  MongoDB running on your machine is reached via `host.docker.internal`.
  A MongoDB Atlas URL works unchanged.
