import { canAccess } from '../config/permissions.js';
import { AdminUser } from '../models/index.js';
import { HttpError } from '../utils/HttpError.js';
import { readToken, TOKEN_PURPOSE } from '../utils/tokens.js';

/**
 * Requires a valid access token for an active admin; exposes the admin as `req.admin`. A token
 * stops working when the admin signs out, is deactivated, or has their role changed
 * (each bumps `tokenVersion`).
 */
export async function requireAuth(req, _res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw HttpError.unauthorized();

  const claims = readToken(token, TOKEN_PURPOSE.access);
  if (!claims) throw HttpError.unauthorized('Your session has expired. Please sign in again.');

  const admin = await AdminUser.findById(claims.adminId).lean();
  if (!admin || admin.status !== 'active' || (admin.tokenVersion ?? 0) !== claims.version) {
    throw HttpError.unauthorized('Your session is no longer valid. Please sign in again.');
  }

  req.admin = admin;
  next();
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.admin?.role)) throw HttpError.forbidden();
  next();
};

/** Allows only roles with access to `area` (see config/permissions.js). */
export const requireAccess = area => (req, _res, next) => {
  if (!canAccess(req.admin?.role, area)) throw HttpError.forbidden();
  next();
};
