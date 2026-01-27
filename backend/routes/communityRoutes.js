import express from "express";
import {
  getPosts,
  createPost,
  deletePost,
  addComment,
  reactToPost,
  reportPost,
  editPost,
  deleteComment,
  adminGetAllPosts,
  adminDeletePost,
  adminDeleteComment,
  adminResolveReport,
  adminDismissReport
  
} from "../controllers/communityController.js";
import { protect,requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getPosts);
router.post("/", protect, createPost);
router.delete("/:id", protect, deletePost);
router.post("/:id/comment", protect, addComment);
router.post("/:id/react", protect, reactToPost);
router.post("/:id/report", protect, reportPost);
router.put("/:id", protect, editPost);
router.delete("/:postId/comment/:commentId", protect, deleteComment);


/* ================= ADMIN ROUTES ================= */

router.get("/admin/all", protect, requireAdmin, adminGetAllPosts);
router.delete("/admin/post/:id", protect, requireAdmin, adminDeletePost);
router.delete(
  "/admin/post/:postId/comment/:commentId",
  protect,
  requireAdmin,
  adminDeleteComment
);



/* ================= ADMIN REPORT ACTIONS ================= */

router.post(
  "/admin/report/resolve/:postId",
  protect,
  requireAdmin,
  adminResolveReport
);

router.delete(
  "/admin/report/dismiss/:reportId",
  protect,
  requireAdmin,
  adminDismissReport
);

export default router;
