export type LogCategory = 'auth' | 'photographers' | 'payments' | 'settings' | 'admin' | 'system';

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  category: LogCategory;
  target: string;
  ipAddress: string;
  status: 'success' | 'failure' | 'warning';
  details: string;
}
