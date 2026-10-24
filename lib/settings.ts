import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { getDownloadURL, ref as fileRef, uploadBytes } from "firebase/storage";
import { db, isFirebaseConfigured, storage } from "./firebase";
import { wedding } from "./wedding";

import { lighten, normalize as normalizeWith, type Settings } from "./settings-utils";

export type { Person, Settings } from "./settings-utils";

// Couple-editable site settings (admin → Settings). Stored at settings/site; defaults come from wedding.ts.
export const defaultSettings: Settings = {
  theme: { gold: "#e8c069", rose: "#f58fb0", ink: "#0a0612" },
  dressCode: {
    title: wedding.dressCode.title,
    note: wedding.dressCode.note,
    palette: wedding.dressCode.palette.map(([name, hex]) => ({ name, hex })),
  },
  song: wedding.songUrl,
  couple: wedding.couple,
  date: wedding.date,
  venue: wedding.venue,
  rsvpDeadline: wedding.rsvpDeadline,
  hashtag: wedding.hashtag,
  sealLogo: wedding.sealLogo,
  story: wedding.story,
  program: wedding.program,
  entourage: wedding.entourage.map((g) => ({ role: g.role, people: g.people.map((p) => ({ name: p.name, note: p.note ?? "", image: p.image ?? "" })) })),
  gallery: wedding.gallery,
  faq: wedding.faq,
  gifts: wedding.gifts,
  travel: wedding.travel,
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

// Phone photos are 5–10 MB; shrink before upload so guests' pages stay fast. PNG keeps transparency.
async function shrink(file: File, max: number) {
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error(`${file.name} isn't a photo this browser can read. Use a JPG or PNG.`);
  });
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

/** Uploads a photo to Storage and returns its public URL. ponytail: replaced photos stay in the bucket; prune by hand if storage ever matters. */
export async function uploadImage(file: File) {
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const c = await shrink(file, 1600);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not process the photo."))), type, 0.85));
  const r = fileRef(storage(), `site/${crypto.randomUUID()}.${type === "image/png" ? "png" : "jpg"}`);
  await uploadBytes(r, blob, { contentType: type, cacheControl: "public, max-age=31536000, immutable" });
  return getDownloadURL(r);
}

/** Seal logo as an inline PNG data URL (stamp texture is 256px, and WebGL needs it same-origin). */
export const logoDataUrl = async (file: File) => (await shrink(file, 256)).toDataURL("image/png");
