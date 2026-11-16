// A check that has never been seen to fail is decoration. Each one here is
// run against a deliberately broken COPY of a built page, in a throwaway
// folder, and must report the fault. The real pages are never touched.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { serve, openAt, overflowing, chromium, ROOT, decodeQR } from "./helpers.mjs";

const TMP = path.join(ROOT, "tests", ".negative");
let srv, browser;
before(async () => { fs.mkdirSync(TMP, { recursive: true }); srv = await serve(); browser = await chromium.launch(); });
after(async () => { await browser.close(); srv.stop(); fs.rmSync(TMP, { recursive: true, force: true }); });

function brokenCopy(from, name, edit) {
  const html = edit(fs.readFileSync(path.join(ROOT, from), "utf8"));
  fs.writeFileSync(path.join(TMP, name), html);
  return "tests/.negative/" + name;
}

test("the fit check catches a screen that runs off the edge", async () => {
  const file = brokenCopy("timetable.html", "overflow.html", (h) => h.replace("</style>", "#cards{left:-400px}</style>"));
  const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00");
  assert.ok((await overflowing(page)).length > 0, "the fit check passed a broken screen");
  await ctx.close();
});

test("the QR check catches a code that opens the wrong page", async () => {
  const real = JSON.parse(fs.readFileSync(path.join(ROOT, "foyer-content.json"), "utf8")).newBuild.give.otherAmountUrl;
  const file = brokenCopy("foyer.html", "qr.html", (h) => h.split(real).join("https://example.org/not-the-donate-page"));
  const { page, ctx } = await openAt(browser, srv.base, file, "2026-11-16T13:05:00");
  const got = await decodeQR(page);
  assert.ok(got, "nothing decoded at all");
  assert.notEqual(got, real, "the QR check could not tell a wrong link from the right one");
  await ctx.close();
});

test("the build refuses a page with a placeholder left in it", async () => {
  const { spawnSync } = await import("node:child_process");
  const src = path.join(ROOT, "src/timetable/page.html"), keep = fs.readFileSync(src, "utf8");
  // A throwaway copy of the whole source tree, so the real one is untouched.
  const tree = fs.mkdtempSync(path.join((await import("node:os")).tmpdir(), "screens-tree-"));
  for (const f of ["build.py", "foyer-content.json", "src", "data"]) fs.cpSync(path.join(ROOT, f), path.join(tree, f), { recursive: true });
  fs.writeFileSync(path.join(tree, "src/timetable/page.html"), keep.replace("</body>", "{{NOT_A_THING}}</body>"));
  const r = spawnSync("python3", ["build.py"], { cwd: tree, encoding: "utf8" });
  assert.notEqual(r.status, 0); assert.match(r.stderr, /NOT_A_THING/);
  assert.equal(fs.readFileSync(src, "utf8"), keep);
});
