# eventsnap-dashboard-backend

Express + MongoDB API for the EventSnap dashboard (`eventsnap-dashboard-ui`).

## Docker

Build (from this folder):

```sh
docker build -t eventsnap-dashboard-backend .
```

Run:

```sh
docker run -d --name eventsnap-dashboard-backend -p 8000:8000 \
  -v "$(pwd)/.env:/app/.env:ro" \
  -v eventsnap-uploads:/app/uploads \
  -e MONGO_URL="mongodb://host.docker.internal:27017/<your-db>" \
  eventsnap-dashboard-backend
```

- `.env` is never copied into the image (see `.dockerignore`); it is mounted
  read-only at runtime. Values passed with `-e` take priority over `.env`.
- `MONGO_URL`: inside a container `localhost` is the container itself, so a
  MongoDB running on your machine is reached via `host.docker.internal`.
  A MongoDB Atlas URL works unchanged.
- `COMPANY_WEBSITE_SYNC_URL`: if `eventsnap-website-backend` runs in a
  container too, put both on one Docker network and pass
  `-e COMPANY_WEBSITE_SYNC_URL=http://eventsnap-website-backend:8081/api/users/sync`.
- `eventsnap-uploads` keeps uploaded gallery / portfolio photos across
  restarts and rebuilds. To bring in existing photos once:
  `docker cp uploads/. eventsnap-dashboard-backend:/app/uploads/`
