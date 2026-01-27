// backend/routes/adminRoutes.js
import express from "express";
import { login, createAdmin, listAdmins } from "../controllers/adminController.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.get("/list", protect, requireAdmin, listAdmins);
router.post("/create-admin", protect, requireAdmin, createAdmin);

export default router;
