import axios from "axios";
import { clearSession, getToken } from "./session";

// Shared axios instance used by every src/api/*.js module. Each module
// supplies its own absolute URL (baseURL is intentionally left unset), and
// this instance auto-attaches the signed-in photographer's JWT — the same
// token stored under "token" alongside the "user" record every other part of
// the app already reads (see src/lib/notifications.js) — so no module has to
// read localStorage itself.
const api = axios.create();

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// An expired/invalid token: drop the stale session and send the photographer
// back to log in, instead of leaving every authenticated page stuck on a
// generic "couldn't load" error. Only triggers when a token was actually
// attached to the failed request — public/anonymous calls (e.g. the portfolio
// "Book Now" form) can also 401 for unrelated reasons and must not redirect.
// Prefixed with the site's base path (only set on the GitHub Pages build).
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const AUTH_PAGES = ["/login", "/signup", "/forgot-password"].map((p) => BASE_PATH + p);
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (
      typeof window !== "undefined" &&
      error.response?.status === 401 &&
      error.config?.headers?.Authorization &&
      !AUTH_PAGES.includes(window.location.pathname.replace(/(.)\/$/, "$1"))
    ) {
      clearSession();
      window.location.href = `${BASE_PATH}/login`;
    }
    return Promise.reject(error);
  }
);

export default api;
