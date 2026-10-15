import { clientIp } from '../services/auditService.js';
import { login, verifyTwoFactor } from '../services/authService.js';
import { toAdminUser } from '../services/mappers.js';
import { HttpError } from '../utils/HttpError.js';
import { requireObject } from '../utils/validation.js';

const MAX_PASSWORD_LENGTH = 200;

export async function postLogin(req, res) {
  const { email, password } = requireObject(req.body);
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw HttpError.badRequest('Email and password are required.');
  }
  if (password.length > MAX_PASSWORD_LENGTH) throw HttpError.unauthorized('Invalid email or password.');
  res.json(await login({ email: email.trim().toLowerCase(), password }, clientIp(req)));
}

export async function postTwoFactor(req, res) {
  const { challengeToken, code } = requireObject(req.body);
  if (typeof challengeToken !== 'string' || typeof code !== 'string') {
    throw HttpError.badRequest('challengeToken and code are required.');
  }
  res.json(await verifyTwoFactor({ challengeToken, code: code.trim() }, clientIp(req)));
}

export function getMe(req, res) {
  res.json({ user: toAdminUser(req.admin) });
}
