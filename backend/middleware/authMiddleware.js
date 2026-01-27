// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/user.js";
import Admin from "../models/admin.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "secret";

/* ================= PROTECT ================= */
export const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // 1. Handle Admin (Static or from Admin collection)
    if (decoded.role === "admin") {
      if (decoded.isStatic) {
        req.user = { role: "admin", phoneNumber: decoded.number, isStatic: true };
        return next();
      }

      const admin = await Admin.findById(decoded.id).select("-password");
      if (admin) {
        req.user = {
          ...admin.toObject(),
          role: "admin"
        };
        return next();
      }
    }

    // 2. Handle Regular User
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* ================= ADMIN ================= */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authorization denied" });
  }

  if (req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({ message: "Admin access required" });
};
