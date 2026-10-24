"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { submitRsvp } from "@/lib/rsvp";
import { useSettings } from "@/lib/settings";
import { wedding } from "@/lib/wedding";

type Status = "idle" | "sending" | "done" | "error";

export default function RsvpForm() {
  const [attending, setAttending] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const { rsvpDeadline } = useSettings();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (attending === null) return setError("Please let us know if you can make it.");
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    if (!name) return setError("Please tell us your name.");
    setError("");
    setStatus("sending");
    try {
      await submitRsvp({
        name: name.slice(0, 120),
        email: String(f.get("email") ?? "").trim().slice(0, 200),
        attending,
        guests: attending ? Math.min(wedding.maxGuestsPerRsvp, Math.max(0, Number(f.get("guests") ?? 0))) : 0,
        message: String(f.get("message") ?? "").trim().slice(0, 1000),
      });
      gsap.to(formRef.current, { opacity: 0, y: -20, duration: 0.5, onComplete: () => setStatus("done") });
    } catch (err) {
      console.error(err);
      setStatus("error");
      setError("Something went wrong sending your RSVP. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-3xl border border-gold/40 bg-ink-2/70 p-10 text-center backdrop-blur">
        <p className="font-serif text-4xl italic text-gold">{attending ? "We can't wait to see you!" : "We'll miss you."}</p>
        <p className="mt-4 text-cream/70">{attending ? "Your seat is saved." : "Thank you for letting us know."}</p>
      </div>
    );
  }

  const pill = (yes: boolean) =>
    `flex-1 rounded-full border px-6 py-4 font-serif text-xl transition ${
      attending === yes ? "border-gold bg-gold text-ink" : "border-cream/20 text-cream/80 hover:border-gold/60"
    }`;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6 rounded-3xl border border-cream/10 bg-ink-2/85 p-6 backdrop-blur sm:p-10">
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" className={pill(true)} onClick={() => setAttending(true)} aria-pressed={attending === true}>
          Joyfully accepts
        </button>
        <button type="button" className={pill(false)} onClick={() => setAttending(false)} aria-pressed={attending === false}>
          Regretfully declines
        </button>
      </div>

      <label className="block">
        <span className="text-xs uppercase tracking-[0.3em] text-cream/60">Full name</span>
        <input name="name" required maxLength={120} autoComplete="name" className="mt-2 w-full rounded-xl border border-cream/15 bg-ink px-4 py-3 outline-none focus:border-gold" />
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-[0.3em] text-cream/60">Email (optional)</span>
        <input name="email" type="email" maxLength={200} autoComplete="email" className="mt-2 w-full rounded-xl border border-cream/15 bg-ink px-4 py-3 outline-none focus:border-gold" />
      </label>

      {attending && (
        <label className="block">
          <span className="text-xs uppercase tracking-[0.3em] text-cream/60">Additional guests</span>
          <select name="guests" defaultValue="0" className="mt-2 w-full rounded-xl border border-cream/15 bg-ink px-4 py-3 outline-none focus:border-gold">
            {Array.from({ length: wedding.maxGuestsPerRsvp + 1 }, (_, i) => (
              <option key={i} value={i}>
                {i === 0 ? "Just me" : `+${i}`}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="text-xs uppercase tracking-[0.3em] text-cream/60">Message, dietary needs, song requests</span>
        <textarea name="message" rows={3} maxLength={1000} className="mt-2 w-full rounded-xl border border-cream/15 bg-ink px-4 py-3 outline-none focus:border-gold" />
      </label>

      {error && <p role="alert" className="text-sm text-rose">{error}</p>}

      <button type="submit" disabled={status === "sending"} className="w-full rounded-full bg-gold py-4 text-sm uppercase tracking-[0.3em] text-ink transition hover:brightness-110 disabled:opacity-60">
        {status === "sending" ? "Sending…" : "Send RSVP"}
      </button>
      <p className="text-center text-xs text-cream/50">Kindly reply by {new Date(rsvpDeadline).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}.</p>
    </form>
  );
}
