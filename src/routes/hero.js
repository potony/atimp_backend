// src/routes/hero.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import SiteSetting from "../models/SiteSetting.js";
import { uploadHeroToS3, getHeroStreamFromS3 } from "../lib/s3.js";

const router = express.Router();
const upload = multer();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// helper to build full URL visible to frontend
function buildPublicUrl(relPath) {
  const base = process.env.API_PUBLIC_BASE || "http://localhost:5000";
  return `${base}${relPath}`;
}

/**
 * GET metadata → frontend calls this
 * returns { ok: true, url: "/api/hero/image" }
 */
router.get("/", async (req, res) => {
  try {
    const doc = await SiteSetting.findOne({ key: "hero" }).lean();
    // if nothing saved yet, still return the endpoint
    return res.json({
      ok: true,
      url: buildPublicUrl("/api/hero/image"),
      raw: doc?.value || null, // debug
    });
  } catch (err) {
    return res.json({ ok: false, error: err.message });
  }
});

/**
 * ACTUAL IMAGE ENDPOINT
 * browser loads this: <div style="background:url('/api/hero/image')">
 * we will try S3 first, then local
 */
router.get("/image", async (req, res) => {
  console.log("[hero] GET /api/hero/image");
  const doc = await SiteSetting.findOne({ key: "hero" }).lean();

  const s3Key = doc?.value?.s3Key || null;
  const localPath = doc?.value?.localPath || null;

  // 1) try S3 (private)
  if (s3Key) {
    console.log("[hero] found s3Key =", s3Key);
    const s3Stream = await getHeroStreamFromS3(s3Key);
    if (s3Stream) {
      res.setHeader("Content-Type", "image/jpeg");
      return s3Stream.pipe(res);
    }
    console.warn("[hero] S3 stream was null, will try local");
  }

  // 2) try local
  if (localPath) {
    const abs = path.join(process.cwd(), localPath);
    if (fs.existsSync(abs)) {
      console.log("[hero] sending local file:", abs);
      return res.sendFile(abs);
    } else {
      console.warn("[hero] local file not found:", abs);
    }
  }

  // 3) nothing → send 404 or a placeholder
  res.status(404).send("hero-not-found");
});

/**
 * MANUAL SET by URL (if you ever want a CDN / external image)
 */
router.post("/", async (req, res) => {
  const { password, url } = req.body || {};
  if (password !== process.env.HERO_PASS) {
    return res.status(403).json({ ok: false, error: "bad-password" });
  }

  await SiteSetting.findOneAndUpdate(
    { key: "hero" },
    {
      value: {
        externalUrl: url,
        // still keep our API route:
        url: buildPublicUrl("/api/hero/image"),
      },
    },
    { upsert: true }
  );

  return res.json({ ok: true, url: buildPublicUrl("/api/hero/image") });
});

/**
 * UPLOAD from admin panel
 */
router.post("/upload", upload.single("heroImage"), async (req, res) => {
  console.log("👉 /api/hero/upload called");
  console.log("[hero] req.body =", req.body);

  const pwd = req.body.password;
  if (pwd !== process.env.HERO_PASS) {
    return res.status(403).json({ ok: false, error: "bad-password" });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ ok: false, error: "no-file" });
  }

  // we will store a LOCAL copy too
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const filename = `hero-${Date.now()}.jpg`;
  const absPath = path.join(uploadsDir, filename);
  fs.writeFileSync(absPath, file.buffer);
  const relLocalPath = path.join("uploads", filename); // relative to cwd

  // S3 key we want to use (so GET knows it)
  const s3Key = `public/hero/${filename}`;

  // try S3 (private)
  let uploadedKey = null;
  try {
    uploadedKey = await uploadHeroToS3(file.buffer, file.mimetype, s3Key);
    console.log("[hero] uploadedKey from S3 =", uploadedKey);
  } catch (err) {
    console.warn("[hero] S3 upload failed:", err.message);
  }

  // save to DB
  await SiteSetting.findOneAndUpdate(
    { key: "hero" },
    {
      value: {
        url: buildPublicUrl("/api/hero/image"), // what frontend should use
        s3Key: uploadedKey || s3Key, // even if S3 failed, we keep a key shape
        localPath: relLocalPath,
      },
    },
    { upsert: true }
  );

  return res.json({
    ok: true,
    url: buildPublicUrl("/api/hero/image"),
  });
});

export default router;