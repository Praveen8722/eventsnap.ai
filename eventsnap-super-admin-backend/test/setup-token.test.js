// Runs in its own process (node --test), so the setup code can be configured before env loads.
process.env.ADMIN_SETUP_TOKEN = 'one-time-setup-code-for-tests';

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

const { startTestServer } = await import('./helpers.js');
const { AdminUser } = await import('../src/models/index.js');

let api;

before(async () => {
  api = await startTestServer({ seed: false });
});

after(async () => {
  await api.stop();
});

const OWNER = { name: 'Owner', email: 'owner@example.com', password: 'a-strong-owner-password' };

describe('first-time setup with ADMIN_SETUP_TOKEN', () => {
  it('says a setup code is needed', async () => {
    const status = await api.request('/auth/setup');
    assert.equal(status.body.setupRequired, true);
    assert.equal(status.body.setupTokenRequired, true);
  });

  it('refuses a missing or wrong code', async () => {
    for (const setupToken of [undefined, '', 'wrong-code']) {
      const res = await api.request('/auth/setup', { method: 'POST', body: { ...OWNER, setupToken } });
      assert.equal(res.status, 401);
    }
    assert.equal(await AdminUser.countDocuments(), 0);
  });

  it('accepts the right code', async () => {
    const res = await api.request('/auth/setup', { method: 'POST', body: { ...OWNER, setupToken: 'one-time-setup-code-for-tests' } });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.ok(res.body.token);
  });
});
