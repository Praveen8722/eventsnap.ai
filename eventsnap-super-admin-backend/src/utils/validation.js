import { HttpError } from './HttpError.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isPlainObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);

export function requireObject(value, name = 'Request body') {
  if (!isPlainObject(value)) throw HttpError.badRequest(`${name} must be a JSON object.`);
  return value;
}

export function requireString(value, field, { maxLength = 200 } = {}) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw HttpError.badRequest(`${field} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw HttpError.badRequest(`${field} must be at most ${maxLength} characters.`);
  return trimmed;
}

export function requireEmail(value, field) {
  const email = requireString(value, field, { maxLength: 254 }).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw HttpError.badRequest(`${field} must be a valid email address.`);
  return email;
}

export function requireOneOf(value, field, allowed) {
  if (!allowed.includes(value)) throw HttpError.badRequest(`${field} must be one of: ${allowed.join(', ')}.`);
  return value;
}
