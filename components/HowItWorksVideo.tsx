"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { HOW_IT_WORKS_VIDEO } from "@/lib/data";

/**
 * "See how it works" video.
 *
 * For YouTube this is a facade embed: we show the thumbnail and only insert
 * the iframe once someone clicks play. A YouTube iframe pulls well over half a
 * megabyte of script and sets cookies on load — paying that on every visit,
 * for a video most visitors never play, is not worth it.
 *
 * A self-hosted file renders as a normal <video> with its poster.
 */
export function HowItWorksVideo() {
  const { youtubeId, src, poster } = HOW_IT_WORKS_VIDEO;
  const [playing, setPlaying] = useState(false);

  return (
    <section className="py-16">
      <div className="mx-auto w-full max-w-[1180px] px-6 text-center">
        <h2 className="section-title">
          See how it <span className="text-brand">works</span>
        </h2>

        <div className="card relative mx-auto mt-9 aspect-video max-w-[900px] overflow-hidden rounded-2xl">
          {youtubeId ? (
            playing ? (
              <iframe
                // -nocookie so nothing is stored until playback actually starts.
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
                title="How Bundly works"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="group absolute inset-0 h-full w-full cursor-pointer"
                aria-label="Play the walkthrough video"
              >
                <img
                  src={
                    poster ??
                    `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`
                  }
                  alt=""
                  className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                />
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid h-[74px] w-[74px] place-items-center rounded-full border border-brand/50 bg-ink/70 text-brand backdrop-blur-sm transition-transform group-hover:scale-110">
                    <Icon name="play" size={28} />
                  </span>
                </span>
              </button>
            )
          ) : src ? (
            <video
              src={src}
              poster={poster}
              controls
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            /* Nothing configured yet. */
            <div className="grid h-full w-full place-items-center">
              <span className="grid h-[66px] w-[66px] place-items-center rounded-full border border-brand/40 bg-brand/12 text-brand">
                <Icon name="play" size={26} />
              </span>
              <p className="absolute bottom-4 m-0 text-[13px] text-muted-dim">
                Set <code>HOW_IT_WORKS_VIDEO</code> in <code>lib/data.ts</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
