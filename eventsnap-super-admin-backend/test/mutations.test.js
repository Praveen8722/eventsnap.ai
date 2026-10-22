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

const signInAsSupportAgent = () => api.signIn('sarah.k@eventsnap.ai');

describe('notifications', () => {
  it('marks one notification as read, and all of them', async () => {
    const list = await api.request('/notifications', { token });
    assert.equal(list.body.notifications.length, 3);
    const first = list.body.notifications[0].id;

    const res = await api.request(`/notifications/${encodeURIComponent(first)}/read`, { method: 'PATCH', token });
    assert.equal(res.status, 200);
    assert.equal(res.body.read, true);

    const alerts = await api.request('/notifications/alerts', { token });
    assert.equal(alerts.body.length, 3);
    assert.equal(alerts.body.find(a => a.id === first).read, true);

    assert.deepEqual((await api.request('/notifications/read-all', { method: 'POST', token })).body, { updated: 2 });
    assert.ok((await api.request('/notifications', { token })).body.notifications.every(n => n.read));
  });

  it('dismissed platform alerts stay dismissed, and unknown ids 404', async () => {
    const [first] = (await api.request('/notifications', { token })).body.notifications;
    const path = `/notifications/${encodeURIComponent(first.id)}`;
    assert.equal((await api.request(path, { method: 'DELETE', token })).status, 204);
    assert.equal((await api.request(path, { method: 'DELETE', token })).status, 404);
    assert.equal((await api.request('/notifications/nope/read', { method: 'PATCH', token })).status, 404);
    const list = await api.request('/notifications', { token });
    assert.equal(list.body.notifications.length, 2);
    assert.equal(list.body.notifications.some(n => n.id === first.id), false);
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
    assert.equal(res.body.generalSettings.defaultTimezone, 'Asia/Kolkata');
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
    await api.request('/settings', { method: 'PUT', token, body: { generalSettings: { maxFileSize: '300', supportEmail: 'bad' } } });
    const settings = await api.request('/settings', { token });
    assert.equal(settings.body.generalSettings.maxFileSize, '100');
  });

  it('can be viewed by Platform Admins but changed only by Super Admins', async () => {
    const platformToken = await api.signIn('raj.patel@eventsnap.ai');
    assert.equal((await api.request('/settings', { token: platformToken })).status, 200);
    const res = await api.request('/settings', { method: 'PUT', token: platformToken, body: { toggles: { maintenance: true } } });
    assert.equal(res.status, 403);
    assert.equal((await api.request('/settings', { token: await signInAsSupportAgent() })).status, 403);
  });
});

describe('admin users', () => {
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
    assert.ok(res.body.inviteUrl);

    const list = await api.request('/admin-users', { token });
    const listed = list.body.adminUsers.find(a => a.id === 'ADM007');
    assert.equal(listed.invitePending, true);
    assert.equal('inviteUrl' in listed, false);
    for (const admin of list.body.adminUsers) {
      for (const secret of ['passwordHash', 'inviteTokenHash', 'tokenVersion']) assert.equal(secret in admin, false);
    }

    const logs = await api.request('/activity-logs', { token });
    assert.ok(logs.body.some(log => log.action === 'ADMIN_CREATED' && log.target === 'Jane Smith (Finance Admin)'));
  });

  it('rejects duplicate emails', async () => {
    const res = await api.request('/admin-users', { method: 'POST', token, body: { name: 'Dup', email: 'raj.patel@eventsnap.ai', role: 'Read Only' } });
    assert.equal(res.status, 409);
  });

  for (const [name, body] of [
    ['missing name', { email: 'a@eventsnap.ai', role: 'Read Only' }],
    ['invalid email', { name: 'A', email: 'nope', role: 'Read Only' }],
    ['unknown role', { name: 'A', email: 'a@eventsnap.ai', role: 'God Mode' }],
  ]) {
    it(`rejects ${name}`, async () => {
      assert.equal((await api.request('/admin-users', { method: 'POST', token, body })).status, 400);
    });
  }

  it('changes role and status, with an audit trail', async () => {
    const res = await api.request('/admin-users/ADM005', { method: 'PATCH', token, body: { role: 'Platform Admin' } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.role, 'Platform Admin');

    const deactivated = await api.request('/admin-users/ADM005', { method: 'PATCH', token, body: { status: 'inactive' } });
    assert.equal(deactivated.body.status, 'inactive');

    const logs = await api.request('/activity-logs', { token });
    assert.ok(logs.body.some(log => log.action === 'ADMIN_UPDATED' && /role: Support Agent → Platform Admin/.test(log.details)));
  });

  it('cannot activate an admin who has not accepted their invite', async () => {
    const created = await api.request('/admin-users', { method: 'POST', token, body: { name: 'New', email: 'new@eventsnap.ai', role: 'Read Only' } });
    const res = await api.request(`/admin-users/${created.body.id}`, { method: 'PATCH', token, body: { status: 'active' } });
    assert.equal(res.status, 409);
  });

  it('protects the signed-in Super Admin from locking themselves out', async () => {
    for (const body of [{ role: 'Read Only' }, { status: 'inactive' }]) {
      assert.equal((await api.request('/admin-users/ADM000', { method: 'PATCH', token, body })).status, 409);
    }
    assert.equal((await api.request('/admin-users/ADM000', { method: 'DELETE', token })).status, 409);
  });

  it('removes an admin', async () => {
    assert.equal((await api.request('/admin-users/ADM006', { method: 'DELETE', token })).status, 204);
    assert.equal((await api.request('/admin-users/ADM006', { method: 'DELETE', token })).status, 404);
  });

  it('is restricted to Super Admins', async () => {
    const agentToken = await signInAsSupportAgent();
    const created = await api.request('/admin-users', { method: 'POST', token: agentToken, body: { name: 'X', email: 'x@eventsnap.ai', role: 'Read Only' } });
    assert.equal(created.status, 403);
    assert.equal((await api.request('/admin-users/ADM004', { method: 'PATCH', token: agentToken, body: { role: 'Super Admin' } })).status, 403);
  });
});

describe('support tickets', () => {
  const newTicket = {
    subject: 'Gallery link not opening for guests',
    requester: 'Asha Studio',
    requesterType: 'photographer',
    category: 'Galleries & Storage',
    priority: 'critical',
    message: 'Guests get an error when they open the QR link.',
  };

  it('creates a ticket, replies, and updates status and assignee', async () => {
    const created = await api.request('/support-tickets', { method: 'POST', token, body: newTicket });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.id, '#1001');
    assert.equal(created.body.status, 'open');
    assert.equal(created.body.messages, 1);
    assert.deepEqual(created.body.thread.map(m => [m.from, m.author, m.body]), [['requester', 'Asha Studio', newTicket.message]]);

    const path = `/support-tickets/${encodeURIComponent(created.body.id)}`;
    const reply = await api.request(`${path}/messages`, { method: 'POST', token, body: { body: 'Looking into it now.' } });
    assert.equal(reply.status, 201);
    assert.equal(reply.body.status, 'in-progress');
    assert.equal(reply.body.thread.at(-1).author, 'Super Admin');

    const meta = await api.request('/support-tickets/meta', { token });
    assert.ok(meta.body.assignees.some(a => a.name === 'Sarah Kowalski'));
    assert.equal(meta.body.assignees.some(a => a.role === 'Finance Admin'), false);

    const updated = await api.request(path, { method: 'PATCH', token, body: { status: 'resolved', assignedTo: 'Sarah Kowalski' } });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.status, 'resolved');
    assert.equal(updated.body.assignedTo, 'Sarah Kowalski');

    // A message from the requester reopens it.
    const followUp = await api.request(`${path}/messages`, { method: 'POST', token, body: { body: 'Still broken.', from: 'requester' } });
    assert.equal(followUp.body.status, 'open');
    assert.equal(followUp.body.thread.at(-1).author, 'Asha Studio');

    const list = await api.request('/support-tickets', { token });
    assert.deepEqual(list.body.map(t => [t.id, t.messages]), [['#1001', 3]]);
    assert.equal('thread' in list.body[0], false);

    const detail = await api.request(path, { token });
    assert.equal(detail.body.thread.length, 3);

    const notifications = await api.request('/notifications', { token });
    assert.ok(notifications.body.notifications.some(n => n.category === 'Support' && n.title.includes('#1001')));
    const logs = await api.request('/activity-logs', { token });
    assert.ok(logs.body.some(log => log.category === 'support' && log.action === 'TICKET_UPDATED'));
  });

  for (const [name, body] of [
    ['missing subject', { ...newTicket, subject: '' }],
    ['unknown priority', { ...newTicket, priority: 'urgent' }],
    ['unknown category', { ...newTicket, category: 'Nope' }],
    ['missing message', { ...newTicket, message: '  ' }],
    ['unknown assignee', { ...newTicket, assignedTo: 'Someone Else' }],
    ['finance admin as assignee', { ...newTicket, assignedTo: 'Mike Lawson' }],
  ]) {
    it(`rejects ${name}`, async () => {
      assert.equal((await api.request('/support-tickets', { method: 'POST', token, body })).status, 400);
    });
  }

  it('404s for unknown tickets', async () => {
    assert.equal((await api.request('/support-tickets/%23999', { token })).status, 404);
    assert.equal((await api.request('/support-tickets/%23999', { method: 'PATCH', token, body: { status: 'closed' } })).status, 404);
  });

  it('can be worked by Support Agents but not Finance Admins', async () => {
    const agentToken = await signInAsSupportAgent();
    assert.equal((await api.request('/support-tickets', { method: 'POST', token: agentToken, body: newTicket })).status, 201);
    const financeToken = await api.signIn('mike.l@eventsnap.ai');
    assert.equal((await api.request('/support-tickets', { method: 'POST', token: financeToken, body: newTicket })).status, 403);
  });
});
