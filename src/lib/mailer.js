 // src/lib/mailer.js
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resendKey = process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;

if (!resend) {
  console.warn("⚠️ [MAIL] Mailer not configured (missing RESEND_API_KEY)");
}

export async function sendJoinMail(payload) {
  if (!resend) {
    console.error("❌ [MAIL] sendJoinMail called but Resend not configured");
    return { ok: false, error: "mailer-not-configured" };
  }

  const toRaw = process.env.MAIL_TO || process.env.MAIL_USER;
  const to = toRaw.split(",").map((v) => v.trim()).filter(Boolean);

  const subject = `[ATIMP] New join request (${payload.role || "unknown"})`;
  const text = JSON.stringify(payload, null, 2);

  console.log(">>> [MAIL] Sending join mail via Resend", { to, subject });

  try {
    const { error } = await resend.emails.send({
      from:
        process.env.MAIL_FROM ||
        "A Tree in My Pocket <notifications@atreeinmypocket.com>",
      to,
      subject,
      text,
    });

    if (error) {
      console.error("❌ [MAIL] sendJoinMail FAILED:", error);
      return { ok: false, error: error.message || "send-failed" };
    }

    console.log("✅ [MAIL] sendJoinMail OK");
    return { ok: true };
  } catch (err) {
    console.error("❌ [MAIL] Unexpected error:", err.message);
    return { ok: false, error: err.message };
  }
}