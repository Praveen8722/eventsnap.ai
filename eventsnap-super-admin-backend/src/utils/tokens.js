import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ALGORITHM = 'HS256';

export const TOKEN_PURPOSE = Object.freeze({
  access: 'access',
  twoFactor: '2fa',
});

export function signToken(adminId, purpose) {
  const expiresIn = purpose === TOKEN_PURPOSE.access ? env.jwtExpiresIn : env.twoFactorChallengeExpiresIn;
  return jwt.sign({ purpose }, env.jwtSecret, { subject: adminId, expiresIn, algorithm: ALGORITHM });
}

/** Returns the admin id the token was issued for, or null if it is invalid, expired, or for another purpose. */
export function verifyToken(token, purpose) {
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] });
    return payload.purpose === purpose && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
