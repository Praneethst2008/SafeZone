import User from "../models/user.js";
import OTP from "../models/OTP.js";
import jwt from "jsonwebtoken";
import { generateUniqueUsername } from "../utils/generateUsername.js";

/**
 * SIGNUP
 */
export const signup = async (req, res) => {
  try {
    const { phoneNumber, password, otp } = req.body;

    if (!phoneNumber || !password || !otp) {
      return res.status(400).json({ message: "All fields required (including OTP)" });
    }

    const userExists = await User.findOne({ phoneNumber });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 🔒 Verify OTP
    const otpRecord = await OTP.findOne({ phoneNumber, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // 🔑 Generate unique random username
    const username = await generateUniqueUsername();

    const user = await User.create({
      phoneNumber,
      password, // hashing happens in model
      username
    });

    // delete used otp
    await OTP.deleteMany({ phoneNumber });

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET
    );

    res.status(201).json({
      message: "Signup successful",
      token,
      user: {
        username: user.username,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * LOGIN
 */
export const login = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        username: user.username,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET PROFILE
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

/**
 * UPDATE PASSWORD
 */
export const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    const isMatch = await user.comparePassword(oldPassword);

    if (!isMatch) {
      return res.status(400).json({ message: "Old password incorrect" });
    }

    user.password = newPassword; // will auto-hash
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch {
    res.status(500).json({ message: "Password update failed" });
  }
};

/**
 * SEND OTP
 */
export const sendOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number required" });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to DB (upsert-like behavior, but since we didn't set unique index on phoneNumber in OTP model, checking first is better or just create new)
    // Actually, clean up old OTPs for this number first
    await OTP.deleteMany({ phoneNumber });

    await OTP.create({
      phoneNumber,
      otp,
    });

    // 🚀 MOCK SMS: Log to console
    console.log(`[MOCK SMS] OTP for ${phoneNumber}: ${otp}`);

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

/**
 * VERIFY OTP (General Purpose)
 */
export const verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ message: "Phone number and OTP required" });
    }

    const otpRecord = await OTP.findOne({ phoneNumber, otp });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // OTP valid
    res.json({ message: "OTP Verified", success: true });
  } catch (error) {
    res.status(500).json({ message: "Server error during verification" });
  }
};

/**
 * RESET PASSWORD
 */
export const resetPassword = async (req, res) => {
  try {
    const { phoneNumber, otp, newPassword } = req.body;

    if (!phoneNumber || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    // Verify OTP
    const otpRecord = await OTP.findOne({ phoneNumber, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Find User
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update Password
    user.password = newPassword;
    await user.save();

    // Delete used OTP
    await OTP.deleteMany({ phoneNumber });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to reset password" });
  }
};
