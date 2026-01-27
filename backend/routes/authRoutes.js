import express from "express";
import {
  signup,
  login,
  getMe,
  updatePassword,
  sendOTP,
  resetPassword,
  verifyOTP
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/user.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/send-otp", sendOTP);
router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOTP);
router.get("/me", protect, getMe);
router.put("/update-password", protect, updatePassword);

router.get("/threat-detection", protect, async (req, res) => {
  res.json({
    enabled: req.user.threatDetectionEnabled
  });
});

router.put("/threat-detection", protect, async (req, res) => {
  const { enabled } = req.body;

  await User.findByIdAndUpdate(req.user.id, {
    threatDetectionEnabled: enabled
  });

  res.json({ success: true });
});

/* ================= EMERGENCY CONTACTS ================= */
router.get("/contacts", protect, async (req, res) => {
  res.json({
    contacts: req.user.emergencyContacts || []
  });
});

router.put("/contacts", protect, async (req, res) => {
  try {
    const { contacts } = req.body;

    const user = await User.findById(req.user.id);
    user.emergencyContacts = contacts;
    await user.save();

    res.json({ success: true, contacts: user.emergencyContacts });
  } catch (err) {
    res.status(500).json({ message: "Failed to update contacts" });
  }
});


export default router;
