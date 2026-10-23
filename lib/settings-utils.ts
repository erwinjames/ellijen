// Pure settings helpers (no Firebase/React imports) so they can be unit-tested with plain node.
export type Settings = {
  theme: { gold: string; rose: string; ink: string };
  dressCode: { title: string; note: string; palette: { name: string; hex: string }[] };
  /** Theme music: direct link to an audio file (https:// or a path under public/). Empty = built-in music-box tune. */
  song: string;
};

const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : fallback);
const str = (v: unknown, fallback: string, max: number) => (typeof v === "string" ? v.slice(0, max) : fallback);
const song = (v: unknown, fallback: string) =>
  typeof v === "string" && (v === "" || ((v.startsWith("https://") || v.startsWith("/")) && v.length <= 1000)) ? v : fallback;

// Tolerates partial/old documents so a bad save can never blank the public site.
export function normalize(raw: unknown, d: Settings): Settings {
  const r = (raw ?? {}) as Partial<Record<keyof Settings, Record<string, unknown>>>;
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
    song: song((raw as { song?: unknown } | null | undefined)?.song, d.song),
  };
}

export function lighten(h: string, amt: number) {
  const n = parseInt(h.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * amt));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}
