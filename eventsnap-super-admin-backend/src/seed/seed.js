import { env } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { DEMO_ADMIN, seedDatabase } from './seedDatabase.js';

// Usage: npm run seed [-- --force]   (--force is required when NODE_ENV=production)
if (env.isProduction && !process.argv.includes('--force')) {
  console.error('Refusing to wipe and seed a production database without --force.');
  process.exit(1);
}

try {
  await connectDatabase(env.mongoUri);
  const result = await seedDatabase({ adminPassword: env.seedAdminPassword });
  console.log(`Seeded ${result.admins} admin users and ${result.photographers} photographers into ${env.mongoUri}.`);
  console.log(`Sign in with ${DEMO_ADMIN.email} and the SEED_ADMIN_PASSWORD value (default "admin123").`);
} catch (error) {
  console.error('Seeding failed:', error);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
