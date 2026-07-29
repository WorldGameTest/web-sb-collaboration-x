"use client";

/**
 * Stand-in for real auth. The Dev Hub reads the signed-in email from
 * localStorage so the join -> hub flow is browsable end to end.
 *
 * Replace with a real session (magic-link email + httpOnly cookie) before this
 * goes anywhere near production — nothing here is a security boundary.
 */

const KEY = "swipegames.session";

export type Session = { email: string; joinedAt: string };

export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function writeSession(email: string): Session {
  const session: Session = { email, joinedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* private browsing — session just won't persist */
  }
  return session;
}

export function clearSession() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
