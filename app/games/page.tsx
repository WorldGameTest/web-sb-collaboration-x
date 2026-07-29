import type { Metadata } from "next";
import Link from "next/link";
import { Art } from "@/components/Art";
import { getShowcase } from "@/lib/sheet";
import type { Game } from "@/lib/data";
import { Icon } from "@/lib/icons";

export const metadata: Metadata = {
  title: "Our Games — Bundly",
  description:
    "Indie games we believe in. Published with passion, marketed like mad.",
};

const TAG_TONES = [
  "bg-purple/12 text-purple",
  "bg-cyan/10 text-cyan",
  "bg-brand/12 text-brand",
];

/** "Coming soon" / "2026" all mean unreleased; a real date means it's out. */
function isReleased(game: Game) {
  const d = game.releaseDate.trim();
  if (!d || /coming|tba|soon/i.test(d)) return false;
  const parsed = Date.parse(d);
  return Number.isNaN(parsed) ? false : parsed <= Date.now();
}

function eyebrowFor(game: Game) {
  return isReleased(game)
    ? "Available now on Steam"
    : `Coming ${game.releaseDate}`;
}

function ctaFor(game: Game) {
  return isReleased(game) ? "Buy on Steam" : "Wishlist on Steam";
}

export default async function GamesPage() {
  // Straight from the sheet: Status = Approved and Ours = Yes.
  const { featured, more } = await getShowcase();

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="pb-12 pt-24 text-center">
        <div className="mx-auto w-full max-w-[1180px] px-6">
          <span className="mb-6 flex justify-center text-brand">
            <Icon name="gamepad" size={40} />
          </span>
          <h1 className="display mb-5">
            Our <span className="text-brand">Games</span>
          </h1>
          <p className="lead mx-auto max-w-[660px]">
            Indie games we believe in. Published with passion, marketed like mad.
          </p>
        </div>
      </section>

      {/* ---------------- Featured ---------------- */}
      {featured && (
        <section className="pb-16">
          <div className="mx-auto w-full max-w-[1180px] px-6">
            {/* Heading follows the game — calling a shipped game "upcoming"
                would just be wrong. */}
            <h2 className="mb-9 text-center font-display text-[28px] font-extrabold text-brand">
              {isReleased(featured) ? "Latest Release" : "Upcoming Release"}
            </h2>

            <div className="grid items-center overflow-hidden rounded-2xl border border-cyan/28 bg-card md:grid-cols-2">
              {/* Natural capsule ratio — stretching it to fill a taller column
                  crops the artwork's title right off. */}
              <Art
                name={featured.name}
                src={featured.capsule}
                eager
                className="self-center rounded-none"
              />
              <div className="self-center p-8 md:p-10">
                <p
                  className={`mb-2.5 text-[13px] font-bold uppercase tracking-[0.07em] ${
                    isReleased(featured) ? "text-brand" : "text-cyan"
                  }`}
                >
                  {eyebrowFor(featured)}
                </p>
                <h3 className="mb-2.5 text-[clamp(1.6rem,2.6vw,2.3rem)]">
                  {featured.name}
                </h3>
                <p className="mb-4 text-[14.5px] text-muted">
                  by {featured.developer}
                </p>
                <p className="mb-5 text-muted">{featured.description}</p>
                <TagRow tags={featured.genres} />
                <a
                  href={featured.steamUrl}
                  className="btn btn-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ctaFor(featured)}
                  <Icon name="external" size={15} />
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- The rest ---------------- */}
      {more.length > 0 && (
        <section className="pb-16">
          <div className="mx-auto w-full max-w-[1180px] px-6">
            <h2 className="mb-9 text-center font-display text-[28px] font-extrabold text-purple">
              More Games
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {more.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Nothing marked "Ours" in the sheet yet. */}
      {!featured && (
        <section className="pb-16">
          <div className="mx-auto w-full max-w-[1180px] px-6">
            <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
              <h2 className="mb-3 font-sans text-xl font-bold tracking-normal">
                Nothing published here yet
              </h2>
              <p className="m-0 text-muted">
                Titles appear once a row is marked <strong>Approved</strong> and{" "}
                <strong>Ours</strong> in the submissions sheet.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- CTA ---------------- */}
      <section className="pb-20">
        <div className="mx-auto w-full max-w-[1180px] px-6">
          <div className="h-px bg-line-soft" />

          <div className="pt-16 text-center">
            <h2 className="mb-4 font-sans text-[clamp(1.5rem,2.4vw,2rem)] font-bold tracking-normal text-muted">
              Want Your Game Here?
            </h2>
            <p className="mx-auto mb-7 max-w-[520px] text-muted">
              We&apos;re always looking for the next great indie game to publish.
              Think your game could be next?
            </p>
            <Link href="/submit" className="btn btn-ghost btn-lg">
              Submit Your Game
            </Link>

            <div className="mt-14">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 text-muted transition-colors hover:text-white"
              >
                <Icon name="arrowLeft" size={18} />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function TagRow({ tags }: { tags: string[] }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {tags.map((tag, i) => (
        <span
          key={tag}
          className={`rounded-full px-3 py-1 text-[12.5px] font-semibold ${
            TAG_TONES[i % TAG_TONES.length]
          }`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const released = isReleased(game);

  return (
    <article className="card flex flex-col overflow-hidden p-0">
      <Art name={game.name} src={game.capsule} className="rounded-none" />

      <div className="flex flex-1 flex-col p-5">
        <p
          className={`mb-2.5 text-[13px] font-bold uppercase tracking-[0.07em] ${
            released ? "text-brand" : "text-cyan"
          }`}
        >
          {eyebrowFor(game)}
        </p>
        <h3 className="mb-1.5 text-[19px]">{game.name}</h3>
        <p className="mb-3 text-sm text-muted">by {game.developer}</p>
        <p className="clamp-3 mb-4 text-[14.5px] text-muted">
          {game.description}
        </p>

        {/* Pinned to the bottom so CTAs line up across the grid. */}
        <div className="mt-auto">
          <TagRow tags={game.genres} />
          <a
            href={game.steamUrl}
            className="btn btn-primary w-full"
            target="_blank"
            rel="noopener noreferrer"
          >
            {ctaFor(game)}
            <Icon name="external" size={15} />
          </a>
        </div>
      </div>
    </article>
  );
}
