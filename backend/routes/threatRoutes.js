import express from "express";
import multer from "multer";
import { classifyThreat } from "../controllers/threatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer();

router.post("/classify", protect, upload.single("audio"), classifyThreat);

export default router;
