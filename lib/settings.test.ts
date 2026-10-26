import assert from "node:assert/strict";
import { test } from "node:test";
import { contrast, lighten, normalize, THEMES, youtubeId, type Settings } from "./settings-utils.ts";

const d: Settings = {
  theme: { gold: "#e8c069", rose: "#f58fb0", ink: "#0a0612", cream: "#f5ead9" },
  dressCode: { title: "Formal", note: "Suits and gowns.", palette: [{ name: "Gold", hex: "#e8c069" }] },
  song: "",
  couple: { a: "A", b: "B" },
  date: "2027-06-12T15:00:00+08:00",
  venue: { name: "Hall", address: "Town", mapsUrl: "https://maps.google.com/?q=Town" },
  rsvpDeadline: "2027-05-01",
  hashtag: "#AB",
  sealLogo: "",
  story: [
    { key: "met", year: "2019", title: "Met", text: "Hi", image: "/story/1.jpg" },
    { key: "proposal", year: "2025", title: "Yes", text: "!", image: "/story/2.jpg" },
  ],
  program: [{ time: "3 PM", title: "Ceremony", note: "" }],
  entourage: [{ role: "Best Man", people: [{ name: "C", note: "", image: "" }] }],
  gallery: ["/gallery/1.jpg"],
  faq: [{ q: "Q", a: "A" }],
  gifts: { note: "Thanks", registryUrl: "" },
  travel: { note: "Drive", stays: [{ name: "Inn", note: "", url: "https://inn.example" }] },
};

test("normalize falls back field by field", () => {
  const s = normalize({ theme: { gold: "#ABCDEF", rose: "nope" }, dressCode: { palette: [{ name: "Sage", hex: "#8a9a5b" }, { hex: "zzz", name: "Bad hex" }] } }, d);
  assert.equal(s.theme.gold, "#abcdef");
  assert.equal(s.theme.rose, d.theme.rose);
  assert.deepEqual(s.dressCode.palette, [{ name: "Sage", hex: "#8a9a5b" }, { name: "Bad hex", hex: "#e8c069" }]);
  assert.equal(s.dressCode.title, d.dressCode.title);
});

test("normalize accepts https or local links, and empty for the music box", () => {
  assert.equal(normalize({ song: "https://x/song.mp3" }, d).song, "https://x/song.mp3");
  assert.equal(normalize({ song: "/audio/song.mp3" }, d).song, "/audio/song.mp3");
  assert.equal(normalize({ song: "" }, { ...d, song: "/a.mp3" }).song, "");
  assert.equal(normalize({ song: "javascript:alert(1)" }, d).song, d.song);
  const s = normalize({ gallery: ["https://cdn/x.jpg", "javascript:alert(1)", "//evil/x.jpg"], venue: { mapsUrl: "data:text/html,x" } }, d);
  assert.deepEqual(s.gallery, ["https://cdn/x.jpg", "/gallery/1.jpg", "/gallery/1.jpg"]);
  assert.equal(s.venue.mapsUrl, d.venue.mapsUrl);
  assert.equal(normalize({ sealLogo: "data:image/png;base64,iVBORw0KGgo=" }, d).sealLogo, "data:image/png;base64,iVBORw0KGgo=");
  assert.equal(normalize({ sealLogo: "data:image/svg+xml;base64,PHN2Zz4=" }, d).sealLogo, "");
});

test("normalize edits nested lists but keeps story chapter keys fixed", () => {
  const s = normalize(
    {
      entourage: [{ role: "Groomsmen", people: [{ name: "D", image: "https://img/d.jpg" }, { name: "E" }] }],
      story: [{ key: "hacked", title: "Hello", text: 5 }, { title: "Engaged" }, { title: "extra" }],
      faq: [],
      date: "not a date",
    },
    d,
  );
  assert.deepEqual(s.entourage, [{ role: "Groomsmen", people: [{ name: "D", note: "", image: "https://img/d.jpg" }, { name: "E", note: "", image: "" }] }]);
  assert.deepEqual(s.story.map((c) => [c.key, c.title, c.text]), [["met", "Hello", "Hi"], ["proposal", "Engaged", "!"]]);
  assert.deepEqual(s.faq, []);
  assert.equal(s.date, d.date);
});

test("normalize of nothing is the defaults", () => {
  assert.deepEqual(normalize(undefined, d), d);
});

test("youtubeId reads links and embed codes", () => {
  for (const v of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?list=x&v=dQw4w9WgXcQ&t=3",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/embed/dQw4w9WgXcQ?si=abc",
    '<iframe width="560" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" allow="autoplay"></iframe>',
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
  ])
    assert.equal(youtubeId(v), "dQw4w9WgXcQ", v);
  assert.equal(youtubeId("https://x/song.mp3"), "");
});

test("lighten moves toward white", () => {
  assert.equal(lighten("#000000", 0.5), "#808080");
  assert.equal(lighten("#ffffff", 0.3), "#ffffff");
});

test("every preset theme is readable: text 4.5:1, accent 3:1 on the background", () => {
  assert.equal(contrast("#000000", "#ffffff").toFixed(0), "21");
  for (const { name, colors: c } of THEMES) {
    assert.ok(contrast(c.cream, c.ink) >= 4.5, `${name} text`);
    assert.ok(contrast(c.gold, c.ink) >= 3, `${name} accent`);
    assert.ok(contrast(c.ink, c.gold) >= 3, `${name} button label`);
  }
});

test("old documents without a text colour get the default", () => {
  assert.equal(normalize({ theme: { gold: "#111111", rose: "#222222", ink: "#333333" } }, d).theme.cream, d.theme.cream);
});
