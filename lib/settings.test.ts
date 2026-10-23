import assert from "node:assert/strict";
import { test } from "node:test";
import { lighten, normalize, type Settings } from "./settings-utils.ts";

const d: Settings = {
  theme: { gold: "#e8c069", rose: "#f58fb0", ink: "#0a0612" },
  dressCode: { title: "Formal", note: "Suits and gowns.", palette: [{ name: "Gold", hex: "#e8c069" }] },
  song: "",
};

test("normalize falls back field by field", () => {
  const s = normalize({ theme: { gold: "#ABCDEF", rose: "nope" }, dressCode: { palette: [{ name: "Sage", hex: "#8a9a5b" }, { name: "", hex: "#000000" }, { hex: "zzz", name: "Bad hex" }] } }, d);
  assert.equal(s.theme.gold, "#abcdef");
  assert.equal(s.theme.rose, d.theme.rose);
  assert.deepEqual(s.dressCode.palette, [{ name: "Sage", hex: "#8a9a5b" }, { name: "Bad hex", hex: "#888888" }]);
  assert.equal(s.dressCode.title, d.dressCode.title);
});

test("normalize accepts https or local song links, and empty for the music box", () => {
  assert.equal(normalize({ song: "https://x/song.mp3" }, d).song, "https://x/song.mp3");
  assert.equal(normalize({ song: "/audio/song.mp3" }, d).song, "/audio/song.mp3");
  assert.equal(normalize({ song: "" }, { ...d, song: "/a.mp3" }).song, "");
  assert.equal(normalize({ song: "javascript:alert(1)" }, d).song, d.song);
});

test("normalize of nothing is the defaults", () => {
  assert.deepEqual(normalize(undefined, d), d);
});

test("lighten moves toward white", () => {
  assert.equal(lighten("#000000", 0.5), "#808080");
  assert.equal(lighten("#ffffff", 0.3), "#ffffff");
});
