import mongoose from 'mongoose';
import { HttpError } from '../utils/HttpError.js';

// Read-only access to the EventSnap platform database (the photographer dashboard's data:
// users, createevents, bookings, …). A separate connection from the admin database, with no
// Mongoose models registered on it, and only read operations exposed below — so nothing in the
// admin API (including the seed script, which clears the admin models) can change platform data.
// In production, also connect with a MongoDB user that has only the "read" role.

let connection = null;

export async function connectPlatformDatabase(uri) {
  if (!uri) return null;
  connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 10_000 }).asPromise();
  return connection;
}

export async function disconnectPlatformDatabase() {
  const conn = connection;
  connection = null;
  if (conn) await conn.close();
}

export const platformConnected = () => connection !== null;

const READ_ONLY = ['find', 'findOne', 'aggregate', 'countDocuments', 'distinct'];

/** A platform collection with read operations only. */
export function platformCollection(name) {
  if (!connection) {
    throw new HttpError(503, 'The EventSnap platform database is not connected. Set PLATFORM_MONGO_URL for the admin API.');
  }
  const collection = connection.db.collection(name);
  return Object.fromEntries(READ_ONLY.map(op => [op, (...args) => collection[op](...args)]));
}
