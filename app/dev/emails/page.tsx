import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EMAIL_PREVIEWS, BRAND } from "@/lib/email/templates";

/**
 * Renders every email the platform sends, so the copy and layout can be
 * reviewed without triggering the real thing.
 *
 * Dev-only by default. In production it needs ?secret=<ADMIN_SECRET> — the
 * templates aren't sensitive, but this is internal tooling and shouldn't be
 * indexable or browsable by anyone who guesses the path.
 */

export const metadata: Metadata = {
  title: "Email templates — Bundly",
  robots: { index: false, follow: false },
};

export default async function EmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>;
}) {
  const { secret } = await searchParams;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    const expected = process.env.ADMIN_SECRET;
    if (!expected || secret !== expected) notFound();
  }

  return (
    <section className="mx-auto w-full max-w-[1180px] px-6 py-16">
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-brand">
        Internal
      </p>
      <h1 className="display mb-5">Email templates</h1>
      <p className="lead mb-2 max-w-[680px]">
        Every automated email Bundly sends, with sample data. Edit the copy in{" "}
        <code className="text-white">lib/email/templates.ts</code> — these render
        from the same functions the senders use, so what you see is what ships.
      </p>
      <p className="mb-12 text-sm text-muted-dim">
        Sending from <strong className="text-muted">{BRAND.name}</strong> ·
        replies go to{" "}
        <strong className="text-muted">{BRAND.supportEmail}</strong>
      </p>

      <div className="flex flex-col gap-14">
        {EMAIL_PREVIEWS.map(({ key, label, when, build }) => {
          const email = build();
          return (
            <article key={key} className="card overflow-hidden rounded-2xl">
              <header className="border-b border-line-soft px-6 py-5">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h2 className="font-sans text-xl font-bold tracking-normal">
                    {label}
                  </h2>
                  <code className="rounded bg-card-2 px-2 py-0.5 text-[12.5px] text-muted">
                    {key}
                  </code>
                </div>
                <p className="mt-2 text-[14.5px] text-muted">
                  <strong className="text-white">Trigger:</strong> {when}
                </p>
                <p className="mt-1.5 text-[14.5px] text-muted">
                  <strong className="text-white">Subject:</strong>{" "}
                  {email.subject}
                </p>
              </header>

              {/* srcDoc so the email's own CSS is fully isolated — exactly how
                  a mail client renders it. */}
              <iframe
                title={`${label} preview`}
                srcDoc={email.html}
                className="h-[560px] w-full border-0 bg-white"
              />

              <details className="border-t border-line-soft px-6 py-4">
                <summary className="cursor-pointer text-[14px] text-muted">
                  Plain-text version (what clients without HTML see)
                </summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
                  {email.text}
                </pre>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
