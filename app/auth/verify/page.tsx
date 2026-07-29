import type { Metadata } from "next";
import { VerifyClient } from "./VerifyClient";

export const metadata: Metadata = {
  title: "Signing you in — Bundly",
  robots: { index: false, follow: false },
};

// searchParams is a Promise in Next.js 16.
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <VerifyClient token={token ?? null} />;
}
