import { NextResponse } from "next/server";
import { sendEmailSafe } from "@/lib/email/send";
import { announcementEmail } from "@/lib/email/templates";

/**
 * Broadcast an announcement to a list of developers.
 *
 * Admin-only, guarded by ADMIN_SECRET. Recipients come from the request body —
 * pull them out of the sheet's Email column (filter to Approved, copy, paste).
 *
 * Sends sequentially with a small gap: providers rate-limit bursts, and a
 * partial send with no record of who got what is worse than a slow one. The
 * response reports per-recipient outcomes so a failed batch can be retried
 * against only the addresses that didn't go out.
 */

type Body = {
  secret?: string;
  to?: string[];
  subject?: string;
  heading?: string;
  paragraphs?: string[];
  ctaLabel?: string;
  ctaUrl?: string;
};

/** Gap between sends, ms. Resend's default limit is ~2 requests/second. */
const SEND_GAP_MS = 600;

export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!adminSecret || body.secret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to = (body.to ?? []).map((e) => e.trim()).filter(Boolean);
  const subject = body.subject?.trim();
  const heading = body.heading?.trim();
  const paragraphs = (body.paragraphs ?? []).filter(Boolean);

  if (!to.length) {
    return NextResponse.json({ error: "No recipients." }, { status: 400 });
  }
  if (!subject || !heading || !paragraphs.length) {
    return NextResponse.json(
      { error: "subject, heading and paragraphs are all required." },
      { status: 400 }
    );
  }

  const template = announcementEmail({
    subject,
    heading,
    paragraphs,
    ctaLabel: body.ctaLabel,
    ctaUrl: body.ctaUrl,
  });

  const results: { email: string; ok: boolean; error?: string }[] = [];

  // De-duplicate: pasted columns very often contain the same address twice.
  for (const email of [...new Set(to)]) {
    const r = await sendEmailSafe(email, template);
    results.push({ email, ok: r.ok, error: r.ok ? undefined : r.error });
    await new Promise((resolve) => setTimeout(resolve, SEND_GAP_MS));
  }

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    ok: failed.length === 0,
    sent: results.length - failed.length,
    failed: failed.length,
    results,
  });
}
