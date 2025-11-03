// src/lib/mailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
export function buildTransporter() {
  const host = process.env.MAIL_HOST || "smtp.gmail.com";
  const port = Number(process.env.MAIL_PORT || 465);
  const secure = (process.env.MAIL_SECURE || "true") === "true";
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (!user || !pass) {
    console.warn("⚠️ Mailer not configured (missing MAIL_USER or MAIL_PASS)");
    return null;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  transporter
    .verify()
    .then(() => console.log(`📧 Mailer: connected to ${host} (secure: ${secure})`))
    .catch((err) => console.warn("⚠️ Mailer verify failed:", err.message));

  return transporter;
}

const transporter = buildTransporter();

export async function sendJoinMail(payload) {
  if (!transporter) return { ok: false, error: "mailer-not-configured" };

  const to = process.env.MAIL_TO || process.env.MAIL_USER;
  const subject = `[ATIMP] New join request (${payload.role || "unknown"})`;
  const text = JSON.stringify(payload, null, 2);

  await transporter.sendMail({
    from: `"A Tree in My Pocket" <${process.env.MAIL_USER}>`,
    to,
    subject,
    text,
  });

  return { ok: true };
}