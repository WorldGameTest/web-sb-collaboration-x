import { Art } from "@/components/Art";
import { CatalogMarquee } from "@/components/CatalogMarquee";
import { Faq } from "@/components/Faq";
import { FeatureCard } from "@/components/FeatureCard";
import { HeroBackdrop } from "@/components/HeroBackdrop";
import { HowItWorksVideo } from "@/components/HowItWorksVideo";
import { JoinPanel } from "@/components/JoinPanel";
import { SwipeDeck } from "@/components/SwipeDeck";
import { SITE_STATS } from "@/lib/data";
import { getApprovedGames } from "@/lib/sheet";
import { Icon } from "@/lib/icons";

export default async function HomePage() {
  // Everything game-shaped on this page comes from the approved rows in the
  // sheet, so publishing and unpublishing needs no deploy.
  const pool = await getApprovedGames();

  const demoDeck = pool.slice(0, 5);
  const recentMatches: [typeof pool[number], typeof pool[number]][] = [];
  if (pool.length >= 4) {
    recentMatches.push([pool[0], pool[2]], [pool[1], pool[3]]);
  }

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden pb-16 pt-24 text-center">
        <HeroBackdrop games={pool} />

        <div className="relative z-10 mx-auto w-full max-w-[1180px] px-6">
          <span className="mb-6 flex justify-center text-brand">
            <Icon name="handshake" size={40} />
          </span>

          <h1 className="display mb-5">
            Steam Bundle <span className="text-brand">Matchmaking</span>
          </h1>

          <p className="lead mx-auto max-w-[660px]">
            Bundles are the cheapest visibility boost on Steam - if you find the
            right partner. Swipe through curated indie games, match with a
            developer who wants to bundle with you, and ship it together.
          </p>

          <p className="mt-5 text-muted-dim">
            <strong className="font-semibold text-muted">
              Join free — no payment, ever.
            </strong>
          </p>

          {/* Stats. The pool count is real — it's the approved rows in the
              sheet, so it can never claim games that aren't live. */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-9 gap-y-5">
            <Stat value={pool.length} label="games in the pool" />
            <StatDivider />
            <Stat value={SITE_STATS.studiosSwiping} label="studios swiping" />
            <StatDivider />
            <Stat value={SITE_STATS.matchesMade} label="matches made" />
          </div>

          {/* Recent matches — omitted entirely until there are pairs to show,
              rather than leaving a heading over empty space. */}
          {recentMatches.length > 0 && (
            <p className="mt-9 text-base text-muted">Recent matches:</p>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-5">
            {recentMatches.map(([a, b]) => (
              <div
                key={`${a.id}-${b.id}`}
                /*
                 * Fluid, not fixed. Each pair fills the row on a phone and caps
                 * at 520px on wider screens. Fixed capsule widths meant the card
                 * was wider than a 320px viewport could hold.
                 */
                className="card w-full max-w-[520px] p-2.5 sm:p-3.5"
              >
                <div className="relative flex items-center">
                  {/* min-w-0 so the flex children can actually shrink. */}
                  <Art
                    name={a.name}
                    src={a.capsule}
                    eager
                    className="min-w-0 flex-1 rounded-md"
                  />
                  {/* An icon rather than the "×" character: the glyph's ink
                      sits off-centre in its em box, so it never looks centred
                      inside the circle. */}
                  <span className="absolute left-1/2 top-1/2 z-[2] grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-card bg-brand text-on-brand sm:h-9 sm:w-9 sm:border-4">
                    <Icon name="x" size={14} strokeWidth={3.5} />
                  </span>
                  <Art
                    name={b.name}
                    src={b.capsule}
                    eager
                    className="min-w-0 flex-1 rounded-md"
                  />
                </div>
                <p className="mt-2.5 text-center text-[13.5px] text-muted sm:text-[15px]">
                  {a.name} <span className="font-bold text-brand">×</span>{" "}
                  {b.name}
                </p>
              </div>
            ))}
          </div>

          <JoinPanel />
        </div>
      </section>

      {/* ---------------- Catalog ----------------
          Skipped while the pool is empty — a heading over a blank strip reads
          as a broken page, not as "no games yet". */}
      {pool.length > 0 && <CatalogMarquee games={pool} />}

      {/* ---------------- Try the deck ---------------- */}
      <section className="py-16">
        <div className="mx-auto w-full max-w-[1180px] px-6 text-center">
          <h2 className="font-sans text-2xl font-bold tracking-normal">
            Try the deck
          </h2>
          <p className="mt-1 text-muted">
            {pool.length > 0
              ? "Drag the card left or right - exactly like members swipe the real pool."
              : "This is how members swipe the pool."}
          </p>

          <SwipeDeck
            games={demoDeck}
            showFit
            allowUndo
            emptyState={
              <div className="card p-14 text-center">
                <h3 className="mb-2 text-xl tracking-normal">
                  {pool.length > 0
                    ? "That's the demo"
                    : "The pool is filling up"}
                </h3>
                <p className="mb-5 text-muted">
                  {pool.length > 0 ? (
                    <>
                      The real pool has {pool.length} game
                      {pool.length === 1 ? "" : "s"} in it, each scored for how
                      well it&apos;d sell next to yours.
                    </>
                  ) : (
                    <>
                      We&apos;re reviewing the first submissions now. Add your
                      game and you&apos;ll be in the deck as soon as it&apos;s
                      approved.
                    </>
                  )}
                </p>
                <a href="#signin" className="btn btn-primary">
                  {pool.length > 0
                    ? "Join free to keep swiping"
                    : "Add your game"}
                </a>
              </div>
            }
          />
        </div>
      </section>

      {/* ---------------- See how it works ---------------- */}
      <HowItWorksVideo />

      {/* ---------------- Why bundle ---------------- */}
      <section className="py-16">
        <div className="mx-auto w-full max-w-[1180px] px-6">
          <h2 className="section-title mb-11 text-center">
            Why <span className="text-purple">bundle?</span>
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon="trending"
              title="The cheapest visibility on Steam"
              accent="brand"
            >
              A bundle is a store-page presence on someone else&apos;s game -
              permanently. Every visitor to your partner&apos;s page sees your
              game in the &apos;complete the set&apos; box. No ad spend, no
              algorithm luck.
            </FeatureCard>
            <FeatureCard
              icon="users"
              title="Borrow each other's audience"
              accent="brand"
            >
              Your partner&apos;s wishlisters and owners are already buyers of
              games like yours. A bundle puts your game in front of them at the
              exact moment they&apos;re in a buying mood.
            </FeatureCard>
            <FeatureCard
              icon="sparkles"
              title="A launch-beat for free"
              accent="brand"
            >
              A new bundle is news: a reason for a social post, a Discord ping, a
              curator mail - for both studios at once.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how-it-works" className="scroll-mt-24 py-16">
        <div className="mx-auto w-full max-w-[1180px] px-6">
          <h2 className="section-title mb-11 text-center">
            How it <span className="text-cyan">works</span>
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon="shield" title="1. Submit your game">
              Sign in with just your email and paste your Steam store link. Every
              game is verified - instantly if your email matches the game,
              otherwise by a quick manual check. No shovelware, no asset flips.
            </FeatureCard>
            <FeatureCard icon="heart" title="2. Swipe potential partners">
              Browse curated games that could sell next to yours. Like the ones
              you&apos;d bundle with, pass on the rest. Nobody sees your choices.
            </FeatureCard>
            <FeatureCard icon="handshake" title="3. Match with a developer">
              When two developers like each other&apos;s games, it&apos;s a match
              - you both get each other&apos;s contact details instantly.
            </FeatureCard>
            <FeatureCard icon="palette" title="4. Launch the bundle">
              We help matched pairs ship: bundle artwork, store copy and a
              suggested discount, built from both games&apos; assets.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* ---------------- What you get ---------------- */}
      <section className="py-16">
        <div className="mx-auto w-full max-w-[1180px] px-6">
          <h2 className="section-title mb-11 text-center">
            What you get in the <span className="text-brand">Lobby</span>
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon="heart" title="Swipe matchmaking with Fit score">
              A curated deck of games that could sell next to yours, each scored
              for genre, price and audience fit. Like, pass, undo - nobody sees
              your choices until it&apos;s mutual.
            </FeatureCard>
            <FeatureCard icon="message" title="Built-in chat">
              Matched? Talk right in the hub - no hunting for emails. You also
              get the studio&apos;s profile and contact, and can pick up where
              you left off anytime.
            </FeatureCard>
            <FeatureCard icon="package" title="Ready-made bundle kit">
              Every match comes with a generated asset pack in all six Steamworks
              formats, a store-description draft and a suggested discount with
              the reasoning spelled out.
            </FeatureCard>
            <FeatureCard icon="calendar" title="Launch-window planner">
              The kit suggests concrete two-week windows that dodge Next Fests
              and seasonal sales, so your bundle doesn&apos;t drown in
              Steam&apos;s own noise.
            </FeatureCard>
            <FeatureCard icon="chart" title="Your game's pulse">
              See how many developers reviewed your game, how many liked it and
              how your matches are progressing - per game, at a glance.
            </FeatureCard>
            <FeatureCard icon="shield" title="Curated pool, real studios">
              Every game is verified before it enters the deck - by a matching
              developer email or a manual check by our team. No shovelware, no
              asset flips, no bots.
            </FeatureCard>
          </div>

          <p className="mt-10 text-center text-muted">
            All of it built by developers who ship bundles for their own games.
          </p>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="scroll-mt-24 pb-20 pt-16">
        <div className="mx-auto w-full max-w-[1180px] px-6">
          <h2 className="section-title text-center">
            Common <span className="text-brand">questions</span>
          </h2>
          <p className="lead mx-auto mt-4 max-w-[560px] text-center">
            Everything developers ask before adding their first game.
          </p>

          <Faq />

          {/* Closes the page: the FAQ answers most of it, Discord covers the rest. */}
          <div className="mx-auto mt-12 max-w-[720px] rounded-xl border border-purple/25 bg-purple/5 px-6 py-5 text-center">
            <strong className="mb-1.5 block">Still need a hand?</strong>
            <p className="m-0 text-muted">
              We&apos;re building this in the open. Reach out on{" "}
              <a href="#" className="text-white underline">
                Discord
              </a>{" "}
              and we&apos;ll help you out.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

/** Big amber figure with a small uppercase caption beside it. */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <p className="m-0 flex items-baseline gap-3">
      <span className="font-display text-[clamp(2.1rem,4vw,3rem)] font-extrabold leading-none tracking-tight text-brand">
        {value.toLocaleString()}
      </span>
      <span className="text-[13px] font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
    </p>
  );
}

/** Hairline between stats. Hidden once they wrap, where it reads as clutter. */
function StatDivider() {
  return (
    <span aria-hidden="true" className="hidden h-9 w-px bg-line lg:block" />
  );
}
