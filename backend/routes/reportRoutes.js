import express from "express";
import {
  createReport,
  getMyReports,
  getAllReports,
  reviewReport,
  deleteMyReport
} from "../controllers/reportController.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  upload.array("files", 5),
  createReport
);

// user
router.post("/", protect, createReport);
router.get("/my", protect, getMyReports);
router.delete("/:id", protect, deleteMyReport);



// admin
router.get("/all", protect, requireAdmin, getAllReports);
router.put("/:id", protect, requireAdmin, reviewReport);



export default router;
