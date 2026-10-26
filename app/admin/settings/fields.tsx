"use client";

import { useId, useState } from "react";

// Editors take updater functions (not values) so an upload that finishes later cannot overwrite edits made meanwhile.
export type Upd<T> = (f: (v: T) => T) => void;
// Arrays must stay arrays: spreading one into `{}` turns it into an object and every `.map` after that throws.
export const at = <T, K extends keyof T>(set: Upd<T>, k: K): NoInfer<Upd<T[K]>> => (f) =>
  set((v) => (Array.isArray(v) ? (v.map((x, j) => (j === k ? f(x) : x)) as T) : { ...v, [k]: f(v[k]) }));

export const field = "w-full rounded-xl border border-cream/15 bg-ink px-4 py-3 outline-none transition-colors focus:border-gold";
export const label = "block text-xs uppercase tracking-[0.3em] text-cream/60";
const iconBtn = "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-cream/50 transition-colors hover:bg-cream/5 hover:text-cream disabled:opacity-30 focus-visible:outline focus-visible:outline-gold";
export const addBtn = "cursor-pointer rounded-full border border-gold/40 px-4 py-2 text-sm text-gold transition-colors hover:bg-gold/10";

export function Text({ name, value, set, area, max = 400, placeholder, type = "text" }: { name: string; value: string; set: Upd<string>; area?: boolean; max?: number; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className={label}>{name}</span>
      {area ? (
        <textarea value={value} maxLength={max} rows={3} placeholder={placeholder} onChange={(e) => set(() => e.target.value)} className={`mt-2 ${field}`} />
      ) : (
        <input type={type} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => set(() => e.target.value)} className={`mt-2 ${field}`} />
      )}
    </label>
  );
}

/** Photo picker: uploads with `upload` and stores the returned URL. Empty = the site shows a photo slot. */
export function ImageField({ name, value, set, upload, round }: { name: string; value: string; set: Upd<string>; upload: (f: File) => Promise<string>; round?: boolean }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [broken, setBroken] = useState("");
  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const url = await upload(file);
      set(() => url);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }
  const shape = round ? "rounded-full" : "rounded-xl";
  return (
    <div className="flex items-center gap-4">
      <div className={`flex size-20 shrink-0 items-center justify-center overflow-hidden border border-cream/15 bg-ink ${shape}`}>
        {value && broken !== value ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded photo
          <img src={value} alt="" onError={() => setBroken(value)} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] uppercase tracking-widest text-cream/30">none</span>
        )}
      </div>
      <div className="min-w-0">
        <span className={label}>{name}</span>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label htmlFor={id} className={`${addBtn} ${busy ? "pointer-events-none opacity-60" : ""}`}>
            {busy ? "Uploading…" : value ? "Replace" : "Upload"}
          </label>
          <input id={id} type="file" accept="image/jpeg,image/png" className="sr-only" disabled={busy} onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
          {value && !busy && (
            <button type="button" onClick={() => set(() => "")} className="cursor-pointer px-2 text-sm text-cream/50 transition-colors hover:text-rose">
              Remove
            </button>
          )}
        </div>
        {error && <p role="alert" className="mt-1 text-sm text-rose">{error}</p>}
      </div>
    </div>
  );
}

/** Add / remove / reorder rows. `children` renders one row's fields. */
export function List<T>({ items, set, blank, noun, max = 60, children }: { items: T[]; set: Upd<T[]>; blank: T; noun: string; max?: number; children: (item: T, set: Upd<T>, i: number) => React.ReactNode }) {
  const move = (i: number, d: number) => set((a) => { const b = [...a]; [b[i], b[i + d]] = [b[i + d], b[i]]; return b; });
  return (
    <div>
      <ul className="space-y-4">
        {items.map((it, i) => (
          <li key={i} className="flex flex-col-reverse gap-2 rounded-xl border border-cream/10 bg-ink/40 p-3 sm:flex-row sm:p-4">
            <div className="min-w-0 flex-1 space-y-4">{children(it, at(set, i), i)}</div>
            <div className="-mt-1 flex justify-end sm:mt-0 sm:flex-col sm:justify-start">
              <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${noun} up`}>↑</button>
              <button type="button" className={iconBtn} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${noun} down`}>↓</button>
              <button type="button" className={`${iconBtn} hover:text-rose`} onClick={() => set((a) => a.filter((_, j) => j !== i))} aria-label={`Remove ${noun}`}>✕</button>
            </div>
          </li>
        ))}
      </ul>
      {items.length < max && (
        <button type="button" onClick={() => set((a) => [...a, blank])} className={`mt-4 ${addBtn}`}>
          + Add {noun}
        </button>
      )}
    </div>
  );
}

export function ColorField({ value, set, name }: { value: string; set: Upd<string>; name: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input type="color" value={value} onChange={(e) => set(() => e.target.value)} aria-label={name} className="size-11 cursor-pointer rounded-lg border border-cream/15 bg-ink p-1" />
      <span className="flex-1">
        <span className={label}>{name}</span>
        <span className="font-mono text-sm text-cream/80">{value}</span>
      </span>
    </label>
  );
}

/** One collapsible group; sharing `name` makes the browser keep only one open at a time. */
export function Section({ id, title, hint, open, children }: { id: string; title: string; hint?: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details
      id={id}
      name="settings"
      open={open}
      // The section closing above can push this one off screen; bring its header back.
      onToggle={(e) => e.currentTarget.open && e.currentTarget.scrollIntoView({ block: "nearest" })}
      className="group scroll-mt-6 rounded-2xl border border-cream/10 bg-ink-2 transition-colors open:border-gold/30"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl p-4 transition-colors hover:bg-cream/[0.03] focus-visible:outline focus-visible:outline-gold sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block font-serif text-2xl">{title}</span>
          {hint && <span className="mt-1 hidden text-sm text-cream/50 group-open:block">{hint}</span>}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0 text-cream/50 transition-transform duration-200 group-open:rotate-180" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="space-y-5 px-4 pb-5 pt-1 sm:px-6 sm:pb-6">{children}</div>
    </details>
  );
}
