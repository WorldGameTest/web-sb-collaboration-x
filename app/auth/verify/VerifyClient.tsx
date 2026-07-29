"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";
import { writeSession } from "@/lib/session";

type State = "working" | "error";

export function VerifyClient({ token }: { token: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<State>("working");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    // Tokens are single-use, so React's dev double-invoke would burn ours.
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setState("error");
      setMessage("This link is missing its token. Request a new one.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.email) {
          setState("error");
          setMessage(
            data.error ?? "That link is invalid or has expired."
          );
          return;
        }

        writeSession(data.email);
        router.replace("/hub");
      } catch {
        setState("error");
        setMessage("We couldn't reach the server. Please try again.");
      }
    })();
  }, [token, router]);

  return (
    <section className="mx-auto w-full max-w-[1180px] px-6 py-24">
      <div className="card mx-auto max-w-[480px] rounded-2xl p-10 text-center">
        {state === "working" ? (
          <>
            <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-purple/12 text-purple">
              <Icon name="mail" size={26} />
            </span>
            <h1 className="mb-3 text-2xl tracking-normal">Signing you in…</h1>
            <p className="m-0 text-muted">
              Checking your link. This only takes a second.
            </p>
          </>
        ) : (
          <>
            <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-danger/12 text-danger">
              <Icon name="x" size={26} />
            </span>
            <h1 className="mb-3 text-2xl tracking-normal">
              That link didn&apos;t work
            </h1>
            <p className="mb-6 text-muted">{message}</p>
            <Link href="/" className="btn btn-primary">
              Request a new link
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
