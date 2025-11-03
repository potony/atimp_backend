// src/routes/admin.js
import express from "express";
const router = express.Router();

router.post("/check", (req, res) => {
  const { password } = req.body || {};
  if (password === process.env.HERO_PASS) {
    return res.json({ ok: true });
  }
  return res.status(403).json({ ok: false, error: "bad-password" });
});

export default router;