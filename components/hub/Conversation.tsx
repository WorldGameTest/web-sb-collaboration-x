"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Art } from "@/components/Art";
import { Icon } from "@/lib/icons";

/**
 * Real chat inside a match.
 *
 * Messages are stored server-side and polled, so both people genuinely see the
 * same conversation. Polling (every 3s) rather than websockets: Vercel functions
 * are short-lived, so a socket would need a separate always-on service for what
 * is, at this volume, a few requests a minute.
 *
 * Only sends `after=<lastId>`, so a poll returns nothing once you're caught up.
 */

const POLL_MS = 3000;

type Message = {
  id: number;
  sender_user_id: number;
  body: string;
  created_at: string;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function Conversation({
  matchId,
  mine,
  theirs,
  theirCapsule,
  otherEmail,
  onBack,
}: {
  matchId: number | null;
  mine: string;
  theirs: string;
  theirCapsule?: string;
  otherEmail?: string;
  onBack?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [meId, setMeId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    matchId ? "loading" : "unavailable"
  );
  const [error, setError] = useState<string | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);

  /** Fetches only what we haven't seen yet. */
  const poll = useCallback(async () => {
    if (!matchId) return;
    try {
      const res = await fetch(
        `/api/messages?matchId=${matchId}&after=${lastIdRef.current}`,
        { cache: "no-store" }
      );

      if (res.status === 503) {
        setStatus("unavailable");
        return;
      }
      if (!res.ok) return;

      const data = (await res.json()) as {
        me: number;
        messages: Message[];
      };

      setMeId(data.me);
      if (data.messages.length > 0) {
        lastIdRef.current = data.messages[data.messages.length - 1].id;
        setMessages((prev) => [...prev, ...data.messages]);
      }
      setStatus("ready");
    } catch {
      /* Transient network blip — the next tick retries. */
    }
  }, [matchId]);

  useEffect(() => {
    // Reset when switching conversation.
    lastIdRef.current = 0;
    setMessages([]);
    setStatus(matchId ? "loading" : "unavailable");
    if (!matchId) return;

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => clearInterval(timer);
  }, [matchId, poll]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !matchId || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, body }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Could not send that message.");
        return;
      }

      // Append immediately so the sender sees it without waiting for a poll.
      setMeId(data.me);
      if (data.message) {
        lastIdRef.current = Math.max(lastIdRef.current, data.message.id);
        setMessages((prev) => [...prev, data.message]);
      }
      setDraft("");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-6 border-t border-line-soft pt-6">
      <div className="mb-4.5 flex flex-wrap items-center gap-3 border-b border-line-soft pb-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex cursor-pointer items-center gap-1.5 text-[14.5px] text-muted transition-colors hover:text-white"
          >
            <Icon name="arrowLeft" size={16} />
            All conversations
          </button>
        )}

        <Art
          name={theirs}
          src={theirCapsule}
          className="w-[72px] flex-none rounded"
        />

        <div>
          <p className="m-0 text-[15.5px] font-bold">
            {mine} <span className="text-brand">×</span> {theirs}
          </p>
          {otherEmail && (
            <p className="m-0 flex items-center gap-1.5 text-[13px] text-muted">
              <Icon name="mail" size={13} />
              <a href={`mailto:${otherEmail}`} className="text-purple hover:underline">
                {otherEmail}
              </a>
            </p>
          )}
        </div>
      </div>

      {status === "unavailable" ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-muted">
          <p className="m-0">
            Chat isn&apos;t available yet — the database isn&apos;t connected.
          </p>
        </div>
      ) : (
        <>
          <div
            ref={threadRef}
            className="thin-scroll mb-4 grid max-h-[380px] gap-3 overflow-y-auto p-1"
          >
            {status === "loading" && messages.length === 0 && (
              <p className="m-0 py-6 text-center text-sm text-muted">
                Loading messages…
              </p>
            )}

            {status === "ready" && messages.length === 0 && (
              <p className="m-0 py-6 text-center text-sm text-muted">
                No messages yet. Say hello — you both liked each other&apos;s
                games.
              </p>
            )}

            {messages.map((m) => {
              const isMine = meId !== null && m.sender_user_id === meId;
              return (
                <div
                  key={m.id}
                  className={`max-w-[78%] rounded-[10px] px-3.5 py-2.5 ${
                    isMine ? "ml-auto bg-purple/14" : "bg-card-2"
                  }`}
                >
                  <p className="m-0 leading-snug">{m.body}</p>
                  <span className="mt-1 block text-[11.5px] text-muted-dim">
                    {formatTime(m.created_at)}
                  </span>
                </div>
              );
            })}
          </div>

          {error && <p className="mb-2 text-[13px] text-danger">{error}</p>}

          <form onSubmit={send} className="flex gap-2.5">
            <input
              className="input flex-1"
              placeholder="Write a message…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Message"
              maxLength={2000}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!draft.trim() || sending}
            >
              <Icon name="send" size={17} />
              <span className="sr-only sm:not-sr-only">
                {sending ? "Sending…" : "Send"}
              </span>
            </button>
          </form>
        </>
      )}
    </div>
  );
}
