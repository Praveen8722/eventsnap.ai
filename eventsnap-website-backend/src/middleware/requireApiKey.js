import crypto from "node:crypto";

// Guards server-to-server / admin-only endpoints (synced photographer
// profiles, the list of contact messages). The caller must send the shared
// secret from WEBSITE_API_KEY in the "x-api-key" header. With no key
// configured the endpoints stay closed — they are never public. CORS alone
// doesn't protect them: it only restricts browsers, not scripts or curl.
export const requireApiKey = (req, res, next) => {
  const expected = String(process.env.WEBSITE_API_KEY || "");
  const given = String(req.headers["x-api-key"] || "");
  const ok =
    expected.length > 0 &&
    given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
};
