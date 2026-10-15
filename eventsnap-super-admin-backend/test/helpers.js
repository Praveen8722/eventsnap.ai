process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters-long';

const { createApp } = await import('../src/app.js');
const { connectDatabase, disconnectDatabase, startMemoryDatabase } = await import('../src/config/db.js');
const { seedDatabase, DEMO_ADMIN } = await import('../src/seed/seedDatabase.js');

export const PASSWORD = 'test-password';
export { DEMO_ADMIN };

/** Boots an in-memory MongoDB and the API on a random port. Call `reset()` to reseed. */
export async function startTestServer() {
  await connectDatabase(await startMemoryDatabase());
  await seedDatabase({ adminPassword: PASSWORD });

  const server = createApp().listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  async function request(path, { method = 'GET', token, body, rawBody } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined || rawBody !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  /** Signs in via password + 2FA and returns an access token. */
  async function signIn(email = DEMO_ADMIN.email, password = PASSWORD) {
    const login = await request('/auth/login', { method: 'POST', body: { email, password } });
    if (login.status !== 200) throw new Error(`Login failed: ${login.status} ${JSON.stringify(login.body)}`);
    if (!login.body.twoFactorRequired) return login.body.token;
    const verified = await request('/auth/2fa', {
      method: 'POST',
      body: { challengeToken: login.body.challengeToken, code: '123456' },
    });
    return verified.body.token;
  }

  return {
    request,
    signIn,
    reset: () => seedDatabase({ adminPassword: PASSWORD }),
    async stop() {
      await new Promise(resolve => server.close(resolve));
      await disconnectDatabase();
    },
  };
}
