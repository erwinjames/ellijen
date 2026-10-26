"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Photo frame with a labelled slot when the file is missing, so layouts read correctly before photos arrive.
// `parallax` drifts the image from a zoomed crop as the frame scrolls through the viewport.
export default function Photo({
  src,
  alt,
  label,
  parallax = false,
  className = "",
  rounded = "rounded-[2rem]",
}: {
  src: string;
  alt: string;
  label?: string;
  parallax?: boolean;
  className?: string;
  rounded?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  // Remembers which src failed, so swapping in an uploaded photo (settings load after mount) shows it again.
  const [failed, setFailed] = useState<string | null>(null);
  const missing = !src || failed === src;

  useEffect(() => {
    if (!parallax || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const tween = gsap.fromTo(
      img.current,
      { yPercent: -10, scale: 1.25 },
      { yPercent: 10, scale: 1, ease: "none", scrollTrigger: { trigger: frame.current, start: "top bottom", end: "bottom top", scrub: true } },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [parallax]);

  return (
    <div ref={frame} className={`relative overflow-hidden border border-cream/10 bg-ink-2/80 ${rounded} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- user-supplied photos of unknown size */}
      <img
        ref={(el) => {
          img.current = el;
          // A 404 that fired before hydration never reaches onError; a complete image with no pixels is that case.
          if (el && src && el.complete && el.naturalWidth === 0) setFailed(src);
        }}
        src={src || undefined}
        alt={alt}
        onError={() => setFailed(src)} className={`h-full w-full object-cover will-change-transform ${missing ? "invisible" : ""}`} loading="lazy" />
      {missing && (
        <div className={`absolute inset-2 flex flex-col items-center justify-center gap-2 border border-dashed border-gold/40 p-2 text-center ${rounded}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="size-[22%] max-h-16 text-gold/70" aria-hidden>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9.5" r="1.8" />
            <path d="M21 16l-5.5-5.5L7 19" />
          </svg>
          {label !== "" && <p className="font-serif text-lg italic leading-tight text-cream/80 sm:text-2xl">{label ?? alt}</p>}
          <p className="max-w-full break-all px-2 text-[10px] uppercase tracking-[0.15em] text-cream/70">
            {src.startsWith("/") && process.env.NODE_ENV !== "production" ? <>add <code className="text-gold/80">public{src}</code></> : "photo coming soon"}
          </p>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
    </div>
  );
}
