// The arithmetic every screen depends on, tested against the real published
// timetables rather than invented fixtures: if a rule is wrong, it is wrong
// on a day that exists.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { loadDays } from "./helpers.mjs";
const T = createRequire(import.meta.url)("../src/shared/times.js");
const days = loadDays();
const at = (s) => new Date(s);                 // local wall-clock, TZ=Europe/London
const hhmm = (d) => d.toTimeString().slice(0, 5);
const ymd = (d) => T.dayKey(d);

test("hm12", () => {
  assert.deepEqual(T.hm12("05:52"), { t: "5:52", ap: "am" });
  assert.deepEqual(T.hm12("12:45"), { t: "12:45", ap: "pm" });
  assert.deepEqual(T.hm12("00:05"), { t: "12:05", ap: "am" });
  assert.deepEqual(T.hm12("15:00"), { t: "3:00", ap: "pm" });
});

test("between jamaahs", () => {
  const now = at("2026-11-16T13:05:00");
  const n = T.nextJamaah(days, now);
  assert.equal(n.key, "asr"); assert.equal(hhmm(n.at), "15:00"); assert.equal(ymd(n.at), "2026-11-16");
  assert.deepEqual([...T.passedKeys(days, now)].sort(), ["fajr", "zuhr"]);
});

test("after isha", () => {
  const now = at("2026-11-16T19:31:00");
  const n = T.nextJamaah(days, now);
  assert.equal(n.key, "fajr"); assert.equal(ymd(n.at), "2026-11-17"); assert.equal(hhmm(n.at), "07:00");
  assert.equal(T.passedKeys(days, now).size, 5);
});

test("after midnight", () => {
  const now = at("2026-11-17T00:30:00");
  const n = T.nextJamaah(days, now);
  assert.equal(n.key, "fajr"); assert.equal(ymd(n.at), "2026-11-17"); assert.equal(hhmm(n.at), "07:00");
  assert.equal(T.passedKeys(days, now).size, 0);
});

test("friday between jumuah", () => {
  let n = T.nextJamaah(days, at("2026-11-20T13:00:00"));
  assert.equal(n.key, "asr"); assert.equal(hhmm(n.at), "14:45");
  n = T.nextJamaah(days, at("2026-11-20T12:00:00"));
  assert.equal(n.key, "zuhr"); assert.equal(n.en, "Jumuʿah"); assert.equal(hhmm(n.at), "12:45");
});

test("clock change", () => {
  let n = T.nextJamaah(days, at("2027-03-28T13:00:00"));
  assert.equal(n.key, "zuhr"); assert.equal(hhmm(n.at), "13:45");
  n = T.nextJamaah(days, at("2027-10-31T13:00:00"));
  assert.equal(n.key, "asr"); assert.equal(hhmm(n.at), "15:30");
});

test("year end", () => {
  assert.equal(T.nextJamaah(days, at("2027-12-31T19:00:00")), null);
  assert.deepEqual(T.slotsFor(days, at("2028-01-01T09:00:00")), []);
});

test("countdown", () => {
  assert.equal(T.countdown(6840000), "in 1h 54m");
  assert.equal(T.countdown(1380000), "in 23m");
  assert.equal(T.countdown(30000), "now");
  assert.equal(T.countdown(3600000), "in 1h 0m");
});

test("nextJumuah", () => {
  let j = T.nextJumuah(days, at("2026-11-16T13:05:00"));
  assert.equal(ymd(j.date), "2026-11-20"); assert.equal(j.first, "12:45"); assert.equal(j.second, "13:40");
  j = T.nextJumuah(days, at("2026-11-20T14:00:00"));
  assert.equal(ymd(j.date), "2026-11-27");
});

test("arcFraction", () => {
  assert.equal(T.arcFraction(days, at("2026-11-16T03:00:00")), 0);
  assert.equal(T.arcFraction(days, at("2026-11-16T21:00:00")), 1);
  const f = T.arcFraction(days, at("2026-11-16T11:53:00"));   // midway 05:52 → 17:54
  assert.ok(Math.abs(f - 0.5) < 0.01, String(f));
});
