import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startTestServer } from './helpers.js';

let api;
let token;

before(async () => {
  api = await startTestServer();
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

describe('read endpoints return the UI payload shapes', () => {
  it('GET /dashboard derives top photographers and plan distribution', async () => {
    const data = await get('/dashboard');
    assert.equal(data.revenueData.length, 12);
    assert.deepEqual(data.revenueData[0], { month: 'Apr', revenue: 158000, bookings: 1842 });
    assert.deepEqual(data.subscriptionData, [
      { name: 'Starter', value: 412, color: '#A78BFA' },
      { name: 'Professional', value: 638, color: '#6C63FF' },
      { name: 'Studio', value: 153, color: '#FF675D' },
    ]);
    assert.deepEqual(
      data.topPhotographers.map(p => p.name),
      ['Marcus Chen Photography', 'Elena Vasquez Studio', 'James Okafor Visuals', 'Priya Sharma Captures', "Liam O'Brien Lens"],
    );
    assert.deepEqual(data.topPhotographers[0], {
      name: 'Marcus Chen Photography', location: 'New York, NY', bookings: 142, revenue: '$48,200', status: 'active', plan: 'Studio',
    });
    assert.equal(data.recentActivity.length, 6);
    assert.equal(data.recentActivity[0].time, '3 min ago');
  });

  it('GET /photographers formats revenue and storage', async () => {
    const data = await get('/photographers');
    assert.equal(data.length, 12);
    assert.deepEqual(data[0], {
      id: 'PH001', name: 'Marcus Chen Photography', email: 'marcus@chenphotos.com', phone: '+1 (212) 555-0141',
      location: 'New York, NY', joinDate: '2023-03-15', plan: 'Studio', status: 'active', bookings: 142,
      revenue: '$48,200', rating: 4.9, storage: '84.2 GB', specialty: 'Weddings',
    });
    assert.equal(data.find(p => p.id === 'PH006').storage, '0 GB');
  });

  it('GET /clients and /bookings', async () => {
    const clients = await get('/clients');
    assert.equal(clients.length, 10);
    assert.equal(clients[0].totalSpent, '$8,400');

    const bookings = await get('/bookings');
    assert.equal(bookings.length, 12);
    assert.equal(bookings[0].id, 'BK-28543');
    assert.equal(bookings[0].amount, '$3,800');
  });

  it('GET /payments signs transaction amounts', async () => {
    const data = await get('/payments');
    assert.equal(data.monthlyRevenue.length, 8);
    assert.equal(data.transactions.length, 10);
    assert.equal(data.transactions.find(t => t.id === 'TXN-84521').amount, '+$299.00');
    assert.equal(data.transactions.find(t => t.id === 'TXN-84518').amount, '-$248.00');
  });

  it('GET /subscriptions derives MRR and subscriber details', async () => {
    const data = await get('/subscriptions');
    assert.deepEqual(data.plans.map(p => [p.id, p.mrr]), [['starter', 20188], ['professional', 95062], ['studio', 45747]]);
    assert.deepEqual(data.plans[1].limits, { bookings: 'Unlimited', storage: '50 GB', galleries: 'Unlimited', staff: 3 });
    assert.equal(data.plans[1].popular, true);
    assert.equal('popular' in data.plans[0], false);
    assert.equal(data.recentSubscribers.length, 5);
    assert.deepEqual(data.recentSubscribers.find(s => s.email === 'deshawn@williamsshots.com'), {
      name: 'DeShawn Williams Shots', plan: 'Professional', email: 'deshawn@williamsshots.com',
      since: '2023-09-21', status: 'past_due', nextBilling: '2024-01-21', amount: '$149',
    });
  });

  it('GET /analytics', async () => {
    const data = await get('/analytics');
    assert.deepEqual(Object.keys(data), ['userGrowth', 'geographicData', 'eventTypeData', 'retentionData', 'radarData']);
    assert.equal(data.retentionData.length, 12);
  });

  it('GET /gallery computes storage status from plan limits', async () => {
    const data = await get('/gallery');
    assert.equal(data.storageOverview.totalAllocated, 12800);
    assert.equal(data.galleryUsers.length, 9);
    const status = Object.fromEntries(data.galleryUsers.map(u => [u.id, u.status]));
    assert.deepEqual(status, {
      PH001: 'ok', PH003: 'ok', PH012: 'ok', PH002: 'exceeded', PH009: 'exceeded',
      PH004: 'warning', PH005: 'ok', PH010: 'exceeded', PH008: 'exceeded',
    });
    assert.equal(data.galleryUsers[0].id, 'PH001');
  });

  it('GET /support-tickets and /activity-logs return ISO timestamps newest first', async () => {
    const tickets = await get('/support-tickets');
    assert.equal(tickets.length, 9);
    assert.equal(tickets[0].id, '#1048');
    assert.ok(!Number.isNaN(Date.parse(tickets[0].created)));

    const logs = await get('/activity-logs');
    assert.ok(logs.length >= 12);
    assert.equal(logs[0].action, 'LOGIN');
    const times = logs.map(log => Date.parse(log.timestamp));
    assert.deepEqual(times, [...times].sort((a, b) => b - a));
  });

  it('GET /admin-users never exposes password hashes', async () => {
    const data = await get('/admin-users');
    assert.equal(data.adminUsers.length, 7);
    assert.deepEqual(Object.keys(data.roles), ['Super Admin', 'Platform Admin', 'Support Agent', 'Finance Admin', 'Read Only']);
    for (const admin of data.adminUsers) assert.equal('passwordHash' in admin, false);
  });

  it('unknown API routes return JSON 404 for signed-in admins', async () => {
    const res = await api.request('/does-not-exist', { token });
    assert.equal(res.status, 404);
    assert.match(res.body.error.message, /Route not found/);
  });
});
