// src/lib/mailer.js
import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.RESEND_API_KEY || "";
const resend = apiKey ? new Resend(apiKey) : null;

export async function sendJoinMail(payload = {}) {
  if (!resend) {
    console.error("❌ [MAIL] Resend not configured (missing RESEND_API_KEY)");
    return { ok: false, error: "mailer-not-configured" };
  }

  // Build recipient list safely
  const toRaw = process.env.MAIL_TO || process.env.MAIL_USER || "";
  const to = toRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!to.length) {
    console.error("❌ [MAIL] No recipients (set MAIL_TO or MAIL_USER)");
    return { ok: false, error: "no-recipients" };
  }

  // Use verified sender if set, otherwise Resend’s default (works without DNS)
  const from =
    process.env.MAIL_FROM || "onboarding@resend.dev"; // TEMP SAFE DEFAULT

  const subject = `[ATIMP] New join request (${payload.role || "unknown"})`;
  const text = JSON.stringify(payload, null, 2);

  console.log(">>> [MAIL] Sending via Resend", { from, to, subject });

  try {
    const { data, error } = await resend.emails.send({
      from,            // e.g., "A Tree in My Pocket <notify@atreeinmypocket.com>" after domain verify
      to,
      subject,
      text,
      reply_to: payload.email || undefined, // nice-to-have
      tags: [{ name: "source", value: "join" }],
    });

    if (error) {
      // Helpful hints for common cases
      const msg = error.message || String(error);
      if (msg.includes("domain is not verified")) {
        console.error("❌ [MAIL] Sender domain not verified. Use MAIL_FROM=onboarding@resend.dev or verify your domain in Resend.");
      } else {
        console.error("❌ [MAIL] Resend error:", error);
      }
      return { ok: false, error: msg };
    }

    console.log("✅ [MAIL] Sent:", data?.id || "ok");
    return { ok: true };
  } catch (err) {
    console.error("❌ [MAIL] Unexpected:", err);
    return { ok: false, error: err.message || "unexpected-error" };
  }
}