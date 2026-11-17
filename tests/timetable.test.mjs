// The timetable screens (prayer hall and downstairs), driven in a real
// browser at fixed times on real dates.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { serve, openAt, overflowing, chromium, loadDays } from "./helpers.mjs";

let srv, browser;
before(async () => { srv = await serve(); browser = await chromium.launch(); });
after(async () => { await browser.close(); srv.stop(); });

const FILES = [["timetable.html", 1920, 1080], ["timetablevertical.html", 1080, 1920]];

for (const [file, width, height] of FILES) {
  test(`${file} at 13:05 on a Monday`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height });
    assert.equal(await page.locator(".card.past").count(), 2);
    const cds = await page.$$eval(".card .cd", (els) => els.map((e) => [e.closest(".card").className, e.textContent.trim()]).filter((x) => x[1]));
    assert.deepEqual(cds, [["card asr isnext", "in 1h 54m"]], "the countdown is in the next card, and only there");
    assert.equal(await page.locator("#arc, #arcwrap, #next, .pill, .star").count(), 0, "no arc, pill or star");
    const jum = await page.textContent("#jbox");
    assert.match(jum, /1st/); assert.doesNotMatch(jum, /Friday|November|\b20\b/, "the Jumuʿah bar carries no date");
    assert.equal((await page.textContent(".card.isnext .nm")).trim(), "Asr");
    assert.equal(await page.locator("#clock .sec").count(), 0, "no seconds on the clock");
    assert.match(await page.textContent("#clock"), /^1:05\s*pm$/);
    const text = await page.evaluate(() => document.body.innerText);
    assert.doesNotMatch(text, /\d(am|pm)\b/, "times are spaced: 3:00 pm");
    assert.match(text, /6 Jumada al-Thani 1448 AH/);
    await ctx.close();
  });

  test(`${file} on a Friday labels the Jumu'ah times`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-20T12:00:00", { width, height });
    const card = await page.textContent(".card.zuhr");
    assert.match(card, /Jumuʿah/); assert.match(card, /1st/); assert.match(card, /2nd/); assert.doesNotMatch(card, /&/);
    const bar = await page.textContent("#jbox");
    assert.match(bar, /1st/); assert.match(bar, /2nd/); assert.doesNotMatch(bar, /&/);
    await ctx.close();
  });

  test(`${file} with no data for the date`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2028-01-01T09:00:00", { width, height });
    assert.equal(await page.isVisible("#nodata"), true);
    assert.equal(await page.isVisible("#cards"), false);
    assert.equal((await page.textContent("#nodata")).trim(), "Prayer times for this date are not loaded. Please use the printed timetable.");
    await ctx.close();
  });
}

test("embedded data equals data/", async () => {
  const { page, ctx } = await openAt(browser, srv.base, "timetable.html", "2026-11-16T13:05:00");
  assert.deepEqual(await page.evaluate(() => window.TT_DATA), loadDays());
  await ctx.close();
});

test("no network beyond the page itself", async () => {
  const { page, ctx, requests } = await openAt(browser, srv.base, "timetable.html", "2026-11-16T13:05:00");
  await page.waitForTimeout(500);
  assert.deepEqual(requests, [srv.base + "timetable.html"]);
  await ctx.close();
});

test("guarded reload offline keeps the timetable", async () => {
  const { page, ctx } = await openAt(browser, srv.base, "timetable.html", "2026-11-16T13:05:00");
  await page.route("**/*", (r) => r.abort());
  await page.evaluate(() => { window.__stillHere = true; window.guardedReload(); });
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(() => window.__stillHere), true, "page navigated away while offline");
  assert.equal(await page.isVisible("#cards"), true);
  await ctx.close();
});

test("guarded reload online does reload", async () => {
  const { page, ctx } = await openAt(browser, srv.base, "timetable.html", "2026-11-16T13:05:00");
  await page.evaluate(() => { window.__stillHere = true; window.guardedReload(); });
  await page.waitForFunction(() => !window.__stillHere, null, { timeout: 5000 });
  await ctx.close();
});

const VIEWS = [["timetable.html", 1920, 1080], ["timetable.html", 1366, 768], ["timetable.html", 3840, 2160],
  ["timetablevertical.html", 1080, 1920], ["timetablevertical.html", 768, 1366]];
for (const [file, width, height] of VIEWS) {
  for (const when of ["2026-11-16T13:05:00", "2026-11-20T12:00:00", "2027-06-20T23:30:00"]) {
    test(`${file} fits ${width}x${height} at ${when}`, async () => {
      const { page, ctx } = await openAt(browser, srv.base, file, when, { width, height });
      assert.equal(await page.locator("#content .card").count(), 5, "the screen is not there to measure");
      assert.deepEqual(await overflowing(page), []);
      const cards = await page.$$eval(".card", (els) => els.map((e) => e.getBoundingClientRect().toJSON()));
      for (let i = 1; i < cards.length; i++) {
        const a = cards[i - 1], b = cards[i];
        assert.ok(a.right <= b.left + 1 || a.bottom <= b.top + 1, `cards ${i - 1} and ${i} overlap`);
      }
      await ctx.close();
    });
  }
}

/* Design B, final: the cards are the screen. Every label and time sits on the
   same line across the five cards (landscape) or in the same column down the
   five rows (portrait), on an ordinary day and on a Friday, and no time wraps
   or touches its neighbour. */
for (const [file, width, height] of FILES) {
  for (const when of ["2026-11-16T13:05:00", "2026-11-20T12:00:00", "2026-11-16T19:45:00", "2027-06-20T13:00:00"]) {
    test(`${file} lines up cleanly at ${when}`, async () => {
      const { page, ctx } = await openAt(browser, srv.base, file, when, { width, height });
      const r = await page.evaluate((portrait) => {
        const bad = [], cards = [...document.querySelectorAll(".card")];
        const box = (el) => el.getBoundingClientRect();
        const ink = (el) => { const g = document.createRange(); g.selectNodeContents(el); return g.getBoundingClientRect(); };
        const same = (sel, side) => {
          // measured from each card's own edge, so rows that sit lower still compare
          const v = cards.map((c) => [...c.querySelectorAll(sel)].map((e) => Math.round(box(e)[side] - box(c)[side])));
          for (let i = 1; i < v.length; i++) for (let k = 0; k < v[0].length; k++)
            if (Math.abs(v[i][k] - v[0][k]) > 1) bad.push(`${sel} ${side} differs: ${cards[0].className} ${v[0][k]} vs ${cards[i].className} ${v[i][k]}`);
        };
        if (portrait) { same(".ic", "left"); same(".nm", "left"); same(".bk", "left"); same(".jk", "right"); same(".k", "top"); }
        else { for (const sel of [".ic", ".nm", ".ar", ".k", ".b", ".jk", ".cd"]) same(sel, "top"); }
        if (cards.length !== 5) bad.push(cards.length + " cards");
        for (const c of cards) {
          for (const part of [".ic", ".nm", ".ar", ".bk", ".jk", ".k", ".b", ".j", ".cd"]) if (!c.querySelector(part)) bad.push(part + " missing in " + c.className);
          const cb = box(c);
          for (const t of c.querySelectorAll(".b, .j > div, .j:not(.two)")) {
            const fs = parseFloat(getComputedStyle(t).fontSize), r = ink(t);
            if (r.height > fs * 1.6) bad.push("a time wraps in " + c.className);
            if (r.left < cb.left + 10 || r.right > cb.right - 10) bad.push("a time leaves " + c.className);
          }
          // within one card the two labels share a line, and so do the two times
          if (portrait) {
            const [kb, kj] = [...c.querySelectorAll(".k")].map(box);
            if (Math.abs(kb.top - kj.top) > 1) bad.push(`labels not on one line in ${c.className}: ${Math.round(kb.top)} vs ${Math.round(kj.top)}`);
            const base = (el) => { const r = ink(el.matches(".two") ? el.firstElementChild : el), fs = parseFloat(getComputedStyle(el.matches(".two") ? el.firstElementChild : el).fontSize); return r.bottom - fs * 0.22; };
            const bb = base(c.querySelector(".b")), jb = base(c.querySelector(".j"));
            if (Math.abs(bb - jb) > 6) bad.push(`times not on one baseline in ${c.className}: ${Math.round(bb)} vs ${Math.round(jb)}`);
          }
          const b = ink(c.querySelector(".b")), j = ink(c.querySelector(".j"));
          if (b.right > j.left - 16 && b.left < j.right && b.bottom > j.top && b.top < j.bottom) bad.push("begins touches jamaah in " + c.className);
          if (c.scrollHeight > c.clientHeight + 1) bad.push("contents overflow " + c.className);
        }
        return bad;
      }, width < height);
      assert.deepEqual(r, []);
      await ctx.close();
    });
  }
}

/* The bottom is two separate boxes: Jumuʿah (gold label above the two
   times) and the sun (a sunrise and a sunset icon, each with its time to
   the right). They line up with the cards' outer edges and don't touch. */
for (const [file, width, height] of FILES) {
  for (const when of ["2026-11-16T13:05:00", "2026-11-20T12:00:00"]) {
    test(`${file} bottom boxes at ${when.slice(0, 10)}`, async () => {
      const { page, ctx } = await openAt(browser, srv.base, file, when, { width, height });
      const r = await page.evaluate(() => {
        const bad = [], box = (s) => document.querySelector(s) && document.querySelector(s).getBoundingClientRect();
        const jb = box("#jbox"), sb = box("#sbox"), cards = box("#cards");
        if (!jb || !sb) return ["the two boxes are missing"];
        if (Math.abs(jb.left - cards.left) > 1) bad.push("Jumuʿah box not on the cards' left edge");
        if (Math.abs(sb.right - cards.right) > 1) bad.push("sun box not on the cards' right edge");
        if (jb.right > sb.left - 16) bad.push("the boxes touch");
        if (Math.abs(jb.top - sb.top) > 1 || Math.abs(jb.bottom - sb.bottom) > 1) bad.push("the boxes are not the same height");
        const eb = document.querySelector("#jbox .eyebrow").getBoundingClientRect(), times = document.querySelector("#jbox .times").getBoundingClientRect();
        if (!(eb.bottom <= times.top + 2)) bad.push("the Jumuʿah label is not above the times");
        // both boxes centre their contents the same way
        const mid = (r) => (r.left + r.right) / 2;
        const g = document.createRange(); g.selectNodeContents(document.querySelector("#jbox .times"));
        if (Math.abs(mid(g.getBoundingClientRect()) - mid(jb)) > 3) bad.push("the Jumuʿah times are not centred in their box");
        if (Math.abs(mid(eb) - mid(jb)) > 3) bad.push("the Jumuʿah label is not centred in its box");
        const ts = [...document.querySelectorAll("#sbox .t")].map((t) => t.getBoundingClientRect());
        if (innerWidth > innerHeight) {
          const tops = [eb, ...[...document.querySelectorAll("#sbox .k")].map((k) => k.getBoundingClientRect())].map((r) => Math.round(r.top));
          if (Math.max(...tops) - Math.min(...tops) > 1) bad.push("the three bottom labels are not on one line: " + tops.join(","));
        }
        if (innerWidth < innerHeight && ts.length === 2 && Math.abs(ts[0].left - ts[1].left) > 1) bad.push("the sun times do not line up");
        const suns = [...document.querySelectorAll("#sbox .sunpart")];
        if (suns.length !== 2) bad.push(suns.length + " sun parts");
        for (const s of suns) {
          const ic = s.querySelector("svg").getBoundingClientRect(), t = s.querySelector(".t").getBoundingClientRect();
          if (!(ic.right <= t.left)) bad.push("a time is not to the right of its icon");
        }
        for (const el of [document.querySelector("#jbox .times"), ...document.querySelectorAll("#sbox .t")]) {
          const g = document.createRange(); g.selectNodeContents(el); const q = g.getBoundingClientRect();
          // against the largest type in the line, not the small "1st"/"2nd"
          const fs = Math.max(...[el, ...el.querySelectorAll("*")].map((e) => parseFloat(getComputedStyle(e).fontSize)));
          if (q.height > fs * 1.7) bad.push("a bottom time wraps");
        }
        return bad;
      });
      assert.deepEqual(r, []);
      const sun = await page.textContent("#sbox");
      assert.match(sun, /Sunrise/i); assert.match(sun, /Sunset/i);
      await ctx.close();
    });
  }
}
