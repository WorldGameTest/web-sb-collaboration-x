import { artGradient } from "@/lib/data";

/**
 * A game's Steam header capsule (460x215).
 *
 * Renders the real image when `src` is given, otherwise a deterministic
 * gradient with the title on it — so placeholder entries still look composed.
 *
 * Uses a plain <img> rather than next/image on purpose: Steam capsules are
 * already served at display size, and the marquee plus hero backdrop put ~100
 * of them on the page, which is a lot of pointless optimiser work.
 */
export function Art({
  name,
  src,
  className = "",
  ratio = true,
  eager = false,
}: {
  name: string;
  src?: string;
  className?: string;
  /** Set false when the parent controls height (e.g. the featured panel). */
  ratio?: boolean;
  /** Skip lazy-loading for above-the-fold art. */
  eager?: boolean;
}) {
  const shape = ratio ? "aspect-[460/215]" : "h-full";

  if (src) {
    return (
      <img
        src={src}
        alt={`Cover art for ${name}`}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={`${shape} w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`art ${shape} ${className}`}
      style={{ background: artGradient(name) }}
      role="img"
      aria-label={`Cover art for ${name}`}
    >
      <span>{name}</span>
    </div>
  );
}
