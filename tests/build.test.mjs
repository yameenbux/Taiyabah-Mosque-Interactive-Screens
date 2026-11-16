// The build is the only way a screen reaches a TV, so these check the build
// itself: that it refuses bad data, that it carries every year, and that its
// outputs say they are generated.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT, OUTPUTS, MARKER, loadDays } from "./helpers.mjs";

test("build refuses a malformed year", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "screens-data-"));
  const bad = JSON.parse(fs.readFileSync(path.join(ROOT, "data/timetable-2027.json"), "utf8"));
  delete bad.days["2027-06-01"].jamaat.isha;
  fs.writeFileSync(path.join(tmp, "timetable-2099.json"), JSON.stringify(bad));
  const r = spawnSync("python3", ["build.py", "--data", tmp, "--check-only"], { cwd: ROOT, encoding: "utf8" });
  assert.notEqual(r.status, 0, "build accepted a day with no Isha jamaat");
  assert.match(r.stderr, /isha/);
});

test("build embeds both years", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "screens-out-"));
  execFileSync("python3", ["build.py", "--out", out], { cwd: ROOT });
  const html = fs.readFileSync(path.join(out, "timetable.html"), "utf8");
  assert.ok(html.includes('"2026-01-01"'));
  assert.ok(html.includes('"2027-12-31"'));
  for (const f of OUTPUTS) assert.ok(!fs.readFileSync(path.join(out, f), "utf8").includes("{{"), f + " has an unfilled placeholder");
});

test("outputs are marked generated", () => {
  for (const f of OUTPUTS) assert.ok(fs.readFileSync(path.join(ROOT, f), "utf8").startsWith(MARKER), f);
});

/* Review finding 4: the mistakes a hand-typed year is most likely to carry,
   each one able to put a wrong time on a TV, must stop the build. */
const BAD = [
  ["jummah.first before Zuhr begins (a 12-hour typo)", (d) => { d.days["2027-01-01"].jummah.first = "01:00"; }, /jummah/],
  ["2nd Jumu'ah before the 1st", (d) => { d.days["2027-01-01"].jummah.second = "12:30"; }, /jummah/],
  ["2nd Jumu'ah after Asr begins", (d) => { d.days["2027-01-01"].jummah.second = "15:30"; }, /jummah/],
  ["jamaat out of order", (d) => { d.days["2027-06-01"].jamaat.asr = "13:00"; }, /jamaat/],
  ["Fajr jamaat after sunrise", (d) => { d.days["2027-06-01"].jamaat.fajr = "06:30"; }, /fajr/],
  ["a Hijri month spelt another way", (d) => { d.days["2027-02-08"].hijri = "1 Ramadhan 1448 AH"; }, /Ramadhan/],
];
for (const [name, edit, msg] of BAD) {
  test(`build refuses ${name}`, () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "screens-data-"));
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, "data/timetable-2027.json"), "utf8"));
    edit(d);
    fs.writeFileSync(path.join(tmp, "timetable-2027.json"), JSON.stringify(d));
    const r = spawnSync("python3", ["build.py", "--data", tmp, "--check-only"], { cwd: ROOT, encoding: "utf8" });
    assert.notEqual(r.status, 0, name + " was accepted");
    assert.match(r.stderr, msg);
  });
}

/* Review finding 11: the pages in the repo are what the TVs get. A green test
   run must mean they are a fresh build of src/, not stale. */
test("the committed pages are a fresh build of src/", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "screens-out-"));
  execFileSync("python3", ["build.py", "--out", out], { cwd: ROOT });
  for (const f of OUTPUTS)
    assert.ok(fs.readFileSync(path.join(out, f)).equals(fs.readFileSync(path.join(ROOT, f))), `${f} is out of date: run python3 build.py and commit it`);
});

/* The original failure: a forgotten new year. Go red 60 days before the
   last day of prayer times, while there is time to add the next year. */
test("prayer times run at least 60 days beyond today", () => {
  const last = Object.keys(loadDays()).sort().pop();
  const days = (new Date(last + "T00:00:00") - new Date()) / 864e5;
  assert.ok(days >= 60, `prayer times end on ${last}: add next year's timetable (SETUP.md section 5)`);
});
