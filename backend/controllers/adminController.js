// backend/controllers/adminController.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Admin from "../models/admin.js"; // <-- new Admin model
// (Don't import User here unless you need to check cross-collection stuff)
dotenv.config();

const STATIC_NUMBER = process.env.STATIC_ADMIN_NUMBER;
const STATIC_PASSWORD = process.env.STATIC_ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || "secret";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET);
}

export const login = async (req, res) => {
  try {
    const { number, password } = req.body;
    if (!number || !password)
      return res.status(400).json({ message: "Number and password required" });

    // Static admin login (bootstrap)
    if (number === STATIC_NUMBER && password === STATIC_PASSWORD) {
      const token = signToken({ role: "admin", number, isStatic: true });
      return res.json({
        token,
        role: "admin",
        admin: { phoneNumber: number, name: "System Admin", isStatic: true }
      });
    }

    // DB admin login uses Admin collection only
    const admin = await Admin.findOne({ phoneNumber: number });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const passwordMatches = await admin.comparePassword(password);
    if (!passwordMatches) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken({ id: admin._id, role: "admin" });
    return res.json({ token, role: "admin", admin: { id: admin._id, phoneNumber: admin.phoneNumber, name: admin.name } });
  } catch (err) {
    console.error("admin login err", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createAdmin = async (req, res) => {
  try {
    // protect + requireAdmin middleware should ensure only admins can call this
    const { phoneNumber, password, name } = req.body;
    if (!phoneNumber || !password)
      return res.status(400).json({ message: "phoneNumber and password required" });

    // If you still want to forbid creating an admin with the STATIC_NUMBER, optionally keep this:
    if (phoneNumber === STATIC_NUMBER) {
      return res.status(400).json({ message: "Cannot create static admin as DB user" });
    }

    // Check only the Admin collection for duplicates (so regular User accounts don't block admin creation)
    const existingAdmin = await Admin.findOne({ phoneNumber });
    if (existingAdmin) return res.status(400).json({ message: "Admin with this phone number already exists" });

    const newAdmin = new Admin({ phoneNumber, password, name });
    await newAdmin.save();

    return res.status(201).json({
      message: "Admin created",
      admin: { id: newAdmin._id, phoneNumber: newAdmin.phoneNumber, name: newAdmin.name },
    });
  } catch (err) {
    console.error("createAdmin err", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* GET ALL ADMINS */
export const listAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select("-password").sort({ createdAt: -1 });

    res.json({
      admins
    });
  } catch (error) {
    console.error("List admins error:", error);
    res.status(500).json({ message: "Failed to fetch admins" });
  }
};

