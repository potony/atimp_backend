// src/routes/movements.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import SiteSetting from "../models/SiteSetting.js";
import { uploadFileToS3, getHeroStreamFromS3 } from "../lib/s3.js";

const router = express.Router();
const upload = multer();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildPublicUrl(relPath) {
  const base = process.env.API_PUBLIC_BASE;
  return `${base}${relPath}`;
}

/**
 * Data layout in Mongo (SiteSetting):
 * key: "movement-reuse-wednesday" or "movement-echo-workers"
 * value: {
 *   slots: {
 *     poster:   { s3Key, localPath, mime },
 *     extra:    { s3Key, localPath, mime }, // activity or certificate
 *     png:      { s3Key, localPath, mime }
 *   }
 * }
 */

/** GET JSON metadata so Angular can build the hrefs if you want */
router.get("/:movementId", async (req, res) => {
  const { movementId } = req.params;
  const key = `movement-${movementId}`;

  try {
    const doc = await SiteSetting.findOne({ key }).lean();
    return res.json({ ok: true, value: doc?.value || { slots: {} } });
  } catch (err) {
    return res.json({ ok: false, error: err.message });
  }
});

/**
 * GET actual file stream: /api/movements/reuse-wednesday/file/poster
 */
router.get("/:movementId/file/:slot", async (req, res) => {
  const { movementId, slot } = req.params;
  const key = `movement-${movementId}`;

  const doc = await SiteSetting.findOne({ key }).lean();
  const slotInfo = doc?.value?.slots?.[slot];

  if (!slotInfo) {
    return res.status(404).send("file-not-found");
  }

  const { s3Key, localPath, mime } = slotInfo;

  // 1) try S3
  if (s3Key) {
    const stream = await getHeroStreamFromS3(s3Key); // re-using same reader
    if (stream) {
      if (mime) res.setHeader("Content-Type", mime);
      return stream.pipe(res);
    }
  }

  // 2) fallback to local
  if (localPath) {
    const abs = path.join(process.cwd(), localPath);
    if (fs.existsSync(abs)) {
      if (mime) res.setHeader("Content-Type", mime);
      return res.sendFile(abs);
    }
  }

  return res.status(404).send("file-not-found");
});

/**
 * UPLOAD: /api/movements/reuse-wednesday/upload
 * body: { password, slot } + file: "movementFile"
 * slot: "poster" | "extra" | "png"
 */
router.post("/:movementId/upload", upload.single("movementFile"), async (req, res) => {
  const { movementId } = req.params;
  const { password, slot } = req.body || {};
  const file = req.file;

  if (password !== process.env.HERO_PASS) {
    return res.status(403).json({ ok: false, error: "bad-password" });
  }
  if (!file) {
    return res.status(400).json({ ok: false, error: "no-file" });
  }
  if (!slot) {
    return res.status(400).json({ ok: false, error: "missing-slot" });
  }

  const key = `movement-${movementId}`;
  const uploadsDir = path.join(process.cwd(), "uploads", "movements", movementId);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const ext = file.originalname.split(".").pop() || "bin";
  const filename = `${slot}-${Date.now()}.${ext}`;
  const absPath = path.join(uploadsDir, filename);
  fs.writeFileSync(absPath, file.buffer);
  const relLocalPath = path.join("uploads", "movements", movementId, filename);

  const s3Key = `public/movements/${movementId}/${filename}`;
  let uploadedKey = null;
  try {
    uploadedKey = await uploadFileToS3(file.buffer, file.mimetype, s3Key);
  } catch (err) {
    console.warn("[movements] S3 upload failed:", err.message);
  }

  // upsert + set this slot
  const doc = await SiteSetting.findOne({ key }).lean();
  const slots = (doc?.value?.slots || {});
  slots[slot] = {
    s3Key: uploadedKey || s3Key,
    localPath: relLocalPath,
    mime: file.mimetype,
  };

  await SiteSetting.findOneAndUpdate(
    { key },
    { value: { slots } },
    { upsert: true }
  );

  // return public URL that Angular can use directly
  return res.json({
    ok: true,
    url: buildPublicUrl(`/api/movements/${movementId}/file/${slot}`),
  });
});

export default router;