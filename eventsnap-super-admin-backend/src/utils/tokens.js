import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ALGORITHM = 'HS256';

export const TOKEN_PURPOSE = Object.freeze({
  access: 'access',
});

/** `version` is the admin's tokenVersion; bumping it invalidates every token issued before. */
export function signToken(adminId, purpose, { version = 0 } = {}) {
  return jwt.sign({ purpose, ver: version }, env.jwtSecret, { subject: adminId, expiresIn: env.jwtExpiresIn, algorithm: ALGORITHM });
}

/** Returns `{ adminId, version, claims }`, or null if the token is invalid, expired, or for another purpose. */
export function readToken(token, purpose) {
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] });
    if (payload.purpose !== purpose || typeof payload.sub !== 'string') return null;
    return { adminId: payload.sub, version: Number(payload.ver) || 0, claims: payload };
  } catch {
    return null;
  }
}

/** Returns the admin id the token was issued for, or null. */
export const verifyToken = (token, purpose) => readToken(token, purpose)?.adminId ?? null;
