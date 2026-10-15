// Generated from eventsnap-super-admin-ui/src/mocks/notifications.ts. Raw seed data in the UI's payload shape.
export const initialNotifications = [
  { id: 'N001', type: 'warning', title: 'Photographer Pending Approval', message: 'Isabella Rossi Foto has submitted a registration request and is awaiting approval. Review their profile and portfolio.', time: '2 min ago', read: false, category: 'Photographers' },
  { id: 'N002', type: 'error', title: 'Support Ticket #1047 Escalated', message: 'Critical: Gallery upload failing for large files. Elena Vasquez Studio is unable to upload files exceeding 50MB. Requires immediate technical attention.', time: '15 min ago', read: false, category: 'Support' },
  { id: 'N003', type: 'info', title: 'Monthly Revenue Report Ready', message: 'The March 2024 platform revenue report is now available. Platform revenue reached $318K, up 7.8% from February.', time: '1h ago', read: false, category: 'Revenue' },
  { id: 'N004', type: 'success', title: 'Platform Uptime Milestone', message: 'EventSnap.ai has achieved 99.97% uptime over the last 30 days. All systems are operating normally.', time: '3h ago', read: true, category: 'System' },
  { id: 'N005', type: 'warning', title: '7 Refund Requests Pending', message: 'There are 7 refund requests awaiting review. 3 have been pending for more than 48 hours and require action.', time: '5h ago', read: false, category: 'Payments' },
  { id: 'N006', type: 'error', title: 'Subscription Payment Failed', message: 'DeShawn Williams Shots (Professional Plan) - Monthly payment of $149 failed due to card decline. Account at risk of suspension.', time: '7h ago', read: true, category: 'Billing' },
  { id: 'N007', type: 'success', title: 'New Studio Plan Subscriber', message: 'Marcus Chen Photography has upgraded from Professional to Studio plan. New MRR: $299/month.', time: '12h ago', read: true, category: 'Revenue' },
  { id: 'N008', type: 'info', title: 'Storage Warning: 3 Accounts Over Limit', message: 'Elena Vasquez Studio, DeShawn Williams Shots, and Nadia Petrov Photography are exceeding their storage limits. Consider reaching out about plan upgrades.', time: '1d ago', read: true, category: 'Storage' },
  { id: 'N009', type: 'warning', title: 'Unusual Login Activity Detected', message: 'Multiple failed login attempts detected for admin account from IP 185.220.101.x. Account has been temporarily locked as a precaution.', time: '1d ago', read: true, category: 'Security' },
  { id: 'N010', type: 'success', title: 'Platform Milestone: 4,892 Photographers', message: 'EventSnap.ai has reached 4,892 registered photographers, up from 4,768 last month. Growth rate: +2.6% MoM.', time: '2d ago', read: true, category: 'Growth' },
];

export const categories = ['All', 'Photographers', 'Support', 'Revenue', 'System', 'Payments', 'Billing', 'Storage', 'Security', 'Growth'];

export const recentAlerts = [
  { id: 1, text: 'New photographer pending approval', time: '2m ago', type: 'warning' },
  { id: 2, text: 'Support ticket #1042 escalated', time: '15m ago', type: 'error' },
  { id: 3, text: 'Monthly revenue report ready', time: '1h ago', type: 'info' },
  { id: 4, text: 'Platform uptime reached 99.9%', time: '3h ago', type: 'success' },
  { id: 5, text: '7 refund requests pending review', time: '5h ago', type: 'warning' },
];
