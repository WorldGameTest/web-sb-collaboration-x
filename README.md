# Bundly

Free Steam bundle matchmaking for indie developers. Developers add their Steam
game, get it approved, then swipe other developers' games to find a bundle
partner. Mutual likes become a match.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build && npm start   # production
```

## Pages

| Route | What it is |
|---|---|
| `/` | Landing + Dev Hub pitch: hero, live stats, recent matches, join panel, playable swipe demo, why-bundle, how-it-works, feature grid |
| `/games` | Games we publish ourselves — featured upcoming release + grid |
| `/submit` | Submit Your Game form → Google Sheet |
| `/hub` | Signed-in dashboard: overview, swipe deck, matches, messages, my games, profile |
| `/auth/verify` | Lands here from the emailed link — burns the token, starts the session |
| `/api/submit` | POST handler: validates, enriches from Steam, appends to the Sheet |
| `/api/auth/request-link` | Issues a one-time sign-in link |
| `/api/auth/verify` | Validates and burns a token |

## Layout

```
app/
  page.tsx                 landing
  games/ submit/ hub/      pages
  api/submit/route.ts      submission handler
  globals.css              design tokens + component classes
components/
  Header  Footer  Art  FeatureCard
  SwipeDeck.tsx            drag physics, keyboard, undo, stamps
  JoinPanel.tsx  SubmitForm.tsx
  hub/                     HubShell, HubSidebar, MyGames, Conversation
lib/
  data.ts                  placeholder games + types
  icons.tsx                inline SVG set (no icon package)
  steam.ts                 shared validation (client + server)
  session.ts               localStorage stand-in for auth
google-sheets/             Apps Script + setup guide
```

## Design system

Tokens live in `app/globals.css` under `@theme`, so they're available as
Tailwind utilities (`bg-card`, `text-brand`, `border-line`, …).

- Background `#0a0a0a`, cards `#111113`, borders `#232326`
- Orange `#f5a623` (primary), purple `#a855f7`, cyan `#22d3ee`
- Display font Archivo 800, body Rubik — self-hosted via `next/font`

Repeated patterns (`.btn`, `.card`, `.input`, `.swipe-card`, `.art`) are
`@layer components` classes; everything else is utilities.

## The swipe deck

`components/SwipeDeck.tsx` is the core interaction, used by both the public
demo and the real hub deck.

- Pointer drag with rotation, LIKE/NOPE stamps that fade in with distance,
  spring-back below a 110px threshold, fly-out above it
- Keyboard: `←` pass, `→` like, `z`/`Backspace` undo
- Props: `showFit` (Fit-score badge), `allowUndo`, `onSwipe`, `emptyState`

## Sign-in (passwordless)

There are no passwords anywhere. Both joining and signing in do the same thing:
you enter your email, we email you a one-time link, clicking it signs you in.

1. `POST /api/auth/request-link` — validates the address, mints a 32-byte
   token, stores it for 15 minutes, emails the link. Requesting a new link
   invalidates any previous one for that address.
2. You click `/auth/verify?token=…`.
3. `POST /api/auth/verify` — constant-time lookup, burns the token (single
   use), returns the email. The client starts a session and lands on `/hub`.

The response is identical whether or not the address has an account — telling
an anonymous caller which emails are registered would leak your user list.

**No email provider is wired up yet.** Until `EMAIL_FROM` is set, the link is
logged to the server console and returned in the API response, and the UI shows
an "Open the sign-in link" button so you can click through locally. That
shortcut is disabled automatically when `NODE_ENV=production`. Drop your
provider into the `TODO` in `app/api/auth/request-link/route.ts`.

**Tokens are stored in a `Map`** (`lib/authTokens.ts`) — they vanish on restart
and don't exist on other instances, so this breaks the moment you run more than
one process. Move it to a table (`email`, `token_hash`, `expires_at`,
`used_at`) or Redis before launch; that file is the only thing that changes.

## The "See how it works" video

Configure it in one place — `HOW_IT_WORKS_VIDEO` in `lib/data.ts`. Set **one**
of `youtubeId` or `src`. With neither set, the section shows a placeholder.

**Use YouTube for a narrated walkthrough.** Free bandwidth, adaptive quality on
bad connections, works on every device, and you get watch-time analytics.

```ts
export const HOW_IT_WORKS_VIDEO = { youtubeId: "dQw4w9WgXcQ" };
```

The embed is a facade: the page shows the thumbnail and only inserts the iframe
when someone clicks play. A YouTube iframe costs 500KB+ of script and sets
cookies on load — paying that on every visit, for a video most people never
play, is not worth it. It also uses `youtube-nocookie.com`.

**Self-host only a short, silent, looping clip** (under ~30s, a screen capture
of the swipe deck). No third-party branding, no cookies, and it feels native.

```ts
export const HOW_IT_WORKS_VIDEO = {
  src: "/how-it-works.mp4",
  poster: "/how-it-works.jpg",
};
```

Put both files in `public/`. Encode H.264 MP4, ~1280x720, and keep it under a
few MB — you pay this bandwidth on every load, and there's no adaptive quality,
so one big file punishes anyone on mobile data.

**Do not use Google Drive.** It isn't a video host: the embed player is
unreliable, throttles once a file gets popular ("download quota exceeded"),
has no adaptive streaming, shows Drive's own UI, and breaks the moment sharing
permissions change. It will fail exactly when the page starts getting traffic.

Vimeo is a reasonable paid alternative if you want no branding and no
recommended-videos bar; it drops into the same `youtubeId` slot with a small
change to the embed URL.

## Content pipeline (the Sheet is the database)

A Google Sheet decides what's on the site. Set a row's **Status** and the site
follows — no deploy, no code change.

```
/submit ──► sheet row (In Process) ──► invitation email
                    │
             you set Status
                    │
   Approved ──► live on site + approval email
   Rejected ──► removed + rejection email (with your notes)
   Hidden   ──► removed, no email
```

Full setup, review workflow and troubleshooting:
[`google-sheets/README.md`](./google-sheets/README.md).

**How "instant" works.** `getApprovedGames()` in `lib/sheet.ts` caches the sheet
read under a tag. The sheet's `onEdit` trigger POSTs to `/api/sheet-hook` the
moment a Status cell changes; that route expires the tag *and then re-reads the
sheet itself*. That second step matters: `revalidateTag` alone only marks the
entry stale, so the next visitor would still be served the old list once while
it refreshed behind them — meaning a rejected game stays up for one more
request. Pulling the fresh list inside the webhook makes that this request's
cost instead of a user's. A 60s timer is the fallback if the trigger fails.

**Contact details never ship.** The sheet's Steam Key and Email columns are
excluded from the endpoint the website reads.

**No sheet configured?** The site falls back to the bundled Steam fixtures in
`lib/games.generated.ts` so development isn't blocked. Submissions are logged
to the console rather than saved — set the env vars before taking real ones.

## Email

Resend over HTTP, so there's no SDK to keep updated. Templates are plain
functions in `lib/email/templates.ts` returning `{ subject, html, text }`.

| Template | Trigger |
|---|---|
| `invitationEmail` | On submission — welcome + invite into the Lobby |
| `approvedEmail` | Status → Approved |
| `rejectedEmail` | Status → Rejected, includes Reviewer Notes |
| `announcementEmail` | `POST /api/announce` (guarded by `ADMIN_SECRET`) |

Sending requires a domain you own — a personal Gmail can't be authenticated
with SPF/DKIM and will land in spam. See the
[email section](./google-sheets/README.md#email) for the DNS setup.

Until `RESEND_API_KEY` and `EMAIL_FROM` are set, nothing is sent; the subject
and recipient are logged instead.

## What's real vs. stubbed

Real:

- Every page, responsive, keyboard-accessible
- Swipe interaction, match detection, match celebration
- Submit form validation (client + server), Steam metadata lookup by appid,
  Google Sheets append
- Passwordless sign-in: token issue, expiry, single-use, re-request
  invalidation, verify page

Stubbed — needs a database and real auth:

- **Email delivery.** Links are generated and validated for real, but nothing
  sends them yet. Set `EMAIL_FROM` and fill in the provider call.
- **Token storage.** In-memory `Map`; see the sign-in section above.
- **The session itself.** `lib/session.ts` writes the verified email to
  `localStorage` rather than setting an httpOnly cookie, so anyone can forge
  one from devtools. Not a security boundary.
- **Game/swipe/match data.** `lib/data.ts` is placeholder content; swipes and
  matches live in component state and reset on reload.
- **Cover art.** `components/Art.tsx` renders a deterministic gradient. Swap for
  `https://cdn.akamai.steamstatic.com/steam/apps/<appid>/header.jpg`.
- **Approvals.** Flipping Status to `Approved` in the Sheet doesn't yet put the
  game in the pool — there's no store to sync into.

## Notes

`npm audit` reports advisories in `next`, `postcss` and `sharp` transitives.
These are the current versions shipped by `create-next-app`; `npm audit fix
--force` would downgrade Next.js, so they're left as-is.
