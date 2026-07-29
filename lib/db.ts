import "server-only";
import { neon } from "@neondatabase/serverless";

/**
 * Postgres access.
 *
 * Everything that has to be shared between people lives here — users, swipes,
 * matches, messages. The Google Sheet stays the source of truth for *which
 * games exist*; this is the source of truth for *what people did*.
 *
 * The sheet deliberately isn't used for this: Apps Script has daily call
 * quotas, ~seconds of latency, and no row-level locking, so two people
 * chatting would hit conflicts and burn the submissions pipeline's quota.
 */

const url =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.NEON_DATABASE_URL;

/** True when a database is wired up. Features degrade instead of crashing. */
export const dbConfigured = Boolean(url);

const sql = url ? neon(url) : null;

function db() {
  if (!sql) {
    throw new Error(
      "No database configured. Set DATABASE_URL (Vercel -> Storage -> " +
        "Create Database -> Neon) — chat and matching need it."
    );
  }
  return sql;
}

/* -------------------------------------------------------------------------- */
/* Schema                                                                      */
/* -------------------------------------------------------------------------- */

let migrated = false;

/**
 * Creates the tables if they're missing. Cheap enough to call on any request
 * (it's `if not exists`), and it means there's no separate migration step to
 * forget when deploying.
 */
export async function ensureSchema() {
  if (migrated || !sql) return;
  const q = db();

  await q`
    create table if not exists users (
      id          bigserial primary key,
      email       text unique not null,
      studio_name text,
      created_at  timestamptz not null default now()
    )`;

  await q`
    create table if not exists swipes (
      id             bigserial primary key,
      swiper_user_id bigint not null references users(id) on delete cascade,
      swiper_game_id text,
      target_game_id text not null,
      direction      text not null check (direction in ('like','pass')),
      created_at     timestamptz not null default now(),
      unique (swiper_user_id, target_game_id)
    )`;

  await q`
    create table if not exists matches (
      id         bigserial primary key,
      user_a     bigint not null references users(id) on delete cascade,
      user_b     bigint not null references users(id) on delete cascade,
      game_a     text,
      game_b     text,
      created_at timestamptz not null default now(),
      -- user_a is always the lower id, so a pair can only ever match once
      -- regardless of who liked first.
      unique (user_a, user_b)
    )`;

  await q`
    create table if not exists messages (
      id             bigserial primary key,
      match_id       bigint not null references matches(id) on delete cascade,
      sender_user_id bigint not null references users(id) on delete cascade,
      body           text not null,
      created_at     timestamptz not null default now()
    )`;

  await q`create index if not exists messages_match_idx on messages (match_id, id)`;
  await q`create index if not exists swipes_target_idx on swipes (target_game_id, direction)`;

  migrated = true;
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

export type User = { id: number; email: string; studio_name: string | null };

/** Finds or creates the user for an email. Emails are normalised to lowercase. */
export async function upsertUser(email: string): Promise<User> {
  await ensureSchema();
  const clean = email.trim().toLowerCase();

  const rows = (await db()`
    insert into users (email) values (${clean})
    on conflict (email) do update set email = excluded.email
    returning id, email, studio_name
  `) as User[];

  return rows[0];
}

export async function findUserByEmail(email: string): Promise<User | null> {
  await ensureSchema();
  const rows = (await db()`
    select id, email, studio_name from users
    where email = ${email.trim().toLowerCase()}
  `) as User[];
  return rows[0] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Swipes and matches                                                          */
/* -------------------------------------------------------------------------- */

export type MatchRow = {
  id: number;
  other_user_id: number;
  other_email: string;
  my_game_id: string | null;
  their_game_id: string | null;
  created_at: string;
};

/**
 * Records a swipe and reports whether it completed a match.
 *
 * A match needs both directions: I liked a game they own, and they liked a game
 * I own. `ownerOf` maps a game id to its owner's user id — resolved by the
 * caller from the sheet, since game ownership lives there.
 */
export async function recordSwipe(args: {
  userId: number;
  myGameId?: string;
  targetGameId: string;
  direction: "like" | "pass";
  /** user id that owns targetGameId, if known */
  targetOwnerId?: number;
  /** game ids the swiper owns, so we can check the reverse like */
  myGameIds: string[];
}): Promise<{ matched: boolean; matchId?: number }> {
  await ensureSchema();
  const q = db();

  await q`
    insert into swipes (swiper_user_id, swiper_game_id, target_game_id, direction)
    values (${args.userId}, ${args.myGameId ?? null}, ${args.targetGameId}, ${args.direction})
    on conflict (swiper_user_id, target_game_id)
      do update set direction = excluded.direction, created_at = now()
  `;

  if (args.direction !== "like" || !args.targetOwnerId) return { matched: false };
  if (args.targetOwnerId === args.userId) return { matched: false }; // own game
  if (args.myGameIds.length === 0) return { matched: false };

  // Did they already like one of mine?
  const reverse = (await q`
    select target_game_id from swipes
    where swiper_user_id = ${args.targetOwnerId}
      and direction = 'like'
      and target_game_id = any(${args.myGameIds})
    limit 1
  `) as { target_game_id: string }[];

  if (reverse.length === 0) return { matched: false };

  // Order the pair so (a,b) and (b,a) can't both exist.
  const [lo, hi] =
    args.userId < args.targetOwnerId
      ? [args.userId, args.targetOwnerId]
      : [args.targetOwnerId, args.userId];

  const [gameLo, gameHi] =
    args.userId < args.targetOwnerId
      ? [args.myGameId ?? null, args.targetGameId]
      : [args.targetGameId, args.myGameId ?? null];

  const rows = (await q`
    insert into matches (user_a, user_b, game_a, game_b)
    values (${lo}, ${hi}, ${gameLo}, ${gameHi})
    on conflict (user_a, user_b) do update set user_a = excluded.user_a
    returning id
  `) as { id: number }[];

  return { matched: true, matchId: rows[0]?.id };
}

/** Every match this user is part of, newest first. */
export async function listMatches(userId: number): Promise<MatchRow[]> {
  await ensureSchema();
  return (await db()`
    select
      m.id,
      case when m.user_a = ${userId} then m.user_b else m.user_a end as other_user_id,
      u.email as other_email,
      case when m.user_a = ${userId} then m.game_a else m.game_b end as my_game_id,
      case when m.user_a = ${userId} then m.game_b else m.game_a end as their_game_id,
      m.created_at
    from matches m
    join users u
      on u.id = case when m.user_a = ${userId} then m.user_b else m.user_a end
    where m.user_a = ${userId} or m.user_b = ${userId}
    order by m.created_at desc
  `) as MatchRow[];
}

/** Game ids this user has already swiped, so the deck doesn't repeat them. */
export async function listSwipedGameIds(userId: number): Promise<string[]> {
  await ensureSchema();
  const rows = (await db()`
    select target_game_id from swipes where swiper_user_id = ${userId}
  `) as { target_game_id: string }[];
  return rows.map((r) => r.target_game_id);
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                    */
/* -------------------------------------------------------------------------- */

export type MessageRow = {
  id: number;
  sender_user_id: number;
  body: string;
  created_at: string;
};

/** Confirms the user is actually in this match before any read or write. */
export async function userInMatch(userId: number, matchId: number) {
  await ensureSchema();
  const rows = (await db()`
    select 1 from matches
    where id = ${matchId} and (user_a = ${userId} or user_b = ${userId})
  `) as unknown[];
  return rows.length > 0;
}

/** `afterId` lets the client poll for only what it hasn't seen. */
export async function listMessages(
  matchId: number,
  afterId = 0
): Promise<MessageRow[]> {
  await ensureSchema();
  return (await db()`
    select id, sender_user_id, body, created_at
    from messages
    where match_id = ${matchId} and id > ${afterId}
    order by id asc
    limit 500
  `) as MessageRow[];
}

export async function insertMessage(args: {
  matchId: number;
  senderUserId: number;
  body: string;
}): Promise<MessageRow> {
  await ensureSchema();
  const rows = (await db()`
    insert into messages (match_id, sender_user_id, body)
    values (${args.matchId}, ${args.senderUserId}, ${args.body})
    returning id, sender_user_id, body, created_at
  `) as MessageRow[];
  return rows[0];
}
