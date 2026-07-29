import "server-only";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

/**
 * Sign-in tokens for the passwordless email flow.
 *
 * These are STATELESS: the email and expiry are encoded in the token and
 * signed with AUTH_SECRET, so any instance can verify a link any other
 * instance issued. That matters on Vercel — an in-memory store would break
 * immediately, because the request that mints the token and the request that
 * verifies it routinely land on different lambdas.
 *
 * Trade-off: without a shared store there is nowhere to record that a token
 * has been used, so a link works until it expires rather than exactly once.
 * The 15-minute window keeps that narrow. To get true single-use, add Redis
 * (Upstash/Vercel KV) and record consumed token ids here — this file is the
 * only thing that changes.
 */

const TTL_MS = 15 * 60 * 1000;

type Payload = {
  /** email */
  e: string;
  /** expires at (ms epoch) */
  x: number;
  /** nonce, so two links for the same address are never byte-identical */
  n: string;
};

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a long random string " +
        "(openssl rand -base64 32) — sign-in cannot work without it."
    );
  }
  return value;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function createToken(email: string): {
  token: string;
  expiresAt: number;
} {
  const payload: Payload = {
    e: email,
    x: Date.now() + TTL_MS,
    n: randomBytes(9).toString("base64url"),
  };

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${body}.${sign(body)}`, expiresAt: payload.x };
}

/**
 * Verifies a token's signature and expiry.
 * Returns the email it was issued for, or null.
 */
export function verifyToken(token: string): string | null {
  const [body, signature] = String(token).split(".");
  if (!body || !signature) return null;

  let expected: string;
  try {
    expected = sign(body);
  } catch {
    return null; // AUTH_SECRET not configured
  }

  // Constant-time compare so the signature can't be guessed byte by byte.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as Payload;

    if (!payload.e || typeof payload.x !== "number") return null;
    if (payload.x < Date.now()) return null;

    return payload.e;
  } catch {
    return null;
  }
}

export const TOKEN_TTL_MINUTES = TTL_MS / 60000;
