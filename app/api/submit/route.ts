import { NextResponse } from "next/server";
import { parseSteamAppId } from "@/lib/steam";
import { sendEmailSafe } from "@/lib/email/send";
import { invitationEmail } from "@/lib/email/templates";

/**
 * Receives a game submission and appends it to the Google Sheet.
 *
 * Set SHEETS_WEBHOOK_URL in .env.local to the deployed Apps Script web-app URL
 * (see google-sheets/README.md). Without it the route still validates and
 * succeeds, logging the row so the UI is testable before the Sheet exists.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * One row in the sheet. Everything the website needs to render a game card
 * lives here, so the sheet is genuinely the source of truth — the site never
 * has to call Steam again to display an approved game.
 */
export type SubmissionRow = {
  timestamp: string;
  status: "In Process";
  reviewerNotes: string;
  gameName: string;
  steamAppId: string;
  steamLink: string;
  developer: string;
  publishers: string;
  price: string;
  releaseDate: string;
  genres: string;
  platforms: string;
  tags: string;
  reviewScore: string;
  positive: string;
  capsule: string;
  description: string;
  steamKey: string;
  email: string;
  additionalInfo: string;
};

type SteamAppDetails = {
  name?: string;
  genres?: { description: string }[];
  categories?: { description: string }[];
  price_overview?: { final_formatted?: string };
  is_free?: boolean;
  header_image?: string;
  short_description?: string;
  developers?: string[];
  publishers?: string[];
  release_date?: { date?: string; coming_soon?: boolean };
  platforms?: { windows?: boolean; mac?: boolean; linux?: boolean };
};

/** Steam review summary — a separate endpoint from appdetails. */
async function fetchSteamReviews(appId: string) {
  try {
    const res = await fetch(
      `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      query_summary?: {
        review_score_desc?: string;
        total_positive?: number;
        total_reviews?: number;
      };
    };
    const q = json.query_summary;
    if (!q?.total_reviews) return null;
    return {
      score: q.review_score_desc ?? "",
      positive: `${Math.round(((q.total_positive ?? 0) / q.total_reviews) * 100)}%`,
    };
  } catch {
    return null;
  }
}

function stripHtml(s?: string) {
  return String(s ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Best-effort metadata pull. Never blocks the submission. */
async function fetchSteamDetails(appId: string): Promise<SteamAppDetails | null> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=en`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;

    const json = (await res.json()) as Record<
      string,
      { success: boolean; data?: SteamAppDetails }
    >;
    const entry = json[appId];
    return entry?.success && entry.data ? entry.data : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const steamKey = String(body.steamKey ?? "").trim();
  const steamLink = String(body.steamLink ?? "").trim();
  const email = String(body.email ?? "").trim();
  const additionalInfo = String(body.additionalInfo ?? "").trim();

  /* ---- Validation (mirrors the client, never trusts it) ---- */
  const errors: Record<string, string> = {};
  if (!steamKey) errors.steamKey = "Steam key is required.";
  if (!steamLink) errors.steamLink = "Steam game link is required.";
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";

  const appId = steamLink ? parseSteamAppId(steamLink) : null;
  if (steamLink && !appId) {
    errors.steamLink =
      "Use a Steam store link, e.g. https://store.steampowered.com/app/123456/";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  /* ---- Enrich from Steam ---- */
  const [details, reviews] = await Promise.all([
    appId ? fetchSteamDetails(appId) : Promise.resolve(null),
    appId ? fetchSteamReviews(appId) : Promise.resolve(null),
  ]);

  const genres = details?.genres?.map((g) => g.description) ?? [];
  const categories = details?.categories?.map((c) => c.description) ?? [];

  const row: SubmissionRow = {
    timestamp: new Date().toISOString(),
    status: "In Process",
    reviewerNotes: "",
    gameName: details?.name ?? "",
    steamAppId: appId ?? "",
    steamLink,
    developer: (details?.developers ?? []).map((d) => d.trim()).join(", "),
    publishers: (details?.publishers ?? []).map((p) => p.trim()).join(", "),
    price: details?.is_free
      ? "Free"
      : (details?.price_overview?.final_formatted ?? ""),
    releaseDate: details?.release_date?.date ?? "",
    genres: genres.join(", "),
    platforms: [
      details?.platforms?.windows && "Windows",
      details?.platforms?.mac && "macOS",
      details?.platforms?.linux && "Linux",
    ]
      .filter(Boolean)
      .join(", "),
    tags: [...genres, ...categories]
      .filter((t, i, a) => a.indexOf(t) === i)
      .slice(0, 7)
      .join(", "),
    reviewScore: reviews?.score ?? "",
    positive: reviews?.positive ?? "",
    capsule: details?.header_image?.split("?")[0] ?? "",
    description: stripHtml(details?.short_description).slice(0, 300),
    steamKey,
    email,
    additionalInfo,
  };

  /* ---- Append to the Google Sheet ---- */
  const webhook = process.env.SHEETS_WEBHOOK_URL;

  if (!webhook) {
    console.warn(
      "[submit] SHEETS_WEBHOOK_URL is not set — submission not persisted:",
      row
    );
    await sendEmailSafe(email, invitationEmail({ gameName: row.gameName }));
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...row, secret: process.env.SHEETS_SECRET ?? "" }),
      signal: AbortSignal.timeout(10000),
    });

    // Apps Script's ContentService ALWAYS replies 200 — it cannot set a status
    // code. Checking res.ok alone would treat a rejected secret or a script
    // error as a successful save, so the body is the only real signal.
    if (!res.ok) throw new Error(`Sheet responded ${res.status}`);

    const text = await res.text();
    let result: { ok?: boolean; error?: string; row?: number };
    try {
      result = JSON.parse(text);
    } catch {
      // An HTML body means Apps Script served its error/login page instead of
      // running the script — usually a bad deployment URL or access setting.
      throw new Error(`Sheet returned non-JSON: ${text.slice(0, 200)}`);
    }

    if (result.ok !== true) {
      throw new Error(result.error ?? "Sheet rejected the row");
    }

    // Row is safely stored — now invite them in. Deliberately after the write:
    // a mail outage must never cost us the submission, and sendEmailSafe
    // swallows its own errors so it can't fail the request either.
    await sendEmailSafe(email, invitationEmail({ gameName: row.gameName }));

    return NextResponse.json({ ok: true, persisted: true });
  } catch (err) {
    // The developer already filled the form — don't lose it to a Sheets outage.
    console.error("[submit] Failed to append to sheet:", err, row);
    return NextResponse.json(
      { error: "We couldn't record your submission. Please try again." },
      { status: 502 }
    );
  }
}
