import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { wedding } from "./wedding";

import { lighten, normalize as normalizeWith, type Settings } from "./settings-utils";

export type { Settings } from "./settings-utils";

// Couple-editable site settings (admin → Settings). Stored at settings/site; defaults come from wedding.ts.
export const defaultSettings: Settings = {
  theme: { gold: "#e8c069", rose: "#f58fb0", ink: "#0a0612" },
  dressCode: {
    title: wedding.dressCode.title,
    note: wedding.dressCode.note,
    palette: wedding.dressCode.palette.map(([name, hex]) => ({ name, hex })),
  },
};

export const normalize = (raw: unknown) => normalizeWith(raw, defaultSettings);

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
