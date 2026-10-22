import { env } from '../config/env.js';
import { HttpError } from '../utils/HttpError.js';

/**
 * Blocks sign-in after LOGIN_MAX_FAILURES failed attempts (wrong password, invalid
 * invite token) for the same email or from the same IP within LOGIN_LOCKOUT_MINUTES. Kept in
 * memory, so it is per API instance and resets on restart; run one instance or add a shared
 * store (or a rate-limiting proxy) when scaling out.
 */

const failures = new Map();

const windowMs = () => env.loginLockoutMinutes * 60_000;
const keysFor = ({ email, ip }) => [email && `email:${email}`, ip && `ip:${ip}`].filter(Boolean);

function recent(key, now) {
  const times = (failures.get(key) ?? []).filter(time => now - time < windowMs());
  if (times.length) failures.set(key, times);
  else failures.delete(key);
  return times;
}

/** Throws 429 while any of the identities is locked out. */
export function assertNotLocked(identity, now = Date.now()) {
  for (const key of keysFor(identity)) {
    const times = recent(key, now);
    if (times.length >= env.loginMaxFailures) {
      const minutes = Math.max(Math.ceil((times[0] + windowMs() - now) / 60_000), 1);
      throw new HttpError(429, `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`);
    }
  }
}

export function recordFailure(identity, now = Date.now()) {
  for (const key of keysFor(identity)) failures.set(key, [...recent(key, now), now]);
}

/** A successful sign-in clears the account's failures (not the IP's). */
export function clearFailures({ email }) {
  if (email) failures.delete(`email:${email}`);
}

export const resetLoginThrottle = () => failures.clear();
