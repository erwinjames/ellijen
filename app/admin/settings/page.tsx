"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { defaultSettings, logoDataUrl, saveSettings, subscribeSettings, uploadImage, type Settings } from "@/lib/settings";
import { contrast, THEMES, youtubeId } from "@/lib/settings-utils";
import { at, ColorField, field, ImageField, label, List, Section, Text, type Upd } from "./fields";

// The site shows times in the venue's zone, so the editor reads and writes Philippine time.
// ponytail: fixed +08:00; make the offset a setting if a wedding ever happens elsewhere.
const OFFSET = "+08:00";
const toLocal = (iso: string) => new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 16);

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [s, setS] = useState<Settings>(defaultSettings);
  // Last version known to be in Firestore; edits replace `s`, so `s !== saved` means unsaved changes.
  const [saved, setSaved] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [wasReset, setWasReset] = useState(false);
  const [error, setError] = useState("");
  const dirty = saved !== null && s !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth(), (u) => (u ? setUser(u) : (setUser(null), router.replace("/admin/login"))));
  }, [router]);

  // Load once, then stop listening so a remote edit cannot overwrite what is being typed.
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeSettings(
      (remote) => {
        setS(remote);
        setSaved(remote);
        unsub();
      },
      (e) => setError(e.message),
    );
    return unsub;
  }, [user]);

  const set: Upd<Settings> = (f) => {
    setS(f);
    setJustSaved(false);
  };
  const k = <K extends keyof Settings>(key: K) => at(set, key);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const snap = s; // edits typed while saving stay unsaved
    setSaving(true);
    setError("");
    try {
      const n = await saveSettings(snap);
      setSaved(n);
      setS((cur) => (cur === snap ? n : cur));
      setWasReset(JSON.stringify(n) !== JSON.stringify(snap));
      setJustSaved(true);
    } catch (err) {
      setError((err as Error).message);
    }
    setSaving(false);
  }

  if (!isFirebaseConfigured) {
    return <main className="flex flex-1 items-center justify-center p-6 text-center text-cream/70">Firebase is not configured. Copy .env.local.example to .env.local and fill in your project keys.</main>;
  }
  if (!user || !saved)
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-center text-cream/50">
        {error ? <p role="alert" className="text-rose">Could not load settings: {error}</p> : "Loading…"}
      </main>
    );

  const yt = youtubeId(s.song);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-4xl">Site settings</h1>
        <Link href="/admin" className="text-sm text-cream/60 transition-colors hover:text-gold">
          ← RSVPs
        </Link>
      </header>
      <p className="mt-2 text-sm text-cream/50">Open a section, make your changes, then press Save. The layout and 3D scene stay as designed.</p>

      {/* A bad link in a closed section would block Save with no visible message, so open the section it is in. */}
      <form onSubmit={save} onInvalidCapture={(e) => (e.target as HTMLElement).closest("details")?.setAttribute("open", "")} className="mt-6 space-y-3">
        <Section id="couple" open title="Couple & date" hint="Shown on the envelope, the welcome screen and the countdown.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Text name="First name" value={s.couple.a} set={at(k("couple"), "a")} max={40} />
            <Text name="Second name" value={s.couple.b} set={at(k("couple"), "b")} max={40} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Ceremony (Philippine time)</span>
              <input type="datetime-local" required value={toLocal(s.date)} onChange={(e) => e.target.value && k("date")(() => `${e.target.value}:00${OFFSET}`)} className={`mt-2 ${field} [color-scheme:dark]`} />
            </label>
            <label className="block">
              <span className={label}>RSVP by</span>
              <input type="date" required value={s.rsvpDeadline} onChange={(e) => e.target.value && k("rsvpDeadline")(() => e.target.value)} className={`mt-2 ${field} [color-scheme:dark]`} />
            </label>
          </div>
          <Text name="Venue" value={s.venue.name} set={at(k("venue"), "name")} max={80} />
          <Text name="Venue address" value={s.venue.address} set={at(k("venue"), "address")} max={160} />
          <Text name="Map link" type="url" placeholder="https://maps.google.com/?q=…" value={s.venue.mapsUrl} set={at(k("venue"), "mapsUrl")} max={1000} />
          <Text name="Hashtag" value={s.hashtag} set={k("hashtag")} max={60} />
          <ImageField name="Wax seal logo (dark artwork, transparent PNG; empty = initials)" round value={s.sealLogo} set={k("sealLogo")} upload={logoDataUrl} />
        </Section>

        <Section id="story" title="Our story" hint="Three chapters; the 3D camera moves with each one.">
          {s.story.map((c, i) => {
            const ch = at(k("story"), i);
            return (
              <div key={c.key} className="space-y-4 rounded-xl border border-cream/10 bg-ink/40 p-4">
                <p className="font-serif text-lg text-gold">Chapter {i + 1}</p>
                <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                  <Text name="Year" value={c.year} set={at(ch, "year")} max={20} />
                  <Text name="Title" value={c.title} set={at(ch, "title")} max={80} />
                </div>
                <Text name="Text" area value={c.text} set={at(ch, "text")} max={600} />
                <ImageField name="Photo" value={c.image} set={at(ch, "image")} upload={uploadImage} />
              </div>
            );
          })}
        </Section>

        <Section id="program" title="Order of the day">
          <List items={s.program} set={k("program")} blank={{ time: "", title: "", note: "" }} noun="item">
            {(p, set) => (
              <>
                <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                  <Text name="Time" placeholder="e.g. 3:00 PM" value={p.time} set={at(set, "time")} max={20} />
                  <Text name="What" value={p.title} set={at(set, "title")} max={80} />
                </div>
                <Text name="Note" value={p.note} set={at(set, "note")} max={200} />
              </>
            )}
          </List>
        </Section>

        <Section id="entourage" title="Entourage" hint="Groups like Groomsmen or Bridesmaids, each with its people. Photos are optional (initials show otherwise).">
          <List items={s.entourage} set={k("entourage")} blank={{ role: "", people: [{ name: "", note: "", image: "" }] }} noun="group">
            {(g, set) => (
              <>
                <Text name="Group" placeholder="e.g. Groomsmen" value={g.role} set={at(set, "role")} max={60} />
                <List items={g.people} set={at(set, "people")} blank={{ name: "", note: "", image: "" }} noun="person">
                  {(p, set) => (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Text name="Name" value={p.name} set={at(set, "name")} max={80} />
                        <Text name="Note (optional)" placeholder="e.g. Candle" value={p.note} set={at(set, "note")} max={40} />
                      </div>
                      <ImageField name="Photo" round value={p.image} set={at(set, "image")} upload={uploadImage} />
                    </>
                  )}
                </List>
              </>
            )}
          </List>
        </Section>

        <Section id="gallery" title="Gallery">
          <List items={s.gallery} set={k("gallery")} blank="" noun="photo">
            {(src, set, i) => <ImageField name={`Photo ${i + 1}`} value={src} set={set} upload={uploadImage} />}
          </List>
        </Section>

        <Section id="faq" title="Questions & answers">
          <List items={s.faq} set={k("faq")} blank={{ q: "", a: "" }} noun="question">
            {(f, set) => (
              <>
                <Text name="Question" value={f.q} set={at(set, "q")} max={160} />
                <Text name="Answer" area value={f.a} set={at(set, "a")} max={800} />
              </>
            )}
          </List>
        </Section>

        <Section id="gifts" title="Gifts & travel">
          <Text name="Gift note" area value={s.gifts.note} set={at(k("gifts"), "note")} max={600} />
          <Text name="Registry link (optional)" type="url" placeholder="https://…" value={s.gifts.registryUrl} set={at(k("gifts"), "registryUrl")} max={1000} />
          <Text name="Travel note" area value={s.travel.note} set={at(k("travel"), "note")} max={600} />
          <div>
            <span className={label}>Places to stay</span>
            <div className="mt-3">
              <List items={s.travel.stays} set={at(k("travel"), "stays")} blank={{ name: "", note: "", url: "" }} noun="place">
                {(h, set) => (
                  <>
                    <Text name="Name" value={h.name} set={at(set, "name")} max={80} />
                    <Text name="Note" placeholder="e.g. 10 min from the venue" value={h.note} set={at(set, "note")} max={120} />
                    <Text name="Website" type="url" placeholder="https://…" value={h.url} set={at(set, "url")} max={1000} />
                  </>
                )}
              </List>
            </div>
          </div>
        </Section>

        <Section id="theme" title="Theme colours" hint="Pick a look, or fine-tune each colour. It recolours the whole public site, including the 3D sky, rings and sparkles.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {THEMES.map(({ name, colors: c }) => {
              const on = (Object.keys(c) as (keyof typeof c)[]).every((key) => c[key] === s.theme[key]);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => k("theme")(() => c)}
                  style={{ background: c.ink, color: c.cream }}
                  className={`cursor-pointer rounded-xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-gold ${on ? "border-gold ring-1 ring-gold" : "border-cream/15 hover:border-cream/40"}`}
                >
                  <span className="flex gap-1.5" aria-hidden>
                    {[c.gold, c.rose, c.cream].map((hex) => (
                      <span key={hex} className="size-4 rounded-full border border-black/10" style={{ background: hex }} />
                    ))}
                  </span>
                  <span className="mt-2 block font-serif text-lg leading-tight">{name}</span>
                </button>
              );
            })}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <ColorField name="Background" value={s.theme.ink} set={at(k("theme"), "ink")} />
            <ColorField name="Text" value={s.theme.cream} set={at(k("theme"), "cream")} />
            <ColorField name="Accent (headings, buttons, rings)" value={s.theme.gold} set={at(k("theme"), "gold")} />
            <ColorField name="Highlight (sparkles, notes)" value={s.theme.rose} set={at(k("theme"), "rose")} />
          </div>
          <div className="rounded-xl p-5" style={{ background: s.theme.ink, color: s.theme.cream }}>
            <p className="text-xs uppercase tracking-[0.4em]" style={{ color: s.theme.gold }}>
              Preview
            </p>
            <p className="mt-2 font-serif text-3xl">
              {s.couple.a} &amp; {s.couple.b}
            </p>
            <p className="mt-1 text-sm opacity-75">
              Guests read text like this. <span style={{ color: s.theme.rose }}>Highlights look like this.</span>
            </p>
            <span className="mt-4 inline-block rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.3em]" style={{ background: s.theme.gold, color: s.theme.ink }}>
              RSVP
            </span>
          </div>
          {(contrast(s.theme.cream, s.theme.ink) < 4.5 || contrast(s.theme.gold, s.theme.ink) < 3) && (
            <p role="status" className="text-sm text-rose">
              Hard to read: {contrast(s.theme.cream, s.theme.ink) < 4.5 ? "the text" : "the accent"} is too close to the background. Pick a lighter or darker colour.
            </p>
          )}
        </Section>

        <Section id="dress" title="Dress code">
          <Text name="Title" value={s.dressCode.title} set={at(k("dressCode"), "title")} max={80} />
          <Text name="Note to guests" area value={s.dressCode.note} set={at(k("dressCode"), "note")} max={400} />
          <div>
            <span className={label}>Colour palette</span>
            <div className="mt-3">
              <List items={s.dressCode.palette} set={at(k("dressCode"), "palette")} blank={{ name: "", hex: "#888888" }} noun="colour" max={8}>
                {(p, set) => (
                  <div className="flex items-center gap-3">
                    <input type="color" value={p.hex} aria-label="Colour" onChange={(e) => at(set, "hex")(() => e.target.value)} className="size-11 shrink-0 cursor-pointer rounded-lg border border-cream/15 bg-ink p-1" />
                    <input value={p.name} maxLength={40} placeholder="Colour name" aria-label="Colour name" onChange={(e) => at(set, "name")(() => e.target.value)} className={field} />
                  </div>
                )}
              </List>
            </div>
          </div>
        </Section>

        <Section id="music" title="Theme music" hint="Plays when guests open the envelope. Paste a YouTube link or its embed code (YouTube → Share → Embed), or a direct link to an mp3. Leave empty for the built-in music-box tune.">
          <label className="block">
            <span className={label}>Song</span>
            <input
              value={s.song}
              placeholder="https://www.youtube.com/watch?v=… or <iframe …>"
              onChange={(e) => {
                const v = e.target.value.trim();
                const id = youtubeId(v);
                k("song")(() => (id ? `https://www.youtube.com/embed/${id}` : v.slice(0, 1000)));
              }}
              className={`mt-2 ${field}`}
            />
          </label>
          {s.song && !/^(https:\/\/|\/[^/])/.test(s.song) && <p className="text-sm text-rose">Use a YouTube link, an https:// mp3 link, or a /path under public/.</p>}
          {yt && (
            <div>
              <p className="text-sm text-cream/60">YouTube video found. Guests hear its audio; the video stays hidden.</p>
              <iframe src={`https://www.youtube-nocookie.com/embed/${yt}`} title="Theme song preview" loading="lazy" allow="encrypted-media; picture-in-picture" className="mt-3 aspect-video w-full max-w-md rounded-xl border border-cream/10" />
            </div>
          )}
          {s.song && (
            <button type="button" onClick={() => k("song")(() => "")} className="cursor-pointer text-sm text-cream/50 transition-colors hover:text-cream">
              Use the music-box tune instead
            </button>
          )}
        </Section>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-4 border-t border-cream/10 bg-ink/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
          <button disabled={saving || !dirty} className="cursor-pointer rounded-full bg-gold px-8 py-3 text-sm uppercase tracking-[0.3em] text-ink transition hover:brightness-110 disabled:cursor-default disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
          {justSaved && !dirty && !wasReset && <span className="text-sm text-emerald-300">Saved. The public site updates instantly.</span>}
          {justSaved && !dirty && wasReset && <span role="status" className="text-sm text-gold">Saved. Some entries weren&apos;t valid (links must start with https://) and were reset — please check them.</span>}
          {dirty && !saving && <span className="text-sm text-cream/50">Unsaved changes</span>}
          {error && <p role="alert" className="text-sm text-rose">{error}</p>}
        </div>
      </form>
    </main>
  );
}
