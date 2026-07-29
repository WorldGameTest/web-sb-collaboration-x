import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/authTokens";
import { startSession } from "@/lib/serverSession";
import { dbConfigured } from "@/lib/db";

/**
 * Passwordless sign-in, step 2: verify the link and start the session.
 *
 * Sets a signed httpOnly cookie via startSession(), which also creates the
 * user row. The email is still returned so the client can show who signed in.
 */

export async function POST(request: Request) {
  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const email = verifyToken(token);
  if (!email) {
    return NextResponse.json(
      { error: "That link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  // Set the real httpOnly session cookie and create the user row. Falls back to
  // returning just the email when there's no database yet, so the demo flow
  // still works before Postgres is provisioned.
  if (dbConfigured) {
    try {
      await startSession(email);
    } catch (err) {
      console.error("[auth] Could not start session:", err);
      return NextResponse.json(
        { error: "Could not sign you in. Please try again." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, email });
}
