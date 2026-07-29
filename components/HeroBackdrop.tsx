import { type Game } from "@/lib/data";

/**
 * Ambient collage behind the hero: rows of dimmed game covers drifting slowly
 * in alternating directions, tilted and over-scaled so no edge shows.
 *
 * Purely decorative — aria-hidden and pointer-events-none, so it never
 * interferes with the content sitting on top of it. Heavily scrimmed, because
 * the hero headline and body copy have to stay readable over it.
 */

export function HeroBackdrop({ games }: { games: Game[] }) {
  if (games.length === 0) return null;

  /** Five overlapping rows, each offset so the same cover never lines up. */
  const ROWS: Game[][] = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 9 }, (_, i) => games[(row * 7 + i * 3) % games.length])
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Tilted and over-sized so the rotation never exposes a corner. */}
      <div className="absolute left-1/2 top-1/2 w-[190%] -translate-x-1/2 -translate-y-1/2 -rotate-[9deg]">
        {/* Blurred on purpose: it must read as texture, never as a carousel
            you could interact with. The real one lives further down the page. */}
        <div className="flex flex-col gap-4 opacity-[0.42] blur-[3px]">
          {ROWS.map((row, i) => (
            <DriftRow
              key={i}
              games={row}
              reverse={i % 2 === 1}
              seconds={190 + i * 30}
            />
          ))}
        </div>
      </div>

      {/* Scrims: pull the middle down hard so centred copy stays legible, then
          fade the top and bottom into the page background. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_45%,rgba(10,10,10,0.97)_0%,rgba(10,10,10,0.88)_40%,rgba(10,10,10,0.62)_70%,rgba(10,10,10,0.45)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink via-transparent to-ink" />

      {/* Warm/violet wash so the collage reads as brand colour, not noise. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_0%,rgba(168,85,247,0.14),transparent_70%)]" />
    </div>
  );
}

function DriftRow({
  games,
  reverse,
  seconds,
}: {
  games: Game[];
  reverse: boolean;
  seconds: number;
}) {
  // Plain overflow wrapper rather than `.marquee`, so the reduced-motion rule
  // that makes real marquees hand-scrollable doesn't add a scrollbar here.
  return (
    <div className="overflow-hidden">
      <div
        className={`marquee__track ${reverse ? "marquee__track--reverse" : ""}`}
        style={{ ["--marquee-duration" as string]: `${seconds}s` }}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="marquee__group">
            {games.map((game, i) => (
              <img
                key={`${copy}-${game.id}-${i}`}
                src={game.capsule}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-[460/215] w-[260px] flex-none rounded-lg object-cover"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
