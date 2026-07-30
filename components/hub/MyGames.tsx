"use client";

import { useState } from "react";
import { Art } from "@/components/Art";
import { Icon } from "@/lib/icons";
import { parseSteamAppId } from "@/lib/steam";
import type { MyGame } from "@/lib/data";

const STATUS_LABEL: Record<MyGame["status"], string> = {
  in_pool: "In the pool",
  in_review: "In review",
  refused: "Refused",
};

const STATUS_TONE: Record<MyGame["status"], string> = {
  in_pool: "bg-brand/12 text-brand",
  in_review: "bg-muted/14 text-muted",
  refused: "bg-danger/14 text-danger",
};

export function MyGames({
  games,
  onAdd,
  onRemove,
  onSwipeAs,
}: {
  games: MyGame[];
  onAdd: (appId: string) => void;
  onRemove: (id: string) => void;
  onSwipeAs: (game: MyGame) => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const appId = parseSteamAppId(url);
    if (!appId) {
      setError(
        "Paste a Steam store URL (or a bare appid), e.g. https://store.steampowered.com/app/123456/"
      );
      return;
    }
    if (games.length >= 25) {
      setError("You've hit the 25 game limit for one account.");
      return;
    }
    setError(null);
    setUrl("");
    onAdd(appId);
  }

  return (
    <>
      {/* Add another game */}
      <div className="mb-6 rounded-xl border border-line p-6">
        <h3 className="mb-3 flex items-center gap-2.5 text-xl tracking-normal">
          <Icon name="plus" size={22} className="text-purple" />
          Add another game
        </h3>
        <p className="mb-4.5 text-muted">
          Paste a Steam store page URL (or appid) - we pull the name, artwork,
          genres, price and review score straight from Steam. If your account
          email matches the game&apos;s Steam contact, it&apos;s verified
          instantly; otherwise our team reviews it before it enters the pool. Up
          to 25 games per account.
        </p>

        <form onSubmit={add} noValidate className="flex flex-col gap-3 sm:flex-row">
          <input
            className="input flex-1"
            placeholder="https://store.steampowered.com/app/123456/…"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            aria-label="Steam store page URL"
            aria-invalid={!!error}
            inputMode="url"
          />
          <button type="submit" className="btn btn-primary">
            Add game
          </button>
        </form>

        {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      </div>

      {/* Game list */}
      {games.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-14 text-center">
          <h3 className="mb-2 text-[19px] tracking-normal">No games yet</h3>
          <p className="m-0 text-muted">
            Add your first Steam game above to get into the pool.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {games.map((game) => (
            <div
              key={game.id}
              className="flex flex-wrap items-start gap-4.5 rounded-xl border border-line p-4.5"
            >
              <Art
                name={game.name}
                className="w-full flex-none rounded-md sm:w-[190px]"
              />

              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                  <h3 className="text-[19px] tracking-normal">{game.name}</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-bold ${
                      STATUS_TONE[game.status]
                    }`}
                  >
                    {STATUS_LABEL[game.status]}
                  </span>
                </div>

                <p className="m-0 text-[13.5px] uppercase text-muted">
                  {game.genres.join(", ")} · {game.price}
                </p>

                <p className="mt-1.5 flex items-center gap-2 text-sm">
                  <Icon name="star" size={15} className="text-brand" />
                  <span className="font-semibold">{game.score}</span>
                  <span className="text-muted">
                    · {game.reviews} reviews ({game.positive} positive)
                  </span>
                </p>

                <p className="mb-3 mt-2 text-[13.5px] text-muted">
                  <b className="text-white">{game.swipes}</b> swipes by other
                  devs <b className="ml-1 text-white">{game.likes}</b> likes{" "}
                  <b className="ml-1 text-white">{game.matches}</b> matches
                </p>

                <button
                  type="button"
                  className="btn btn-outline-brand"
                  onClick={() => onSwipeAs(game)}
                  disabled={game.status !== "in_pool"}
                >
                  <Icon name="heart" size={16} />
                  Swipe as this game
                </button>
              </div>

              <div className="ml-auto flex gap-1">
                <IconAction label="Copy link" icon="link" />
                <IconAction label="Refresh from Steam" icon="refresh" />
                <IconAction label="Open on Steam" icon="external" />
                {/* Approved games live in the sheet — removing one means
                    setting Status = Hidden there, not deleting it here. */}
                {game.status !== "in_pool" && (
                  <IconAction
                    label={`Remove ${game.name}`}
                    icon="trash"
                    onClick={() => onRemove(game.id)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function IconAction({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: "link" | "refresh" | "external" | "trash";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="cursor-pointer rounded-[7px] p-1.5 text-muted transition-colors hover:bg-card-2 hover:text-white"
    >
      <Icon name={icon} size={18} />
    </button>
  );
}
