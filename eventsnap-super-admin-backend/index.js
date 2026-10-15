import { createApp } from './src/app.js';
import { connectDatabase, disconnectDatabase, startMemoryDatabase } from './src/config/db.js';
import { env } from './src/config/env.js';
import { seedDatabase } from './src/seed/seedDatabase.js';

async function start() {
  let mongoUri = env.mongoUri;
  if (env.useMemoryDb) {
    if (env.isProduction) throw new Error('The in-memory database cannot be used in production.');
    mongoUri = await startMemoryDatabase();
  }

  await connectDatabase(mongoUri);

  if (env.useMemoryDb) {
    await seedDatabase({ adminPassword: env.seedAdminPassword });
    console.log('Using a temporary in-memory MongoDB seeded with demo data (reset on every restart).');
  }

  const server = createApp().listen(env.port, () => {
    console.log(`EventSnap admin API listening on http://localhost:${env.port}/api`);
  });

  const shutdown = signal => {
    console.log(`${signal} received, shutting down.`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch(async error => {
  console.error('Failed to start the API:', error);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
