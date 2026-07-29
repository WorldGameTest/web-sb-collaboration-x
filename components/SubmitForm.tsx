"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { EMAIL_RE, parseSteamAppId } from "@/lib/steam";

type Fields = {
  steamKey: string;
  steamLink: string;
  email: string;
  additionalInfo: string;
};

const EMPTY: Fields = {
  steamKey: "",
  steamLink: "",
  email: "",
  additionalInfo: "",
};

export function SubmitForm() {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof Fields, string>> = {};

    if (!fields.steamKey.trim()) next.steamKey = "Steam key is required.";

    if (!fields.steamLink.trim()) {
      next.steamLink = "Steam game link is required.";
    } else if (!parseSteamAppId(fields.steamLink)) {
      next.steamLink =
        "Use a Steam store link, e.g. https://store.steampowered.com/app/123456/";
    }

    if (!fields.email.trim()) next.email = "Email is required.";
    else if (!EMAIL_RE.test(fields.email.trim()))
      next.email = "Enter a valid email address.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setBusy(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        setFormError(
          data.error ?? "Something went wrong. Please check the form and retry."
        );
        return;
      }

      setSent(true);
    } catch {
      setFormError("We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------------- Success ---------------- */
  if (sent) {
    return (
      <div className="mx-auto mt-10 max-w-[620px] rounded-2xl border border-brand bg-card px-6 py-14 text-center sm:px-10">
        <span className="mx-auto mb-6 grid h-19 w-19 place-items-center rounded-full border-[3px] border-brand text-brand">
          <Icon name="check" size={36} strokeWidth={3} />
        </span>
        <h2 className="mb-3.5 text-[28px]">Submission received!</h2>
        <p className="mx-auto mb-6 max-w-[440px] text-muted">
          We&apos;ll review your game and get back to you within 5 business days.
          Check your inbox (and spam folder).
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setFields(EMPTY);
            setErrors({});
            setSent(false);
          }}
        >
          Submit another game
        </button>
      </div>
    );
  }

  /* ---------------- Form ---------------- */
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="card mx-auto mt-10 max-w-[620px] rounded-2xl p-6 sm:p-9"
    >
      <Field
        id="steamKey"
        label="Steam Key"
        required
        error={errors.steamKey}
        placeholder="Enter your Steam key"
        value={fields.steamKey}
        onChange={(v) => set("steamKey", v)}
      />

      <Field
        id="steamLink"
        label="Steam Game Link"
        required
        error={errors.steamLink}
        placeholder="https://store.steampowered.com/app/…"
        value={fields.steamLink}
        onChange={(v) => set("steamLink", v)}
        inputMode="url"
      />

      <Field
        id="email"
        label="Your Email"
        required
        type="email"
        error={errors.email}
        placeholder="your.email@example.com"
        value={fields.email}
        onChange={(v) => set("email", v)}
        autoComplete="email"
      />

      <div className="mb-5">
        <label htmlFor="additionalInfo" className="mb-2 block font-semibold">
          Additional Info (Optional)
        </label>
        <textarea
          id="additionalInfo"
          className="textarea"
          placeholder="Tell us about your game…"
          value={fields.additionalInfo}
          onChange={(e) => set("additionalInfo", e.target.value)}
        />
      </div>

      {formError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {formError}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-lg w-full"
        disabled={busy}
      >
        {busy ? "Submitting…" : "Submit Your Game Now"}
        {!busy && <Icon name="arrowRight" size={18} />}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  error,
  value,
  onChange,
  type = "text",
  ...rest
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "id" | "value" | "onChange" | "type"
>) {
  return (
    <div className="mb-5">
      <label htmlFor={id} className="mb-2 block font-semibold">
        {label} {required && <span className="text-brand">*</span>}
      </label>
      <input
        id={id}
        type={type}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
