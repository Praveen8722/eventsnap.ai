import { getDashboard } from "@/api/authApi";

// Session storage shared by the login/signup flow and everything that reads
// the signed-in photographer's id (e.g. src/lib/notifications.js already
// reads localStorage "user" for its per-user keys). Token lives under "token"
// — that's what src/lib/api.js attaches as the Authorization header.
//
// Login/signup responses carry only { message, token } — no user object —
// so establishSession stores the token first, then resolves the user's own
// record (name, businessName, etc.) from the existing GET /api/auth/dashboard
// route before saving the "user" record.
export const establishSession = async (token) => {
  localStorage.setItem("token", token);
  const res = await getDashboard();
  saveSession(token, res.data.userId, res.data.user);
};

export const saveSession = (token, userId, user = {}) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify({ ...user, _id: userId }));
};

// Re-reads the signed-in user's record (incl. profilePhoto) from the backend,
// which is the source of truth — so a page refresh always reflects the
// database, e.g. a photo changed on another device. The result is dropped if
// the session changed (logout / another account) while the request was out.
export const refreshSessionUser = async () => {
  const token = getToken();
  if (!token) return;
  const res = await getDashboard();
  if (getToken() !== token) return;
  saveSession(token, res.data.userId, res.data.user);
  window.dispatchEvent(new CustomEvent("eventsnap-user-updated"));
};

export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

export const isLoggedIn = () => !!getToken();
