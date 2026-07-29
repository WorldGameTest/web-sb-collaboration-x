"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Art } from "./Art";
import { Icon } from "@/lib/icons";
import type { Game } from "@/lib/data";

export type SwipeDirection = "like" | "pass";

/** Horizontal distance (px) past which releasing commits the swipe. */
const COMMIT_THRESHOLD = 110;
/**
 * How much further the card travels as it leaves. It fades out over the same
 * window rather than flying off-screen, which reads a lot calmer than a long
 * throw — the card is invisible well before it would reach the edge.
 */
const EXIT_DISTANCE = 150;
/** Must match the CSS transition below. */
const EXIT_MS = 260;

type Props = {
  games: Game[];
  /** Show the purple Fit score badge (real deck only, not the demo). */
  showFit?: boolean;
  /** Show the undo button. */
  allowUndo?: boolean;
  onSwipe?: (game: Game, direction: SwipeDirection) => void;
  /** Rendered once the deck runs out. */
  emptyState?: React.ReactNode;
};

export function SwipeDeck({
  games,
  showFit = false,
  allowUndo = false,
  onSwipe,
  emptyState,
}: Props) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<SwipeDirection | null>(null);

  const startRef = useRef({ x: 0, y: 0 });
  const pointerRef = useRef<number | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = games[index];
  const next = games[index + 1];
  const done = index >= games.length;

  useEffect(() => {
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, []);

  /** Commit a swipe: animate the card out, then advance. */
  const commit = useCallback(
    (direction: SwipeDirection) => {
      if (!current || exiting) return;
      setDragging(false);
      setExiting(direction);
      onSwipe?.(current, direction);

      exitTimer.current = setTimeout(() => {
        setIndex((i) => i + 1);
        setDrag({ x: 0, y: 0 });
        setExiting(null);
      }, EXIT_MS);
    },
    [current, exiting, onSwipe]
  );

  const undo = useCallback(() => {
    if (exiting || index === 0) return;
    setIndex((i) => i - 1);
    setDrag({ x: 0, y: 0 });
  }, [exiting, index]);

  /* ---- Pointer drag ---- */
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (exiting) return;
    pointerRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || pointerRef.current !== e.pointerId) return;
    setDrag({
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
    });
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerRef.current !== e.pointerId) return;
    pointerRef.current = null;
    setDragging(false);

    if (drag.x > COMMIT_THRESHOLD) commit("like");
    else if (drag.x < -COMMIT_THRESHOLD) commit("pass");
    else setDrag({ x: 0, y: 0 }); // spring back
  }

  /* ---- Keyboard ---- */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") commit("like");
      else if (e.key === "ArrowLeft") commit("pass");
      else if (allowUndo && (e.key === "Backspace" || e.key === "z")) {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, undo, allowUndo]);

  if (done) {
    return (
      <div className="mx-auto mt-9 w-full max-w-[440px]">
        {emptyState ?? (
          <div className="card p-14 text-center">
            <h3 className="mb-2 text-xl tracking-normal">
              That&apos;s the whole deck
            </h3>
            <p className="m-0 text-muted">
              New games enter the pool as we approve them. Check back soon.
            </p>
          </div>
        )}
      </div>
    );
  }

  /* Position of the live card. */
  // The exit continues outward from wherever the drag ended, so the card never
  // jerks backwards before leaving. A button press starts from rest.
  const offsetX = exiting
    ? exiting === "like"
      ? drag.x + EXIT_DISTANCE
      : drag.x - EXIT_DISTANCE
    : drag.x;
  const offsetY = drag.y;
  // Capped so a long drag can't spin the card.
  const rotation = Math.max(-10, Math.min(10, offsetX * 0.05));

  // Stamp opacity ramps up as you approach the commit threshold.
  const likeOpacity = Math.min(Math.max(offsetX / COMMIT_THRESHOLD, 0), 1);
  const passOpacity = Math.min(Math.max(-offsetX / COMMIT_THRESHOLD, 0), 1);

  const progress = (index / games.length) * 100;

  // Buttons live inside the card, so stop drags starting from them.
  const stopDrag = (e: React.PointerEvent) => e.stopPropagation();

  const actions = (
    <div className="mt-6 mb-1 flex items-center justify-center gap-6">
      <button
        type="button"
        className="round-btn h-16 w-16 text-danger hover:bg-danger/12"
        onPointerDown={stopDrag}
        onClick={() => commit("pass")}
        disabled={!!exiting}
        aria-label={`Pass on ${current.name}`}
      >
        <Icon name="x" size={26} />
      </button>

      <button
        type="button"
        className="round-btn h-16 w-16 text-brand hover:bg-brand/12"
        onPointerDown={stopDrag}
        onClick={() => commit("like")}
        disabled={!!exiting}
        aria-label={`Like ${current.name}`}
      >
        <Icon name="heart" size={26} />
      </button>
    </div>
  );

  return (
    // text-left because the parent sections centre their copy.
    <div className="mx-auto mt-9 w-full max-w-[560px] text-left">
      {/* No fixed height — the live card is in flow, so the deck grows with it. */}
      <div className="deck relative">
        {/* Card behind, to hint at the stack */}
        {next && (
          <div
            className="card-surface swipe-card-behind"
            style={{
              // Rises to full size as the top card leaves, so by the time the
              // index advances it's already in place — no pop on swap.
              transform: exiting
                ? "scale(1) translateY(0)"
                : "scale(0.95) translateY(10px)",
              opacity: exiting ? 1 : 0.65,
              transition: `transform ${EXIT_MS}ms cubic-bezier(.22,.61,.36,1), opacity ${EXIT_MS}ms ease-out`,
              pointerEvents: "none",
            }}
            aria-hidden="true"
          >
            <CardFace game={next} showFit={showFit} />
          </div>
        )}

        <div
          className="card-surface relative z-10"
          data-dragging={dragging}
          style={{
            transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg) scale(${
              exiting ? 0.94 : 1
            })`,
            // Fading out is what lets the travel stay short: the card is gone
            // before it would have cleared the frame.
            opacity: exiting ? 0 : 1,
            transition: dragging
              ? "none"
              : `transform ${EXIT_MS}ms cubic-bezier(.22,.61,.36,1), opacity ${EXIT_MS}ms ease-out`,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span
            className="stamp left-5 text-success"
            style={{ opacity: likeOpacity, transform: "rotate(-14deg)" }}
          >
            Like
          </span>
          <span
            className="stamp right-5 text-danger"
            style={{ opacity: passOpacity, transform: "rotate(14deg)" }}
          >
            Nope
          </span>

          <CardFace game={current} showFit={showFit} actions={actions} />
        </div>
      </div>

      <div className="mt-4 h-[3px] overflow-hidden rounded bg-line-soft">
        <div
          className="h-full bg-brand transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Undo, how many are left, and the controls hint */}
      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[14px] text-muted">
        {allowUndo && (
          <>
            <button
              type="button"
              onClick={undo}
              disabled={index === 0 || !!exiting}
              className="flex cursor-pointer items-center gap-1.5 text-purple underline transition-opacity disabled:cursor-not-allowed disabled:text-muted disabled:no-underline disabled:opacity-50"
            >
              <Icon name="undo" size={15} />
              Undo
            </button>
            <span aria-hidden="true">·</span>
          </>
        )}
        <span>
          {games.length - index} game{games.length - index === 1 ? "" : "s"} left
        </span>
        <span aria-hidden="true">·</span>
        <span>drag the card or use ← / →</span>
      </div>

      <p className="sr-only" aria-live="polite">
        Card {index + 1} of {games.length}: {current.name}
      </p>
    </div>
  );
}

/** Rounded outline chip used for the fit / date / price / platform row. */
function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "fit" | "price";
}) {
  const tones = {
    neutral: "border-line text-white",
    fit: "border-success/45 text-success",
    price: "border-brand/55 text-brand",
  };
  return (
    <span
      className={`rounded-full border px-3.5 py-1.5 text-[14px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function CardFace({
  game,
  showFit,
  actions,
}: {
  game: Game;
  showFit: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <>
      <Art name={game.name} src={game.capsule} className="rounded-none" />

      <div className="px-5 pb-5 pt-4 sm:px-6">
        {/* Title + link out to the store page */}
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-[26px] tracking-tight">{game.name}</h3>
          <a
            href={game.steamUrl}
            target="_blank"
            rel="noopener noreferrer"
            // The card swallows drags; let the link handle its own clicks.
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-1 flex flex-none items-center gap-1.5 text-[15px] text-purple hover:underline"
          >
            Steam
            <Icon name="external" size={15} />
          </a>
        </div>

        {/* Review score */}
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[15px]">
          <Icon name="star" size={17} className="flex-none text-brand" />
          <span className="font-semibold">{game.score}</span>
          <span className="text-muted">
            · {game.reviews} reviews ({game.positive} positive)
          </span>
        </p>

        {/* Fit / release / price / platform */}
        <div className="mt-3.5 flex flex-wrap gap-2.5">
          {showFit && <Pill tone="fit">Fit {game.fit}%</Pill>}
          <Pill>{game.releaseDate}</Pill>
          <Pill tone="price">{game.price}</Pill>
          {game.platforms.map((p) => (
            <Pill key={p}>{p}</Pill>
          ))}
        </div>

        {/* Why this scored the way it did */}
        {showFit && (
          <p className="mt-3.5 text-[14.5px] text-muted">
            Shared: {game.fitShared.join(", ")}
            {game.fitNotes.map((n) => ` · ${n}`)}
          </p>
        )}

        {/* Who made it */}
        <p className="mt-3 text-[14.5px] text-muted">
          by <b className="font-semibold text-white">{game.developer}</b>
          {game.publishers.length > 0 && (
            <> · published by {game.publishers.join(", ")}</>
          )}
        </p>

        <p className="mt-3 flex items-center gap-2 text-[14.5px]">
          <Icon name="mail" size={16} className="flex-none text-muted" />
          {game.contactEmail ? (
            <a
              href={`mailto:${game.contactEmail}`}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-purple hover:underline"
            >
              {game.contactEmail}
            </a>
          ) : (
            <span className="text-muted">Contact unlocks when you match</span>
          )}
        </p>

        {/* Steam tags */}
        <div className="mt-4 flex flex-wrap gap-2">
          {game.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-line px-3 py-1 text-[13px] text-muted"
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="clamp-3 mt-4 text-[14.5px] leading-relaxed text-muted">
          {game.description}
        </p>

        {actions}
      </div>
    </>
  );
}
