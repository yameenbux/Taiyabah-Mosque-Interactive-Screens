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
    const next = await page.textContent("#next");
    assert.match(next, /Asr/); assert.match(next, /3:00/); assert.match(next, /in 1h 54m/);
    assert.equal(await page.locator(".card.past").count(), 2);
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
    const bar = await page.textContent("#jum");
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

/* Short winter days and long summer evenings squeeze some begin times
   together; their labels on the arc must still be readable. */
for (const [file, width, height] of FILES) {
  for (const when of ["2027-06-20T23:30:00", "2026-12-21T12:00:00", "2026-11-20T12:00:00"]) {
    test(`${file} arc labels don't touch each other, the line or a dot on ${when.slice(0, 10)}`, async () => {
      const { page, ctx } = await openAt(browser, srv.base, file, when, { width, height });
      const found = await page.evaluate(() => {
        const svg = document.getElementById("arc"), m = svg.getScreenCTM();
        const pt = (x, y) => { const p = svg.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(m); };
        const texts = [...svg.querySelectorAll("text")].map((e) => ({ t: e.textContent, r: e.getBoundingClientRect() }));
        const pr = document.getElementById("next").getBoundingClientRect();
        const obstacles = [{ what: "pill", x0: pr.left, x1: pr.right, y0: pr.top, y1: pr.bottom }];
        for (const c of svg.querySelectorAll("circle")) {
          const p = pt(+c.getAttribute("cx"), +c.getAttribute("cy")), rr = +c.getAttribute("r") * m.a;
          obstacles.push({ what: "dot", x0: p.x - rr, x1: p.x + rr, y0: p.y - rr, y1: p.y + rr });
        }
        for (const pl of svg.querySelectorAll("polyline"))
          for (const xy of pl.getAttribute("points").trim().split(/\s+/)) {
            const [x, y] = xy.split(",").map(Number), p = pt(x, y);
            obstacles.push({ what: "line", x0: p.x - 2, x1: p.x + 2, y0: p.y - 2, y1: p.y + 2 });
          }
        const bad = [];
        texts.forEach((a, i) => {
          texts.forEach((b, k) => { if (k > i && a.r.left < b.r.right + 6 && b.r.left < a.r.right + 6 && a.r.top < b.r.bottom && b.r.top < a.r.bottom) bad.push(a.t + "/" + b.t); });
          for (const o of obstacles) if (a.r.left < o.x1 && o.x0 < a.r.right && a.r.top < o.y1 && o.y0 < a.r.bottom) { bad.push(a.t + " on a " + o.what); break; }
        });
        return { n: texts.length, bad };
      });
      assert.equal(found.n, 6);
      assert.deepEqual(found.bad, []);
      await ctx.close();
    });
  }
}
