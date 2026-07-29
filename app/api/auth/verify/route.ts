import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/authTokens";

/**
 * Passwordless sign-in, step 2: verify the link and hand back the email.
 *
 * A real implementation would set an httpOnly session cookie here instead of
 * returning the address — see lib/session.ts for why this one doesn't.
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

  return NextResponse.json({ ok: true, email });
}
