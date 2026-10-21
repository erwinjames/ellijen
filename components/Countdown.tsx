"use client";

import { useSyncExternalStore } from "react";
import { wedding } from "@/lib/wedding";

const target = new Date(wedding.date).getTime();

const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
};
// Floored to the second so the snapshot is stable between ticks; null on the server avoids a hydration mismatch.
const getNow = () => Math.floor(Date.now() / 1000) * 1000;
const getServerNow = () => null;

function parts(now: number) {
  const s = Math.max(0, Math.floor((target - now) / 1000));
  return [
    ["Days", Math.floor(s / 86400)],
    ["Hours", Math.floor((s % 86400) / 3600)],
    ["Minutes", Math.floor((s % 3600) / 60)],
    ["Seconds", s % 60],
  ] as const;
}

export default function Countdown() {
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);

  return (
    <div className="grid grid-cols-4 gap-3 sm:gap-6">
      {parts(now ?? target).map(([label, n]) => (
        <div key={label} data-reveal="pop" className="rounded-2xl border border-cream/10 bg-ink-2/60 px-2 py-5 backdrop-blur">
          <div className="font-serif text-4xl text-gold tabular-nums sm:text-6xl">{now === null ? "–" : n}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-cream/60 sm:text-xs sm:tracking-[0.3em]">{label}</div>
        </div>
      ))}
    </div>
  );
}
