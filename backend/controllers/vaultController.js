import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { supabase } from "../config/supabase.js";
import { deriveKey, encryptFile, decryptFileToBuffer } from "../utils/vaultCrypto.js";
import VaultPasscode from "../models/VaultPasscode.js";
import VaultFile from "../models/VaultFile.js";


/* CHECK PASSCODE EXISTS */
export const hasPasscode = async (req, res) => {
  const exists = await VaultPasscode.exists({ userId: req.user.id });
  res.json({ exists: !!exists });
};

/* CREATE PASSCODE */
export const setPasscode = async (req, res) => {
  const { passcode } = req.body;
  if (!passcode || passcode.length !== 4)
    return res.status(400).json({ message: "Invalid passcode" });

  const hash = await bcrypt.hash(passcode, 10);
  await VaultPasscode.create({ userId: req.user.id, passcodeHash: hash });

  res.json({ message: "Vault passcode created" });
};

/* VERIFY PASSCODE */
export const verifyPasscode = async (req, res) => {
  const { passcode } = req.body;

  const vault = await VaultPasscode.findOne({ userId: req.user.id });
  if (!vault) return res.status(404).json({ message: "Vault not found" });

  /* 🔒 CHECK LOCK */
  if (vault.lockedUntil && vault.lockedUntil > new Date()) {
    const remaining =
      Math.ceil((vault.lockedUntil - Date.now()) / 1000);

    return res.status(423).json({
      message: "Vault locked",
      remainingSeconds: remaining
    });
  }

  const ok = await bcrypt.compare(passcode, vault.passcodeHash);

  /* ✅ CORRECT PASSCODE */
  if (ok) {
    vault.failedAttempts = 0;
    vault.lockedUntil = null;
    await vault.save();

    return res.json({ success: true });
  }

  /* ❌ WRONG PASSCODE */
  vault.failedAttempts += 1;

  if (vault.failedAttempts >= 3) {
    vault.lockedUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    vault.failedAttempts = 0; // reset counter
  }

  await vault.save();

  return res.status(401).json({ message: "Incorrect passcode" });
};

/* UPLOAD FILE */
export const uploadFile = async (req, res) => {
  try {
    const vault = await VaultPasscode.findOne({ userId: req.user.id });
    if (!vault)
      return res.status(403).json({ message: "Vault not initialized" });

    const key = deriveKey(vault.passcodeHash);
    const records = [];

    for (const file of req.files) {
      const inputPath = file.path;
      const encryptedName = `${Date.now()}-${file.filename}.enc`;
      const encryptedPath = path.join("uploads/vault", encryptedName);

      const { iv, authTag } = await encryptFile(inputPath, encryptedPath, key);
      const encryptedBuffer = fs.readFileSync(encryptedPath);

      let storage = "local";

      /* ☁️ TRY SUPABASE FIRST */
      try {
        const { error } = await supabase.storage
          .from("vault")
          .upload(`${req.user.id}/${encryptedName}`, encryptedBuffer, {
            contentType: "application/octet-stream",
            upsert: false
          });

        if (!error) {
          storage = "supabase";
          fs.unlinkSync(encryptedPath); // keep cloud only
        }
      } catch (cloudErr) {
        console.warn("Supabase failed, using local storage");
      }

      fs.unlinkSync(inputPath); // remove raw upload

      records.push({
        userId: req.user.id,
        originalName: file.originalname,
        storedName: encryptedName,
        mimeType: file.mimetype,
        size: file.size,
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
        storage
      });
    }

    await VaultFile.insertMany(records);
    res.json({ message: "Files stored securely (cloud + fallback)" });

  } catch (err) {
    console.error("Vault upload error:", err);
    res.status(500).json({ message: "Vault upload failed" });
  }
};

/* LIST FILES */
export const getFiles = async (req, res) => {
  const files = await VaultFile.find({ userId: req.user.id })
    .sort({ createdAt: -1 });

  res.json(files);
};


/* OPEN ENCRYPTED FILE */
export const openFile = async (req, res) => {
  try {
    const file = await VaultFile.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    if (!file)
      return res.status(404).json({ message: "File not found" });

    const vault = await VaultPasscode.findOne({ userId: req.user.id });
    if (!vault)
      return res.status(403).json({ message: "Vault locked" });

    if (vault.lockedUntil && vault.lockedUntil > new Date())
      return res.status(423).json({ message: "Vault locked" });

    const key = deriveKey(vault.passcodeHash);
    let encryptedBuffer;

    /* ☁️ SUPABASE */
    if (file.storage === "supabase") {
      const { data, error } = await supabase.storage
        .from("vault")
        .download(`${req.user.id}/${file.storedName}`);

      if (error) throw error;
      encryptedBuffer = Buffer.from(await data.arrayBuffer());
    }

    /* 💾 LOCAL FALLBACK */
    if (file.storage === "local") {
      const encryptedPath = path.join(
        process.cwd(),
        "uploads",
        "vault",
        file.storedName
      );

      if (!fs.existsSync(encryptedPath))
        return res.status(404).json({ message: "Encrypted file missing" });

      encryptedBuffer = fs.readFileSync(encryptedPath);
    }

    const decrypted = decryptFileToBuffer(
      encryptedBuffer,
      key,
      file.iv,
      file.authTag
    );

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${file.originalName}"`
    );

    res.send(decrypted);

  } catch (err) {
    console.error("Vault open error:", err);
    res.status(500).json({ message: "Failed to open file" });
  }
};



/* UPDATE PASSCODE */
export const changePasscode = async (req, res) => {
  try {
    const vault = await VaultPasscode.findOne({ userId: req.user.id });
    if (!vault)
      return res.status(404).json({ message: "Vault not found" });

    if (vault.lockedUntil && vault.lockedUntil > new Date()) {
      return res.status(423).json({ message: "Vault locked" });
    }

    const { oldPasscode, newPasscode } = req.body;

    if (!oldPasscode || !newPasscode || newPasscode.length !== 4) {
      return res.status(400).json({ message: "Invalid passcode data" });
    }

    const validOld = await bcrypt.compare(oldPasscode, vault.passcodeHash);
    if (!validOld) {
      return res.status(401).json({ message: "Old passcode incorrect" });
    }

    vault.passcodeHash = await bcrypt.hash(newPasscode, 10);
    await vault.save();

    res.json({ message: "Vault passcode updated successfully" });

  } catch (err) {
    console.error("Change passcode error:", err);
    res.status(500).json({ message: "Failed to update passcode" });
  }
};

