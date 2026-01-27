import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { submitCase, getHistory, getReport, chatWithAnalyzer, deleteCase } from "../controllers/analyzerController.js";

const router = express.Router();

// POST /api/analyzer - Submit new case (with file upload)
router.post("/", protect, upload.array("evidence", 5), submitCase);

// GET /api/analyzer - Get user history
router.get("/", protect, getHistory);

// GET /api/analyzer/:id - Get specific report
router.get("/:id", protect, getReport);

// DELETE /api/analyzer/:id - Delete a case
router.delete("/:id", protect, deleteCase);

// POST /api/analyzer/:id/chat - Ask questions about the report
router.post("/:id/chat", protect, chatWithAnalyzer);

export default router;
