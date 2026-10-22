import { createApp } from './src/app.js';
import { connectDatabase, disconnectDatabase, startMemoryDatabase } from './src/config/db.js';
import { env } from './src/config/env.js';
import { connectPlatformDatabase, disconnectPlatformDatabase } from './src/config/platformDb.js';
import { seedDatabase } from './src/seed/seedDatabase.js';

async function start() {
  let mongoUri = env.mongoUri;
  let platformUri = env.platformMongoUri;
  if (env.useMemoryDb) {
    if (env.isProduction) throw new Error('The in-memory database cannot be used in production.');
    mongoUri = await startMemoryDatabase();
    // Without PLATFORM_MONGO_URL, an empty platform database on the same throwaway server: pages
    // show zeros rather than invented data.
    if (!platformUri) platformUri = mongoUri.replace(/\/eventsnap_admin(\?|$)/, '/eventSnapDB$1');
  }

  if (platformUri && platformUri === mongoUri) {
    throw new Error('PLATFORM_MONGO_URL must point to the platform database, not the admin database (MONGODB_URI).');
  }

  await connectDatabase(mongoUri);

  if (platformUri) {
    await connectPlatformDatabase(platformUri);
    console.log('Connected to the EventSnap platform database (read-only).');
  } else {
    console.warn('[platform] PLATFORM_MONGO_URL is not set: platform pages (photographers, bookings, revenue, …) will report it.');
  }

  if (env.useMemoryDb) {
    await seedDatabase({ adminPassword: env.seedAdminPassword, demo: true });
    console.log('Using a temporary in-memory admin database seeded with demo admin accounts (reset on every restart).');
  }

  const server = createApp().listen(env.port, () => {
    console.log(`EventSnap admin API listening on http://localhost:${env.port}/api`);
  });

  const shutdown = signal => {
    console.log(`${signal} received, shutting down.`);
    server.close(async () => {
      await disconnectPlatformDatabase();
      await disconnectDatabase();
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch(async error => {
  console.error('Failed to start the API:', error);
  await disconnectPlatformDatabase().catch(() => {});
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
