import { env } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { MIN_PASSWORD_LENGTH } from '../services/authService.js';
import { DEMO_ADMIN, seedDatabase } from './seedDatabase.js';

// Usage: npm run seed [-- --demo] [-- --force]
//   Wipes the ADMIN database at MONGODB_URI (never the platform database) and creates the first
//   Super Admin (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD). --demo adds demo admin accounts for local
//   development. --force is required when NODE_ENV=production.
const demo = process.argv.includes('--demo');

if (env.isProduction) {
  if (!process.argv.includes('--force')) {
    console.error('Refusing to wipe and seed a production database without --force.');
    process.exit(1);
  }
  if (demo) {
    console.error('Demo admin accounts cannot be seeded in production.');
    process.exit(1);
  }
  if (!process.env.SEED_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD.length < MIN_PASSWORD_LENGTH) {
    console.error(`Set SEED_ADMIN_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters) to seed a production database.`);
    process.exit(1);
  }
}

const adminEmail = (process.env.SEED_ADMIN_EMAIL || DEMO_ADMIN.email).trim().toLowerCase();

try {
  await connectDatabase(env.mongoUri);
  const result = await seedDatabase({ adminPassword: env.seedAdminPassword, adminEmail, demo });
  console.log(`Seeded ${result.admins} admin user(s), roles and settings into the admin database.`);
  console.log(`Sign in with ${adminEmail} and the SEED_ADMIN_PASSWORD value; you'll set up an authenticator app at first sign-in.`);
} catch (error) {
  console.error('Seeding failed:', error);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
