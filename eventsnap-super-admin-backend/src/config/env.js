import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

function readJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isProduction) {
    throw new Error('JWT_SECRET must be set to a value of at least 32 characters in production.');
  }
  if (secret) {
    console.warn('[env] JWT_SECRET is shorter than 32 characters; use a longer secret outside local development.');
    return secret;
  }
  if (!isTest) {
    console.warn('[env] JWT_SECRET is not set; using an insecure development secret. Copy .env.example to .env.');
  }
  return 'insecure-development-secret-change-me-0123456789';
}

function readList(value, fallback) {
  return (value ?? fallback)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export const env = Object.freeze({
  nodeEnv,
  isProduction,
  isTest,
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/eventsnap_admin',
  useMemoryDb: process.env.USE_MEMORY_DB === 'true' || process.argv.includes('--memory'),
  jwtSecret: readJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  corsOrigins: readList(process.env.CORS_ORIGIN, 'http://localhost:5173,http://localhost:5174'),
  trustProxy: process.env.TRUST_PROXY === 'true',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'admin123',
  // The EventSnap platform database (photographers, events, bookings), read-only. Use a MongoDB
  // user with only the "read" role on that database. Unset: platform pages report it isn't set up.
  platformMongoUri: process.env.PLATFORM_MONGO_URL || '',
  // How long platform figures are reused between requests (seconds); 0 = always query live.
  platformCacheSeconds: process.env.PLATFORM_CACHE_SECONDS === undefined ? 30 : Math.max(Number(process.env.PLATFORM_CACHE_SECONDS) || 0, 0),
  // Calendar months for charts ("this month", monthly series) are counted in this timezone.
  reportTimeZone: process.env.REPORT_TIMEZONE || 'Asia/Kolkata',
  // Per-photographer storage quota on the platform (its STORAGE_QUOTA_GB); default 3 GB.
  platformStorageQuotaGB: Number(process.env.PLATFORM_STORAGE_QUOTA_GB) > 0 ? Number(process.env.PLATFORM_STORAGE_QUOTA_GB) : 3,
  // Failed sign-ins allowed per email / per IP within the window before sign-in is blocked.
  loginMaxFailures: Number(process.env.LOGIN_MAX_FAILURES) > 0 ? Number(process.env.LOGIN_MAX_FAILURES) : 5,
  loginLockoutMinutes: Number(process.env.LOGIN_LOCKOUT_MINUTES) > 0 ? Number(process.env.LOGIN_LOCKOUT_MINUTES) : 15,
  // One-time code required to create the first Super Admin (POST /auth/setup). Required in
  // production — without it, first-time setup is disabled there; optional locally.
  adminSetupToken: process.env.ADMIN_SETUP_TOKEN || '',
  // Public address of the admin UI, used to build invite links.
  adminUiUrl: (process.env.ADMIN_UI_URL || 'http://localhost:5173').replace(/\/$/, ''),
});
