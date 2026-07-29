import type { Metadata } from "next";
import { SubmitForm } from "@/components/SubmitForm";

export const metadata: Metadata = {
  title: "Submit Your Game — Bundly",
  description:
    "Send us your Steam game. We review every submission and get back to you within 5 business days.",
};

export default function SubmitPage() {
  return (
    <section className="relative overflow-hidden pb-24 pt-22">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 h-[520px] w-[1000px] -translate-x-1/2"
        style={{
          top: "-120px",
          background:
            "radial-gradient(ellipse at center, rgb(168 85 247 / .09), transparent 68%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1180px] px-6 text-center">
        <h1 className="display">
          <span className="block">Join the rebellion.</span>
          <span className="block">
            <span className="text-cyan">Be seen.</span>{" "}
            <span className="text-brand">Be sold.</span>
          </span>
          <span className="block text-purple">Be respected.</span>
        </h1>

        <p className="lead mx-auto mt-7 max-w-[560px]">
          Stop getting screwed by traditional publishers.
          <br />
          Let&apos;s build something legendary together.
        </p>

        <div className="text-left">
          <SubmitForm />
        </div>
      </div>
    </section>
  );
}
