import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

/**
 * Fonts are vendored in app/fonts rather than pulled via next/font/google.
 * The Google fetch happens at build time, so a slow or blocked network there
 * fails the whole build — self-hosting makes builds reproducible and offline.
 * Both files are the latin subset of the variable font.
 */
const archivo = localFont({
  src: "./fonts/Archivo-Variable.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
});

const rubik = localFont({
  src: "./fonts/Rubik-Variable.woff2",
  variable: "--font-rubik",
  weight: "300 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bundly — Steam Bundle Matchmaking",
  description:
    "Swipe through curated indie games, match with a developer who wants to bundle with you, and ship it together. Free to join, no payment ever.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${rubik.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
