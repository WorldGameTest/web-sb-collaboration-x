"use client";

import { Icon, type IconName } from "@/lib/icons";
import type { Game } from "@/lib/data";

export type HubView =
  | "overview"
  | "swipe"
  | "matches"
  | "bundles"
  | "messages"
  | "games"
  | "profile";

const PRIMARY: { view: HubView; label: string; icon: IconName }[] = [
  { view: "swipe", label: "Swipe", icon: "heart" },
  { view: "matches", label: "Matches", icon: "handshake" },
  { view: "bundles", label: "Open bundles", icon: "megaphone" },
  { view: "messages", label: "Messages", icon: "message" },
  { view: "games", label: "My Games", icon: "gamepad" },
  { view: "profile", label: "Profile", icon: "user" },
];

const SECONDARY: { label: string; icon: IconName }[] = [
  { label: "How it works", icon: "help" },
  { label: "How to make a bundle on Steam", icon: "video" },
  { label: "Visual guide", icon: "image" },
];

export function HubSidebar({
  email,
  view,
  onView,
  gameCount,
  poolCount,
  unread,
  onSignOut,
  newInPool,
}: {
  email: string;
  view: HubView;
  onView: (view: HubView) => void;
  gameCount: number;
  poolCount: number;
  unread: number;
  onSignOut: () => void;
  /** Most recently approved games, newest first. */
  newInPool: Game[];
}) {
  return (
    <div className="grid gap-4.5 lg:sticky lg:top-24">
      <div className="card rounded-2xl p-4.5">
        {/* Signed-in user */}
        <div className="mb-3 flex items-start gap-3 border-b border-line-soft pb-4">
          <div className="min-w-0 flex-1">
            <b className="block truncate text-[15px]">{email}</b>
            <span className="text-[13.5px] text-muted">
              {gameCount} {gameCount === 1 ? "game" : "games"} · {poolCount} in
              the pool
            </span>
          </div>
          <button
            type="button"
            className="relative cursor-pointer p-1 text-muted transition-colors hover:text-white"
            aria-label={`Notifications: ${unread} unread`}
          >
            <Icon name="bell" size={20} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-brand px-1 text-[11px] font-extrabold text-on-brand">
                {unread}
              </span>
            )}
          </button>
        </div>

        {/* Primary nav */}
        <ul className="m-0 list-none space-y-0.5 p-0">
          {PRIMARY.map((item) => {
            const active = view === item.view;
            return (
              <li key={item.view}>
                <button
                  type="button"
                  onClick={() => onView(item.view)}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-[14.5px] transition-colors ${
                    active
                      ? "bg-purple/12 font-semibold text-white"
                      : "text-muted hover:bg-card-2 hover:text-white"
                  }`}
                >
                  <Icon
                    name={item.icon}
                    size={18}
                    className={active ? "text-purple" : undefined}
                  />
                  {item.label}
                  {item.view === "games" && (
                    <span className="ml-auto text-muted">({gameCount})</span>
                  )}
                  {item.view === "messages" && unread > 0 && (
                    <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11.5px] font-extrabold text-on-brand">
                      {unread}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="my-3 h-px bg-line-soft" />

        {/* Secondary nav */}
        <ul className="m-0 list-none space-y-0.5 p-0">
          {SECONDARY.map((item) => (
            <li key={item.label}>
              <a
                href="#"
                className="flex w-full items-center gap-3 rounded-[9px] px-3 py-2.5 text-[14.5px] text-muted transition-colors hover:bg-card-2 hover:text-white"
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </a>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full cursor-pointer items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-[14.5px] text-muted transition-colors hover:bg-card-2 hover:text-white"
            >
              <Icon name="logout" size={18} />
              Sign out
            </button>
          </li>
        </ul>
      </div>

      {/* Newly approved games */}
      <div className="card rounded-2xl p-4.5">
        <div className="mb-1.5 flex items-center gap-2.5">
          <Icon name="sparkles" size={18} className="text-brand" />
          <b className="text-[15.5px]">New in the pool</b>
          <span className="ml-auto text-[13px] text-muted">
            {newInPool.length} recent
          </span>
        </div>
        <p className="mb-3.5 text-[13px] text-muted">
          Games we&apos;ve just approved into the deck.
        </p>

        <ul className="thin-scroll m-0 grid max-h-[280px] list-none gap-1 overflow-y-auto p-0">
          {newInPool.map((game) => (
            <li key={game.id}>
              <button
                type="button"
                onClick={() => onView("swipe")}
                className="flex w-full cursor-pointer items-center gap-3 rounded-[9px] px-2 py-2 text-left transition-colors hover:bg-card-2"
              >
                <img
                  src={game.capsule}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="aspect-[460/215] w-[54px] flex-none rounded object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">
                    {game.name}
                  </span>
                  <span className="block truncate text-[12px] text-muted-dim">
                    {game.genres.slice(0, 2).join(", ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => onView("swipe")}
          className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border border-line py-2 text-[13.5px] text-muted transition-colors hover:border-brand/50 hover:text-brand"
        >
          Swipe the pool
          <Icon name="arrowRight" size={15} />
        </button>
      </div>
    </div>
  );
}
