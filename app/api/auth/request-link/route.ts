import { NextResponse } from "next/server";
import { createToken, TOKEN_TTL_MINUTES } from "@/lib/authTokens";
import { EMAIL_RE } from "@/lib/steam";

/**
 * Passwordless sign-in, step 1: issue a one-time link and email it.
 *
 * There's no email provider wired up yet, so in development the link comes
 * back in the response for you to click. That must never happen in
 * production — see the guard below.
 */

export async function POST(request: Request) {
  let body: { email?: unknown; intent?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const intent = body.intent === "join" ? "join" : "signin";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  let token: string;
  try {
    ({ token } = createToken(email));
  } catch (err) {
    // Missing AUTH_SECRET — fail loudly rather than issuing links nobody can
    // verify, which would look like a silent, intermittent sign-in bug.
    console.error("[auth]", err);
    return NextResponse.json(
      { error: "Sign-in is not configured yet. Please try again later." },
      { status: 500 }
    );
  }

  const origin = new URL(request.url).origin;
  const link = `${origin}/auth/verify?token=${token}`;

  const emailProviderConfigured = Boolean(process.env.EMAIL_FROM);

  if (emailProviderConfigured) {
    // TODO: send via Resend / Postmark / SES.
    // await sendSignInEmail({ to: email, link, intent });
  } else {
    console.warn(
      `[auth] No email provider configured. Sign-in link for ${email}:\n  ${link}`
    );
  }

  // Always report success: telling an anonymous caller whether an address is
  // registered would leak your user list.
  return NextResponse.json({
    ok: true,
    expiresInMinutes: TOKEN_TTL_MINUTES,
    intent,
    // Dev convenience only — there is no inbox to check locally.
    devLink: process.env.NODE_ENV === "production" ? undefined : link,
  });
}
