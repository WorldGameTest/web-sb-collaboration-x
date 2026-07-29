import "server-only";
import type { Template } from "./templates";

/**
 * Transactional email sending.
 *
 * Uses Resend's HTTP API — no SDK, so no dependency to keep updated. Swapping
 * to Postmark or SES means changing `deliver()` only.
 *
 * Sending must come from a domain you own (hello@yourstudio.com), not a
 * personal Gmail. See google-sheets/README.md for why and how.
 */

export type SendResult =
  | { ok: true; id?: string; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

const FROM = process.env.EMAIL_FROM;
const REPLY_TO = process.env.EMAIL_REPLY_TO;
const RESEND_KEY = process.env.RESEND_API_KEY;

export async function sendEmail(
  to: string,
  template: Template
): Promise<SendResult> {
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return { ok: false, error: `Invalid recipient: ${to}` };
  }

  // Not configured yet — log it so the flow is testable without a provider,
  // and make it obvious nothing actually left the building.
  if (!FROM || !RESEND_KEY) {
    console.warn(
      `[email] Not configured (need EMAIL_FROM + RESEND_API_KEY). Would have sent to ${to}:\n` +
        `        Subject: ${template.subject}`
    );
    return { ok: true, skipped: true, reason: "provider-not-configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: template.subject,
        html: template.html,
        text: template.text,
        ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        error: data.message ?? `Provider responded ${res.status}`,
      };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Best-effort send: never throws, never blocks the caller's success path.
 * A submission must still be recorded even if the mail provider is down.
 */
export async function sendEmailSafe(to: string, template: Template) {
  const result = await sendEmail(to, template);
  if (!result.ok) {
    console.error(`[email] Failed to send "${template.subject}" to ${to}:`, result.error);
  }
  return result;
}
