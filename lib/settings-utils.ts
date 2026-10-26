// Pure settings helpers (no Firebase/React imports) so they can be unit-tested with plain node.
export type Person = { name: string; note: string; image: string };

export type Settings = {
  /** gold = accent, rose = highlight, ink = background, cream = text. */
  theme: { gold: string; rose: string; ink: string; cream: string };
  dressCode: { title: string; note: string; palette: { name: string; hex: string }[] };
  /** Theme music: an mp3 link (https:// or a path under public/) or a YouTube embed link. Empty = built-in music-box tune. */
  song: string;
  couple: { a: string; b: string };
  /** Ceremony date-time, ISO with the venue's offset, e.g. 2027-06-12T15:00:00+08:00. */
  date: string;
  venue: { name: string; address: string; mapsUrl: string };
  /** YYYY-MM-DD */
  rsvpDeadline: string;
  hashtag: string;
  /** Logo pressed into the wax seal (dark artwork on transparent). Empty = initials. */
  sealLogo: string;
  /** Fixed chapters: each key drives a 3D camera move, so only the copy and photo are editable. */
  story: { key: string; year: string; title: string; text: string; image: string }[];
  program: { time: string; title: string; note: string }[];
  entourage: { role: string; people: Person[] }[];
  gallery: string[];
  faq: { q: string; a: string }[];
  gifts: { note: string; registryUrl: string };
  travel: { note: string; stays: { name: string; note: string; url: string }[] };
};

const HEX = /^#[0-9a-f]{6}$/i;
// Fields holding links or images: only https://, a /path under public/, a small raster data: image (the seal logo is
// stored inline so WebGL can read it without bucket CORS), or empty. Blocks javascript: and friends.
const LINKISH = /(url|image|logo|song|gallery)$/i;
const safeLink = (v: string) =>
  v === "" ||
  (!v.includes("\\") &&
  ((v.startsWith("https://") || (v.startsWith("/") && !v.startsWith("//"))) && v.length <= 2000) ||
  (/^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/.test(v) && v.length <= 300_000));

// Coerces raw Firestore data into the shape of `d`, field by field, falling back to `d` wherever it does not fit.
// Array items are checked against the default's first item; a bad link there becomes "", not another item's link. ponytail: one generic length cap per string/array.
export function conform<T>(raw: unknown, d: T, key = "", inArr = false): T {
  if (typeof d === "string") {
    if (typeof raw !== "string") return d;
    if (HEX.test(d)) return (HEX.test(raw) ? raw.toLowerCase() : d) as T;
    if (LINKISH.test(key)) return (safeLink(raw) ? raw : inArr ? "" : d) as T;
    return raw.slice(0, 4000) as T;
  }
  if (Array.isArray(d)) {
    if (!Array.isArray(raw) || !d.length) return d;
    return raw.slice(0, 60).map((x) => conform(x, d[0], key, true)) as T;
  }
  if (d && typeof d === "object") {
    const r = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, conform(r[k], v, k, inArr)])) as T;
  }
  return d;
}

// Tolerates partial/old documents so a bad save can never blank the public site.
export function normalize(raw: unknown, d: Settings): Settings {
  const s = conform(raw, d);
  const story = (raw as { story?: unknown } | null)?.story;
  return {
    ...s,
    date: isNaN(Date.parse(s.date)) ? d.date : s.date,
    rsvpDeadline: isNaN(Date.parse(s.rsvpDeadline)) ? d.rsvpDeadline : s.rsvpDeadline,
    story: d.story.map((c, i) => ({ ...conform(Array.isArray(story) ? story[i] : undefined, c), key: c.key })),
  };
}

/** Video id from a YouTube watch/share/embed/shorts link or a pasted <iframe> embed code; "" if none. */
export function youtubeId(v: string) {
  return v.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|shorts\/|live\/|watch\?(?:.*&)?v=)|youtu\.be\/)([\w-]{11})/)?.[1] ?? "";
}

// One-click looks for admin → Settings. The first is the site's original design and the default.
export const THEMES: { name: string; colors: Settings["theme"] }[] = [
  { name: "Midnight gold", colors: { gold: "#e8c069", rose: "#f58fb0", ink: "#0a0612", cream: "#f5ead9" } },
  { name: "Wine & blush", colors: { gold: "#eba9a5", rose: "#f7d0b8", ink: "#1a0910", cream: "#fbeee8" } },
  { name: "Sage garden", colors: { gold: "#b5cc9a", rose: "#e8c49a", ink: "#0c1410", cream: "#eef2e6" } },
  { name: "Navy & silver", colors: { gold: "#c8d2e2", rose: "#9fbaea", ink: "#070b18", cream: "#eef1f7" } },
  { name: "Terracotta", colors: { gold: "#e3955f", rose: "#f2c48d", ink: "#150a06", cream: "#f7e9dc" } },
  { name: "Ivory daylight", colors: { gold: "#8a6320", rose: "#9e3f5c", ink: "#f7f1e6", cream: "#2b2118" } },
];

const luminance = (h: string) =>
  [0, 1, 2]
    .map((i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);

/** WCAG contrast ratio of two #rrggbb colours (1 to 21; body text wants 4.5+). */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function lighten(h: string, amt: number) {
  const n = parseInt(h.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * amt));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

const HONORIFIC = /\b(mr|mrs|ms|dr)\b\.?/gi;
export const initials = (name: string) => {
  const t = name.trim();
  const w = t.replace(HONORIFIC, " ").split(/[\s&]+/).filter((x) => /^\p{L}/u.test(x));
  return (w.slice(0, 2).map((x) => x[0]).join("") || t[0] || "").toUpperCase();
};
