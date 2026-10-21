import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultSettings, normalize } from "./settings.ts";

test("normalize falls back field by field", () => {
  const s = normalize({ theme: { gold: "#ABCDEF", rose: "nope" }, dressCode: { palette: [{ name: "Sage", hex: "#8a9a5b" }, { name: "", hex: "#000000" }, { hex: "zzz", name: "Bad hex" }] } });
  assert.equal(s.theme.gold, "#abcdef");
  assert.equal(s.theme.rose, defaultSettings.theme.rose);
  assert.deepEqual(s.dressCode.palette, [{ name: "Sage", hex: "#8a9a5b" }, { name: "Bad hex", hex: "#888888" }]);
  assert.equal(s.dressCode.title, defaultSettings.dressCode.title);
});

test("normalize of nothing is the defaults", () => {
  assert.deepEqual(normalize(undefined), defaultSettings);
});
