import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { DEMO_ADMIN, PASSWORD, startTestServer } from './helpers.js';

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

describe('POST /api/auth/login', () => {
  it('rejects a wrong password and records a failed login', async () => {
    const res = await api.request('/auth/login', { method: 'POST', body: { email: DEMO_ADMIN.email, password: 'nope' } });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.message, 'Invalid email or password.');

    const token = await api.signIn();
    const logs = await api.request('/activity-logs', { token });
    assert.ok(logs.body.some(log => log.action === 'LOGIN_FAILED' && log.details.includes(DEMO_ADMIN.email)));
  });

  it('gives the same answer for unknown emails', async () => {
    const res = await api.request('/auth/login', { method: 'POST', body: { email: 'ghost@eventsnap.ai', password: PASSWORD } });
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
    const res = await api.request('/auth/login', { method: 'POST', body: { email: 'fatima.h@eventsnap.ai', password: PASSWORD } });
    assert.equal(res.status, 403);
  });

  it('issues a 2FA challenge, then an access token for a valid 6-digit code', async () => {
    const login = await api.request('/auth/login', { method: 'POST', body: { email: 'Admin@EventSnap.ai ', password: PASSWORD } });
    assert.equal(login.status, 200);
    assert.equal(login.body.twoFactorRequired, true);
    assert.equal(login.body.token, undefined);

    const badCode = await api.request('/auth/2fa', { method: 'POST', body: { challengeToken: login.body.challengeToken, code: '12ab' } });
    assert.equal(badCode.status, 400);

    const verified = await api.request('/auth/2fa', { method: 'POST', body: { challengeToken: login.body.challengeToken, code: '654321' } });
    assert.equal(verified.status, 200);
    assert.equal(verified.body.user.email, DEMO_ADMIN.email);
    assert.ok(verified.body.user.lastLogin);
    assert.equal(verified.body.user.passwordHash, undefined);

    const me = await api.request('/auth/me', { token: verified.body.token });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.id, DEMO_ADMIN._id);
  });

  it('does not accept a 2FA challenge token as an access token', async () => {
    const login = await api.request('/auth/login', { method: 'POST', body: { email: DEMO_ADMIN.email, password: PASSWORD } });
    const res = await api.request('/auth/me', { token: login.body.challengeToken });
    assert.equal(res.status, 401);
  });

  it('does not accept an access token as a 2FA challenge', async () => {
    const token = await api.signIn();
    const res = await api.request('/auth/2fa', { method: 'POST', body: { challengeToken: token, code: '123456' } });
    assert.equal(res.status, 401);
  });
});

describe('protected routes', () => {
  it('require a bearer token', async () => {
    for (const path of ['/auth/me', '/dashboard', '/photographers', '/settings']) {
      const res = await api.request(path);
      assert.equal(res.status, 401, path);
    }
  });

  it('reject tampered tokens', async () => {
    const token = await api.signIn();
    const res = await api.request('/dashboard', { token: `${token.slice(0, -2)}xx` });
    assert.equal(res.status, 401);
  });

  it('reject tokens of admins deactivated after sign-in', async () => {
    const { AdminUser } = await import('../src/models/index.js');
    const token = await api.signIn();
    await AdminUser.updateOne({ _id: DEMO_ADMIN._id }, { status: 'inactive' });
    const res = await api.request('/dashboard', { token });
    assert.equal(res.status, 401);
  });
});
