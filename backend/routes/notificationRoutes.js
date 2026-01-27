import express from "express";
import Notification from "../models/notification.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.id })
    .sort({ createdAt: -1 });

  res.json(notifications);
});

// DELETE notification (User viewed it)
router.delete("/:id", protect, async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ message: "Notification deleted" });
});

// Clear all notifications
router.delete("/", protect, async (req, res) => {
  await Notification.deleteMany({ userId: req.user.id });
  res.json({ message: "All notifications cleared" });
});

router.get("/unread-count", protect, async (req, res) => {
  const count = await Notification.countDocuments({
    userId: req.user.id,
    isRead: false
  });
  res.json({ count });
});

export default router;
