# The submissions pipeline

One Google Sheet is the content database. A developer submits a game, it lands
as a row, you set **Status**, and the website updates itself. Nothing is
deployed to publish or unpublish a game.

```
  Developer submits          Sheet row appended         Invitation email
  /submit  ───────────────►  Status = In Process  ────► sent to developer
                                     │
                            you set Status in the sheet
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
          Approved               Rejected                Hidden
    game appears on site    removed + email          removed, silent
    + approval email
```

The trigger fires the moment you change the cell, so the site reflects it on
the next page load. If the trigger ever fails, the site re-reads the sheet
every 60 seconds anyway — the webhook makes it instant, it isn't load-bearing.

## Why Google Sheets and not an .xlsx file

You asked for Excel. A raw `.xlsx` sitting in a folder can't notify anything
when you edit a cell, so "instantly appears on the website" isn't possible with
one — you'd be back to manual publishing.

Google Sheets is the same grid with automation attached: it runs Apps Script on
edit, which is what makes this real time. It also opens in Excel
(**File → Download → Microsoft Excel**) if you want a copy, and Excel files can
be imported into it.

If you must stay in Microsoft's world, the equivalent is Excel on SharePoint
with a Power Automate flow calling the same `/api/sheet-hook` endpoint. The
website side needs no changes.

## Setup

### 1. Create the sheet

1. New Google Sheet — name it **Bundly Submissions**.
2. **Extensions → Apps Script**, delete the placeholder, paste in
   [`Code.gs`](./Code.gs).
3. At the top of the file set:
   - `SHARED_SECRET` — a long random string (generate one:
     `openssl rand -base64 32`)
   - `SITE_URL` — your deployed site, no trailing slash
4. Run **`initialiseSheet`** once. Approve the permission prompt. This builds
   the header row, freezes Timestamp + Status, sets column widths, adds zebra
   striping, and installs the Status dropdown with colour coding.
5. Run **`installTriggers`** once. This is what makes edits reach the website.
   It's safe to re-run — it clears its own old triggers first, so you never end
   up firing the hook twice per edit.

### 2. Deploy the web app

1. **Deploy → New deployment → Web app**
2. *Execute as*: **Me**
3. *Who has access*: **Anyone**
4. Copy the **Web app URL**.

"Anyone" sounds alarming but is required — Apps Script has no other way to
accept a server-to-server call. `SHARED_SECRET` is the actual protection, and
both `doGet` and `doPost` reject anything without it.

> **Re-deploy after every code change.** Apps Script serves the last deployed
> version, not the editor's. Use **Deploy → Manage deployments → Edit → New
> version**, or your edits silently won't take effect.

### 3. Point the website at it

In `.env.local`:

```bash
SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/AKfy…/exec
SHEETS_SECRET=the-same-long-random-string
SITE_URL=https://yourdomain.com
```

Restart the dev server. Run **`testSiteConnection`** from the Apps Script editor
and check the execution log — you want a `200`.

## Day-to-day: reviewing submissions

Open the sheet. Every new submission is a row with **Status = In Process**.

| Set Status to | What happens |
|---|---|
| **Approved** | Game appears in the swipe pool. Developer gets an approval email. |
| **Rejected** | Game is removed. Developer gets a rejection email, including your **Reviewer Notes** if you filled them in. |
| **Hidden** | Game is removed. **No email** — this is for taking something down quietly. |
| **In Process** | Not on the site. The default. |

Write **Reviewer Notes** *before* setting Rejected — the note is read at the
moment the status changes and included in the email.

Status is the only cell you normally touch. Everything else is filled in
automatically from Steam at submission time: name, developer, publishers,
price, release date, genres, platforms, tags, review score, cover art and
description. That's deliberate — the sheet holds everything the website needs
to render a game, so approving is genuinely one click.

**Steam Key** and **Email** never leave the sheet. The endpoint the website
reads returns neither.

## Email

Transactional email goes through [Resend](https://resend.com). Templates live
in `lib/email/templates.ts` — plain functions returning `{ subject, html, text }`.
Edit the copy there; no build step, no template language.

| Template | Sent when |
|---|---|
| `invitationEmail` | Immediately on submission — welcomes them and invites them into the Lobby |
| `approvedEmail` | Status → Approved |
| `rejectedEmail` | Status → Rejected (includes Reviewer Notes) |
| `announcementEmail` | Manually, via `POST /api/announce` |

### Sending from a business address

You cannot reliably send bulk mail *as* `you@gmail.com`. Gmail's SMTP caps at
~500 recipients/day, has no delivery reporting, and anything that looks like a
mailing list gets throttled or spam-foldered. Worse, you can't set SPF/DKIM for
gmail.com, so your mail fails authentication and inbox placement collapses.

What you need:

1. **A domain you own** — `yourdomain.com`.
2. **A mailbox on it** for replies — Google Workspace or Fastmail, ~$6/month.
3. **A sending provider** for outbound — Resend's free tier covers 3,000
   emails/month, which is plenty at this stage.

Then in Resend: **Domains → Add Domain**, add the DNS records it gives you
(SPF, DKIM, and DMARC). Verification takes minutes to a few hours. Once it's
green:

```bash
RESEND_API_KEY=re_...
EMAIL_FROM=Bundly <hello@yourdomain.com>
EMAIL_REPLY_TO=hello@yourdomain.com
```

Postmark and Amazon SES are equivalent alternatives — swapping means editing
`deliver()` in `lib/email/send.ts` and nothing else.

**Until `RESEND_API_KEY` and `EMAIL_FROM` are both set, no email is sent.** The
subject and recipient are logged to the server console instead, so the flow is
testable, and it's obvious nothing actually went out.

### Announcements

```bash
curl -X POST https://yourdomain.com/api/announce \
  -H 'Content-Type: application/json' \
  -d '{
    "secret": "YOUR_ADMIN_SECRET",
    "to": ["dev1@studio.com", "dev2@studio.com"],
    "subject": "Bundle round 3 is open",
    "heading": "Bundle round 3 is open",
    "paragraphs": ["We are matching studios for a September bundle.",
                   "Approved games are already in the deck."],
    "ctaLabel": "Start swiping",
    "ctaUrl": "https://yourdomain.com/hub"
  }'
```

Recipients come from the sheet's **Email** column — filter to Approved, copy
the column, paste into `to`. Duplicates are removed automatically. Sends are
spaced ~600ms apart to stay inside provider rate limits, and the response
reports per-address success so a partial failure can be retried against only
the addresses that didn't go out.

Guarded by `ADMIN_SECRET`, which is separate from `SHEETS_SECRET` — mass email
is the most damaging thing here if it leaks.

## Sheet columns

| Column | Filled by |
|---|---|
| Timestamp | Server, on submit |
| **Status** | **You — dropdown, drives the whole site** |
| **Reviewer Notes** | **You — included in rejection emails** |
| Game Name, Steam AppID, Steam Link | Server / Steam |
| Developer, Publishers | Steam |
| Price, Release Date | Steam |
| Genres, Platforms, Tags | Steam |
| Review Score, Positive % | Steam |
| Capsule URL, Description | Steam |
| Steam Key, Email, Additional Info | The developer — never published |

## Troubleshooting

**Nothing happens when I change Status.** `installTriggers` wasn't run, or the
deployment is stale. Check **Extensions → Apps Script → Executions** for
`onStatusEdit` runs and their errors.

**"Sheet returned non-JSON".** Apps Script served its login page — the
deployment's *Who has access* isn't **Anyone**, or the URL is wrong.

**Approved games don't show up.** Confirm `SHEETS_WEBHOOK_URL` and
`SHEETS_SECRET` match the script exactly, then open
`YOUR_WEBAPP_URL?action=games&secret=YOUR_SECRET` in a browser — you should see
JSON listing the approved rows.

**The site shows games I never approved.** `SHEETS_WEBHOOK_URL` isn't set, so
the site is falling back to the bundled Steam fixtures in
`lib/games.generated.ts`. That fallback exists so development isn't blocked on
having a sheet; it only applies when the sheet is unreachable or unconfigured.
