// Every page on every screen it might meet. 49-inch and larger TVs are all
// 16:9 at 1080p or 4K, but the browser on them may report 720p, 4K or 8K,
// lose a little height to a bar, or sit on an ultrawide or old 4:3 set. On
// all of them each page must fill the screen in its limiting direction, stay
// centred, keep every word clear of the 2.5% a TV may crop from each edge
// (overscan), and leave no bare edge.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { serve, openAt, chromium } from "./helpers.mjs";

let srv, browser;
before(async () => { srv = await serve(); browser = await chromium.launch(); });
after(async () => { await browser.close(); srv.stop(); });

const LAND = [[1280, 720], [1366, 768], [1920, 1080], [1920, 1040], [2560, 1440], [3840, 2160], [7680, 4320], [2560, 1080], [1024, 768]];
const PORT = LAND.map(([w, h]) => [h, w]);
const PAGES = [["timetable.html", LAND], ["timetablevertical.html", PORT], ["foyer.html", LAND], ["foyervertical.html", PORT]];

for (const [file, sizes] of PAGES) for (const [w, h] of sizes) {
  for (const when of ["2026-11-20T12:00:00", "2027-02-18T13:05:00"]) {
    if (file.startsWith("timetable") && when.startsWith("2027")) continue;
    test(`${file} at ${w}x${h} ${when.slice(0, 10)}`, async () => {
      const { page, ctx } = await openAt(browser, srv.base, file, when, { width: w, height: h });
      const r = await page.evaluate(() => {
        const c = document.getElementById("content").getBoundingClientRect(), g = document.querySelector(".ground").getBoundingClientRect();
        const W = innerWidth, H = innerHeight, mx = W * 0.025, my = H * 0.025, out = [];
        for (const el of document.querySelectorAll("#content *")) {
          if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || el.closest("[hidden]") || !el.getClientRects().length) continue;
          // where the letters are drawn, not the font's taller line box
          const q = document.createRange(); q.selectNodeContents(el); const t = q.getBoundingClientRect();
          const mark = document.createElement("span"); mark.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
          el.appendChild(mark); const base = mark.getBoundingClientRect().top; mark.remove();
          const k = (document.getElementById("content").getBoundingClientRect().width / document.getElementById("content").offsetWidth) || 1;
          const cx = document.createElement("canvas").getContext("2d"); { const fs = getComputedStyle(el); cx.font = `${fs.fontStyle} ${fs.fontWeight} ${fs.fontSize} ${fs.fontFamily}`; }
          const m = cx.measureText(el.textContent.trim());
          const top = base - m.actualBoundingBoxAscent * k, bottom = base + m.actualBoundingBoxDescent * k;
          if (t.left < mx || t.right > W - mx || top < my || bottom > H - my) out.push(el.textContent.trim().slice(0, 20) + " " + [t.left, top, t.right, bottom].map(Math.round));
        }
        return { c: c.toJSON(), ground: g.left <= 0 && g.top <= 0 && g.right >= W && g.bottom >= H, W, H, overscan: out };
      });
      const fill = Math.max(r.c.width / r.W, r.c.height / r.H);
      assert.ok(fill > 0.995, `fills ${(fill * 100).toFixed(1)}%`);
      assert.ok(r.c.left >= -1 && r.c.top >= -1 && r.c.right <= r.W + 1 && r.c.bottom <= r.H + 1, "content cut off");
      assert.ok(Math.abs((r.c.left + r.c.right) / 2 - r.W / 2) <= 8 && Math.abs((r.c.top + r.c.bottom) / 2 - r.H / 2) <= 8, "not centred");
      assert.ok(r.ground, "a bare edge shows");
      assert.deepEqual(r.overscan, [], "text inside the overscan strip");
      await ctx.close();
    });
  }
}
