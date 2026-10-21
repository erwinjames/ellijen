"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { wedding } from "@/lib/wedding";

const dateLabel = new Date(wedding.date).toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default function Hero({ opened, onOpen }: { opened: boolean; onOpen: () => void }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!opened) {
        gsap.from(".hero-prompt", { opacity: 0, y: 20, duration: 1.2, delay: 0.8, ease: "power3.out" });
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

  const chars = (s: string) =>
    s.split("").map((c, i) => (
      <span key={i} className="hero-char inline-block">
        {c}
      </span>
    ));

  return (
    <section ref={ref} id="top" data-chapter="hero" className="relative flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      {!opened ? (
        <button onClick={onOpen} className="hero-prompt absolute bottom-[14%] rounded-full border border-gold/50 px-8 py-3 text-xs uppercase tracking-[0.4em] text-gold transition hover:bg-gold/10">
          <span>Tap to open your invitation</span>
        </button>
      ) : (
        <>
          <p className="hero-eyebrow mb-6 text-xs uppercase tracking-[0.5em] text-gold/80">Together with their families</p>
          <h1 className="font-serif text-6xl font-light leading-none text-cream [text-shadow:0_2px_30px_rgba(0,0,0,0.8)] sm:text-8xl md:text-9xl" style={{ perspective: 600 }}>
            {chars(wedding.couple.a)}
            <span className="hero-amp mx-3 inline-block italic text-gold sm:mx-6">&amp;</span>
            {chars(wedding.couple.b)}
          </h1>
          <p className="hero-date mt-8 font-serif text-xl italic text-cream/80 [text-shadow:0_2px_20px_rgba(0,0,0,0.8)] sm:text-2xl">{dateLabel}</p>
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
