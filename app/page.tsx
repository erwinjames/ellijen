"use client";

import Countdown from "@/components/Countdown";
import DressCode from "@/components/DressCode";
import Invitation from "@/components/Invitation";
import Photo from "@/components/Photo";
import Reveal from "@/components/Reveal";
import RsvpForm from "@/components/RsvpForm";
import { useSettings } from "@/lib/settings";
import { initials } from "@/lib/settings-utils";

function Title({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <p
        data-reveal
        className="text-xs uppercase tracking-[0.5em] text-gold/80"
      >
        {eyebrow}
      </p>
      <h2
        data-reveal
        className="mt-4 font-serif text-5xl font-light sm:text-6xl"
      >
        {children}
      </h2>
    </>
  );
}

const card = "rounded-3xl border border-cream/10 bg-ink-2/85 backdrop-blur";

// Client page: all copy and photos come live from admin → Settings (wedding.ts holds the defaults).
export default function Home() {
  const wedding = useSettings();
  const time = new Date(wedding.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
  const deadline = new Date(wedding.rsvpDeadline).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  return (
    <>
      <Invitation />

      {/* body is a flex column: without a block wrapper, mx-auto sections shrink-wrap to their content */}
      <main className="w-full overflow-x-clip">
        {/* ---- Our story: one chapter per scroll, photo on alternating sides ---- */}
        <section
          id="story"
          className="mx-auto max-w-6xl scroll-mt-16 px-6 pt-32"
        >
          <Reveal className="text-center">
            <Title eyebrow="Our story">Two rings, one promise</Title>
          </Reveal>
          {wedding.story.map((c, i) => (
            <div key={c.key} data-chapter={c.key}>
              <Reveal className="relative grid min-h-[80vh] items-center gap-10 py-16 sm:grid-cols-2 sm:gap-16">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-4 left-0 select-none font-serif text-[10rem] leading-none text-gold/5 sm:text-[16rem]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div
                  data-reveal={i % 2 ? "right" : "left"}
                  className={`aspect-[4/5] ${i % 2 ? "sm:order-2" : ""}`}
                >
                  <Photo
                    src={c.image}
                    alt={c.title}
                    parallax
                    className="h-full shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
                  />
                </div>
                <div
                  className={`relative [text-shadow:0_2px_24px_var(--color-ink)] ${i % 2 ? "sm:order-1 sm:text-right" : ""}`}
                >
                  <p
                    data-reveal="pop"
                    className="font-serif text-6xl text-gold/70"
                  >
                    {c.year}
                  </p>
                  <h3
                    data-reveal
                    className="mt-3 font-serif text-4xl sm:text-5xl"
                  >
                    {c.title}
                  </h3>
                  <p
                    data-reveal
                    className="mt-5 max-w-md font-serif text-xl leading-relaxed text-cream/75 sm:ml-auto sm:mr-0"
                  >
                    {c.text}
                  </p>
                </div>
              </Reveal>
            </div>
          ))}
        </section>

        {/* ---- Countdown ---- */}
        <div data-chapter="countdown">
          <Reveal className="mx-auto max-w-3xl px-6 py-24 text-center">
            <p
              data-reveal
              className="mb-8 text-xs uppercase tracking-[0.5em] text-gold/80"
            >
              Counting down
            </p>
            <Countdown />
          </Reveal>
        </div>

        {/* ---- Details + program ---- */}
        <section
          id="details"
          data-chapter="details"
          className="mx-auto max-w-5xl scroll-mt-16 px-6 py-24"
        >
          <Reveal className="text-center">
            <Title eyebrow="The day">When &amp; where</Title>
          </Reveal>
          <Reveal className="mt-14 grid gap-6 sm:grid-cols-3">
            {[
              ["Ceremony", time, wedding.venue.name],
              ["Reception", "To follow", wedding.venue.name],
              [
                "Dress code",
                wedding.dressCode.title.split(" ")[0],
                "See palette below",
              ],
            ].map(([title, a, b]) => (
              <div
                key={title}
                data-reveal="flip"
                className={`${card} p-8 text-center`}
              >
                <p className="text-xs uppercase tracking-[0.4em] text-gold/80">
                  {title}
                </p>
                <p className="mt-4 font-serif text-3xl">{a}</p>
                <p className="mt-2 text-cream/60">{b}</p>
              </div>
            ))}
            {wedding.venue.mapsUrl ? (
              <a
                data-reveal
                href={wedding.venue.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-sm uppercase tracking-[0.3em] text-gold underline-offset-8 hover:underline sm:col-span-3"
              >
                {wedding.venue.address} · open in maps
              </a>
            ) : (
              <p data-reveal className="text-center text-sm uppercase tracking-[0.3em] text-gold sm:col-span-3">
                {wedding.venue.address}
              </p>
            )}
          </Reveal>

          <div data-chapter="program">
            <Reveal className="mx-auto mt-24 max-w-2xl">
              <p
                data-reveal
                className="text-center text-xs uppercase tracking-[0.5em] text-gold/80"
              >
                Order of the day
              </p>
              <ol className="mt-10 border-l border-gold/30 pl-8">
                {wedding.program.map((p, i) => (
                  <li
                    key={i}
                    data-reveal="left"
                    className="relative pb-10 last:pb-0"
                  >
                    <span className="absolute -left-[2.55rem] top-1.5 size-3 rounded-full bg-gold shadow-[0_0_14px_3px_color-mix(in_srgb,var(--color-gold)_50%,transparent)]" />
                    <p className="font-serif text-2xl text-gold">{p.time}</p>
                    <p className="mt-1 font-serif text-2xl">{p.title}</p>
                    <p className="mt-1 text-cream/60">{p.note}</p>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </section>

        {/* ---- Entourage ---- */}
        <section
          id="entourage"
          data-chapter="entourage"
          className="mx-auto max-w-6xl scroll-mt-16 px-6 py-24"
        >
          <Reveal className="text-center">
            <Title eyebrow="Entourage">The people beside us</Title>
            <p
              data-reveal
              className="mx-auto mt-5 max-w-xl font-serif text-xl text-cream/70"
            >
              Family and friends who have carried us here, and will walk with us
              down the aisle.
            </p>
          </Reveal>
          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {wedding.entourage.map((g, gi) => (
              <Reveal
                key={gi}
                className={`${card} p-7 ${g.people.length > 2 ? "sm:col-span-2" : ""}`}
              >
                <p
                  data-reveal
                  className="text-center text-xs uppercase tracking-[0.4em] text-gold/80"
                >
                  {g.role}
                </p>
                <ul
                  className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-7 sm:gap-x-10"
                >
                  {g.people.map((p, i) => (
                    <li
                      key={i}
                      data-reveal="pop"
                      className="flex w-32 flex-col items-center text-center sm:w-36"
                    >
                      {p.image ? (
                        <Photo
                          src={p.image}
                          alt={p.name}
                          label=""
                          rounded="rounded-full"
                          className="size-24"
                        />
                      ) : (
                        <span className="flex size-24 items-center justify-center rounded-full border border-gold/50 bg-gradient-to-br from-ink-2 to-ink font-serif text-3xl italic text-gold">
                          {initials(p.name)}
                        </span>
                      )}
                      <p className="mt-3 font-serif text-lg leading-tight">
                        {p.name}
                      </p>
                      {p.note && (
                        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-cream/70">
                          {p.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---- Dress code (editable in admin → Settings) ---- */}
      <section data-chapter="palette" className="mx-auto max-w-4xl px-6 py-24 text-center">
        <Reveal>
          <DressCode />
        </Reveal>
      </section>

      {/* ---- Gallery ---- */}
        <section
          id="gallery"
          data-chapter="gallery"
          className="mx-auto max-w-6xl scroll-mt-16 px-6 py-24"
        >
          <Reveal className="text-center">
            <Title eyebrow="Gallery">Moments so far</Title>
          </Reveal>
          <Reveal className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {wedding.gallery.map((src, i) => (
              <div
                key={i}
                data-reveal="pop"
                className={
                  i % 3 === 1 ? "aspect-[3/4]" : "aspect-[4/5] sm:translate-y-8"
                }
              >
                <Photo
                  src={src}
                  alt={`Gallery photo ${i + 1}`}
                  label=""
                  parallax
                  className="h-full"
                />
              </div>
            ))}
          </Reveal>
        </section>

        {/* ---- FAQ ---- */}
        <section
          id="faq"
          data-chapter="faq"
          className="mx-auto max-w-3xl scroll-mt-16 px-6 py-24"
        >
          <Reveal className="text-center">
            <Title eyebrow="Good to know">Questions &amp; answers</Title>
          </Reveal>
          <Reveal className="mt-12 space-y-3">
            {wedding.faq.map((f, i) => (
              <details
                key={i}
                data-reveal
                className={`group ${card} px-6 py-5 open:border-gold/40`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-2xl marker:hidden">
                  {f.q}
                  <span className="text-gold transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-cream/70">{f.a}</p>
              </details>
            ))}
          </Reveal>
        </section>

        {/* ---- Gifts + travel ---- */}
        <section
          data-chapter="travel"
          className="mx-auto grid max-w-5xl gap-8 px-6 py-24 md:grid-cols-2"
        >
          <Reveal className={`${card} p-6 text-center sm:p-10`}>
            <Title eyebrow="Gifts">With love</Title>
            <p
              data-reveal
              className="mt-5 font-serif text-xl leading-relaxed text-cream/70"
            >
              {wedding.gifts.note}
            </p>
            {wedding.gifts.registryUrl && (
              <a
                data-reveal
                href={wedding.gifts.registryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-block rounded-full border border-gold/60 px-8 py-3 text-sm uppercase tracking-[0.3em] text-gold transition hover:bg-gold hover:text-ink"
              >
                View registry
              </a>
            )}
          </Reveal>
          <Reveal className={`${card} p-6 sm:p-10`}>
            <Title eyebrow="Travel & stay">Getting there</Title>
            <p
              data-reveal
              className="mt-5 font-serif text-xl leading-relaxed text-cream/70"
            >
              {wedding.travel.note}
            </p>
            <ul className="mt-8 space-y-4">
              {wedding.travel.stays.map((h, i) => (
                <li key={i} data-reveal="left">
                  {h.url ? (
                    <a
                      href={h.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-serif text-2xl text-gold underline-offset-6 hover:underline"
                    >
                      {h.name}
                    </a>
                  ) : (
                    <p className="font-serif text-2xl text-gold">{h.name}</p>
                  )}
                  <p className="text-sm text-cream/60">{h.note}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* ---- RSVP ---- */}
        <div data-chapter="rsvp">
          <Reveal className="mx-auto max-w-xl px-6 py-24">
            <div id="rsvp" className="scroll-mt-24 text-center">
              <Title eyebrow="RSVP">Will you join us?</Title>
              <p data-reveal className="mt-4 mb-10 text-cream/60">
                Kindly reply by {deadline}.
              </p>
            </div>
            <div data-reveal="pop">
              <RsvpForm />
            </div>
          </Reveal>
        </div>

        <footer className="py-16 text-center font-serif text-lg italic text-cream/60">
          {wedding.hashtag} · {wedding.couple.a} &amp; {wedding.couple.b}
        </footer>
      </main>
    </>
  );
}
