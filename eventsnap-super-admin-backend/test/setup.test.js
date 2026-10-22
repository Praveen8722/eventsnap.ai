import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { platformFingerprint } from './fixtures/platform.js';
import { startTestServer } from './helpers.js';

const { AdminUser } = await import('../src/models/index.js');

let api;
let fingerprint;

before(async () => {
  api = await startTestServer({ seed: false });
  fingerprint = await platformFingerprint(api.platformUri);
});

after(async () => {
  await api.stop();
});

const OWNER = { name: 'Praveen Owner', email: 'Owner@Example.com', password: 'a-strong-owner-password' };
const setup = body => api.request('/auth/setup', { method: 'POST', body });

describe('first-time Super Admin setup', () => {
  it('is offered only while no admin exists', async () => {
    const status = await api.request('/auth/setup');
    assert.deepEqual(status.body, { setupRequired: true, setupTokenRequired: false, setupDisabled: false });
  });

  for (const [name, body] of [
    ['a short password', { ...OWNER, password: 'short' }],
    ['an invalid email', { ...OWNER, email: 'nope' }],
    ['a missing name', { ...OWNER, name: '' }],
    ['operator injection', { ...OWNER, email: { $gt: '' } }],
  ]) {
    it(`rejects ${name} and creates nothing`, async () => {
      assert.equal((await setup(body)).status, 400);
      assert.equal(await AdminUser.countDocuments(), 0);
    });
  }

  let token;
  it('creates the Super Admin with a hashed password and signs them straight in', async () => {
    const res = await setup(OWNER);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.ok(res.body.token);
    assert.equal('challengeToken' in res.body, false);
    assert.equal('enrollment' in res.body, false);
    assert.equal(res.body.user.email, 'owner@example.com');
    assert.equal(res.body.user.role, 'Super Admin');
    assert.ok(res.body.user.access.includes('adminUsers'));
    token = res.body.token;

    const stored = await AdminUser.findOne({ email: 'owner@example.com' }).select('+passwordHash').lean();
    assert.equal(stored.role, 'Super Admin');
    assert.equal(stored.status, 'active');
    assert.match(stored.passwordHash, /^\$2[aby]\$10\$/);
    assert.equal(stored.passwordHash.includes(OWNER.password), false);
  });

  it('is closed for good once an admin exists', async () => {
    assert.equal((await api.request('/auth/setup')).body.setupRequired, false);
    const again = await setup({ ...OWNER, email: 'attacker@example.com' });
    assert.equal(again.status, 403);
    assert.equal(await AdminUser.countDocuments(), 1);
  });

  it('creates roles and settings so the whole panel works on a fresh admin database', async () => {
    const admins = await api.request('/admin-users', { token });
    assert.equal(admins.status, 200);
    assert.equal(Object.keys(admins.body.roles).length, 5);
    assert.equal((await api.request('/settings', { token })).status, 200);
    assert.equal((await api.request('/dashboard', { token })).status, 200);
    const logs = await api.request('/activity-logs', { token });
    assert.ok(logs.body.some(log => log.action === 'SETUP_COMPLETED'));
  });

  it('afterwards the normal login takes email and password only', async () => {
    const login = await api.request('/auth/login', { method: 'POST', body: { email: OWNER.email, password: OWNER.password } });
    assert.equal(login.status, 200);
    assert.ok(login.body.token);
    assert.equal((await api.request('/auth/me', { token: login.body.token })).status, 200);
    assert.equal((await api.request('/auth/login', { method: 'POST', body: { email: OWNER.email, password: 'wrong-password' } })).status, 401);
  });

  it('stays closed even if every admin is later removed from the database by hand', async () => {
    await AdminUser.deleteMany({});
    assert.equal((await api.request('/auth/setup')).body.setupRequired, false);
    assert.equal((await setup(OWNER)).status, 403);
  });

  it('never touches the platform database', async () => {
    assert.equal(await platformFingerprint(api.platformUri), fingerprint);
  });
});
