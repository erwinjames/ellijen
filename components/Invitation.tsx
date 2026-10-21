"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { SceneHandle } from "./scene/WeddingScene";
import { createPlayer, type Player } from "@/lib/music";
import { applyTheme, useSettings } from "@/lib/settings";
import { wedding } from "@/lib/wedding";
import Hero from "./Hero";
import Nav from "./Nav";
import Vinyl from "./Vinyl";

// Owns the 3D canvas, the envelope → story state, scroll lock, and the music player.
export default function Invitation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const playerRef = useRef<Player | null>(null);
  const [ready, setReady] = useState(false);
  const [opened, setOpened] = useState(false);
  const [playing, setPlaying] = useState(false);
  const { theme } = useSettings();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  // Admin-chosen colours: CSS tokens for the page, material colours for the scene.
  useEffect(() => {
    applyTheme(theme);
    handleRef.current?.setTheme(theme.gold, theme.rose);
  }, [theme]);

  useEffect(() => {
    let triggers: ScrollTrigger[] = [];
    let cancelled = false;
    gsap.registerPlugin(ScrollTrigger);
    playerRef.current = createPlayer(wedding.songUrl, setPlaying);

    import("./scene/WeddingScene").then(({ createWeddingScene }) => {
      if (cancelled || !canvasRef.current) return;
      try {
        handleRef.current = createWeddingScene(canvasRef.current, {
          onReady: () => setReady(true),
          onOpenStart: () => playerRef.current?.play(),
          onOpened: () => setOpened(true),
        });
        handleRef.current.setTheme(themeRef.current.gold, themeRef.current.rose);
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
      playerRef.current?.dispose();
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
          {wedding.couple.a} &amp; {wedding.couple.b}
        </p>
      </div>
      <Hero opened={opened} onOpen={() => handleRef.current?.open()} />
      {opened && <Nav />}
      {opened && <Vinyl playing={playing} onToggle={() => playerRef.current?.toggle()} />}
    </>
  );
}
