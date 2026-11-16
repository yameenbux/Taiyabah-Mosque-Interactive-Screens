// The build is the only way a screen reaches a TV, so these check the build
// itself: that it refuses bad data, that it carries every year, and that its
// outputs say they are generated.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT, OUTPUTS, MARKER } from "./helpers.mjs";

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
  execFileSync("python3", ["build.py"], { cwd: ROOT });
  const html = fs.readFileSync(path.join(ROOT, "timetable.html"), "utf8");
  assert.ok(html.includes('"2026-01-01"'));
  assert.ok(html.includes('"2027-12-31"'));
  for (const f of OUTPUTS) assert.ok(!fs.readFileSync(path.join(ROOT, f), "utf8").includes("{{"), f + " has an unfilled placeholder");
});

test("outputs are marked generated", () => {
  for (const f of OUTPUTS) assert.ok(fs.readFileSync(path.join(ROOT, f), "utf8").startsWith(MARKER), f);
});
