"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSettings } from "@/lib/settings";

// Scroll-triggered entrance. Children opt in with data-reveal="up|left|right|flip|pop" (default up).
const FROM: Record<string, gsap.TweenVars> = {
  up: { y: 40 },
  left: { x: -90 },
  right: { x: 90 },
  flip: { rotateY: -90, transformPerspective: 900, transformOrigin: "left center" },
  pop: { scale: 0.6 },
};

export default function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const settings = useSettings(); // re-collect [data-reveal] items when Firestore adds content

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = ref.current!;
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-reveal]"));
    const groups = new Map<string, HTMLElement[]>();
    for (const it of items) {
      const k = FROM[it.dataset.reveal || ""] ? it.dataset.reveal! : "up";
      groups.set(k, [...(groups.get(k) ?? []), it]);
    }
    if (!groups.size) groups.set("up", [el]);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set([...groups.values()].flat(), { opacity: 1 });
      return;
    }
    const tweens = [...groups].map(([k, targets]) =>
      gsap.fromTo(
        targets,
        { opacity: 0, ...FROM[k] },
        { opacity: 1, x: 0, y: 0, scale: 1, rotateY: 0, duration: 1.1, ease: "power3.out", stagger: 0.12, scrollTrigger: { trigger: el, start: "top 78%" } },
      ),
    );
    return () => tweens.forEach((t) => (t.scrollTrigger?.kill(), t.kill()));
  }, [settings]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
