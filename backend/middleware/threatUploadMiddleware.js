import multer from "multer";
import path from "path";
import fs from "fs";

const threatDir = "uploads/threat-audio";

if (!fs.existsSync(threatDir)) {
  fs.mkdirSync(threatDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, threatDir),
  filename: (_, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${unique}${path.extname(file.originalname || ".webm")}`);
  }
});

export const threatAudioUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});
