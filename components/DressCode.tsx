"use client";

import { useSettings } from "@/lib/settings";

// Dress code copy and palette come from admin → Settings (falls back to wedding.ts).
export default function DressCode() {
  const { dressCode } = useSettings();
  return (
    <>
      <p data-reveal className="text-xs uppercase tracking-[0.5em] text-gold/80">Dress code</p>
      <h2 data-reveal className="mt-4 font-serif text-5xl font-light sm:text-6xl">{dressCode.title}</h2>
      <p data-reveal className="mx-auto mt-5 max-w-xl font-serif text-xl text-cream/70">{dressCode.note}</p>
      <div className="mt-12 flex flex-wrap justify-center gap-6">
        {dressCode.palette.map((c, i) => (
          <div key={i} data-reveal="pop" className="flex flex-col items-center gap-3">
            <span className="size-20 rounded-full border border-cream/20 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]" style={{ background: c.hex }} />
            <span className="text-xs uppercase tracking-[0.3em] text-cream/60">{c.name}</span>
          </div>
        ))}
      </div>
    </>
  );
}
