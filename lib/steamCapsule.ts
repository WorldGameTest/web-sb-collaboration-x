import "server-only";

/**
 * Resolves a game's header capsule URL from its Steam appid.
 *
 * You CANNOT build this URL from the appid. Older titles are reachable at
 * cdn.akamai.steamstatic.com/steam/apps/<appid>/header.jpg, but anything
 * released recently only exists under a content-hashed path:
 *
 *   .../store_item_assets/steam/apps/<appid>/<hash>/header.jpg
 *
 * The hash is only available from the store API, so guessing produces 404s —
 * which is what a broken cover on the site looks like. Always ask Steam.
 *
 * Submissions already capture header_image at submit time, so this is the
 * safety net for rows added to the sheet by hand.
 */

/** Cached for a day — capsules change when a dev updates their store art. */
const REVALIDATE_SECONDS = 60 * 60 * 24;

export async function resolveCapsule(
  appid: string | number
): Promise<string | undefined> {
  const id = String(appid).trim();
  if (!/^\d{3,8}$/.test(id)) return undefined;

  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${id}&filters=basic&cc=us&l=en`,
      { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return undefined;

    const json = (await res.json()) as Record<
      string,
      { success?: boolean; data?: { header_image?: string } }
    >;
    return json[id]?.success ? json[id]?.data?.header_image : undefined;
  } catch {
    // Never let a cover lookup break the page — the caller falls back to the
    // gradient placeholder, which reads as intentional rather than broken.
    return undefined;
  }
}

/** Resolves many at once, de-duplicated. */
export async function resolveCapsules(
  appids: (string | number | undefined)[]
): Promise<Map<string, string>> {
  const unique = [...new Set(appids.filter(Boolean).map(String))];
  const out = new Map<string, string>();

  const results = await Promise.all(
    unique.map(async (id) => [id, await resolveCapsule(id)] as const)
  );
  for (const [id, url] of results) if (url) out.set(id, url);

  return out;
}
