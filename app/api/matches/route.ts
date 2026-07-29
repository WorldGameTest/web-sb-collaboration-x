import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverSession";
import { dbConfigured, listMatches, listSwipedGameIds } from "@/lib/db";

/**
 * This user's matches, plus the game ids they've already swiped so the deck
 * doesn't show the same card twice across sessions.
 *
 * The other party's email is included deliberately — a mutual match is exactly
 * what unlocks contact details.
 */
export async function GET() {
  if (!dbConfigured) {
    return NextResponse.json(
      { ok: true, matches: [], swiped: [], dbConfigured: false },
      { status: 200 }
    );
  }

  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [matches, swiped] = await Promise.all([
    listMatches(auth.user.id),
    listSwipedGameIds(auth.user.id),
  ]);

  return NextResponse.json({
    ok: true,
    dbConfigured: true,
    me: { id: auth.user.id, email: auth.user.email },
    matches,
    swiped,
  });
}
