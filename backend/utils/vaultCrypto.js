import crypto from "crypto";

const ALGO = "aes-256-gcm";

/* DERIVE 32-BYTE KEY */
export const deriveKey = (passcodeHash) => {
  return crypto.createHash("sha256").update(passcodeHash).digest();
};

/* ENCRYPT FILE */
export const encryptFile = async (inputPath, outputPath, key) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const fs = await import("fs");

  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);

  input.pipe(cipher).pipe(output);

  return new Promise((resolve, reject) => {
    output.on("finish", () => {
      const authTag = cipher.getAuthTag();
      resolve({ iv, authTag });
    });
    output.on("error", reject);
  });
};

/* 🔓 DECRYPT FROM BUFFER (CORRECT) */
export const decryptFileToBuffer = (encryptedBuffer, key, ivHex, authTagHex) => {
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final()
  ]);
};
