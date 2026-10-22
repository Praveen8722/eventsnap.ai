import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { DEMO_ADMIN, PASSWORD, startTestServer } from './helpers.js';

const { AdminUser } = await import('../src/models/index.js');

let api;

before(async () => {
  api = await startTestServer();
});

after(async () => {
  await api.stop();
});

beforeEach(async () => {
  await api.reset();
});

const login = (email = DEMO_ADMIN.email, password = PASSWORD) => api.request('/auth/login', { method: 'POST', body: { email, password } });

describe('POST /api/auth/login', () => {
  it('rejects a wrong password and records a failed login', async () => {
    const res = await login(DEMO_ADMIN.email, 'nope');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.message, 'Invalid email or password.');

    const token = await api.signIn();
    const logs = await api.request('/activity-logs', { token });
    assert.ok(logs.body.some(log => log.action === 'LOGIN_FAILED' && log.details.includes(DEMO_ADMIN.email)));
  });

  it('gives the same answer for unknown emails', async () => {
    const res = await login('ghost@eventsnap.ai');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.message, 'Invalid email or password.');
  });

  it('rejects non-string credentials (operator injection)', async () => {
    const res = await api.request('/auth/login', { method: 'POST', body: { email: { $gt: '' }, password: PASSWORD } });
    assert.equal(res.status, 400);
  });

  it('rejects malformed JSON', async () => {
    const res = await api.request('/auth/login', { method: 'POST', rawBody: '{"email":' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.message, 'Request body is not valid JSON.');
  });

  it('refuses inactive admins even with the right password', async () => {
    assert.equal((await login('fatima.h@eventsnap.ai')).status, 403);
  });

  it('locks sign-in after repeated failures', async () => {
    for (let i = 0; i < 5; i += 1) assert.equal((await login(DEMO_ADMIN.email, `wrong-${i}`)).status, 401);
    const locked = await login(DEMO_ADMIN.email, PASSWORD);
    assert.equal(locked.status, 429);
    assert.match(locked.body.error.message, /Too many failed sign-in attempts/);
  });
});

describe('password sign-in', () => {
  it('signs in with email and password only, straight to a session', async () => {
    const res = await login('Admin@EventSnap.ai ');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.token);
    assert.equal('twoFactorRequired' in res.body, false);
    assert.equal('challengeToken' in res.body, false);
    assert.equal('enrollment' in res.body, false);
    assert.equal(res.body.user.email, DEMO_ADMIN.email);
    assert.ok(res.body.user.lastLogin);
    assert.ok(res.body.user.access.includes('adminUsers'));
    for (const field of ['passwordHash', 'twoFA', 'twoFAEnrolled']) assert.equal(field in res.body.user, false, field);

    const me = await api.request('/auth/me', { token: res.body.token });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.id, DEMO_ADMIN._id);
    const logs = await api.request('/activity-logs', { token: res.body.token });
    assert.ok(logs.body.some(log => log.action === 'LOGIN' && log.details === 'Successful login'));
  });

  it('stores passwords as bcrypt hashes', async () => {
    const stored = await AdminUser.findById(DEMO_ADMIN._id).select('+passwordHash').lean();
    assert.match(stored.passwordHash, /^\$2[aby]\$10\$/);
  });

  it('no longer has a 2FA step', async () => {
    const body = { challengeToken: 'x', code: '123456' };
    assert.equal((await api.request('/auth/2fa', { method: 'POST', body })).status, 401);
    assert.equal((await api.request('/auth/2fa', { method: 'POST', body, token: await api.signIn() })).status, 404);
  });

  it('a successful sign-in clears earlier failures for the account', async () => {
    for (let i = 0; i < 4; i += 1) assert.equal((await login(DEMO_ADMIN.email, `wrong-${i}`)).status, 401);
    assert.equal((await login()).status, 200);
    // Only the IP's failures remain (4 of 5): one more wrong password is still answered normally.
    assert.equal((await login(DEMO_ADMIN.email, 'wrong-again')).status, 401);
  });
});

describe('sessions', () => {
  it('require a bearer token', async () => {
    for (const path of ['/auth/me', '/dashboard', '/photographers', '/settings']) {
      assert.equal((await api.request(path)).status, 401, path);
    }
  });

  it('reject tampered tokens', async () => {
    const token = await api.signIn();
    assert.equal((await api.request('/dashboard', { token: `${token.slice(0, -2)}xx` })).status, 401);
  });

  it('reject tokens of admins deactivated after sign-in', async () => {
    const token = await api.signIn();
    await AdminUser.updateOne({ _id: DEMO_ADMIN._id }, { status: 'inactive' });
    assert.equal((await api.request('/dashboard', { token })).status, 401);
  });

  it('end on sign-out', async () => {
    const token = await api.signIn();
    assert.equal((await api.request('/auth/logout', { method: 'POST', token })).status, 204);
    assert.equal((await api.request('/auth/me', { token })).status, 401);
    const logs = await api.request('/activity-logs', { token: await api.signIn() });
    assert.ok(logs.body.some(log => log.action === 'LOGOUT'));
  });

  it('end when a Super Admin changes the admin\'s role', async () => {
    const agentToken = await api.signIn('sarah.k@eventsnap.ai');
    const token = await api.signIn();
    const res = await api.request('/admin-users/ADM003', { method: 'PATCH', token, body: { role: 'Read Only' } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((await api.request('/auth/me', { token: agentToken })).status, 401);
  });
});

describe('invites', () => {
  async function invite(token, body = { name: 'Jane Smith', email: 'jane@eventsnap.ai', role: 'Finance Admin' }) {
    const res = await api.request('/admin-users', { method: 'POST', token, body });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return { ...res.body, token: new URL(res.body.inviteUrl).searchParams.get('token') };
  }

  it('lets an invited admin set a password once, then sign in with it', async () => {
    const created = await invite(await api.signIn());
    assert.equal(created.status, 'inactive');
    assert.equal(created.invitePending, true);
    assert.match(created.inviteUrl, /^http:\/\/localhost:5173\/accept-invite\?token=/);

    const info = await api.request('/auth/invite', { method: 'POST', body: { token: created.token } });
    assert.deepEqual(info.body, { name: 'Jane Smith', email: 'jane@eventsnap.ai', role: 'Finance Admin' });

    assert.equal((await login('jane@eventsnap.ai', 'whatever-password')).status, 401);
    const weak = await api.request('/auth/accept-invite', { method: 'POST', body: { token: created.token, password: 'short' } });
    assert.equal(weak.status, 400);

    const accepted = await api.request('/auth/accept-invite', { method: 'POST', body: { token: created.token, password: 'a-long-new-password' } });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    const again = await api.request('/auth/accept-invite', { method: 'POST', body: { token: created.token, password: 'another-long-password' } });
    assert.equal(again.status, 400);

    const janeToken = await api.signIn('jane@eventsnap.ai', 'a-long-new-password');
    const me = await api.request('/auth/me', { token: janeToken });
    assert.equal(me.body.user.role, 'Finance Admin');
    assert.equal(me.body.user.status, 'active');
    assert.equal(me.body.user.invitePending, false);
  });

  it('rejects unknown and expired invite tokens', async () => {
    const created = await invite(await api.signIn());
    await AdminUser.updateOne({ email: 'jane@eventsnap.ai' }, { inviteExpiresAt: new Date(Date.now() - 1000) });
    for (const token of [created.token, 'not-a-real-token-but-long-enough', '']) {
      const res = await api.request('/auth/accept-invite', { method: 'POST', body: { token, password: 'a-long-new-password' } });
      assert.equal(res.status, 400);
    }
  });

  it('resending an invite replaces the old link', async () => {
    const token = await api.signIn();
    const created = await invite(token);
    const resent = await api.request(`/admin-users/${created.id}/invite`, { method: 'POST', token });
    assert.equal(resent.status, 200);
    const old = await api.request('/auth/invite', { method: 'POST', body: { token: created.token } });
    assert.equal(old.status, 400);
    const fresh = await api.request('/auth/invite', { method: 'POST', body: { token: new URL(resent.body.inviteUrl).searchParams.get('token') } });
    assert.equal(fresh.status, 200);
  });
});
