import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverSession";
import { dbConfigured, recordSwipe } from "@/lib/db";
import { getGameOwners } from "@/lib/sheet";

/**
 * Records a like/pass and reports whether it completed a match.
 *
 * A match requires both directions: this user liked a game the other owns, AND
 * the other already liked a game this user owns. Ownership comes from the
 * sheet's Email column, resolved server-side.
 */
export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Matching needs a database. Set DATABASE_URL." },
      { status: 503 }
    );
  }

  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { targetGameId?: string; direction?: string; myGameId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const targetGameId = String(body.targetGameId ?? "").trim();
  const direction = body.direction === "pass" ? "pass" : "like";
  if (!targetGameId) {
    return NextResponse.json({ error: "targetGameId is required." }, { status: 400 });
  }

  const owners = await getGameOwners();
  const targetOwnerEmail = owners.get(targetGameId);

  // Which pool games does this user own? Needed to check the reverse like.
  const myGameIds = [...owners.entries()]
    .filter(([, email]) => email === auth.user.email)
    .map(([gameId]) => gameId);

  let targetOwnerId: number | undefined;
  if (targetOwnerEmail && targetOwnerEmail !== auth.user.email) {
    const { upsertUser } = await import("@/lib/db");
    targetOwnerId = (await upsertUser(targetOwnerEmail)).id;
  }

  try {
    const result = await recordSwipe({
      userId: auth.user.id,
      myGameId: myGameIds[0],
      targetGameId,
      direction,
      targetOwnerId,
      myGameIds,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[swipe]", err);
    return NextResponse.json({ error: "Could not record swipe." }, { status: 500 });
  }
}
