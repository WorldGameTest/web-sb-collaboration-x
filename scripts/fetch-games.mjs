/**
 * Pulls real game data from Steam and writes lib/games.generated.ts.
 * Run: node fetch-games.mjs <output-path>
 */
import { writeFileSync } from "node:fs";

const APPIDS = [
  413150,  // Stardew Valley
  367520,  // Hollow Knight
  646570,  // Slay the Spire
  268910,  // Cuphead
  391540,  // Undertale
  504230,  // Celeste
  588650,  // Dead Cells
  105600,  // Terraria
  250900,  // The Binding of Isaac: Rebirth
  294100,  // RimWorld
  1145360, // Hades
  632360,  // Risk of Rain 2
  262060,  // Darkest Dungeon
  322330,  // Don't Starve Together
  1794680, // Vampire Survivors
  233860,  // Kenshi
  1057090, // Ori and the Will of the Wisps
  387290,  // Ori and the Blind Forest
  2379780, // Balatro
  1868140, // Dave the Diver
  1332010, // Stray
  1966720, // Lethal Company
  448510,  // Overcooked
  1229490, // ULTRAKILL
  244850,  // Space Engineers
  219740,  // Don't Starve
  427520,  // Factorio
  774361,  // ?
  1091500, // Cyberpunk 2077 (big name for contrast)
  975370,  // Dwarf Fortress
  1817070, // Marvel's Spider-Man Remastered
  240720,  // Getting Over It
];

/** The game you're swiping as — fit is scored against this. */
const ME = { genres: ["Casual", "Indie", "Simulation"], priceUSD: 0.99 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function clean(html) {
  return String(html ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function priceToNumber(p) {
  if (!p) return 0;
  const m = String(p).match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getGame(appid) {
  const details = await fetchJSON(
    `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=en`
  );
  const entry = details[appid];
  if (!entry?.success || !entry.data) throw new Error("no details");
  const d = entry.data;
  if (d.type !== "game") throw new Error(`type=${d.type}`);

  await sleep(250);

  let score = "No user reviews";
  let reviews = "0";
  let positive = "—";
  try {
    const r = await fetchJSON(
      `https://store.steampowered.com/appreviews/${appid}?json=1&language=all&purchase_type=all&num_per_page=0`
    );
    const q = r?.query_summary;
    if (q && q.total_reviews > 0) {
      score = q.review_score_desc ?? score;
      const total = q.total_reviews;
      reviews =
        total >= 1_000_000
          ? `${(total / 1_000_000).toFixed(1)}M`
          : total >= 1000
            ? `${(total / 1000).toFixed(1)}K`
            : String(total);
      positive = `${Math.round((q.total_positive / total) * 100)}%`;
    }
  } catch {
    /* reviews are optional */
  }

  const genres = (d.genres ?? []).map((g) => g.description);
  const categories = (d.categories ?? []).map((c) => c.description);

  const price = d.is_free
    ? "Free"
    : d.price_overview?.final_formatted ?? "—";

  /* ---- Fit score, computed against ME ---- */
  const shared = genres.filter((g) => ME.genres.includes(g));
  const priceNum = priceToNumber(price);
  const priceGap = Math.abs(priceNum - ME.priceUSD);
  const positiveNum = parseInt(positive) || 0;

  let fit = 52 + shared.length * 11;
  if (priceGap <= 5) fit += 12;
  else if (priceGap <= 15) fit += 6;
  if (positiveNum >= 90) fit += 9;
  else if (positiveNum >= 80) fit += 5;
  fit = Math.max(48, Math.min(97, fit));

  const fitNotes = [
    priceGap <= 5
      ? "similar price range"
      : priceGap <= 15
        ? "different price range"
        : "much higher price range",
    shared.length >= 2 ? "similar audience" : "overlapping audience",
  ];

  return {
    id: `s${appid}`,
    appid,
    name: d.name,
    capsule: d.header_image,
    genres: genres.slice(0, 3),
    price,
    score,
    reviews,
    positive,
    fit,
    fitShared: shared.length ? shared : genres.slice(0, 2),
    fitNotes,
    releaseDate: d.release_date?.date || "TBA",
    platforms: [
      d.platforms?.windows && "Windows",
      d.platforms?.mac && "macOS",
      d.platforms?.linux && "Linux",
    ].filter(Boolean),
    developer: (d.developers ?? ["Unknown"])[0],
    publishers: d.publishers ?? [],
    tags: [...genres, ...categories]
      .filter((t, i, a) => a.indexOf(t) === i)
      .filter((t) => !/steam trading cards|steam workshop|remote play/i.test(t))
      .slice(0, 7),
    description: clean(d.short_description).slice(0, 240),
    steamUrl: `https://store.steampowered.com/app/${appid}/`,
  };
}

const out = [];
for (const appid of APPIDS) {
  try {
    const g = await getGame(appid);
    out.push(g);
    console.error(`ok    ${appid}  ${g.name}`);
  } catch (e) {
    console.error(`skip  ${appid}  (${e.message})`);
  }
  await sleep(400);
  if (out.length >= 30) break;
}

const header = `/**
 * Real Steam data, generated by scripts/fetch-games.mjs.
 * Do not edit by hand — re-run the script to refresh.
 *
 * Fit scores are computed against a reference game
 * (${ME.genres.join(", ")} @ $${ME.priceUSD}), which stands in for "your game"
 * until real per-user scoring exists.
 */
import type { Game } from "./data";

export const STEAM_GAMES: Game[] = ${JSON.stringify(out, null, 2)};
`;

writeFileSync(process.argv[2], header);
console.error(`\nwrote ${out.length} games -> ${process.argv[2]}`);
console.error("capsule hosts:", [
  ...new Set(out.map((g) => new URL(g.capsule).host)),
].join(", "));
