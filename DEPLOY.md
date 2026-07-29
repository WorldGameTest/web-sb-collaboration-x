# Deploying Bundly to Vercel

Target: **bundly.online**, as a **new, separate project** under the
`dev-team-hidden-part07` team — it does not touch the project already there.

Your generated secrets are already in `.env.local` (gitignored). Use those same
values everywhere below so every side agrees.

---

## 1. Create the project

From this directory:

```bash
npx vercel login          # opens your browser
npx vercel link --scope dev-team-hidden-part07
```

When `link` asks:

| Prompt | Answer |
|---|---|
| Set up "…/swipegames"? | **Y** |
| Which scope? | **dev-team-hidden-part07** |
| Link to existing project? | **N** ← important, this is what keeps it separate |
| What's your project's name? | **bundly** |
| In which directory is your code? | **./** |

That creates a brand-new project called `bundly`. Your existing project is
untouched — they only share the team.

## 2. Add environment variables

```bash
# Paste each value when prompted; repeat for preview if you want previews to work.
npx vercel env add AUTH_SECRET production
npx vercel env add SHEETS_SECRET production
npx vercel env add ADMIN_SECRET production
npx vercel env add SHEETS_WEBHOOK_URL production
npx vercel env add RESEND_API_KEY production
npx vercel env add EMAIL_FROM production        # Bundly <hello@bundly.online>
npx vercel env add EMAIL_REPLY_TO production    # hello@bundly.online
npx vercel env add SITE_URL production          # https://bundly.online
```

Or paste them in the dashboard: **Project → Settings → Environment Variables**.

`AUTH_SECRET`, `SHEETS_SECRET` and `ADMIN_SECRET` are in your `.env.local`.
`SITE_URL` must be `https://bundly.online` in production — emails build their
links from it.

## 3. Deploy

```bash
npx vercel --prod
```

## 4. Point bundly.online at it

```bash
npx vercel domains add bundly.online
```

Then at your registrar, set the DNS records Vercel shows you — usually:

| Type | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

Vercel issues the TLS certificate automatically once DNS resolves (minutes to
an hour). Confirm with **Project → Settings → Domains**.

## 5. Connect the Sheet

In `google-sheets/Code.gs`, set:

```js
const SHARED_SECRET = '…';                  // the SHEETS_SECRET from .env.local
const SITE_URL = 'https://bundly.online';   // no trailing slash
```

Then run `initialiseSheet`, `installTriggers`, deploy the web app, and put its
URL into `SHEETS_WEBHOOK_URL` in Vercel. Full walkthrough:
[`google-sheets/README.md`](./google-sheets/README.md).

Re-deploy the site after changing env vars — Vercel only picks them up on a new
build (`npx vercel --prod`).

## 6. Verify email

Resend → **Domains → Add Domain → bundly.online**, add the SPF/DKIM/DMARC
records at your registrar, wait for green, then set `RESEND_API_KEY`.

---

## What will and won't work on first deploy

**Works immediately:** every page, the swipe deck, the catalog, `/games` with
your three titles, and the FAQ.

**Works once `SHEETS_WEBHOOK_URL` is set:** submissions land in the sheet, and
Approved/Rejected/Hidden control the site live.

**Works once Resend is verified:** all four emails. Until then nothing sends —
subjects are logged to the Vercel function logs instead.

> **Sign-in needs both `AUTH_SECRET` and Resend.** In production the dev
> shortcut that shows the link on screen is disabled, so without a working
> email provider a developer requests a link and never receives one. Set
> Resend up before telling anyone the site is live.

## Known limits to fix later

- **Sign-in links are not single-use.** Tokens are stateless (signed, 15-minute
  expiry) because serverless has no shared memory — the instance that issues a
  link is rarely the one that verifies it. A link therefore works until it
  expires rather than exactly once. Add Upstash Redis and record consumed token
  ids in `lib/authTokens.ts` to close that; nothing else changes.
- **The session is `localStorage`, not a cookie.** `lib/session.ts` trusts the
  browser, so it can be forged from devtools. Fine for a private beta, not for
  anything with real accounts behind it.
- **Swipes and matches are component state.** They reset on reload. The swipe
  pool is real (from the sheet); who liked whom is not yet stored anywhere.
