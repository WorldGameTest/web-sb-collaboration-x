"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import { EMAIL_RE } from "@/lib/steam";

type Tab = "join" | "signin";

export function JoinPanel() {
  const [tab, setTab] = useState<Tab>("join");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Set once a link has been emailed, so we can show the "check inbox" state. */
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(15);
  const [devLink, setDevLink] = useState<string | null>(null);

  // The header's "Sign in" link points at /#signin. Honour it on load and on
  // any later hash change, so clicking it from this page also works.
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#signin") setTab("signin");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function switchTab(next: Tab) {
    setTab(next);
    setError(null);
    setSentTo(null);
  }

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();

    if (!EMAIL_RE.test(value)) {
      setError("Enter a valid email address.");
      return;
    }

    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, intent: tab }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setExpiresIn(data.expiresInMinutes ?? 15);
      setDevLink(data.devLink ?? null);
      setSentTo(value);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------------- Link sent ---------------- */
  if (sentTo) {
    return (
      <div className="card mx-auto mt-11 max-w-[600px] rounded-2xl p-6 text-center sm:p-9">
        <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-purple/12 text-purple">
          <Icon name="mailCheck" size={26} />
        </span>

        <h2 className="mb-3 font-sans text-[22px] font-bold tracking-normal">
          Check your inbox
        </h2>
        <p className="mx-auto mb-6 max-w-[420px] text-muted">
          We sent a one-time sign-in link to <b className="text-white">{sentTo}</b>.
          It expires in {expiresIn} minutes. No password needed.
        </p>

        {devLink && (
          <div className="mb-6 rounded-[10px] border border-line bg-card-2 p-4 text-left">
            <p className="m-0 mb-2 text-[13px] font-semibold text-brand">
              Development only — no email provider configured
            </p>
            <a href={devLink} className="btn btn-primary w-full">
              Open the sign-in link
            </a>
          </div>
        )}

        <button
          type="button"
          className="cursor-pointer text-[14.5px] text-muted underline transition-colors hover:text-white"
          onClick={() => setSentTo(null)}
        >
          Use a different email
        </button>
      </div>
    );
  }

  /* ---------------- Join / Sign in ---------------- */
  return (
    <div
      id="signin"
      // scroll-mt clears the sticky header when jumped to via the hash.
      className="card mx-auto mt-11 max-w-[600px] scroll-mt-28 rounded-2xl p-6 text-left"
    >
      <div className="mb-6 grid grid-cols-2 overflow-hidden rounded-[10px] border border-line">
        {(["join", "signin"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            aria-pressed={tab === t}
            className={`cursor-pointer border-0 py-3.5 font-semibold transition-colors ${
              tab === t
                ? "bg-brand/14 text-brand"
                : "bg-transparent text-muted hover:text-white"
            }`}
          >
            {t === "join" ? "Join" : "Sign in"}
          </button>
        ))}
      </div>

      <div className="mb-5 flex items-start gap-4">
        <span
          className={`grid h-12 w-12 flex-none place-items-center rounded-[10px] ${
            tab === "join"
              ? "bg-brand/12 text-brand"
              : "bg-purple/12 text-purple"
          }`}
        >
          <Icon name={tab === "join" ? "userplus" : "mail"} size={22} />
        </span>
        <div>
          <h2 className="mb-1.5 font-sans text-[22px] font-bold tracking-normal">
            {tab === "join" ? "Join Bundly" : "Developer sign in"}
          </h2>
          <p className="m-0 text-muted">
            {tab === "join"
              ? "Add your Steam game, swipe curated partners and ship a bundle together."
              : "No password needed - we'll email you a one-time sign-in link."}
          </p>
        </div>
      </div>

      {tab === "join" && (
        <div className="mb-5 rounded-[10px] border border-brand bg-brand/5 px-5 py-4">
          <p className="mb-2 flex items-center gap-2 text-base font-bold">
            <Icon name="check" size={17} className="text-brand" />
            Free — forever.
          </p>
          <p className="m-0 text-muted">
            Add your game, swipe the pool, match with developers. No revenue
            share, no bundle-slot commitment, no payment. Any match you make
            always needs your OK.
          </p>
        </div>
      )}

      <form onSubmit={requestLink} noValidate>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            className="input flex-1"
            placeholder="you@studio.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            aria-label="Email address"
            aria-invalid={!!error}
            aria-describedby={error ? "auth-error" : undefined}
            autoComplete="email"
          />
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy
              ? "Sending…"
              : tab === "join"
                ? "Join free"
                : "Email me a link"}
          </button>
        </div>

        {error && (
          <p id="auth-error" role="alert" className="mt-2 text-[13px] text-danger">
            {error}
          </p>
        )}
      </form>

      <p className="mt-4 text-[13px] leading-relaxed text-muted-dim">
        For studios and developers (B2B). By{" "}
        {tab === "join" ? "joining" : "requesting a link"} you accept the{" "}
        <a href="#" className="text-muted underline">
          Terms of Service
        </a>
        .
      </p>
    </div>
  );
}
