// Pure settings helpers (no Firebase/React imports) so they can be unit-tested with plain node.
export type Person = { name: string; note: string; image: string };

export type Settings = {
  theme: { gold: string; rose: string; ink: string };
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
  ((v.startsWith("https://") || (v.startsWith("/") && !v.startsWith("//"))) && v.length <= 2000) ||
  (/^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/.test(v) && v.length <= 300_000);

// Coerces raw Firestore data into the shape of `d`, field by field, falling back to `d` wherever it does not fit.
// Array items are checked against the default's first item. ponytail: one generic length cap per string/array.
export function conform<T>(raw: unknown, d: T, key = ""): T {
  if (typeof d === "string") {
    if (typeof raw !== "string") return d;
    if (HEX.test(d)) return (HEX.test(raw) ? raw.toLowerCase() : d) as T;
    if (LINKISH.test(key)) return (safeLink(raw) ? raw : d) as T;
    return raw.slice(0, 4000) as T;
  }
  if (Array.isArray(d)) {
    if (!Array.isArray(raw) || !d.length) return d;
    return raw.slice(0, 60).map((x) => conform(x, d[0], key)) as T;
  }
  if (d && typeof d === "object") {
    const r = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, conform(r[k], v, k)])) as T;
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

export function lighten(h: string, amt: number) {
  const n = parseInt(h.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * amt));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}
