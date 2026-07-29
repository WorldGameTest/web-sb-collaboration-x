import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { findUserByEmail, upsertUser, type User } from "./db";

/**
 * Real sessions: an httpOnly, signed cookie.
 *
 * This replaces lib/session.ts (localStorage), which the browser could edit —
 * meaning anyone could have claimed to be any email. That was fine for a
 * clickable demo and is not fine now that messages are stored per user.
 */

const COOKIE = "bundly_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short.");
  }
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function serialise(email: string) {
  const body = Buffer.from(email.toLowerCase()).toString("base64url");
  return `${body}.${sign(body)}`;
}

function deserialise(raw: string): string | null {
  const [body, signature] = raw.split(".");
  if (!body || !signature) return null;

  let expected: string;
  try {
    expected = sign(body);
  } catch {
    return null;
  }

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return Buffer.from(body, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

/** Called after a magic link verifies. Creates the user row if needed. */
export async function startSession(email: string): Promise<User> {
  const user = await upsertUser(email);
  const jar = await cookies();

  jar.set(COOKIE, serialise(user.email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return user;
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** The signed-in user, or null. Verifies the signature every time. */
export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;

  const email = deserialise(raw);
  if (!email) return null;

  return findUserByEmail(email);
}

/** For API routes: the user, or a 401-shaped reason. */
export async function requireUser(): Promise<
  { ok: true; user: User } | { ok: false; status: number; error: string }
> {
  try {
    const user = await currentUser();
    if (!user) return { ok: false, status: 401, error: "Not signed in." };
    return { ok: true, user };
  } catch (err) {
    return {
      ok: false,
      status: 503,
      error: err instanceof Error ? err.message : "Session unavailable.",
    };
  }
}
