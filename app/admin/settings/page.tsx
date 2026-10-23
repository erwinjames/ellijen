"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { defaultSettings, saveSettings, subscribeSettings, type Settings } from "@/lib/settings";

const field = "w-full rounded-xl border border-cream/15 bg-ink px-4 py-3 outline-none focus:border-gold";
const label = "block text-xs uppercase tracking-[0.3em] text-cream/60";

function ColorField({ value, onChange, name }: { value: string; onChange: (v: string) => void; name: string }) {
  return (
    <label className="flex items-center gap-3">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={name} className="size-11 cursor-pointer rounded-lg border border-cream/15 bg-ink p-1" />
      <span className="flex-1">
        <span className={label}>{name}</span>
        <span className="font-mono text-sm text-cream/80">{value}</span>
      </span>
    </label>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [s, setS] = useState<Settings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth(), (u) => (u ? setUser(u) : router.replace("/admin/login")));
  }, [router]);

  // Load once, then stop listening so a remote edit cannot overwrite what is being typed.
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeSettings(
      (remote) => {
        setS(remote);
        setLoaded(true);
        unsub();
      },
      (e) => setError(e.message),
    );
    return unsub;
  }, [user]);

  const theme = (k: keyof Settings["theme"], v: string) => setS({ ...s, theme: { ...s.theme, [k]: v } });
  const dress = (patch: Partial<Settings["dressCode"]>) => setS({ ...s, dressCode: { ...s.dressCode, ...patch } });
  const palette = (i: number, patch: Partial<{ name: string; hex: string }>) =>
    dress({ palette: s.dressCode.palette.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      await saveSettings(s);
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
    }
  }

  if (!isFirebaseConfigured) {
    return <main className="flex flex-1 items-center justify-center p-6 text-center text-cream/70">Firebase is not configured. Copy .env.local.example to .env.local and fill in your project keys.</main>;
  }
  if (!user || !loaded) return <main className="flex flex-1 items-center justify-center text-cream/50">Loading…</main>;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-4xl">Site settings</h1>
        <Link href="/admin" className="text-sm text-cream/60 hover:text-gold">
          ← RSVPs
        </Link>
      </header>

      <form onSubmit={save} className="mt-8 space-y-10">
        <section className="rounded-2xl border border-cream/10 bg-ink-2 p-6">
          <h2 className="font-serif text-2xl">Theme colours</h2>
          <p className="mt-1 text-sm text-cream/50">Accent, highlight and background of the public site (text, buttons, countdown, the 3D rings and sparkles).</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <ColorField name="Accent (gold)" value={s.theme.gold} onChange={(v) => theme("gold", v)} />
            <ColorField name="Highlight (rose)" value={s.theme.rose} onChange={(v) => theme("rose", v)} />
            <ColorField name="Background" value={s.theme.ink} onChange={(v) => theme("ink", v)} />
          </div>
          <div className="mt-6 flex items-center gap-4 rounded-xl p-5" style={{ background: s.theme.ink }}>
            <span className="font-serif text-3xl italic" style={{ color: s.theme.gold }}>
              Preview
            </span>
            <span className="rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.3em]" style={{ background: s.theme.gold, color: s.theme.ink }}>
              Button
            </span>
            <span className="text-sm" style={{ color: s.theme.rose }}>
              highlight
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-cream/10 bg-ink-2 p-6">
          <h2 className="font-serif text-2xl">Dress code</h2>
          <div className="mt-6 space-y-5">
            <label className="block">
              <span className={label}>Title</span>
              <input value={s.dressCode.title} maxLength={80} onChange={(e) => dress({ title: e.target.value })} className={`mt-2 ${field}`} />
            </label>
            <label className="block">
              <span className={label}>Note to guests</span>
              <textarea value={s.dressCode.note} maxLength={400} rows={3} onChange={(e) => dress({ note: e.target.value })} className={`mt-2 ${field}`} />
            </label>
            <div>
              <span className={label}>Colour palette</span>
              <ul className="mt-3 space-y-3">
                {s.dressCode.palette.map((p, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <input type="color" value={p.hex} aria-label={`Colour ${i + 1}`} onChange={(e) => palette(i, { hex: e.target.value })} className="size-11 cursor-pointer rounded-lg border border-cream/15 bg-ink p-1" />
                    <input value={p.name} maxLength={40} placeholder="Colour name" onChange={(e) => palette(i, { name: e.target.value })} className={field} />
                    <button type="button" onClick={() => dress({ palette: s.dressCode.palette.filter((_, j) => j !== i) })} className="px-2 text-cream/40 hover:text-rose" aria-label="Remove colour">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              {s.dressCode.palette.length < 8 && (
                <button type="button" onClick={() => dress({ palette: [...s.dressCode.palette, { name: "", hex: "#888888" }] })} className="mt-3 text-sm text-gold hover:underline">
                  + Add colour
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-cream/10 bg-ink-2 p-6">
          <h2 className="font-serif text-2xl">Theme music</h2>
          <p className="mt-1 text-sm text-cream/50">
            Plays when guests open the envelope. Paste a direct link to an mp3 (the link itself must play the file, not open a page), or a path under public/ like /audio/song.mp3. Leave empty for the built-in music-box tune.
          </p>
          <label className="mt-6 block">
            <span className={label}>Song link</span>
            <input type="url" value={s.song} maxLength={1000} placeholder="https://…/song.mp3" onChange={(e) => setS({ ...s, song: e.target.value.trim() })} className={`mt-2 ${field}`} />
          </label>
          {s.song && !/^(https:\/\/|\/)/.test(s.song) && <p className="mt-2 text-sm text-rose">Use an https:// link or a /path under public/.</p>}        </section>

        {error && <p role="alert" className="text-sm text-rose">{error}</p>}
        <div className="flex items-center gap-4">
          <button disabled={status === "saving"} className="rounded-full bg-gold px-8 py-3 text-sm uppercase tracking-[0.3em] text-ink disabled:opacity-60">
            {status === "saving" ? "Saving…" : "Save"}
          </button>
          {status === "saved" && <span className="text-sm text-emerald-300">Saved. The public site updates instantly.</span>}
          <button type="button" onClick={() => setS({ ...defaultSettings, song: s.song })} className="ml-auto text-sm text-cream/50 hover:text-cream">
            Reset colours &amp; dress code
          </button>
        </div>
      </form>
    </main>
  );
}
