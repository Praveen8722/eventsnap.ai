import jwt from "jsonwebtoken";

// Like authMiddleware, but never rejects the request. If a valid Bearer
// token is present it sets req.userId; otherwise req.userId is simply left
// unset and the request continues.
//
// Used only by the "create booking" endpoint, which is hit both by the
// public Portfolio "Book Now" form (no login at all) and by the logged-in
// photographer's own Dashboard "+ New Booking" (a real session). The
// controller itself decides, per request, whether req.userId is required.
const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
    } catch {
      // Invalid/expired token — ignore it here rather than reject; the
      // controller enforces authentication where it actually matters.
    }
  }

  next();
};

export default optionalAuthMiddleware;
