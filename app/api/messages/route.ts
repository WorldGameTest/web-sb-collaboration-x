import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverSession";
import {
  dbConfigured,
  insertMessage,
  listMessages,
  userInMatch,
} from "@/lib/db";

/**
 * Chat inside a match.
 *
 * GET  ?matchId=1&after=42   -> messages newer than id 42 (the client polls)
 * POST { matchId, body }     -> send one
 *
 * Both verify the caller is actually in the match. Without that check anyone
 * signed in could read any conversation by guessing a match id.
 */

const MAX_LENGTH = 2000;

export async function GET(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json({ error: "Chat needs a database." }, { status: 503 });
  }

  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const matchId = Number(url.searchParams.get("matchId"));
  const after = Number(url.searchParams.get("after") ?? 0) || 0;

  if (!Number.isInteger(matchId) || matchId <= 0) {
    return NextResponse.json({ error: "matchId is required." }, { status: 400 });
  }

  if (!(await userInMatch(auth.user.id, matchId))) {
    // 404 rather than 403 — don't confirm that a match id exists.
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const messages = await listMessages(matchId, after);
  return NextResponse.json({
    ok: true,
    me: auth.user.id,
    messages,
  });
}

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json({ error: "Chat needs a database." }, { status: 503 });
  }

  const auth = await requireUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let payload: { matchId?: number; body?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const matchId = Number(payload.matchId);
  const body = String(payload.body ?? "").trim();

  if (!Number.isInteger(matchId) || matchId <= 0) {
    return NextResponse.json({ error: "matchId is required." }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json({ error: "Message is empty." }, { status: 400 });
  }
  if (body.length > MAX_LENGTH) {
    return NextResponse.json(
      { error: `Messages are limited to ${MAX_LENGTH} characters.` },
      { status: 400 }
    );
  }

  if (!(await userInMatch(auth.user.id, matchId))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const message = await insertMessage({
    matchId,
    senderUserId: auth.user.id,
    body,
  });

  return NextResponse.json({ ok: true, message, me: auth.user.id });
}
