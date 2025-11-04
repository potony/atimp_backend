// src/lib/mailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export function buildTransporter() {
  const host = process.env.MAIL_HOST || "smtp.gmail.com";
  const port = Number(process.env.MAIL_PORT || 465);
  const secure =
    process.env.MAIL_SECURE != null
      ? process.env.MAIL_SECURE === "true"
      : port === 465;

  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  // 🔍 Log what config we're using (but NEVER the password)
  console.log(">>> [MAIL] Building transporter with config:", {
    host,
    port,
    secure,
    user,
    hasPass: !!pass,
  });

  if (!user || !pass) {
    console.warn(
      "⚠️ [MAIL] Mailer not configured (missing MAIL_USER or MAIL_PASS)"
    );
    return null;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  // ✅ Full error object, not just message
  transporter
    .verify()
    .then((info) => {
      console.log(">>> [MAIL] verify OK:", info);
    })
    .catch((err) => {
      console.error("❌ [MAIL] verify FAILED:", err);
    });

  return transporter;
}

const transporter = buildTransporter();

export async function sendJoinMail(payload) {
  if (!transporter) {
    console.error("❌ [MAIL] sendJoinMail called but transporter is null");
    return { ok: false, error: "mailer-not-configured" };
  }

  const to = process.env.MAIL_TO || process.env.MAIL_USER;
  const subject = `[ATIMP] New join request (${payload.role || "unknown"})`;
  const text = JSON.stringify(payload, null, 2);

  try {
    console.log(">>> [MAIL] Sending join mail", {
      to,
      subject,
      preview: payload?.email || payload?.name || null,
    });

    const info = await transporter.sendMail({
      from: `"A Tree in My Pocket" <${process.env.MAIL_USER}>`,
      to,
      subject,
      text,
    });

    console.log(">>> [MAIL] sendJoinMail OK, messageId:", info.messageId);
    return { ok: true };
  } catch (err) {
    console.error("❌ [MAIL] sendJoinMail FAILED:", err);
    return { ok: false, error: "send-failed", details: err.message };
  }
}