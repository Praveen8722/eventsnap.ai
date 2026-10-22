process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters-long';
process.env.PLATFORM_CACHE_SECONDS = '0';

const { createApp } = await import('../src/app.js');
const { connectDatabase, disconnectDatabase, startMemoryDatabase } = await import('../src/config/db.js');
const { connectPlatformDatabase, disconnectPlatformDatabase } = await import('../src/config/platformDb.js');
const { seedDatabase, DEMO_ADMIN } = await import('../src/seed/seedDatabase.js');
const { resetLoginThrottle } = await import('../src/services/loginThrottle.js');
const { writePlatformFixture } = await import('./fixtures/platform.js');

export const PASSWORD = 'test-password';
export { DEMO_ADMIN };

/**
 * Boots an in-memory MongoDB with the admin database (seeded with the demo admins) and a platform
 * database (fixture data, connected read-only), and the API on a random port. `reset()` reseeds.
 */
export async function startTestServer({ seed = true } = {}) {
  const adminUri = await startMemoryDatabase();
  const platformUri = adminUri.replace('/eventsnap_admin', '/platform_test');
  await connectDatabase(adminUri);
  const fixture = await writePlatformFixture(platformUri);
  await connectPlatformDatabase(platformUri);
  if (seed) await seedDatabase({ adminPassword: PASSWORD, demo: true });

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
    return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
  }

  /** Signs in with email and password and returns the access token. */
  async function signIn(email = DEMO_ADMIN.email, password = PASSWORD) {
    const login = await request('/auth/login', { method: 'POST', body: { email, password } });
    if (login.status !== 200) throw new Error(`Login failed: ${login.status} ${JSON.stringify(login.body)}`);
    return login.body.token;
  }

  return {
    request,
    signIn,
    fixture,
    platformUri,
    async reset() {
      resetLoginThrottle();
      await seedDatabase({ adminPassword: PASSWORD, demo: true });
    },
    async disconnectPlatform() {
      await disconnectPlatformDatabase();
    },
    async reconnectPlatform() {
      await connectPlatformDatabase(platformUri);
    },
    async stop() {
      await new Promise(resolve => server.close(resolve));
      await disconnectPlatformDatabase();
      await disconnectDatabase();
    },
  };
}
