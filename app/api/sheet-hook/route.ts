import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { GAMES_TAG, getApprovedGames } from "@/lib/sheet";
import { sendEmailSafe } from "@/lib/email/send";
import { approvedEmail, rejectedEmail } from "@/lib/email/templates";

/**
 * Called by the sheet's onEdit trigger whenever a Status cell changes.
 *
 * Two jobs:
 *   1. Expire the cached game list so the site reflects the new status.
 *   2. Email the developer about the decision.
 *
 * Guarded by SHEETS_SECRET — this endpoint can publish and unpublish games and
 * send mail, so it must not be callable by anyone who finds the URL.
 */

export type SheetHookBody = {
  secret?: string;
  status?: string;
  gameName?: string;
  email?: string;
  reviewerNotes?: string;
  /** Set by the sheet so we don't re-send on unrelated edits. */
  statusChanged?: boolean;
};

function normalise(status: string) {
  return status.trim().toLowerCase();
}

export async function POST(request: Request) {
  const secret = process.env.SHEETS_SECRET;

  let body: SheetHookBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!secret || body.secret !== secret) {
    // Same response either way — don't confirm whether a secret is configured.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = normalise(String(body.status ?? ""));

  // Always refresh the site: approving, rejecting and hiding all change what
  // the public sees.
  revalidateTag(GAMES_TAG, "max");

  // revalidateTag only marks the entry stale — the next visitor would still be
  // served the old list once while it refreshes behind them. For an unpublish
  // that means a rejected game stays up for one more request, so we pull the
  // fresh list here and let this request absorb that cost instead of a user.
  await getApprovedGames();

  let emailed: string | null = null;

  if (body.statusChanged !== false && body.email) {
    const gameName = body.gameName?.trim() || "your game";

    if (status === "approved") {
      await sendEmailSafe(body.email, approvedEmail({ gameName }));
      emailed = "approved";
    } else if (status === "rejected" || status === "refused") {
      await sendEmailSafe(
        body.email,
        rejectedEmail({ gameName, reason: body.reviewerNotes })
      );
      emailed = "rejected";
    }
    // "hidden" and "in process" pull the game without emailing — hiding is an
    // internal action, and there's nothing useful to tell the developer.
  }

  return NextResponse.json({ ok: true, revalidated: GAMES_TAG, emailed });
}
