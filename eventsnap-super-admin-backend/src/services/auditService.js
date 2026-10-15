import { AuditLog, nextSequence } from '../models/index.js';
import { toAuditLog } from './mappers.js';

export const SYSTEM_ACTOR = Object.freeze({ name: 'Unknown', role: '—' });

/** Normalises the request IP for display ("::ffff:127.0.0.1" -> "127.0.0.1"). */
export const clientIp = req => (req.ip ?? '—').replace(/^::ffff:/, '');

/**
 * Appends an entry to the audit log. `actor` is the admin performing the action, or null for
 * anonymous events such as failed logins.
 */
export async function recordAudit({ actor, action, category, target, status = 'success', details = '', ip = '—' }) {
  const seq = await nextSequence('auditLog');
  await AuditLog.create({
    _id: `LOG-${seq}`,
    actor: actor?.name ?? SYSTEM_ACTOR.name,
    actorRole: actor?.role ?? SYSTEM_ACTOR.role,
    action,
    category,
    target,
    ipAddress: ip,
    status,
    details,
  });
}

export async function listAuditLogs() {
  const logs = await AuditLog.find().sort({ timestamp: -1, _id: -1 }).lean();
  return logs.map(toAuditLog);
}
