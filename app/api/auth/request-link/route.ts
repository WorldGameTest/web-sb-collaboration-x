import { NextResponse } from "next/server";
import { createToken, TOKEN_TTL_MINUTES } from "@/lib/authTokens";
import { EMAIL_RE } from "@/lib/steam";
import { sendEmailSafe } from "@/lib/email/send";
import { signInEmail } from "@/lib/email/templates";

/**
 * Passwordless sign-in, step 1: issue a one-time link and email it.
 *
 * Sends via Resend. In development the link is also returned in the response
 * so you can click through without an inbox; that is disabled in production.
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

  // SITE_URL wins over the request origin: emails must link to the canonical
  // domain, not to whatever preview host happened to serve this request.
  const origin = process.env.SITE_URL?.replace(/\/$/, "") ??
    new URL(request.url).origin;
  const link = `${origin}/auth/verify?token=${token}`;

  const sent = await sendEmailSafe(
    email,
    signInEmail({ link, expiresInMinutes: TOKEN_TTL_MINUTES, intent })
  );

  // A send failure in production means the person cannot get in at all, so say
  // so rather than showing "check your inbox" over a silent failure.
  const reachedInbox = sent.ok && !("skipped" in sent && sent.skipped);
  if (!reachedInbox && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "We couldn't send your sign-in link. Please try again, or contact us if it keeps failing.",
      },
      { status: 502 }
    );
  }

  // Always report success otherwise: telling an anonymous caller whether an
  // address is registered would leak your user list.
  return NextResponse.json({
    ok: true,
    expiresInMinutes: TOKEN_TTL_MINUTES,
    intent,
    emailed: reachedInbox,
    // Dev convenience only — there is no inbox to check locally.
    devLink: process.env.NODE_ENV === "production" ? undefined : link,
  });
}
