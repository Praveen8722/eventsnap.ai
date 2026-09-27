# EventSnap company website backend (Express API) — eventsnap-website-backend
#
# Build:  docker build -t eventsnap-website-backend .
# Run:    see README.md "Docker" for the full docker run command.
#
# Secrets (.env) are never baked into the image — see .dockerignore. Provide
# them at runtime (mount .env read-only, or pass -e VAR=...).

FROM node:24-slim

WORKDIR /app
ENV NODE_ENV=production \
    PORT=8081

# Production dependencies only (no nodemon), exactly as locked.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Run as the image's unprivileged "node" user, not root.
USER node

EXPOSE 8081

# Healthy once the HTTP server answers (any status); no DB call involved.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/').then(() => process.exit(0), () => process.exit(1))"

CMD ["node", "index.js"]
