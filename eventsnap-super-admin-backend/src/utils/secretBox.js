import crypto from 'node:crypto';

/** One-way hash for single-use tokens (invites) stored in the database. */
export const hashToken = token => crypto.createHash('sha256').update(String(token)).digest('hex');

export const randomToken = () => crypto.randomBytes(32).toString('base64url');
