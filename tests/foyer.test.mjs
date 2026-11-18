// The foyer screens: the New Build appeal by default, Ramadan and Eid
// greetings on their dates, and the donate QR code that must open the
// right page.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { serve, openAt, overflowing, chromium, ROOT, decodeQR } from "./helpers.mjs";
const require_ = createRequire(import.meta.url);
const CONTENT = JSON.parse(fs.readFileSync(path.join(ROOT, "foyer-content.json"), "utf8"));

let srv, browser;
before(async () => { srv = await serve(); browser = await chromium.launch(); });
after(async () => { await browser.close(); srv.stop(); });

const FILES = [["foyer.html", 1920, 1080], ["foyervertical.html", 1080, 1920]];
const withContent = (mutate) => async (page) => {
  const c = structuredClone(CONTENT); mutate(c);
  await page.route("**/foyer-content.json", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(c) }));
};


for (const [file, width, height] of FILES) {
  test(`${file} on an ordinary day shows the New Build`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height });
    assert.equal(await page.isVisible("#newbuild"), true);
    assert.equal(await page.isVisible("#occasion"), false);
    const text = await page.evaluate(() => document.body.innerText);
    assert.doesNotMatch(text, /02320258|Sort code|Account number/, "no bank details on screen");
    assert.ok(!text.includes(CONTENT.newBuild.tagline), "no tagline");
    assert.ok(text.includes(CONTENT.newBuild.phaseTitle));
    assert.match(text, /download our app/i, "the app box says what the badges are for");
    assert.match(await page.textContent("#next"), /Asr/);
    const jum = await page.textContent("#jum");
    assert.match(jum, /1st/); assert.match(jum, /2nd/); assert.doesNotMatch(jum, /&|Fri/);
    assert.equal(await page.locator("img.badge").count(), 2);
    await ctx.close();
  });

  test(`${file} donate QR opens the donate link, and is the only QR`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height });
    assert.equal(await decodeQR(page), CONTENT.newBuild.give.otherAmountUrl);
    assert.equal(await page.locator("[data-qr]").count(), 1);
    await ctx.close();
  });

  test(`${file} donate QR opens a Stripe checkout`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height });
    assert.match(await decodeQR(page), /^https:\/\/(buy|donate)\.stripe\.com\/[A-Za-z0-9]+$/);
    await ctx.close();
  });

  test(`${file} ignores a donate link edited to something that is not Stripe`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height, route: withContent((c) => { c.newBuild.give.otherAmountUrl = "https://www.taiyabahmasjid.com/product/dome-donation/"; c.newBuild.phaseTitle = "Carpets and lighting"; }) });
    await page.waitForFunction(() => document.getElementById("phase-title").textContent === "Carpets and lighting");
    assert.equal(await decodeQR(page), CONTENT.newBuild.give.otherAmountUrl, "the QR took a link that does not take money");
    await ctx.close();
  });

  test(`${file} takes a new Stripe link edited on GitHub`, async () => {
    const next = "https://buy.stripe.com/test0000000000000000";
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height, route: withContent((c) => { c.newBuild.give.otherAmountUrl = next; }) });
    await page.waitForTimeout(300);
    assert.equal(await decodeQR(page), next);
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

  test(`${file} progress bar shows where the build is`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height });
    const r = await page.evaluate(() => {
      const bar = document.querySelector("#progress .track").getBoundingClientRect(), dot = document.querySelector("#progress .dot").getBoundingClientRect();
      const labs = [...document.querySelectorAll("#progress .pl span")].map((e) => { const g = document.createRange(); g.selectNodeContents(e); return { t: e.textContent, r: g.getBoundingClientRect().toJSON() }; });
      return { at: ((dot.left + dot.right) / 2 - bar.left) / bar.width, labs };
    });
    assert.ok(Math.abs(r.at - 0.75) < 0.01, `dot at ${r.at}`);   // the 4th of 5 stages is active
    assert.deepEqual(r.labs.map((l) => l.t), ["Phases 1 & 2 complete", "Now · Phase 3.3", "Full facilities"]);
    for (let i = 1; i < r.labs.length; i++) assert.ok(r.labs[i].r.left >= r.labs[i - 1].r.right + 24, "progress labels crowd");
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
  assert.ok((await page.textContent("#newbuild")).includes(CONTENT.newBuild.phaseTitle));
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

/* Nothing on the New Build screen overlaps anything else. */
for (const [file, width, height] of FILES) {
  test(`${file} blocks do not overlap`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height });
    const hits = await page.evaluate(() => {
      const els = [...document.querySelectorAll("#clock .tn, .hdr .logo, .dates, #intro, #progress, #give, #appbox, #next, #jum")];
      const out = [];
      for (let i = 0; i < els.length; i++) for (let k = i + 1; k < els.length; k++) {
        const a = els[i].getBoundingClientRect(), b = els[k].getBoundingClientRect();
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) out.push((els[i].id || els[i].className) + " / " + (els[k].id || els[k].className));
      }
      return out;
    });
    assert.deepEqual(hits, []);
    await ctx.close();
  });
}

/* Review finding 1: valid JSON in the wrong shape must not blank or break
   the screen. The built-in copy stays up, and the greetings keep working. */
for (const [label, body] of [["null", "null"], ["{}", "{}"], ["needs as text", JSON.stringify({ ...CONTENT, newBuild: { ...CONTENT.newBuild, needs: "Tiling, Carpets" } })]]) {
  test(`a wrong-shaped foyer-content.json (${label}) keeps the good copy`, async () => {
    const errors = [];
    const { page, ctx } = await openAt(browser, srv.base, "foyer.html", "2026-11-16T13:05:00", { route: (p) => { p.on("pageerror", (e) => errors.push(e.message)); return p.route("**/foyer-content.json", (r) => r.fulfill({ contentType: "application/json", body })); } });
    await page.waitForTimeout(1500);
    assert.equal((await page.textContent("#phase-title")).trim(), CONTENT.newBuild.phaseTitle);
    assert.equal(await decodeQR(page), CONTENT.newBuild.give.otherAmountUrl);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

/* Review finding 2: long words anywhere on the foyer shrink to fit. */
test("long text in the Give card, app card and greeting still fits", async () => {
  const long = withContent((c) => {
    c.newBuild.give.scanLabel = "Scan here with your phone camera to give any amount you wish";
    c.newBuild.give.giftAidNote += " Please remember the masjid in your duas, and tell your family about the new build.";
    c.occasions.ramadan.title = "Ramadan Mubarak to the whole community";
    c.occasions.ramadan.message = "May this blessed month bring peace. May it bring patience. May it bring closeness to Allah for you and your family. May Allah accept your fasts and your prayers.";
  });
  for (const [file, width, height] of FILES) for (const when of ["2026-11-16T13:05:00", "2027-02-18T13:05:00"]) {
    const { page, ctx } = await openAt(browser, srv.base, file, when, { width, height, route: long });
    await page.waitForTimeout(400);
    assert.match(await page.evaluate(() => document.body.innerText), /any amount you wish|whole community/);
    assert.deepEqual(await overflowing(page), [], `${file} ${when}`);
    const hit = await page.evaluate(() => {
      const b = document.getElementById("fbar").getBoundingClientRect(), c = document.getElementById("clock").getBoundingClientRect();
      for (const el of document.querySelectorAll("#oin > *:not([hidden]), #give, #appbox")) {
        const r = el.getBoundingClientRect();
        if (!r.height) continue;
        if (r.bottom > b.top && r.top < b.bottom && r.right > b.left && r.left < b.right) return el.id || el.className;
        if (r.top < c.bottom && r.bottom > c.top && r.right > c.left && r.left < c.right) return (el.id || el.className) + " on the clock";
      }
      return null;
    });
    assert.equal(hit, null, `${file} ${when}`);
    await ctx.close();
  }
});

/* Review finding 3, for the progress bar: more phases still place the dot
   correctly and keep its labels apart. */
test("a seven-phase build keeps the progress bar right", async () => {
  const seven = withContent((c) => {
    c.newBuild.timeline = [...c.newBuild.timeline.slice(0, 4), { date: "Spring 2027", title: "Phase 3.4 roof and dome", status: "upcoming" }, { date: "2028", title: "Landscaping and car park", status: "upcoming" }, c.newBuild.timeline[4]];
    delete c.newBuild.progress;
  });
  for (const [file, width, height] of FILES) {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height, route: seven });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const bar = document.querySelector("#progress .track").getBoundingClientRect(), dot = document.querySelector("#progress .dot").getBoundingClientRect();
      const labs = [...document.querySelectorAll("#progress .pl span")].map((e) => { const g = document.createRange(); g.selectNodeContents(e); return g.getBoundingClientRect().toJSON(); });
      return { at: ((dot.left + dot.right) / 2 - bar.left) / bar.width, labs };
    });
    assert.ok(Math.abs(r.at - 0.5) < 0.01, `${file}: dot at ${r.at}`);   // the 4th of 7
    for (let i = 1; i < r.labs.length; i++) assert.ok(r.labs[i].left >= r.labs[i - 1].right + 24, `${file}: progress labels crowd`);
    assert.deepEqual(await overflowing(page), [], file);
    await ctx.close();
  }
});

test("a null foyer-content.json still lets Eid show", async () => {
  const errors = [];
  const { page, ctx } = await openAt(browser, srv.base, "foyer.html", "2027-03-10T10:00:00", { route: (p) => { p.on("pageerror", (e) => errors.push(e.message)); return p.route("**/foyer-content.json", (r) => r.fulfill({ contentType: "application/json", body: "null" })); } });
  await page.waitForTimeout(1500);
  await page.clock.runFor(3000);
  assert.equal(await page.isVisible("#occasion"), true);
  assert.deepEqual(errors, []);
  await ctx.close();
});

/* The foyer matches the timetable: the same header (larger logo, no star),
   the same readability rules, and the bottom as two boxes, the next
   jamāʿah and Jumuʿah, each with its gold label above. */
import { textAudit } from "./helpers.mjs";
for (const [file, width, height, logoMin] of [["foyer.html", 1920, 1080, 150], ["foyervertical.html", 1080, 1920, 122]]) {
  for (const when of ["2026-11-16T13:05:00", "2027-02-18T13:05:00", "2027-03-10T10:00:00"]) {
    test(`${file} is readable at ${when.slice(0, 10)}`, async () => {
      const { page, ctx } = await openAt(browser, srv.base, file, when, { width, height });
      const bad = [];
      for (const t of await textAudit(page)) {
        if (t.px < 24) bad.push(`"${t.text}" is ${t.px}px`);
        if (t.contrast < 4.5) bad.push(`"${t.text}" contrast ${t.contrast.toFixed(1)}`);
      }
      assert.deepEqual([...new Set(bad)], []);
      await ctx.close();
    });
  }
  test(`${file} has the timetable's header and two bottom boxes`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height });
    assert.equal(await page.locator(".star").count(), 0, "no star");
    const r = await page.evaluate(() => {
      const b = (s) => document.querySelector(s) && document.querySelector(s).getBoundingClientRect().toJSON();
      const ebAbove = (box) => { const e = document.querySelector(box + " .eyebrow"), v = document.querySelector(box + " b"); return !!(e && v && e.getBoundingClientRect().bottom <= v.getBoundingClientRect().top + 2); };
      return { logo: b(".logo"), next: b("#next"), jum: b("#jum"), nextAbove: ebAbove("#next"), jumAbove: ebAbove("#jum") };
    });
    assert.ok(r.logo.height >= logoMin, `logo ${Math.round(r.logo.height)}px`);
    assert.ok(r.next && r.jum, "two boxes");
    assert.ok(r.next.right + 16 <= r.jum.left || r.next.bottom + 16 <= r.jum.top, "the boxes touch");
    assert.ok(Math.abs(r.next.height - r.jum.height) <= 1, "the boxes differ in height");
    assert.ok(await page.isVisible("#appbox"), "the app box");
    assert.ok(r.nextAbove && r.jumAbove, "gold labels sit above the times");
    await ctx.close();
  });
}

/* The heading sits on one line, as large as fits (and never tiny). A long
   edit to it in foyer-content.json shrinks it to a floor, then wraps. */
for (const [file, width, height] of FILES) {
  test(`${file} title on one line`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height });
    const r = await page.evaluate(() => {
      const h = document.getElementById("phase-title"), cs = getComputedStyle(h);
      return { lines: Math.round(h.getBoundingClientRect().height / parseFloat(cs.lineHeight)), px: parseFloat(cs.fontSize), over: h.scrollWidth > h.clientWidth + 1 };
    });
    assert.equal(r.lines, 1, `title takes ${r.lines} lines`);
    assert.ok(r.px >= 64, `title is ${r.px}px`);
    assert.ok(!r.over, "title runs past the screen");
    await ctx.close();
  });
}

/* The New Build, laid out as signed off (17 Nov): centred, one column. The
   title, needs, progress bar and the give panel share one centre line; the
   give panel is the single largest element after the clock; spacing between
   blocks is even. */
for (const [file, width, height, qrMin] of [["foyer.html", 1920, 1080, 260], ["foyervertical.html", 1080, 1920, 440]]) {
  test(`${file} is centred, evenly spaced and leads with the QR`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height });
    const r = await page.evaluate(() => {
      const b = (s) => document.querySelector(s).getBoundingClientRect();
      const ink = (s) => { const g = document.createRange(); g.selectNodeContents(document.querySelector(s)); return g.getBoundingClientRect(); };
      const mid = (x) => (x.left + x.right) / 2;
      return { centres: ["#phase-title", "#needs", "#progress", "#give"].map((s) => Math.round(mid(s.startsWith("#phase") || s === "#needs" ? ink(s) : b(s)))),
        screen: Math.round(mid(document.getElementById("content").getBoundingClientRect())),
        qr: b("#qr").width, gaps: [b("#progress").top - ink("#needs").bottom, b("#give").top - b("#progress").bottom] };
    });
    for (const c of r.centres) assert.ok(Math.abs(c - r.screen) <= 2, `off centre: ${r.centres} vs ${r.screen}`);
    assert.ok(r.qr >= qrMin, `QR is ${Math.round(r.qr)}px`);
    for (const g of r.gaps) assert.ok(g >= 24, `blocks too close: ${r.gaps.map(Math.round)}`);
    await ctx.close();
  });
}

/* The progress bar is a thin line, and the bottom boxes are even: equal
   widths and equal gaps in landscape, equal heights in a row. */
for (const [file, width, height] of FILES) {
  test(`${file} thin progress line and even boxes`, async () => {
    const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00", { width, height });
    const r = await page.evaluate(() => {
      const b = (s) => document.querySelector(s).getBoundingClientRect();
      return { track: b("#progress .track").height, boxes: ["#next", "#jum", "#appbox"].map((s) => b(s).toJSON()) };
    });
    assert.ok(r.track <= 12, `progress line is ${r.track}px thick`);
    const [n, j, a] = r.boxes;
    if (width > height) {
      assert.ok(Math.abs(n.width - j.width) <= 1 && Math.abs(j.width - a.width) <= 1, `box widths ${[n, j, a].map((x) => Math.round(x.width))}`);
      assert.ok(Math.abs((j.left - n.right) - (a.left - j.right)) <= 1, `gaps ${Math.round(j.left - n.right)} and ${Math.round(a.left - j.right)}`);
      assert.ok(Math.abs(n.top - a.top) <= 1 && Math.abs(n.height - a.height) <= 1, "boxes not on one row");
    } else {
      assert.ok(Math.abs(n.width - j.width) <= 1, "the two prayer boxes differ");
      assert.ok(Math.abs(a.left - n.left) <= 1 && Math.abs(a.right - j.right) <= 1, "the app strip does not span the two boxes");
      assert.ok(Math.abs((n.top - a.bottom) - (j.left - n.right)) <= 6, "uneven gap above the boxes");
    }
    await ctx.close();
  });
}
