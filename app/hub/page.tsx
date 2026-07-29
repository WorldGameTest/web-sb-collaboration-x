import type { Metadata } from "next";
import { HubShell } from "@/components/hub/HubShell";
import { getApprovedGames } from "@/lib/sheet";

export const metadata: Metadata = {
  title: "Lobby — Bundly",
  description:
    "Swipe curated partners, manage your games, and talk to your matches.",
};

export default async function HubPage() {
  // Approved rows from the sheet — no deploy needed when that list changes.
  const pool = await getApprovedGames();
  return <HubShell pool={pool} />;
}
