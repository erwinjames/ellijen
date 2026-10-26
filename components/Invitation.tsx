"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { SceneHandle } from "./scene/WeddingScene";
import type { Card } from "./scene/envelope";
import { createPlayer, type Player } from "@/lib/music";
import { applyTheme, useSettings } from "@/lib/settings";
import Hero from "./Hero";
import Nav from "./Nav";
import Vinyl from "./Vinyl";

// Owns the 3D canvas, the envelope → story state, scroll lock, and the music player.
export default function Invitation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const playerRef = useRef<Player | null>(null);
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(false);
  const [opened, setOpened] = useState(false);
  const [playing, setPlaying] = useState(false);
  const { theme, song, couple, date, venue, sealLogo } = useSettings();
  const themeRef = useRef(theme);
  const card = useMemo<Card>(() => ({ a: couple.a, b: couple.b, date, venue: venue.name, sealLogo }), [couple.a, couple.b, date, venue.name, sealLogo]);
  const cardRef = useRef(card);

  useEffect(() => {
    cardRef.current = card;
    handleRef.current?.setCard(card);
  }, [card]);

  // Made ahead of the opening tap: a YouTube player needs to have loaded for play() to count as part of that gesture.
  useEffect(() => {
    const p = createPlayer(song, setPlaying);
    playerRef.current = p;
    return () => {
      p.dispose();
      playerRef.current = null;
      setPlaying(false);
    };
  }, [song]);

  // Admin-chosen colours: CSS tokens for the page, material colours for the scene.
  useEffect(() => {
    themeRef.current = theme;
    applyTheme(theme);
    handleRef.current?.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    let triggers: ScrollTrigger[] = [];
    let cancelled = false;
    gsap.registerPlugin(ScrollTrigger);
    // Every visit starts at the envelope (top, scroll-locked): drop ScrollTrigger's remembered story scroll, which it
    // would restore on its next refresh, and stop the browser restoring it on back/forward.
    // ponytail: scrollRestoration is app-wide, so admin pages also lose back/forward scroll restore.
    ScrollTrigger.clearScrollMemory("manual");
    window.scrollTo(0, 0);

    import("./scene/WeddingScene").then(({ createWeddingScene }) => {
      if (cancelled || !canvasRef.current) return;
      try {
        handleRef.current = createWeddingScene(canvasRef.current, {
          card: cardRef.current,
          onReady: () => setReady(true),
          onOpenStart: () => {
            setOpening(true);
            playerRef.current?.play();
          },
          onOpened: () => setOpened(true),
        });
        handleRef.current.setTheme(themeRef.current);
        // Whichever [data-chapter] section straddles the viewport centre drives the 3D scene.
        triggers = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]")).map((el) =>
          ScrollTrigger.create({
            trigger: el,
            start: "top center",
            end: "bottom center",
            onToggle: (self) => self.isActive && handleRef.current?.setChapter(el.dataset.chapter!),
          }),
        );
      } catch (err) {
        // No WebGL: skip the envelope and show the plain page.
        console.warn("3D scene unavailable", err);
        setReady(true);
        setOpened(true);
      }
    });

    return () => {
      cancelled = true;
      triggers.forEach((t) => t.kill());
      handleRef.current?.dispose();
      // cacheComponents hides this route in <Activity> on navigation: state survives but the scene above is rebuilt
      // at the envelope, so reset to match it.
      handleRef.current = null;
      setReady(false);
      setOpening(false);
      setOpened(false);
    };
  }, []);

  // Scroll stays locked until the envelope has been opened.
  useEffect(() => {
    document.documentElement.style.overflow = opened ? "" : "hidden";
    if (opened) ScrollTrigger.refresh();
    return () => void (document.documentElement.style.overflow = "");
  }, [opened]);

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 -z-10 h-full w-full" aria-hidden />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-ink transition-opacity duration-1000 ${
          ready ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        aria-hidden={ready}
      >
        <p className="font-serif text-2xl italic tracking-widest text-gold animate-pulse">
          {couple.a} &amp; {couple.b}
        </p>
      </div>
      <Hero opening={opening} opened={opened} onOpen={() => handleRef.current?.open()} />
      {opened && <Nav />}
      {opened && <Vinyl playing={playing} onToggle={() => playerRef.current?.toggle()} />}
    </>
  );
}
