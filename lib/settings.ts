import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { wedding } from "./wedding";

// Couple-editable site settings (admin → Settings). Stored at settings/site; defaults come from wedding.ts.
export type Settings = {
  theme: { gold: string; rose: string; ink: string };
  dressCode: { title: string; note: string; palette: { name: string; hex: string }[] };
};

export const defaultSettings: Settings = {
  theme: { gold: "#e8c069", rose: "#f58fb0", ink: "#0a0612" },
  dressCode: {
    title: wedding.dressCode.title,
    note: wedding.dressCode.note,
    palette: wedding.dressCode.palette.map(([name, hex]) => ({ name, hex })),
  },
};

const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : fallback);
const str = (v: unknown, fallback: string, max: number) => (typeof v === "string" ? v.slice(0, max) : fallback);

// Tolerates partial/old documents so a bad save can never blank the public site.
export function normalize(raw: unknown): Settings {
  const r = (raw ?? {}) as Partial<Record<keyof Settings, Record<string, unknown>>>;
  const d = defaultSettings;
  const palette = Array.isArray(r.dressCode?.palette) ? (r.dressCode!.palette as unknown[]) : null;
  return {
    theme: {
      gold: hex(r.theme?.gold, d.theme.gold),
      rose: hex(r.theme?.rose, d.theme.rose),
      ink: hex(r.theme?.ink, d.theme.ink),
    },
    dressCode: {
      title: str(r.dressCode?.title, d.dressCode.title, 80),
      note: str(r.dressCode?.note, d.dressCode.note, 400),
      palette: palette
        ? palette
            .slice(0, 8)
            .map((p) => {
              const x = (p ?? {}) as Record<string, unknown>;
              return { name: str(x.name, "", 40), hex: hex(x.hex, "#888888") };
            })
            .filter((p) => p.name)
        : d.dressCode.palette,
    },
  };
}

const ref = () => doc(db(), "settings", "site");

export const saveSettings = (s: Settings) => setDoc(ref(), normalize(s));

export function subscribeSettings(cb: (s: Settings) => void, onError?: (e: Error) => void) {
  if (!isFirebaseConfigured) {
    cb(defaultSettings);
    return () => {};
  }
  return onSnapshot(ref(), (snap) => cb(normalize(snap.data())), onError);
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  useEffect(() => subscribeSettings(setSettings, console.warn), []);
  return settings;
}

// Tailwind theme tokens live on :root, so overriding them re-themes every text-gold / bg-ink class.
export function applyTheme(theme: Settings["theme"]) {
  const root = document.documentElement.style;
  root.setProperty("--color-gold", theme.gold);
  root.setProperty("--color-rose", theme.rose);
  root.setProperty("--color-ink", theme.ink);
  root.setProperty("--color-ink-2", lighten(theme.ink, 0.06));
}

function lighten(h: string, amt: number) {
  const n = parseInt(h.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * amt));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}
