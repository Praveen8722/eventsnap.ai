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
  twoFactorChallengeExpiresIn: '5m',
  corsOrigins: readList(process.env.CORS_ORIGIN, 'http://localhost:5173,http://localhost:5174'),
  trustProxy: process.env.TRUST_PROXY === 'true',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'admin123',
});
