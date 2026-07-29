"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/lib/icons";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      <span className="text-purple">Bund</span>
      <span className="text-cyan">ly</span>
    </span>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-line-soft bg-ink/92 backdrop-blur-md">
      <div className="mx-auto flex min-h-[72px] w-full max-w-[1280px] items-center gap-6 px-6">
        <Link href="/" className="text-[22px]" aria-label="Bundly home">
          <Wordmark />
        </Link>

        <button
          type="button"
          className="ml-auto rounded-lg border border-line p-2.5 md:hidden"
          aria-expanded={open}
          aria-controls="primary-nav"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="block h-0.5 w-[18px] rounded bg-white" />
          <span className="mt-1 block h-0.5 w-[18px] rounded bg-white" />
          <span className="mt-1 block h-0.5 w-[18px] rounded bg-white" />
        </button>

        <nav
          id="primary-nav"
          className={`${
            open ? "flex" : "hidden"
          } absolute inset-x-0 top-full flex-col items-stretch gap-1 border-b border-line bg-ink px-6 pb-5 pt-3.5 md:static md:flex md:flex-1 md:flex-row md:items-center md:gap-8 md:border-0 md:bg-transparent md:p-0`}
        >
          <Link
            href="/hub"
            aria-current={pathname.startsWith("/hub") ? "page" : undefined}
            className="btn btn-lobby btn-sm gap-2.5"
          >
            <Icon name="swipe" size={18} />
            Lobby
          </Link>

          <Link
            href="/games"
            aria-current={pathname.startsWith("/games") ? "page" : undefined}
            className={`py-2 text-[15px] transition-colors md:py-0 ${
              pathname.startsWith("/games")
                ? "font-medium text-white"
                : "text-muted hover:text-white"
            }`}
          >
            Games
          </Link>

          {/* Auth cluster pushed to the far right on desktop. */}
          <div className="mt-2 flex flex-col gap-2 md:ml-auto md:mt-0 md:flex-row md:items-center md:gap-5">
            <Link
              href="/#signin"
              className="py-2 text-[15px] text-muted transition-colors hover:text-white md:py-0"
            >
              Sign in
            </Link>
            <Link href="/submit" className="btn btn-primary btn-sm">
              Submit Your Game
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
