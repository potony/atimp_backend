// src/routes/join.js
import express from "express";
import JoinRequest from "../models/JoinRequest.js";
import { sendJoinMail } from "../lib/mailer.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await JoinRequest.create({
      role: body.role || "unknown",
      source: body.source || "WEB",
      data: body.data || body,
    });

    let mailResult = { ok: true };
    try {
      mailResult = await sendJoinMail({
        role: body.role,
        source: body.source,
        data: body.data || body,
      });
    } catch (err) {
      console.warn("⚠️ Email send failed:", err.message);
      mailResult = { ok: false, error: err.message };
    }

    if (!mailResult.ok) {
      return res.json({
        ok: true,
        warning: "saved-but-email-failed",
        id: doc._id,
        error: mailResult.error,
      });
    }

    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error("join POST error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;