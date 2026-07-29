import "server-only";
import type { Game } from "./data";
import { STEAM_GAMES } from "./games.generated";
import { resolveCapsules } from "./steamCapsule";

/**
 * Reads approved games out of the Google Sheet.
 *
 * The sheet is the source of truth: a row's Status decides whether the game is
 * on the site. Nothing is deployed to publish or unpublish a game.
 *
 * Caching: responses are tagged `GAMES_TAG` and revalidated on a short timer.
 * The Apps Script `onEdit` trigger also pings /api/sheet-hook the instant a
 * Status cell changes, which expires the tag — so an approval shows up on the
 * next request rather than waiting out the timer.
 */

export const GAMES_TAG = "approved-games";

/** Fallback poll interval when the webhook doesn't fire (seconds). */
const REVALIDATE_SECONDS = 60;

type SheetRow = {
  status?: string;
  gameName?: string;
  steamAppId?: string | number;
  steamLink?: string;
  developer?: string;
  publishers?: string;
  price?: string;
  releaseDate?: string;
  genres?: string;
  platforms?: string;
  tags?: string;
  reviewScore?: string;
  positive?: string;
  capsule?: string;
  description?: string;
  /** "Yes" = show on the /games page as one of our published titles. */
  ours?: string;
  /** "Yes" = the single featured slot at the top of /games. */
  featured?: string;
  /** Submitter's email. Server-side only — never reaches the browser. */
  ownerEmail?: string;
};

const isYes = (v?: string) => /^(yes|y|true|1|x)$/i.test(String(v ?? "").trim());

const splitList = (v?: string) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Only ever use the capsule the sheet stored.
 *
 * Deriving one from the appid does NOT work: recent releases live at a
 * content-hashed path that can't be guessed, so a constructed URL 404s and the
 * card shows a broken image. Blank rows get filled in from the Steam API by
 * resolveCapsules() below, and anything still missing falls through to the
 * gradient placeholder.
 */
function storedCapsule(stored?: string) {
  const url = stored?.trim();
  return url && /^https?:\/\//.test(url) ? url : undefined;
}

/**
 * Fit is scored against the game you're swiping as. Until per-user scoring
 * exists, this scores against a reference profile so the number means
 * something rather than being random.
 */
const ME = { genres: ["Casual", "Indie", "Simulation"], priceUSD: 0.99 };

function toGame(row: SheetRow): Game | null {
  const name = row.gameName?.trim();
  if (!name) return null;

  const genres = splitList(row.genres);
  const shared = genres.filter((g) => ME.genres.includes(g));

  const priceNum = parseFloat(String(row.price ?? "").replace(/[^\d.]/g, "")) || 0;
  const priceGap = Math.abs(priceNum - ME.priceUSD);
  const positiveNum = parseInt(String(row.positive ?? "")) || 0;

  let fit = 52 + shared.length * 11;
  if (priceGap <= 5) fit += 12;
  else if (priceGap <= 15) fit += 6;
  if (positiveNum >= 90) fit += 9;
  else if (positiveNum >= 80) fit += 5;
  fit = Math.max(48, Math.min(97, fit));

  const appid = row.steamAppId ? String(row.steamAppId) : undefined;

  return {
    id: appid ? `s${appid}` : `row-${name.toLowerCase().replace(/\W+/g, "-")}`,
    appid: appid ? Number(appid) : undefined,
    capsule: storedCapsule(row.capsule),
    name,
    genres: genres.slice(0, 3),
    price: row.price?.trim() || "—",
    score: row.reviewScore?.trim() || "No user reviews",
    reviews: "—",
    positive: row.positive?.trim() || "—",
    fit,
    fitShared: shared.length ? shared : genres.slice(0, 2),
    fitNotes: [
      priceGap <= 5 ? "similar price range" : "different price range",
      shared.length >= 2 ? "similar audience" : "overlapping audience",
    ],
    releaseDate: row.releaseDate?.trim() || "TBA",
    platforms: splitList(row.platforms ?? "Windows"),
    developer: row.developer?.trim() || "Unknown",
    publishers: splitList(row.publishers),
    // Never exposed publicly — contact is revealed only on a mutual match.
    contactEmail: undefined,
    tags: splitList(row.tags).slice(0, 7),
    description: row.description?.trim() || "",
    steamUrl:
      row.steamLink?.trim() ||
      (appid ? `https://store.steampowered.com/app/${appid}/` : "#"),
    ours: isYes(row.ours),
    featured: isYes(row.featured),
  };
}

/**
 * Approved games, straight from the sheet.
 *
 * Falls back to the generated Steam fixtures when the sheet isn't wired up, so
 * the site still looks complete in development.
 */
export async function getApprovedGames(): Promise<Game[]> {
  const url = process.env.SHEETS_WEBHOOK_URL;
  const secret = process.env.SHEETS_SECRET;

  if (!url) return STEAM_GAMES;

  try {
    const endpoint = `${url}?action=games&secret=${encodeURIComponent(secret ?? "")}`;
    const res = await fetch(endpoint, {
      next: { tags: [GAMES_TAG], revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) throw new Error(`Sheet responded ${res.status}`);

    const text = await res.text();
    let payload: { ok?: boolean; games?: SheetRow[]; error?: string };
    try {
      payload = JSON.parse(text);
    } catch {
      // Apps Script serves an HTML error/login page when the deployment URL or
      // access setting is wrong — surface that rather than rendering nothing.
      throw new Error(`Sheet returned non-JSON: ${text.slice(0, 160)}`);
    }

    if (payload.ok !== true || !Array.isArray(payload.games)) {
      throw new Error(payload.error ?? "Sheet rejected the read");
    }

    const games = payload.games
      .map(toGame)
      .filter((g): g is Game => g !== null);

    // Backfill covers for rows the sheet has no capsule for — typically ones
    // added by hand. Without this the card falls back to a gradient, which is
    // tidy but not the real art.
    const missing = games.filter((g) => !g.capsule && g.appid).map((g) => g.appid);
    if (missing.length > 0) {
      const resolved = await resolveCapsules(missing);
      for (const game of games) {
        if (!game.capsule && game.appid) {
          game.capsule = resolved.get(String(game.appid));
        }
      }
    }

    // An empty sheet is legitimate; a broken one is not. Only fall back on
    // failure, never on "no games approved yet".
    return games;
  } catch (err) {
    console.error("[sheet] Could not read approved games:", err);
    return STEAM_GAMES;
  }
}

/**
 * Game id -> owner email, for the matching logic.
 *
 * Kept separate from getApprovedGames() on purpose: that result is handed to
 * client components as props, so anything on it is shipped to the browser.
 * Owner emails must never make that trip — a match is what unlocks contact.
 */
export async function getGameOwners(): Promise<Map<string, string>> {
  const url = process.env.SHEETS_WEBHOOK_URL;
  const secret = process.env.SHEETS_SECRET;
  const owners = new Map<string, string>();
  if (!url) return owners;

  try {
    const res = await fetch(
      `${url}?action=games&secret=${encodeURIComponent(secret ?? "")}`,
      { next: { tags: [GAMES_TAG], revalidate: REVALIDATE_SECONDS } }
    );
    if (!res.ok) return owners;

    const payload = (await res.json()) as { ok?: boolean; games?: SheetRow[] };
    if (payload.ok !== true || !Array.isArray(payload.games)) return owners;

    for (const row of payload.games) {
      const email = row.ownerEmail?.trim().toLowerCase();
      const appid = row.steamAppId ? String(row.steamAppId) : "";
      if (!email || !appid) continue;
      owners.set(`s${appid}`, email);
    }
  } catch (err) {
    console.error("[sheet] Could not read game owners:", err);
  }

  return owners;
}

/**
 * Our own published titles — the /games page.
 *
 * Driven entirely by the sheet: a row needs Status = Approved and Ours = Yes.
 * Mark exactly one row Featured = Yes for the big slot at the top; if none is
 * marked, the first one is used so the page never loses its hero.
 */
export async function getShowcase(): Promise<{
  featured: Game | null;
  more: Game[];
}> {
  const approved = await getApprovedGames();
  const ours = approved.filter((g) => g.ours);

  if (ours.length === 0) return { featured: null, more: [] };

  const featured = ours.find((g) => g.featured) ?? ours[0];
  return {
    featured,
    more: ours.filter((g) => g.id !== featured.id),
  };
}
