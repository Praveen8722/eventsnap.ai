import mongoose from 'mongoose';

export const LOG_CATEGORIES = ['auth', 'photographers', 'payments', 'settings', 'admin', 'system'];

const auditLogSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    actor: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    category: { type: String, enum: LOG_CATEGORIES, required: true },
    target: { type: String, default: '' },
    ipAddress: { type: String, default: '—' },
    status: { type: String, enum: ['success', 'failure', 'warning'], required: true },
    details: { type: String, default: '' },
  },
  { versionKey: false },
);

auditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
