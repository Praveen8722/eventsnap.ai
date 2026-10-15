import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { startTestServer } from './helpers.js';

let api;
let token;

before(async () => {
  api = await startTestServer();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
  token = await api.signIn();
});

/** Signs in as an active admin with a non-Super-Admin role. */
async function signInAsSupportAgent() {
  return api.signIn('sarah.k@eventsnap.ai');
}

describe('notifications', () => {
  it('lists categories in order of the newest notification', async () => {
    const res = await api.request('/notifications', { token });
    assert.equal(res.body.notifications.length, 10);
    assert.deepEqual(res.body.categories, [
      'All', 'Photographers', 'Support', 'Revenue', 'System', 'Payments', 'Billing', 'Storage', 'Security', 'Growth',
    ]);
  });

  it('marks one notification as read', async () => {
    const res = await api.request('/notifications/N001/read', { method: 'PATCH', token });
    assert.equal(res.status, 200);
    assert.equal(res.body.read, true);

    const alerts = await api.request('/notifications/alerts', { token });
    assert.equal(alerts.body.length, 5);
    assert.equal(alerts.body.find(a => a.id === 'N001').read, true);
  });

  it('marks all notifications as read', async () => {
    const res = await api.request('/notifications/read-all', { method: 'POST', token });
    assert.deepEqual(res.body, { updated: 4 });
    const list = await api.request('/notifications', { token });
    assert.ok(list.body.notifications.every(n => n.read));
  });

  it('dismisses a notification and 404s for unknown ids', async () => {
    assert.equal((await api.request('/notifications/N002', { method: 'DELETE', token })).status, 204);
    assert.equal((await api.request('/notifications/N002', { method: 'DELETE', token })).status, 404);
    assert.equal((await api.request('/notifications/nope/read', { method: 'PATCH', token })).status, 404);
    const list = await api.request('/notifications', { token });
    assert.equal(list.body.notifications.length, 9);
  });
});

describe('PUT /settings', () => {
  it('updates general settings and toggles, and audits the change', async () => {
    const res = await api.request('/settings', {
      method: 'PUT',
      token,
      body: { generalSettings: { maxFileSize: '250', platformName: ' EventSnap ' }, toggles: { maintenance: true } },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.generalSettings.maxFileSize, '250');
    assert.equal(res.body.generalSettings.platformName, 'EventSnap');
    assert.equal(res.body.toggleSettings.general.find(t => t.key === 'maintenance').value, true);
    assert.deepEqual(Object.keys(res.body.toggleSettings), ['general', 'email', 'security', 'billing', 'infrastructure', 'integrations']);

    const reloaded = await api.request('/settings', { token });
    assert.deepEqual(reloaded.body, res.body);

    const logs = await api.request('/activity-logs', { token });
    const entry = logs.body.find(log => log.action === 'SETTINGS_UPDATED' && log.actor === 'Super Admin');
    assert.ok(entry);
    assert.match(entry.details, /maxFileSize: 100 → 250/);
    assert.match(entry.details, /maintenance: off → on/);
  });

  it('does not write an audit entry when nothing changed', async () => {
    const before = (await api.request('/activity-logs', { token })).body.length;
    const res = await api.request('/settings', { method: 'PUT', token, body: { toggles: { registrations: true } } });
    assert.equal(res.status, 200);
    assert.equal((await api.request('/activity-logs', { token })).body.length, before);
  });

  for (const [name, body] of [
    ['unknown general key', { generalSettings: { hacked: 'x' } }],
    ['unknown toggle', { toggles: { nope: true } }],
    ['non-boolean toggle', { toggles: { maintenance: 'yes' } }],
    ['invalid email', { generalSettings: { supportEmail: 'not-an-email' } }],
    ['invalid url', { generalSettings: { platformUrl: 'javascript:alert(1)' } }],
    ['invalid file size', { generalSettings: { maxFileSize: '0' } }],
    ['invalid timezone', { generalSettings: { defaultTimezone: 'Mars/Olympus' } }],
    ['array body', []],
  ]) {
    it(`rejects ${name}`, async () => {
      const res = await api.request('/settings', { method: 'PUT', token, body });
      assert.equal(res.status, 400, JSON.stringify(res.body));
    });
  }

  it('rejects partial updates atomically', async () => {
    await api.request('/settings', {
      method: 'PUT',
      token,
      body: { generalSettings: { maxFileSize: '300', supportEmail: 'bad' } },
    });
    const settings = await api.request('/settings', { token });
    assert.equal(settings.body.generalSettings.maxFileSize, '100');
  });

  it('is restricted to Super Admins', async () => {
    const agentToken = await signInAsSupportAgent();
    const res = await api.request('/settings', { method: 'PUT', token: agentToken, body: { toggles: { maintenance: true } } });
    assert.equal(res.status, 403);
    assert.equal((await api.request('/settings', { token: agentToken })).status, 200);
  });
});

describe('POST /admin-users', () => {
  it('invites an inactive admin with the next sequential id', async () => {
    const res = await api.request('/admin-users', {
      method: 'POST',
      token,
      body: { name: 'Jane Smith', email: 'Jane@EventSnap.ai', role: 'Finance Admin' },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.id, 'ADM007');
    assert.equal(res.body.email, 'jane@eventsnap.ai');
    assert.equal(res.body.status, 'inactive');
    assert.equal(res.body.lastLogin, null);

    const list = await api.request('/admin-users', { token });
    assert.ok(list.body.adminUsers.some(a => a.id === 'ADM007'));

    const logs = await api.request('/activity-logs', { token });
    assert.ok(logs.body.some(log => log.action === 'ADMIN_CREATED' && log.target === 'Jane Smith (Finance Admin)'));

    // Invited admins have no password yet, so they cannot sign in.
    const login = await api.request('/auth/login', { method: 'POST', body: { email: 'jane@eventsnap.ai', password: 'any-password' } });
    assert.equal(login.status, 401);
  });

  it('rejects duplicate emails', async () => {
    const res = await api.request('/admin-users', {
      method: 'POST',
      token,
      body: { name: 'Dup', email: 'raj.patel@eventsnap.ai', role: 'Read Only' },
    });
    assert.equal(res.status, 409);
  });

  for (const [name, body] of [
    ['missing name', { email: 'a@eventsnap.ai', role: 'Read Only' }],
    ['invalid email', { name: 'A', email: 'nope', role: 'Read Only' }],
    ['unknown role', { name: 'A', email: 'a@eventsnap.ai', role: 'God Mode' }],
  ]) {
    it(`rejects ${name}`, async () => {
      const res = await api.request('/admin-users', { method: 'POST', token, body });
      assert.equal(res.status, 400);
    });
  }

  it('is restricted to Super Admins', async () => {
    const agentToken = await signInAsSupportAgent();
    const res = await api.request('/admin-users', {
      method: 'POST',
      token: agentToken,
      body: { name: 'X', email: 'x@eventsnap.ai', role: 'Read Only' },
    });
    assert.equal(res.status, 403);
  });
});
