// Initial platform settings (admin panel configuration; stored preferences).
export const generalSettings = {
  platformName: 'EventSnap.ai',
  platformUrl: 'https://eventsnap.ai',
  supportEmail: 'support@eventsnap.ai',
  adminEmail: 'admin@eventsnap.ai',
  maxFileSize: '100',
  defaultTimezone: 'Asia/Kolkata',
};

export const toggleSettings = {
  general: [
    { label: 'Maintenance Mode', description: 'Temporarily disable platform access for all users', value: false, key: 'maintenance' },
    { label: 'New Registrations', description: 'Allow new photographers to register on the platform', value: true, key: 'registrations' },
    { label: 'Public Profiles', description: 'Allow photographer profiles to be publicly discoverable', value: true, key: 'publicProfiles' },
  ],
  email: [
    { label: 'Welcome Emails', description: 'Send welcome email to new photographer registrations', value: true, key: 'welcomeEmails' },
    { label: 'Booking Confirmations', description: 'Automated booking confirmation emails to clients', value: true, key: 'bookingEmails' },
    { label: 'Payment Receipts', description: 'Send payment receipts to photographers automatically', value: true, key: 'paymentEmails' },
    { label: 'Admin Alerts', description: 'Receive admin alerts for critical platform events', value: true, key: 'adminAlerts' },
  ],
  security: [
    { label: 'Session Timeout', description: 'Auto-logout admin sessions after 8 hours of inactivity', value: true, key: 'sessionTimeout' },
    { label: 'Rate Limiting', description: 'Enable API rate limiting to prevent abuse', value: true, key: 'rateLimit' },
    { label: 'IP Whitelist', description: 'Restrict admin access to approved IP addresses only', value: false, key: 'ipWhitelist' },
  ],
  billing: [
    { label: 'Auto-Retry Failed Payments', description: 'Automatically retry failed subscription payments after 3 days', value: true, key: 'autoRetry' },
    { label: 'Prorated Upgrades', description: 'Prorate charges when photographers upgrade plans mid-cycle', value: true, key: 'proration' },
    { label: 'Grace Period', description: 'Allow 5-day grace period before suspending accounts for non-payment', value: true, key: 'gracePeriod' },
  ],
  infrastructure: [
    { label: 'CDN Acceleration', description: 'Serve gallery assets via CloudFlare CDN for faster load times', value: true, key: 'cdn' },
    { label: 'Image Optimization', description: 'Auto-optimize uploaded images for web delivery', value: true, key: 'imageOptimization' },
    { label: 'Backup Automation', description: 'Daily automated database and file backups', value: true, key: 'backups' },
    { label: 'Error Monitoring', description: 'Real-time error tracking and alerting via Sentry', value: true, key: 'errorMonitoring' },
  ],
  integrations: [
    { label: 'Stripe Payments', description: 'Process subscription and booking payments via Stripe', value: true, key: 'stripe' },
    { label: 'SendGrid Email', description: 'Transactional email delivery via SendGrid', value: true, key: 'sendgrid' },
    { label: 'Google OAuth', description: 'Allow sign in with Google for photographers', value: true, key: 'googleOauth' },
    { label: 'Public REST API', description: 'Enable public REST API for third-party integrations', value: false, key: 'publicApi' },
  ],
};
