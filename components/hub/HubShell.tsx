"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Art } from "@/components/Art";
import { SwipeDeck, type SwipeDirection } from "@/components/SwipeDeck";
import { Icon } from "@/lib/icons";
import { clearSession, readSession } from "@/lib/session";
import { SEED_MY_GAMES, type Game, type MyGame } from "@/lib/data";
import { HubSidebar, type HubView } from "./HubSidebar";
import { MyGames } from "./MyGames";
import { Conversation } from "./Conversation";

export function HubShell({ pool }: { pool: Game[] }) {
  /** The match you already have when you arrive — never your own game. */
  const SEED_MATCH = pool[4] ?? pool[0];

  /**
   * Games that like you back, so a match is reachable while clicking around.
   * Picked by position, so it survives the pool changing in the sheet.
   */
  const MUTUAL_LIKES = new Set(
    [1, 6, 9].map((i) => pool[i]?.id).filter(Boolean)
  );

  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [view, setView] = useState<HubView>("overview");
  const [games, setGames] = useState<MyGame[]>(SEED_MY_GAMES);
  const [swipingAs, setSwipingAs] = useState<MyGame>(SEED_MY_GAMES[0]);
  const [matches, setMatches] = useState<Game[]>([SEED_MATCH]);
  const [swiped, setSwiped] = useState(0);
  const [likesGiven, setLikesGiven] = useState(0);
  const [newMatch, setNewMatch] = useState<Game | null>(null);
  const [openChat, setOpenChat] = useState<Game | null>(SEED_MATCH);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  // Gate on the local session.
  useEffect(() => {
    setEmail(readSession()?.email ?? null);
    setReady(true);
  }, []);

  const poolCount = games.filter((g) => g.status === "in_pool").length;

  /** Deck excludes games you've already matched with. */
  const deck = useMemo(
    () => pool.filter((g) => !matches.some((m) => m.id === g.id)),
    [matches, pool]
  );

  const checklist = [
    { label: "Add your game", done: games.length > 0 },
    { label: "Get approved by our team", done: poolCount > 0 },
    { label: "Fill in your studio profile", done: false },
    { label: "Swipe your first games", done: swiped > 0 },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  function handleSwipe(game: Game, direction: SwipeDirection) {
    setSwiped((n) => n + 1);
    if (direction !== "like") return;

    setLikesGiven((n) => n + 1);
    if (MUTUAL_LIKES.has(game.id)) {
      setMatches((m) => (m.some((x) => x.id === game.id) ? m : [...m, game]));
      setNewMatch(game);
    }
  }

  function signOut() {
    clearSession();
    router.push("/");
  }

  function addGame(appId: string) {
    setGames((list) => [
      ...list,
      {
        id: `mine-${appId}`,
        name: `Steam app ${appId}`,
        genres: ["Pending Steam sync"],
        price: "—",
        score: "Pending",
        reviews: "0",
        positive: "—",
        status: "in_review",
        swipes: 0,
        likes: 0,
        matches: 0,
      },
    ]);
  }

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-[1180px] px-6 py-24 text-center text-muted">
        Loading your hub…
      </div>
    );
  }

  if (!email) {
    return (
      <div className="mx-auto w-full max-w-[1180px] px-6 py-24">
        <div className="card mx-auto max-w-[480px] rounded-2xl p-10 text-center">
          <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-purple/12 text-purple">
            <Icon name="userplus" size={26} />
          </span>
          <h1 className="mb-3 text-2xl tracking-normal">
            You&apos;re not signed in
          </h1>
          <p className="mb-6 text-muted">
            The Lobby is where you swipe partners, manage your games and talk to
            your matches. Joining is free.
          </p>
          <Link href="/" className="btn btn-primary">
            Join free or sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="pb-18 pt-7">
      <div className="mx-auto w-full max-w-[1180px] px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
          {/* ---------------- Main column ---------------- */}
          <div className="card rounded-2xl p-5 sm:p-6">
            <div className="mb-6 flex items-center gap-3 border-b border-line-soft pb-5">
              <span className="h-2.5 w-2.5 flex-none rounded-full bg-brand" />
              <div>
                <h1 className="text-[21px] uppercase tracking-normal">
                  Bundly <span className="text-brand">Lobby</span>
                </h1>
                <p className="m-0 text-sm text-muted">{email}</p>
              </div>
            </div>

            {view === "overview" && (
              <>
                {!noticeDismissed && (
                  <div className="mb-5.5 flex flex-wrap items-center gap-4 rounded-xl border border-purple/35 bg-purple/5 px-5 py-4">
                    <span className="grid place-items-center text-purple">
                      <Icon name="mailCheck" size={20} />
                    </span>
                    <p className="m-0 min-w-[220px] flex-1">
                      You&apos;re signed in with a one-time email link. There&apos;s
                      no password to remember - we&apos;ll email you a fresh link
                      whenever you need one.
                    </p>
                    <button
                      type="button"
                      className="btn btn-outline-brand"
                      onClick={() => setNoticeDismissed(true)}
                    >
                      Got it
                    </button>
                  </div>
                )}

                {/* Getting started */}
                <div className="mb-5.5 rounded-xl border border-purple/35 bg-purple/4 p-5">
                  <div className="mb-3.5 flex items-center justify-between">
                    <strong className="text-[16.5px]">Getting started</strong>
                    <span className="text-sm text-muted">
                      {doneCount}/{checklist.length}
                    </span>
                  </div>

                  <div className="mb-5 h-1 overflow-hidden rounded bg-white/8">
                    <div
                      className="h-full bg-purple transition-[width] duration-300"
                      style={{
                        width: `${(doneCount / checklist.length) * 100}%`,
                      }}
                    />
                  </div>

                  <ul className="m-0 grid list-none gap-3.5 p-0 sm:grid-cols-2">
                    {checklist.map((item) => (
                      <li
                        key={item.label}
                        className="flex items-center gap-2.5 text-[14.5px]"
                      >
                        <span
                          className={`grid h-4.5 w-4.5 flex-none place-items-center rounded-full border-[1.5px] ${
                            item.done
                              ? "border-purple bg-purple/12 text-purple"
                              : "border-muted-dim"
                          }`}
                        >
                          {item.done && (
                            <Icon name="check" size={11} strokeWidth={3.5} />
                          )}
                        </span>
                        <span
                          className={
                            item.done ? "text-muted line-through" : undefined
                          }
                        >
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Stats */}
                <div className="mb-6 grid overflow-hidden rounded-xl border border-line sm:grid-cols-2 lg:grid-cols-5">
                  <Stat label="Swipes on your games" value={2} />
                  <Stat label="Devs who checked you out" value={2} />
                  <Stat label="Likes received" value={1} />
                  <Stat label="Matches" value={matches.length} />
                  <Stat label="Games you swiped" value={swiped} last />
                </div>

                {openChat && (
                  <Conversation mine={swipingAs.name} theirs={openChat.name} />
                )}
              </>
            )}

            {view === "games" && (
              <MyGames
                games={games}
                onAdd={addGame}
                onRemove={(id) =>
                  setGames((list) => list.filter((g) => g.id !== id))
                }
                onSwipeAs={(game) => {
                  setSwipingAs(game);
                  setView("swipe");
                }}
              />
            )}

            {view === "swipe" && (
              <div className="text-center">
                <h2 className="font-sans text-2xl font-bold tracking-normal">
                  Swiping as {swipingAs.name}
                </h2>
                <p className="mt-1 text-muted">
                  Like the games you&apos;d bundle with. Nobody sees your choices
                  until it&apos;s mutual.
                </p>

                <SwipeDeck
                  games={deck}
                  showFit
                  allowUndo
                  onSwipe={handleSwipe}
                  emptyState={
                    <div className="rounded-xl border border-dashed border-line px-6 py-14 text-center">
                      <h3 className="mb-2 text-[19px] tracking-normal">
                        You&apos;ve seen everyone
                      </h3>
                      <p className="m-0 text-muted">
                        New games enter the pool as we approve them. We&apos;ll
                        email you when there are fresh cards.
                      </p>
                    </div>
                  }
                />
              </div>
            )}

            {view === "matches" && (
              <ListView
                title="Matches"
                empty="No matches yet. Keep swiping — a match needs both sides to like."
                items={matches}
                action="Open chat"
                onAction={(game) => {
                  setOpenChat(game);
                  setView("overview");
                }}
              />
            )}

            {view === "messages" && (
              <>
                <h2 className="mb-1 font-sans text-2xl font-bold tracking-normal">
                  Messages
                </h2>
                <p className="mb-2 text-muted">
                  Every conversation from a mutual match.
                </p>
                {openChat ? (
                  <Conversation mine={swipingAs.name} theirs={openChat.name} />
                ) : (
                  <Empty text="No conversations yet." />
                )}
              </>
            )}

            {view === "bundles" && (
              <>
                <h2 className="mb-1 font-sans text-2xl font-bold tracking-normal">
                  Open bundles
                </h2>
                <p className="mb-5 text-muted">
                  Bundles you and a partner have started but not shipped.
                </p>
                <Empty text="No open bundles. Start one from a match and it'll show up here with its kit and checklist." />
              </>
            )}

            {view === "profile" && (
              <>
                <h2 className="mb-1 font-sans text-2xl font-bold tracking-normal">
                  Studio profile
                </h2>
                <p className="mb-5 text-muted">
                  This is what a matched developer sees about you.
                </p>

                <div className="space-y-5">
                  <ProfileField label="Studio name" placeholder="Your studio" />
                  <ProfileField label="Contact email" value={email} readOnly />
                  <div>
                    <label
                      htmlFor="about"
                      className="mb-2 block font-semibold"
                    >
                      About
                    </label>
                    <textarea
                      id="about"
                      className="textarea"
                      placeholder="What you make, and what you're looking for in a bundle partner…"
                    />
                  </div>
                  <button type="button" className="btn btn-primary">
                    Save profile
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ---------------- Sidebar ---------------- */}
          <HubSidebar
            email={email}
            view={view}
            onView={setView}
            gameCount={games.length}
            poolCount={poolCount}
            unread={matches.length + likesGiven > 0 ? 2 : 0}
            onSignOut={signOut}
            // Newest approvals sit at the bottom of the sheet.
            newInPool={pool.slice(-8).reverse()}
          />
        </div>
      </div>

      {/* ---------------- Match celebration ---------------- */}
      {newMatch && (
        <div
          className="fixed inset-0 z-100 grid place-items-center bg-black/75 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-title"
          onClick={() => setNewMatch(null)}
        >
          <div
            className="w-full max-w-[460px] rounded-2xl border border-brand bg-card p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="match-title" className="display mb-3 text-[2.2rem]">
              It&apos;s a <span className="text-brand">match!</span>
            </h2>
            <p className="mb-6 text-muted">
              {swipingAs.name} × {newMatch.name}. You both liked each other —
              their contact details are in your matches now.
            </p>

            <div className="mb-6 flex gap-2.5">
              <Art name={swipingAs.name} className="flex-1 rounded-md" />
              <Art name={newMatch.name} className="flex-1 rounded-md" />
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setOpenChat(newMatch);
                  setNewMatch(null);
                  setView("overview");
                }}
              >
                Say hello
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setNewMatch(null)}
              >
                Keep swiping
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Stat({
  label,
  value,
  last,
}: {
  label: string;
  value: number;
  last?: boolean;
}) {
  return (
    <div
      className={`px-5 py-4.5 ${
        last ? "" : "border-b border-line lg:border-b-0 lg:border-r"
      }`}
    >
      <p className="m-0 min-h-9 text-[13.5px] leading-snug text-muted">
        {label}
      </p>
      <p className="m-0 mt-2 font-display text-[32px] font-extrabold leading-none">
        {value}
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-14 text-center text-muted">
      {text}
    </div>
  );
}

function ListView({
  title,
  empty,
  items,
  action,
  onAction,
}: {
  title: string;
  empty: string;
  items: Game[];
  action: string;
  onAction: (game: Game) => void;
}) {
  return (
    <>
      <h2 className="mb-1 font-sans text-2xl font-bold tracking-normal">
        {title}
      </h2>
      <p className="mb-5 text-muted">
        Mutual likes. Both of you said yes, so contact details are unlocked.
      </p>

      {items.length === 0 ? (
        <Empty text={empty} />
      ) : (
        <div className="space-y-3.5">
          {items.map((game) => (
            <div
              key={game.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-line p-4"
            >
              <Art name={game.name} className="w-[150px] flex-none rounded-md" />
              <div className="min-w-0 flex-1">
                <h3 className="text-[18px] tracking-normal">{game.name}</h3>
                <p className="m-0 text-sm text-muted">
                  {game.genres.join(", ")} · {game.price}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onAction(game)}
              >
                {action}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ProfileField({
  label,
  placeholder,
  value,
  readOnly,
}: {
  label: string;
  placeholder?: string;
  value?: string;
  readOnly?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-semibold">
        {label}
      </label>
      <input
        id={id}
        className="input"
        placeholder={placeholder}
        defaultValue={value}
        readOnly={readOnly}
      />
    </div>
  );
}
