import jwt from "jsonwebtoken";

// ================ AUTH MIDDLEWARE ================
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader){
    return res.status(401).json({ message: "No token provided"})
  }
   
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Every owner-scoped query filters on req.userId — a token without one
    // would query { user: undefined } and could match ownerless legacy rows.
    if (!decoded.userId) {
      return res.status(401).json({ message: "Invalid token" });
    }
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

export default authMiddleware;