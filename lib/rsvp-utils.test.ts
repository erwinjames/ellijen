import assert from "node:assert/strict";
import { test } from "node:test";
import { summarize, toCsv, type Rsvp } from "./rsvp-utils.ts";

const rows: Rsvp[] = [
  { id: "1", name: 'Ann "A"', email: "a@x.com", attending: true, guests: 2, message: "hi, there", createdAt: new Date(0) },
  { id: "2", name: "Bob", email: "", attending: false, guests: 0, message: "", createdAt: null },
];

test("summarize counts headcount including respondent", () => {
  assert.deepEqual(summarize(rows), { responses: 2, attending: 1, declined: 1, headcount: 3 });
});

test("toCsv escapes quotes and commas", () => {
  const lines = toCsv(rows).split("\n");
  assert.equal(lines.length, 3);
  assert.equal(lines[1], '"Ann ""A""","a@x.com","yes","2","hi, there","1970-01-01T00:00:00.000Z"');
  assert.equal(lines[2], '"Bob","","no","0","",""');
});

test("toCsv neutralises spreadsheet formulas", () => {
  const cell = (name: string) => toCsv([{ ...rows[1], name }]).split("\n")[1].split(",")[0];
  for (const f of ["=HYPERLINK(\"x\")", "+1", "-2", "@SUM(A1)", "\t=x", "\r=x"]) assert.equal(cell(f), `"'${f.replace(/"/g, '""')}"`, f);
  for (const ok of ["Ann", ""]) assert.equal(cell(ok), `"${ok}"`);
});
