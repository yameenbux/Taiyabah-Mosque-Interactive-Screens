// The foyer screens: the New Build appeal by default, Ramadan and Eid
// greetings on their dates, and the donate QR code that must open the
// right page.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { serve, openAt, overflowing, chromium, ROOT } from "./helpers.mjs";
const require_ = createRequire(import.meta.url);
const jsQR = require_("jsqr"), { PNG } = require_("pngjs");
const CONTENT = JSON.parse(fs.readFileSync(path.join(ROOT, "foyer-content.json"), "utf8"));

let srv, browser;
before(async () => { srv = await serve(); browser = await chromium.launch(); });
after(async () => { await browser.close(); srv.stop(); });

const FILES = [["foyer.html", 1920, 1080], ["foyervertical.html", 1080, 1920]];
const withContent = (mutate) => async (page) => {
  const c = structuredClone(CONTENT); mutate(c);
  await page.route("**/foyer-content.json", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(c) }));
};

export async function decodeQR(page, selector = "#qr") {
  const png = PNG.sync.read(await page.locator(selector).screenshot({ animations: "disabled" }));
  const q = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return q && q.data;
}

for (const [file, width, height] of FILES) {
  test(`${file} on an ordinary day shows the New Build`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height });
    assert.equal(await page.isVisible("#newbuild"), true);
    assert.equal(await page.isVisible("#occasion"), false);
    const text = await page.evaluate(() => document.body.innerText);
    assert.doesNotMatch(text, /02320258|Sort code|Account number/, "no bank details on screen");
    assert.ok(!text.includes(CONTENT.newBuild.tagline), "no tagline");
    assert.ok(text.includes(CONTENT.newBuild.heading));
    assert.match(await page.textContent("#next"), /Asr/);
    const jum = await page.textContent("#jum");
    assert.match(jum, /1st/); assert.match(jum, /2nd/); assert.doesNotMatch(jum, /&|Fri/);
    assert.ok(text.includes("Now available on the app stores"));
    assert.equal(await page.locator("img.badge").count(), 2);
    await ctx.close();
  });

  test(`${file} donate QR opens the donate link, and is the only QR`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height });
    assert.equal(await decodeQR(page), CONTENT.newBuild.give.otherAmountUrl);
    assert.equal(await page.locator("[data-qr]").count(), 1);
    await ctx.close();
  });

  test(`${file} in Ramadan`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2027-02-18T13:05:00", { width, height });
    assert.equal(await page.isVisible("#occasion"), true);
    assert.equal(await page.isVisible("#newbuild"), false);
    assert.match(await page.textContent("#occasion"), /Ramadan Mubarak/);
    assert.equal((await page.innerText("#oday")).replace(/\s+/g, " ").trim(), "Day 11 of Ramadan · Maghrib 5:31 pm");
    await ctx.close();
  });

  test(`${file} timeline labels don't touch`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height });
    const ink = await page.$$eval("#timeline .lab", (labs) => labs.map((l) => {
      let a = Infinity, z = -Infinity, t = Infinity, b = -Infinity;
      for (const e of l.querySelectorAll("b,span")) { const r = document.createRange(); r.selectNodeContents(e); const q = r.getBoundingClientRect(); a = Math.min(a, q.left); z = Math.max(z, q.right); t = Math.min(t, q.top); b = Math.max(b, q.bottom); }
      return { a, z, t, b };
    }));
    assert.equal(ink.length, CONTENT.newBuild.timeline.length);
    for (let i = 1; i < ink.length; i++) {
      const p = ink[i - 1], q = ink[i];
      const apart = q.a >= p.z + 8 || p.a >= q.z + 8 || q.t >= p.b + 8 || p.t >= q.b + 8;
      assert.ok(apart, `labels ${i - 1} and ${i} touch`);
    }
    await ctx.close();
  });
}

test("Eid al-Fitr shows for durationDays, then the New Build returns", async () => {
  for (const [day, eid] of [["2027-03-09", true], ["2027-03-11", true], ["2027-03-12", false]]) {
    const { page, ctx } = await openAt(browser, srv.base, "foyer.html", day + "T10:00:00");
    assert.equal(await page.isVisible("#occasion"), eid, day);
    if (eid) assert.match(await page.textContent("#occasion"), /Eid Mubarak/);
    await ctx.close();
  }
});

test("a greeting switched off in foyer-content.json stays off", async () => {
  const { page, ctx } = await openAt(browser, srv.base, "foyer.html", "2027-05-16T10:00:00", { route: withContent((c) => { c.occasions.eidAdha.enabled = false; }) });
  await page.waitForTimeout(300);
  assert.equal(await page.isVisible("#newbuild"), true);
  await ctx.close();
});

test("Eid al-Adha shows on 10 Dhul Hijjah", async () => {
  const { page, ctx } = await openAt(browser, srv.base, "foyer.html", "2027-05-16T10:00:00");
  assert.match(await page.textContent("#occasion"), /Eid Mubarak/);
  await ctx.close();
});

test("edited foyer-content.json reaches the screen", async () => {
  const { page, ctx } = await openAt(browser, srv.base, "foyer.html", "2026-11-16T13:05:00", { route: withContent((c) => { c.newBuild.phaseTitle = "Carpets and lighting"; }) });
  await page.waitForTimeout(300);
  assert.match(await page.textContent("#newbuild"), /Carpets and lighting/);
  await ctx.close();
});

test("with foyer-content.json unreachable the built-in copy shows", async () => {
  const { page, ctx } = await openAt(browser, srv.base, "foyer.html", "2026-11-16T13:05:00", { route: (p) => p.route("**/foyer-content.json", (r) => r.abort()) });
  await page.waitForTimeout(300);
  assert.ok((await page.textContent("#newbuild")).includes(CONTENT.newBuild.heading));
  await ctx.close();
});

test("the foyer asks the network only for its page and its text", async () => {
  const { page, ctx, requests } = await openAt(browser, srv.base, "foyer.html", "2026-11-16T13:05:00");
  await page.waitForTimeout(500);
  assert.deepEqual([...new Set(requests.map((u) => u.split("?")[0]))].sort(), [srv.base + "foyer-content.json", srv.base + "foyer.html"]);
  await ctx.close();
});

test("long appeal text still fits", async () => {
  for (const [file, width, height] of FILES) {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height, route: withContent((c) => {
      c.newBuild.phaseTitle = "Internal fixtures, fittings, carpets, lighting and the heating system throughout";
      c.newBuild.needs = ["Tiling", "Carpets", "Heating", "Lighting", "Electrical", "Decor", "Plumbing", "Windows", "Doors", "Wudu area", "Signage", "Sound system"];
    }) });
    await page.waitForTimeout(300);
    assert.match(await page.textContent("#newbuild"), /heating system throughout/, "the long title is not on screen to measure");
    assert.deepEqual(await overflowing(page), [], file);
    await ctx.close();
  }
});

test("store badges are Apple's and Google's files, unmodified", { skip: !fs.existsSync(path.join(ROOT, "../Taiyabah-Mosque-App/docs/store-assets/poster/badges")) }, async () => {
  const html = fs.readFileSync(path.join(ROOT, "foyer.html"), "utf8");
  for (const [f, mime] of [["app-store.svg", "image/svg\\+xml"], ["google-play.png", "image/png"]]) {
    const orig = fs.readFileSync(path.join(ROOT, "../Taiyabah-Mosque-App/docs/store-assets/poster/badges", f));
    const m = html.match(new RegExp(`data:${mime};base64,([A-Za-z0-9+/=]+)`));
    assert.ok(m, f + " not embedded");
    const h = (b) => crypto.createHash("sha256").update(b).digest("hex");
    assert.equal(h(Buffer.from(m[1], "base64")), h(orig), f + " differs from the original");
  }
});

const VIEWS = [["foyer.html", 1920, 1080], ["foyer.html", 1366, 768], ["foyer.html", 3840, 2160], ["foyervertical.html", 1080, 1920], ["foyervertical.html", 768, 1366]];
for (const [file, width, height] of VIEWS) {
  for (const when of ["2026-11-16T13:05:00", "2027-02-18T13:05:00"]) {
    test(`${file} fits ${width}x${height} at ${when}`, async () => {
      const { page, ctx } = await openAt(browser, srv.base, file, when, { width, height });
      assert.equal(await page.locator("#content #next").count(), 1, "the screen is not there to measure");
      assert.deepEqual(await overflowing(page), []);
      await ctx.close();
    });
  }
}

/* The bar is positioned on its own; nothing else may sit under it. */
for (const [file, width, height] of FILES) {
  test(`${file} bar overlaps nothing`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height });
    const hits = await page.evaluate(() => {
      const b = document.getElementById("fbar").getBoundingClientRect(), out = [];
      for (const el of document.querySelectorAll("#newbuild .card, #newbuild .appeal, #timeline .lab, #newbuild h1")) {
        const r = el.getBoundingClientRect();
        if (r.left < b.right && b.left < r.right && r.top < b.bottom && b.top < r.bottom) out.push(el.className || el.tagName);
      }
      return out;
    });
    assert.deepEqual(hits, []);
    await ctx.close();
  });
}
