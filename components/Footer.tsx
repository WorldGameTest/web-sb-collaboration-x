import Link from "next/link";
import { Wordmark } from "./Header";

const PLATFORM = [
  { label: "Games", href: "/games" },
  { label: "Submit Your Game", href: "/submit" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Lobby", href: "/hub" },
];

const CONNECT = [
  { label: "Discord", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
];

export function Footer() {
  return (
    <footer className="mt-10 border-t border-line-soft pb-8 pt-15">
      <div className="mx-auto w-full max-w-[1180px] px-6">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Link href="/" className="mb-4 inline-block text-xl">
              <Wordmark />
            </Link>
            <p className="max-w-[380px] text-muted">
              Free Steam bundle matchmaking for indie developers. Add your game,
              swipe curated partners, match, and ship a bundle together.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-sans text-[17px] font-bold tracking-normal">
              Platform
            </h4>
            <ul className="space-y-2.5">
              {PLATFORM.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-muted transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-sans text-[17px] font-bold tracking-normal">
              Connect
            </h4>
            <ul className="space-y-2.5">
              {CONNECT.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-muted transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-11 border-t border-line-soft pt-6 text-center text-sm text-muted">
          © {new Date().getFullYear()} Bundly. All rights reserved.{" "}
          <span className="px-1">|</span>{" "}
          <a href="#" className="underline">
            Privacy Policy
          </a>
        </div>
      </div>
    </footer>
  );
}
