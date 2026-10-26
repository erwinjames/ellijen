"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useSettings } from "@/lib/settings";

export default function Hero({ opening, opened, onOpen }: { opening: boolean; opened: boolean; onOpen: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const { couple, date } = useSettings();
  const dateLabel = new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!opened) {
        // fromTo, not from: a reverted from() tween (StrictMode re-runs the effect) can record the hidden state as its end state.
        gsap.fromTo(".hero-prompt", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.2, delay: 0.8, ease: "power3.out" });
        gsap.to(".hero-prompt span", { opacity: 0.4, repeat: -1, yoyo: true, duration: 1.1, ease: "sine.inOut" });
        return;
      }
      gsap
        .timeline({ delay: 0.2, defaults: { ease: "power3.out" } })
        .from(".hero-eyebrow", { opacity: 0, y: 20, duration: 1 })
        .from(".hero-char", { opacity: 0, y: 60, rotateX: -60, duration: 1.2, stagger: 0.05 }, "-=0.6")
        .from(".hero-amp", { opacity: 0, scale: 0.4, duration: 1, ease: "elastic.out(1, 0.5)" }, "-=0.9")
        .from(".hero-date", { opacity: 0, y: 20, duration: 1 }, "-=0.5")
        .from(".hero-cue", { opacity: 0, duration: 1 }, "-=0.3");
      gsap.to(".hero-cue span", { y: 8, repeat: -1, yoyo: true, duration: 0.9, ease: "sine.inOut" });
    }, ref);
    return () => ctx.revert();
  }, [opened]);

  const chars = (s: string) => (
    <span className="inline-block">
      {s.split(" ").map((w, wi) => (
        <span key={wi}>
          {wi > 0 && " "}
          <span className="inline-block whitespace-nowrap">
            {w.split("").map((c, i) => (
              <span key={i} className="hero-char inline-block">
                {c}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );

  return (
    <section ref={ref} id="top" data-chapter="hero" className="relative flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      {!opened ? (
        // Wrapper fades the prompt once the envelope starts opening (gsap owns the button's own opacity).
        <div
          className={`absolute inset-x-0 bottom-[14%] flex justify-center px-4 transition-opacity duration-500 [@media(max-height:500px)]:bottom-3 ${
            opening ? "pointer-events-none opacity-0" : ""
          }`}
        >
          <button onClick={onOpen} className="hero-prompt rounded-full border border-gold/50 px-6 py-3 text-xs uppercase tracking-[0.25em] sm:px-8 sm:tracking-[0.4em] text-gold transition hover:bg-gold/10">
            <span>Tap to open your invitation</span>
          </button>
        </div>
      ) : (
        <>
          <p className="hero-eyebrow mb-6 text-xs uppercase tracking-[0.5em] text-gold/80">Together with their families</p>
          <h1 className="font-serif text-6xl font-light leading-none text-cream [text-shadow:0_2px_30px_var(--color-ink)] sm:text-8xl md:text-9xl" style={{ perspective: 600 }}>
            {chars(couple.a)}
            <span className="hero-amp mx-3 inline-block italic text-gold sm:mx-6">&amp;</span>
            {chars(couple.b)}
          </h1>
          <p className="hero-date mt-8 font-serif text-xl italic text-cream/80 [text-shadow:0_2px_20px_var(--color-ink)] sm:text-2xl">{dateLabel}</p>
          <a href="#rsvp" className="hero-date mt-10 rounded-full border border-gold/60 px-8 py-3 text-sm uppercase tracking-[0.3em] text-gold transition hover:bg-gold hover:text-ink">
            RSVP
          </a>
          <p className="hero-cue absolute bottom-8 text-xs uppercase tracking-[0.4em] text-cream/50">
            <span className="block">↓</span>
            scroll the story
          </p>
        </>
      )}
    </section>
  );
}
