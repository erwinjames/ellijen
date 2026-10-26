"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

// The "old disk": a spinning record that doubles as the music play/pause control.
export default function Vinyl({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    gsap.fromTo(ref.current, { scale: 0, rotate: -180 }, { scale: 1, rotate: 0, duration: 1.2, ease: "elastic.out(1, 0.5)" });
  }, []);

  return (
    <button
      ref={ref}
      onClick={onToggle}
      aria-pressed={playing}
      title={playing ? "Pause music" : "Play music"}
      className="group fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full bg-ink-2/70 p-2 backdrop-blur sm:pr-4"
    >
      <span
        className="relative block size-14 rounded-full shadow-[0_0_20px_color-mix(in_srgb,var(--color-gold)_25%,transparent)] animate-spin motion-reduce:animate-none"
        style={{
          animationDuration: "3s",
          animationPlayState: playing ? "running" : "paused",
          background:
            "repeating-radial-gradient(circle at 50% 50%, #111 0 1.5px, #1d1d1d 1.5px 3px), radial-gradient(circle, #0b0b0b, #000)",
        }}
      >
        <span className="absolute inset-[34%] rounded-full bg-gold" />
        <span className="absolute inset-[46%] rounded-full bg-ink" />
        <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent" />
      </span>
      <span className="hidden text-xs uppercase tracking-[0.3em] text-cream/70 group-hover:text-cream sm:inline">{playing ? "Playing" : "Paused"}</span>
    </button>
  );
}
