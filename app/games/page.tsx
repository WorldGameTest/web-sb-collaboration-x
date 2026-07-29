import type { Metadata } from "next";
import Link from "next/link";
import { Art } from "@/components/Art";
import { PUBLISHED, type PublishedGame } from "@/lib/data";
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

/** Renders **bold** spans in the placeholder copy. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
        chunk.startsWith("**") && chunk.endsWith("**") ? (
          <b key={i} className="font-semibold text-white">
            {chunk.slice(2, -2)}
          </b>
        ) : (
          <span key={i}>{chunk}</span>
        )
      )}
    </>
  );
}

export default function GamesPage() {
  const { featured, more } = PUBLISHED;

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

      {/* ---------------- Upcoming release ---------------- */}
      <section className="pb-16">
        <div className="mx-auto w-full max-w-[1180px] px-6">
          {/* Heading follows the featured game — calling a shipped game
              "upcoming" would just be wrong. */}
          <h2 className="mb-9 text-center font-display text-[28px] font-extrabold text-brand">
            {featured.released ? "Latest Release" : "Upcoming Release"}
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
                  featured.released ? "text-brand" : "text-cyan"
                }`}
              >
                {featured.eyebrow}
              </p>
              <h3 className="mb-2.5 text-[clamp(1.6rem,2.6vw,2.3rem)]">
                {featured.name}
              </h3>
              <p className="mb-4 text-[14.5px] text-muted">
                by {featured.studio}
              </p>
              <p className="mb-5 text-muted">
                <RichText text={featured.desc} />
              </p>
              <TagRow tags={featured.tags} />
              <a
                href={featured.url}
                className="btn btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                {featured.cta}
                <Icon name="external" size={15} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- More games ---------------- */}
      <section className="pb-16">
        <div className="mx-auto w-full max-w-[1180px] px-6">
          <h2 className="mb-9 text-center font-display text-[28px] font-extrabold text-purple">
            More Games
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {more.map((game) => (
              <GameCard key={game.name} game={game} />
            ))}
          </div>
        </div>
      </section>

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

function GameCard({ game }: { game: PublishedGame }) {
  return (
    <article className="card flex flex-col overflow-hidden p-0">
      <Art name={game.name} src={game.capsule} className="rounded-none" />

      <div className="flex flex-1 flex-col p-5">
        <p
          className={`mb-2.5 text-[13px] font-bold uppercase tracking-[0.07em] ${
            game.released ? "text-brand" : "text-cyan"
          }`}
        >
          {game.eyebrow}
        </p>
        <h3 className="mb-1.5 text-[19px]">{game.name}</h3>
        <p className="mb-3 text-sm text-muted">by {game.studio}</p>
        <p className="clamp-3 mb-4 text-[14.5px] text-muted">{game.desc}</p>

        {/* Pinned to the bottom so CTAs line up across the grid. */}
        <div className="mt-auto">
          <TagRow tags={game.tags} />
          <a
            href={game.url}
            className="btn btn-primary w-full"
            target="_blank"
            rel="noopener noreferrer"
          >
            {game.cta}
            <Icon name="external" size={15} />
          </a>
        </div>
      </div>
    </article>
  );
}
