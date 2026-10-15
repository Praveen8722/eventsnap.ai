import mongoose from 'mongoose';

let memoryServer = null;

/** Starts a throwaway in-memory MongoDB (dev/test only) and returns its connection URI. */
export async function startMemoryDatabase() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  return memoryServer.getUri('eventsnap_admin');
}

export async function connectDatabase(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
