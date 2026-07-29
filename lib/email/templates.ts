/**
 * Email templates.
 *
 * Plain functions returning { subject, html, text } — edit the copy here and
 * it takes effect everywhere. No template engine, no build step.
 *
 * Every template is wrapped by `layout()`, so brand colours, header and footer
 * are defined once. Emails are deliberately LIGHT themed: dark HTML email
 * renders unpredictably across Outlook/Gmail dark modes.
 */

export const BRAND = {
  name: "Bundly",
  tagline: "Steam bundle matchmaking for indie developers",
  /** Public site URL — used for links and the logo. Override with SITE_URL. */
  url: process.env.SITE_URL ?? "https://bundly.online",
  accent: "#c8892a",
  supportEmail: process.env.EMAIL_REPLY_TO ?? "hello@bundly.online",
  discordUrl: "https://discord.gg/your-invite",
};

export type Template = { subject: string; html: string; text: string };

function esc(s: string) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );
}

/** Shared wrapper. Table-based because Outlook still doesn't do flexbox. */
function layout(opts: {
  preheader: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
           <tr><td style="border-radius:10px;background:${BRAND.accent};">
             <a href="${opts.ctaUrl}"
                style="display:inline-block;padding:13px 26px;font-family:Helvetica,Arial,sans-serif;
                       font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
               ${esc(opts.ctaLabel)}
             </a>
           </td></tr>
         </table>`
      : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${esc(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <span style="display:none;font-size:1px;color:#f4f4f5;">${esc(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;
                    border:1px solid #e4e4e7;">
        <tr><td style="padding:26px 32px 0;">
          <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:19px;font-weight:800;color:#18181b;">
            ${esc(BRAND.name)}
          </p>
        </td></tr>
        <tr><td style="padding:18px 32px 32px;">
          <h1 style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:23px;
                     line-height:1.3;color:#18181b;">${esc(opts.heading)}</h1>
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#3f3f46;">
            ${opts.body}
          </div>
          ${cta}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#71717a;">
            ${esc(BRAND.name)} — ${esc(BRAND.tagline)}<br>
            Questions? Just reply to this email, or reach us at
            <a href="mailto:${BRAND.supportEmail}" style="color:#71717a;">${esc(BRAND.supportEmail)}</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/* -------------------------------------------------------------------------- */
/* Templates                                                                   */
/* -------------------------------------------------------------------------- */

/** Sent the moment a developer submits a game. */
export function invitationEmail(args: {
  gameName: string;
  studio?: string;
}): Template {
  const game = args.gameName || "your game";
  return {
    subject: `We've got ${game} — welcome to ${BRAND.name}`,
    text: `Thanks for submitting ${game}.

Our team reviews every submission by hand, usually within 5 business days. We'll email you the moment there's a decision.

While you wait, join the Lobby: add your game, swipe other developers' games, and match with someone who wants to bundle with you. It's free, and there's no payment at any point.

${BRAND.url}`,
    html: layout({
      preheader: `We received ${game} and we're reviewing it now.`,
      heading: `Thanks for submitting ${esc(game)}`,
      body: `
        <p style="margin:0 0 14px;">We've got it. Our team reviews every submission by hand, usually within <strong>5 business days</strong> — we'll email you the moment there's a decision.</p>
        <p style="margin:0 0 14px;">While you wait, come into the <strong>Lobby</strong>. Add your game, swipe through other developers' games, and match with someone who wants to bundle with you.</p>
        <p style="margin:0;">It's free, there's no revenue share, and no payment at any point.</p>`,
      ctaLabel: "Join the Lobby",
      ctaUrl: BRAND.url,
    }),
  };
}

/** Sent when an admin flips Status to Approved. */
export function approvedEmail(args: { gameName: string }): Template {
  const game = args.gameName || "your game";
  return {
    subject: `${game} is approved and live on ${BRAND.name}`,
    text: `Good news — ${game} passed review and is now in the swipe pool.

Developers can see it and like it starting right now. When someone likes it back, it's a match and you'll both get each other's contact details.

Head to the Lobby to start swiping: ${BRAND.url}/hub`,
    html: layout({
      preheader: `${game} passed review and is now in the pool.`,
      heading: `${esc(game)} is approved`,
      body: `
        <p style="margin:0 0 14px;">It passed review and it's now <strong>in the swipe pool</strong>. Developers can see it and like it starting right now.</p>
        <p style="margin:0 0 14px;">When someone likes it back it's a match — you'll both get each other's contact details, and we'll hand you a bundle kit with artwork, store copy and a suggested discount.</p>
        <p style="margin:0;">The best matches go to people who swipe. Come find your partner.</p>`,
      ctaLabel: "Start swiping",
      ctaUrl: `${BRAND.url}/hub`,
    }),
  };
}

/** Sent when an admin flips Status to Rejected. */
export function rejectedEmail(args: {
  gameName: string;
  reason?: string;
}): Template {
  const game = args.gameName || "your game";
  const reason = args.reason?.trim();
  return {
    subject: `About your ${BRAND.name} submission`,
    text: `Thanks for submitting ${game}. We're not able to add it to the pool this time.

${reason ? `Reason: ${reason}\n\n` : ""}This isn't a judgement on the game — our pool is curated to keep bundle partners relevant to each other, and not everything fits. You're welcome to submit again if the game changes substantially.

If you'd like more detail, just reply to this email.`,
    html: layout({
      preheader: `An update on ${game}.`,
      heading: `About ${esc(game)}`,
      body: `
        <p style="margin:0 0 14px;">Thanks for submitting it. We're not able to add it to the pool this time.</p>
        ${
          reason
            ? `<p style="margin:0 0 14px;padding:12px 14px;background:#fafafa;border-left:3px solid #d4d4d8;color:#3f3f46;"><strong>Reason:</strong> ${esc(reason)}</p>`
            : ""
        }
        <p style="margin:0 0 14px;">This isn't a judgement on the game. We curate the pool so bundle partners stay relevant to each other, and not everything fits that shape.</p>
        <p style="margin:0;">You're welcome to submit again if the game changes substantially — and if you'd like more detail, just reply to this email.</p>`,
    }),
  };
}

/** Generic broadcast — new features, bundle rounds, events. */
export function announcementEmail(args: {
  subject: string;
  heading: string;
  /** Paragraphs of plain text; each becomes a <p>. */
  paragraphs: string[];
  ctaLabel?: string;
  ctaUrl?: string;
}): Template {
  return {
    subject: args.subject,
    text: `${args.heading}\n\n${args.paragraphs.join("\n\n")}${
      args.ctaUrl ? `\n\n${args.ctaLabel ?? "Open"}: ${args.ctaUrl}` : ""
    }`,
    html: layout({
      preheader: args.paragraphs[0] ?? args.heading,
      heading: args.heading,
      body: args.paragraphs
        .map((p) => `<p style="margin:0 0 14px;">${esc(p)}</p>`)
        .join(""),
      ctaLabel: args.ctaLabel,
      ctaUrl: args.ctaUrl,
    }),
  };
}
