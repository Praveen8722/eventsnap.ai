import { clientIp } from '../services/auditService.js';
import { acceptInvite, getInvite, login, logout, MAX_PASSWORD_LENGTH, toSessionUser } from '../services/authService.js';
import { createFirstSuperAdmin, getSetupStatus } from '../services/setupService.js';
import { HttpError } from '../utils/HttpError.js';
import { requireObject } from '../utils/validation.js';

export async function postLogin(req, res) {
  const { email, password } = requireObject(req.body);
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw HttpError.badRequest('Email and password are required.');
  }
  if (password.length > MAX_PASSWORD_LENGTH) throw HttpError.unauthorized('Invalid email or password.');
  res.json(await login({ email: email.trim().toLowerCase(), password }, clientIp(req)));
}

export function getMe(req, res) {
  res.json({ user: toSessionUser(req.admin) });
}

export async function postLogout(req, res) {
  await logout(req.admin, clientIp(req));
  res.status(204).end();
}

export async function postInviteInfo(req, res) {
  const { token } = requireObject(req.body);
  res.json(await getInvite(token, clientIp(req)));
}

export async function postAcceptInvite(req, res) {
  const { token, password } = requireObject(req.body);
  res.json(await acceptInvite({ token, password }, clientIp(req)));
}

export async function getSetup(_req, res) {
  res.json(await getSetupStatus());
}

export async function postSetup(req, res) {
  res.status(201).json(await createFirstSuperAdmin(req.body, clientIp(req)));
}
