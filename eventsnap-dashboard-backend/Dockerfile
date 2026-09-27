# EventSnap dashboard backend (Express API) — eventsnap-dashboard-backend
#
# Build:  docker build -t eventsnap-dashboard-backend .
# Run:    see README.md "Docker" for the full docker run command.
#
# Secrets (.env) are never baked into the image — see .dockerignore. Provide
# them at runtime (mount .env read-only, or pass -e VAR=...).

FROM node:24-slim

WORKDIR /app
ENV NODE_ENV=production \
    PORT=8000

# Production dependencies only (no nodemon), exactly as locked.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Uploaded gallery / portfolio photos are written here — mount a volume so
# they survive container restarts and image rebuilds.
RUN mkdir -p uploads/galleries uploads/portfolio && chown -R node:node uploads
VOLUME ["/app/uploads"]

# Run as the image's unprivileged "node" user, not root.
USER node

EXPOSE 8000

# Healthy once the HTTP server answers (any status); no DB call involved.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/').then(() => process.exit(0), () => process.exit(1))"

CMD ["node", "index.js"]
