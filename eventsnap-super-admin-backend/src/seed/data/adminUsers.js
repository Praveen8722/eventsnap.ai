// Generated from eventsnap-super-admin-ui/src/mocks/adminUsers.ts. Raw seed data in the UI's payload shape.
export const adminUsers = [
  { id: 'ADM001', name: 'Alexandra Rivera', email: 'alex.rivera@eventsnap.ai', role: 'Super Admin', status: 'active', lastLogin: '2024-01-15T09:30:00', joined: '2022-01-10', twoFA: true },
  { id: 'ADM002', name: 'Raj Patel', email: 'raj.patel@eventsnap.ai', role: 'Platform Admin', status: 'active', lastLogin: '2024-01-15T08:15:00', joined: '2022-06-15', twoFA: true },
  { id: 'ADM003', name: 'Sarah Kowalski', email: 'sarah.k@eventsnap.ai', role: 'Support Agent', status: 'active', lastLogin: '2024-01-15T07:45:00', joined: '2023-02-01', twoFA: true },
  { id: 'ADM004', name: 'Mike Lawson', email: 'mike.l@eventsnap.ai', role: 'Finance Admin', status: 'active', lastLogin: '2024-01-14T16:20:00', joined: '2022-09-12', twoFA: true },
  { id: 'ADM005', name: 'Chen Wei', email: 'chen.w@eventsnap.ai', role: 'Support Agent', status: 'active', lastLogin: '2024-01-14T12:00:00', joined: '2023-07-20', twoFA: false },
  { id: 'ADM006', name: 'Fatima Hassan', email: 'fatima.h@eventsnap.ai', role: 'Read Only', status: 'inactive', lastLogin: '2024-01-10T09:00:00', joined: '2023-11-01', twoFA: false },
];

export const roles = {
  'Super Admin': {
    color: '#FF675D',
    bg: '#FFF1F0',
    permissions: ['Full platform access', 'Manage all admin users', 'Delete data', 'Billing & revenue', 'System settings', 'Security controls'],
  },
  'Platform Admin': {
    color: '#6C63FF',
    bg: '#F0EEFF',
    permissions: ['Manage photographers', 'Manage clients', 'View analytics', 'Manage bookings', 'Support tickets', 'Notifications'],
  },
  'Support Agent': {
    color: '#10B981',
    bg: '#ECFDF5',
    permissions: ['View photographer data', 'Manage support tickets', 'Send notifications', 'View bookings'],
  },
  'Finance Admin': {
    color: '#F59E0B',
    bg: '#FFFBEB',
    permissions: ['View all revenue data', 'Manage payments', 'Process refunds', 'Subscription management', 'Export financial reports'],
  },
  'Read Only': {
    color: '#8080A0',
    bg: '#F5F5FA',
    permissions: ['View dashboard', 'View photographer list', 'View analytics'],
  },
};
