/**
 * Shared validation helpers. No "use client" — imported by both the browser
 * forms and the server route handler, so the same rules apply on each side.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Accepts a full Steam store URL or a bare appid.
 * Returns the appid, or null when the value isn't a Steam store link.
 */
export function parseSteamAppId(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{3,8}$/.test(trimmed)) return trimmed;

  const match = trimmed.match(
    /^https?:\/\/store\.steampowered\.com\/app\/(\d+)(?:\/|$|\?|#)/i
  );
  return match ? match[1] : null;
}
