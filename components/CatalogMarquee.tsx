import { type Game } from "@/lib/data";
import { Art } from "./Art";

/** Single source for the spacing between cards and between rows. */
const GAP = "1.25rem";

/**
 * Full-bleed scrolling catalog of games sitting in the pool.
 *
 * Pure CSS animation, so this stays a server component. Each row renders its
 * titles twice — the second copy is what the first scrolls into, and it's
 * hidden from assistive tech so the list isn't announced twice.
 */
export function CatalogMarquee({ games }: { games: Game[] }) {
  // Two rows travelling in opposite directions, split by position.
  const rows = [
    games.filter((_, i) => i % 2 === 0),
    games.filter((_, i) => i % 2 === 1),
  ].filter((row) => row.length > 0);

  if (rows.length === 0) return null;

  return (
    <section className="overflow-hidden py-16">
      <div className="mx-auto w-full max-w-[1180px] px-6">
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-brand">
          The pool
        </p>
        <h2 className="font-display text-[clamp(2rem,3.6vw,3.1rem)] font-extrabold tracking-tight">
          Games you can bundle with.
        </h2>
        <p className="lead mt-4 max-w-[620px]">
          Indie to established studios — every game below is verified and in the
          swipe deck right now.
        </p>
      </div>

      {/* GAP drives the space between cards and between rows, so both match. */}
      <div
        className="mt-10 flex flex-col"
        style={{ gap: GAP, ["--marquee-gap" as string]: GAP }}
      >
        {rows.map((row, i) => (
          <MarqueeRow
            key={i}
            games={row}
            reverse={i % 2 === 1}
            durationSeconds={i % 2 === 1 ? 78 : 64}
          />
        ))}
      </div>
    </section>
  );
}

function MarqueeRow({
  games,
  reverse,
  durationSeconds,
}: {
  games: Game[];
  reverse: boolean;
  durationSeconds: number;
}) {
  return (
    <div className="marquee">
      <div
        className={`marquee__track ${reverse ? "marquee__track--reverse" : ""}`}
        style={{ ["--marquee-duration" as string]: `${durationSeconds}s` }}
      >
        <ul className="marquee__group m-0 list-none p-0">
          {games.map((game) => (
            <li key={game.id}>
              <CatalogCard game={game} />
            </li>
          ))}
        </ul>

        <ul className="marquee__group m-0 list-none p-0" aria-hidden="true">
          {games.map((game) => (
            <li key={game.id}>
              <CatalogCard game={game} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CatalogCard({ game }: { game: Game }) {
  return (
    <div className="relative aspect-[460/215] w-[320px] flex-none overflow-hidden rounded-xl border border-line">
      <Art name={game.name} src={game.capsule} className="rounded-none" />
      {/* Scrim so the title stays legible over any cover. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <span className="absolute inset-x-4 bottom-3 truncate text-[15px] font-medium text-white">
        {game.name}
      </span>
    </div>
  );
}
