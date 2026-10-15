import { AdminUser } from '../models/index.js';
import { HttpError } from '../utils/HttpError.js';
import { TOKEN_PURPOSE, verifyToken } from '../utils/tokens.js';

/** Requires a valid access token for an active admin; exposes the admin as `req.admin`. */
export async function requireAuth(req, _res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw HttpError.unauthorized();

  const adminId = verifyToken(token, TOKEN_PURPOSE.access);
  if (!adminId) throw HttpError.unauthorized('Your session has expired. Please sign in again.');

  const admin = await AdminUser.findById(adminId).lean();
  if (!admin || admin.status !== 'active') throw HttpError.unauthorized('Your session is no longer valid.');

  req.admin = admin;
  next();
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.admin?.role)) throw HttpError.forbidden();
  next();
};
