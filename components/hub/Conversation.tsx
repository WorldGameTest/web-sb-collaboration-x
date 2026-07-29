"use client";

import { useEffect, useRef, useState } from "react";
import { Art } from "@/components/Art";
import { Icon } from "@/lib/icons";
import { SEED_THREAD } from "@/lib/data";

type Message = { from: "me" | "them"; body: string; at: string };

function stamp(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function Conversation({
  mine,
  theirs,
  onBack,
}: {
  mine: string;
  theirs: string;
  onBack?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>(SEED_THREAD);
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setMessages((m) => [...m, { from: "me", body, at: stamp(new Date()) }]);
    setDraft("");
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

        <Art name={theirs} className="w-[72px] flex-none rounded" />

        <p className="m-0 text-[15.5px] font-bold">
          {mine} <span className="text-brand">×</span> {theirs}
        </p>

        <a
          href="#"
          className="ml-auto flex items-center gap-1.5 text-sm text-purple underline"
        >
          Match details (kit, checklist)
          <Icon name="external" size={14} />
        </a>
      </div>

      <div
        ref={threadRef}
        className="thin-scroll mb-4 grid max-h-[380px] gap-3 overflow-y-auto p-1"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[78%] rounded-[10px] px-3.5 py-2.5 ${
              m.from === "me" ? "ml-auto bg-purple/14" : "bg-card-2"
            }`}
          >
            <p className="m-0 leading-snug">{m.body}</p>
            <span className="mt-1 block text-[11.5px] text-muted-dim">
              {m.at}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="flex gap-2.5">
        <input
          className="input flex-1"
          placeholder="Write a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Message"
        />
        <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
          <Icon name="send" size={17} />
          <span className="sr-only sm:not-sr-only">Send</span>
        </button>
      </form>
    </div>
  );
}
