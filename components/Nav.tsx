"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { wedding } from "@/lib/wedding";

const links = [
  ["Story", "#story"],
  ["Details", "#details"],
  ["Entourage", "#entourage"],
  ["Gallery", "#gallery"],
  ["FAQ", "#faq"],
  ["RSVP", "#rsvp"],
];

export default function Nav() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    gsap.fromTo(ref.current, { yPercent: -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, delay: 1.5, ease: "power3.out" });
  }, []);

  return (
    <nav ref={ref} className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-3 text-xs uppercase tracking-[0.25em] backdrop-blur-sm sm:px-8">
      <a href="#top" className="font-serif text-base normal-case tracking-normal italic text-gold">
        {wedding.couple.a[0]} &amp; {wedding.couple.b[0]}
      </a>
      <div className="flex gap-4 overflow-x-auto text-cream/70 sm:gap-7">
        {links.map(([label, href]) => (
          <a key={href} href={href} className="whitespace-nowrap transition hover:text-gold">
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
