import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { platformFingerprint } from './fixtures/platform.js';
import { startTestServer } from './helpers.js';

let api;
let token;
let fingerprint;

before(async () => {
  api = await startTestServer();
  fingerprint = await platformFingerprint(api.platformUri);
  token = await api.signIn();
});

after(async () => {
  await api.stop();
});

const get = async path => {
  const res = await api.request(path, { token });
  assert.equal(res.status, 200, `${path}: ${JSON.stringify(res.body)}`);
  return res.body;
};

const id = name => String(api.fixture.ids[name]);

describe('platform pages are computed from the platform database', () => {
  it('GET /photographers joins users, portfolios, bookings, events and storage', async () => {
    const data = await get('/photographers');
    assert.equal(data.length, 3);
    assert.deepEqual(data.map(p => p.name), ['New Pixel', 'Vikram Mehta', 'Asha Studio']);

    const asha = data.find(p => p.id === id('asha'));
    assert.equal(asha.ownerName, 'Asha Rao');
    assert.equal(asha.email, 'asha@studio.in');
    assert.equal(asha.location, 'Mumbai, Maharashtra');
    assert.equal(asha.plan, 'Free');
    assert.equal(asha.status, 'active');
    assert.equal(asha.bookings, 3);
    assert.equal(asha.revenue, '₹1,00,000'); // recorded client payments: 20,000 + 30,000 + 50,000
    assert.equal(asha.rating, 4.5);
    assert.equal(asha.specialty, 'Weddings');
    assert.equal(asha.storage, '2.8 GB');
    assert.equal(asha.events, 2);
    assert.equal(asha.clients, 2);
    assert.equal(asha.portfolioSlug, 'asha-studio');

    const vikram = data.find(p => p.id === id('vikram'));
    assert.equal(vikram.status, 'inactive'); // nothing in the last 30 days
    assert.equal(vikram.revenue, '₹10,000');
    assert.equal(vikram.portfolioPublished, false);
    assert.equal(data.find(p => p.id === id('pixel')).bookings, 0);
  });

  it('never exposes passwords, notes or face data', async () => {
    const everything = JSON.stringify(await Promise.all(
      ['/photographers', '/clients', '/bookings', '/payments', '/gallery', '/dashboard', '/analytics?period=all', '/subscriptions'].map(get),
    ));
    for (const secret of ['not-a-real-hash', 'PRIVATE NOTE', 'password', 'faces']) assert.equal(everything.includes(secret), false, secret);
  });

  it('GET /clients groups bookings per photographer and masks contact details', async () => {
    const clients = await get('/clients');
    assert.equal(clients.length, 3); // the legacy booking without a photographer has no client record
    const rahulAtAsha = clients.find(c => c.name === 'Rahul Sharma' && c.photographer === 'Asha Studio');
    assert.equal(rahulAtAsha.bookings, 2); // same phone, written two ways
    assert.equal(rahulAtAsha.totalSpent, '₹1,00,000');
    assert.equal(rahulAtAsha.email, 'r***@gmail.com');
    assert.equal(rahulAtAsha.phone, '98****3210');
    assert.equal(rahulAtAsha.status, 'active');
    assert.match(rahulAtAsha.id, /^CL-/);

    // The same person booking another photographer is that photographer's client, separately.
    const rahulAtVikram = clients.find(c => c.name === 'Rahul Sharma' && c.photographer === 'Vikram Mehta');
    assert.notEqual(rahulAtVikram.id, rahulAtAsha.id);
    assert.equal(rahulAtVikram.status, 'inactive');

    const raw = JSON.stringify(clients);
    for (const contact of ['9876543210', 'rahul@gmail.com', 'neha@example.com']) assert.equal(raw.includes(contact), false, contact);
  });

  it('GET /bookings maps platform statuses, money and ownership', async () => {
    const bookings = await get('/bookings');
    assert.equal(bookings.length, 5);
    assert.equal(new Set(bookings.map(b => b.id)).size, 5); // BK001 exists for two photographers
    const bk1 = bookings.find(b => b.reference === 'BK001' && b.photographer === 'Asha Studio');
    assert.equal(bk1.status, 'confirmed');
    assert.equal(bk1.amount, '₹1,00,000');
    assert.equal(bk1.paid, '₹50,000');
    assert.equal(bk1.balance, '₹50,000');
    assert.equal(bk1.location, 'Mumbai');
    assert.equal(bk1.clientPhone, '98****3210');
    assert.deepEqual(bk1.days.map(d => d.name), ['Wedding']);
    assert.equal(bookings.find(b => b.reference === 'BK003').status, 'inquiry');
    assert.equal(bookings.find(b => b.reference === 'BK003').source, 'portfolio');
    assert.equal(bookings.find(b => b.reference === 'BK010').photographer, 'Unassigned');
    assert.equal(bookings[0].reference, 'BK003'); // newest first
    assert.equal(JSON.stringify(bookings).includes('9876543210'), false);
  });

  it('GET /payments reports booking volume, not EventSnap income', async () => {
    const data = await get('/payments');
    assert.equal(data.summary.platformIncome, 0);
    assert.equal(data.summary.billingEnabled, false);
    assert.equal(data.summary.volumeTotal, 115000);
    assert.equal(data.summary.outstandingAmount, 50000);
    assert.equal(data.summary.outstandingBookings, 1);
    assert.equal(data.monthlyRevenue.length, 12);
    assert.ok(data.monthlyRevenue.every(point => point.platformIncome === 0));
    assert.equal(data.monthlyRevenue.reduce((sum, p) => sum + p.bookingVolume, 0) >= 30000, true);

    assert.equal(data.transactions.length, 6); // 5 recorded payments + 1 balance due
    const pending = data.transactions.filter(t => t.status === 'pending');
    assert.deepEqual(pending.map(t => [t.type, t.amount]), [['balance', '+₹50,000']]);
    assert.equal(data.transactions[0].amount, '+₹50,000'); // the balance due in 30 days sorts first
    assert.ok(data.transactions.some(t => t.type === 'payment' && t.amount === '+₹30,000'));
  });

  it('GET /subscriptions shows the single Free plan with every photographer', async () => {
    const data = await get('/subscriptions');
    assert.equal(data.billing.enabled, false);
    assert.equal(data.plans.length, 1);
    assert.equal(data.plans[0].name, 'Free');
    assert.equal(data.plans[0].subscribers, 3);
    assert.equal(data.plans[0].mrr, 0);
    assert.equal(data.plans[0].limits.storage, '3 GB');
    assert.deepEqual(data.recentSubscribers.map(s => s.name), ['New Pixel', 'Vikram Mehta', 'Asha Studio']);
    assert.ok(data.recentSubscribers.every(s => s.nextBilling === null && s.amount === '₹0'));
  });

  it('GET /gallery uses the storage ledger (or event photos) against the 3 GB quota', async () => {
    const data = await get('/gallery');
    assert.equal(data.storageOverview.totalAllocated, 9);
    assert.equal(data.storageOverview.totalFiles, 3);
    assert.equal(data.storageOverview.quotaGB, 3);
    assert.deepEqual(data.galleryUsers.map(u => [u.name, u.status, u.galleries, u.files]), [
      ['Vikram Mehta', 'exceeded', 1, 1],
      ['Asha Studio', 'warning', 2, 2],
    ]);
    assert.equal(data.galleryUsers[1].usedGB, 2.8);
  });

  it('GET /dashboard summarises the platform', async () => {
    const data = await get('/dashboard');
    assert.equal(data.stats.photographers.total, 3);
    assert.equal(data.stats.activePhotographers.value, 2);
    assert.equal(data.stats.bookings.total, 5);
    assert.equal(data.stats.bookingVolume.total, 115000);
    assert.equal(data.stats.events.total, 3);
    assert.deepEqual(data.stats.outstanding, { amount: 50000, bookings: 1 });
    assert.equal(data.revenueData.length, 12);
    assert.deepEqual(data.subscriptionData, [{ name: 'Free', value: 3, color: '#6C63FF' }]);
    assert.deepEqual(data.topPhotographers.map(p => p.name), ['Asha Studio', 'Vikram Mehta']);
    assert.equal(data.topPhotographers[0].revenue, '₹1,00,000');
    assert.equal(data.recentActivity.length, 6);
    assert.ok(data.recentActivity.every(a => a.time && a.message && !a.message.includes('9876543210')));
  });

  it('GET /analytics computes growth, event types, geography and health', async () => {
    const data = await get('/analytics?period=all');
    assert.equal(data.period, 'all');
    assert.equal(data.userGrowth.length, 12);
    assert.equal(data.userGrowth.at(-1).photographers, 3);
    assert.equal(data.userGrowth.at(-1).clients, 3);
    assert.deepEqual(data.eventTypeData.map(e => [e.type, e.count]), [['Wedding', 2], ['Engagement', 1], ['Portrait', 1], ['Birthday', 1]]);
    assert.deepEqual(data.geographicData.map(g => [g.state, g.photographers]), [['Mumbai', 1], ['Pune', 1], ['Not set', 1]]);
    assert.equal(data.radarData.length, 6);
    assert.ok(data.radarData.every(m => m.value >= 0 && m.value <= 100));
    assert.equal(data.summary.bookings, 5);
    assert.equal(data.summary.bookingVolume, 115000);

    const month = await get('/analytics?period=30d');
    assert.deepEqual(month.eventTypeData.map(e => e.type), ['Birthday']);
    assert.equal(month.summary.newPhotographers, 1);

    const bad = await api.request('/analytics?period=forever', { token });
    assert.equal(bad.status, 400);
  });

  it('notifications include alerts derived from the platform', async () => {
    const data = await get('/notifications');
    const ids = data.notifications.map(n => n.id).sort();
    assert.deepEqual(ids, [
      `platform-signup-${id('pixel')}`,
      `platform-storage-exceeded-${id('vikram')}`,
      `platform-storage-warning-${id('asha')}`,
    ].sort());
    assert.ok(data.categories.includes('Storage'));
  });

  it('GET /system/status reports the platform connection', async () => {
    assert.deepEqual(await get('/system/status'), { api: 'ok', platformDatabase: 'connected' });
  });

  it('never writes to the platform database', async () => {
    const { platformCollection } = await import('../src/config/platformDb.js');
    const users = platformCollection('users');
    for (const op of ['insertOne', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'drop', 'bulkWrite', 'findOneAndUpdate']) {
      assert.equal(users[op], undefined, op);
    }
    assert.equal(await platformFingerprint(api.platformUri), fingerprint);
  });

  it('platform pages report a missing platform connection clearly', async () => {
    await api.disconnectPlatform();
    try {
      const res = await api.request('/photographers', { token });
      assert.equal(res.status, 503);
      assert.match(res.body.error.message, /PLATFORM_MONGO_URL/);
      assert.equal((await api.request('/notifications', { token })).status, 200); // admin data still works
      assert.equal((await api.request('/system/status', { token })).body.platformDatabase, 'not-configured');
    } finally {
      await api.reconnectPlatform();
    }
  });
});

describe('role-based access', () => {
  const cases = {
    'sarah.k@eventsnap.ai': { // Support Agent
      allowed: ['/dashboard', '/photographers', '/bookings', '/gallery', '/support-tickets', '/notifications'],
      denied: ['/clients', '/payments', '/subscriptions', '/analytics', '/activity-logs', '/settings', '/admin-users'],
    },
    'mike.l@eventsnap.ai': { // Finance Admin
      allowed: ['/dashboard', '/payments', '/subscriptions', '/analytics'],
      denied: ['/clients', '/bookings', '/support-tickets', '/settings', '/admin-users', '/activity-logs'],
    },
    'raj.patel@eventsnap.ai': { // Platform Admin
      allowed: ['/photographers', '/clients', '/bookings', '/analytics', '/gallery', '/activity-logs', '/settings', '/support-tickets'],
      denied: ['/payments', '/subscriptions', '/admin-users'],
    },
  };

  for (const [email, { allowed, denied }] of Object.entries(cases)) {
    it(`enforces ${email}'s role on every route`, async () => {
      const roleToken = await api.signIn(email);
      for (const path of allowed) assert.equal((await api.request(path, { token: roleToken })).status, 200, `${email} ${path}`);
      for (const path of denied) assert.equal((await api.request(path, { token: roleToken })).status, 403, `${email} ${path}`);
    });
  }

  it('sends the role\'s areas with the signed-in user', async () => {
    const me = await api.request('/auth/me', { token: await api.signIn('mike.l@eventsnap.ai') });
    assert.deepEqual(me.body.user.access, ['dashboard', 'payments', 'subscriptions', 'analytics', 'notifications']);
  });

  it('unknown API routes return JSON 404 for signed-in admins', async () => {
    const res = await api.request('/does-not-exist', { token });
    assert.equal(res.status, 404);
    assert.match(res.body.error.message, /Route not found/);
  });
});
