import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { vaultUpload } from "../middleware/vaultUploadMiddleware.js";
import {
  hasPasscode,
  setPasscode,
  verifyPasscode,
  uploadFile,
  getFiles,
  openFile,
  changePasscode
} from "../controllers/vaultController.js";

const router = express.Router();

router.get("/has-passcode", protect, hasPasscode);
router.post("/set-passcode", protect, setPasscode);
router.post("/verify-passcode", protect, verifyPasscode);

router.post("/upload", protect, vaultUpload.array("files", 10), uploadFile);
router.get("/files", protect, getFiles);
router.get("/open/:id", protect, openFile);
router.post("/change-passcode", protect, changePasscode);

export default router;
