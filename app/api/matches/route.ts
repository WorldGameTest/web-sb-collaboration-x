import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverSession";
import {
  dbConfigured,
  getGameStats,
  listMatches,
  listSwipedGameIds,
} from "@/lib/db";
import { getGameOwners } from "@/lib/sheet";

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

  const [matches, swiped, owners] = await Promise.all([
    listMatches(auth.user.id),
    listSwipedGameIds(auth.user.id),
    getGameOwners(),
  ]);

  // The user's own games. Safe to send — they're theirs. The deck uses this to
  // avoid showing you your own game, which you can never match with.
  const owned = [...owners.entries()]
    .filter(([, email]) => email === auth.user.email)
    .map(([gameId]) => gameId);

  // Real reaction counts for the user's own games.
  const stats = await getGameStats(owned);

  return NextResponse.json({
    ok: true,
    dbConfigured: true,
    me: { id: auth.user.id, email: auth.user.email },
    matches,
    swiped,
    owned,
    stats: Object.fromEntries(stats),
  });
}
