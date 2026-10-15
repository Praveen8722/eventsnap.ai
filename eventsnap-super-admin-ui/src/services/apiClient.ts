const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');
const TOKEN_STORAGE_KEY = 'eventsnap.admin.token';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const authToken = {
  get: () => localStorage.getItem(TOKEN_STORAGE_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_STORAGE_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_STORAGE_KEY),
};

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Subscribes to "session expired / revoked" events (a 401 on an authenticated request). */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const payload = (await res.json()) as { error?: { message?: string } };
    if (payload.error?.message) return payload.error.message;
  } catch {
    // Non-JSON error body (e.g. proxy error page); fall through to a generic message.
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    return 'The EventSnap API is unreachable. Make sure the backend is running.';
  }
  return `Request failed (${res.status}).`;
}

/** Sends a JSON request to the EventSnap admin API, attaching the stored access token. */
export async function apiRequest<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const token = authToken.get();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Unable to reach the EventSnap API. Check your connection and that the backend is running.');
  }

  if (!res.ok) {
    const message = await readErrorMessage(res);
    if (res.status === 401 && token) unauthorizedListeners.forEach(listener => listener());
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
