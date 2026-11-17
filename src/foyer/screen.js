/* Taiyabah Masjid screens: the foyer.
 * The New Build appeal by default; the Ramadan or Eid greeting on its dates
 * (read from the same timetable data as the prayer times). Words come from
 * foyer-content.json, with the copy built into the page as the fallback. */
"use strict";
(function () {
  var PORTRAIT = document.body.classList.contains("portrait");
  var CONTENT = window.TT_CONTENT, shownQR = null;

  function text(id, s) { var el = document.getElementById(id); if (el && el.textContent !== (s || "")) el.textContent = s || ""; }

  function parseHijri(s) {
    var m = /^(\d+)\s+(.+?)\s+(\d+)\s+AH$/.exec(s || "");
    return m ? { day: +m[1], month: m[2] } : null;
  }

  /* Same rules as the foyer has always had: Ramadan for the month; each Eid
   * from its first day for durationDays; enabled:false turns one off. */
  function activeOccasion(content, days, now) {
    var occ = content.occasions || {};
    for (var back = 0; back <= 6; back++) {
      var p = parseHijri((days[T.dayKey(T.addDays(now, -back))] || {}).hijri);
      if (!p) continue;
      if (back === 0 && p.month === "Ramadan" && occ.ramadan && occ.ramadan.enabled !== false) return { o: occ.ramadan, ramadanDay: p.day };
      if (p.day === 1 && p.month === "Shawwal" && occ.eidFitr && occ.eidFitr.enabled !== false && back < (occ.eidFitr.durationDays || 1)) return { o: occ.eidFitr };
      if (p.day === 10 && p.month === "Dhul Hijjah" && occ.eidAdha && occ.eidAdha.enabled !== false && back < (occ.eidAdha.durationDays || 1)) return { o: occ.eidAdha };
    }
    return null;
  }

  /* The donate QR code: one crisp vector path, ink on cream, its quiet zone
   * coming from the tile's padding. */
  function drawQR(url) {
    if (url === shownQR) return;
    var box = document.getElementById("qr");
    try {
      var q = qrcode(0, "M");
      q.addData(url);
      q.make();
      var n = q.getModuleCount(), d = "";
      for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (q.isDark(y, x)) d += "M" + x + " " + y + "h1v1h-1z";
      box.innerHTML = '<svg viewBox="0 0 ' + n + " " + n + '" shape-rendering="crispEdges" role="img" aria-label="Donate"><path fill="#261B22" d="' + d + '"/></svg>';
      shownQR = url;
    } catch (e) { box.innerHTML = ""; shownQR = null; }
  }

  /* One progress bar: the dot sits at the active stage, as a share of the
   * way from the first stage to the last. Its three labels come from
   * newBuild.progress when the committee sets them, else from the timeline. */
  function drawProgress(items, words) {
    var n = items.length, act = -1, done = 0;
    items.forEach(function (t, i) { if (t.status === "active") act = i; if (t.status === "done") done++; });
    var at = n > 1 ? (act >= 0 ? act : Math.max(0, done - 1)) / (n - 1) : 1;
    var pct = (at * 100).toFixed(2) + "%";
    var bar = document.querySelector("#progress .track");
    bar.querySelector(".fill").style.width = pct;
    bar.querySelector(".dot").style.left = pct;
    words = words || {};
    var upcoming = items.filter(function (t) { return t.status === "upcoming"; });
    text("pl-done", words.done || (done ? done + (done === 1 ? " stage" : " stages") + " complete" : ""));
    text("pl-now", words.now || (act >= 0 ? items[act].date : ""));
    text("pl-next", words.next || (upcoming.length ? upcoming[upcoming.length - 1].title : ""));
  }

  /* The title on one line, as large as fits the width: from the design size
   * down to a floor, then it wraps rather than becoming hard to read. */
  function fitTitle() {
    var h = document.getElementById("phase-title"), max = PORTRAIT ? 80 : 88, min = PORTRAIT ? 56 : 64;
    h.style.fontSize = max + "px"; h.style.whiteSpace = "nowrap";
    var room = document.getElementById("intro").clientWidth, px = max;
    while (px > min && h.scrollWidth > room) { px -= 1; h.style.fontSize = px + "px"; }
    if (h.scrollWidth > room) h.style.whiteSpace = "";
  }

  /* Shrink the column between the header and the bottom boxes (never clip
   * it) if a long edit to foyer-content.json makes it taller than its room. */
  function fitColumn() {
    var nb = document.getElementById("newbuild");
    nb.style.transform = "none";
    var need = nb.scrollHeight, have = nb.clientHeight;
    if (need > have + 1) { nb.style.transformOrigin = "top center"; nb.style.transform = "scale(" + (have / need) + ")"; }
  }

  /* Shrink `el` (never clip it) when its contents need more room than
   * `box` (default: itself) has. Used for the Ramadan and Eid greeting. */
  function fitBox(el, origin, box) {
    if (!el || el.offsetParent === null) return;
    box = box || el;
    el.style.transform = "none";
    var need = box === el ? el.scrollHeight : el.offsetHeight, have = box.clientHeight;
    if (need > have + 1) { el.style.transformOrigin = origin; el.style.transform = "scale(" + (have / need) + ")"; }
  }

  function renderNewBuild(c) {
    var nb = c.newBuild || {}, give = nb.give || {}, app = c.app || {};
    text("nb-eyebrow", [nb.eyebrow || "The New Build", nb.phaseTag].filter(Boolean).join(" · "));
    text("phase-title", nb.phaseTitle);
    fitTitle();
    text("needs", (nb.needs || []).join(" · "));
    drawProgress(nb.timeline || [], nb.progress);
    text("qr-label", give.scanLabel || "Scan to give any amount");
    text("qr-sub", give.giftAidNote);
    if (give.otherAmountUrl) drawQR(give.otherAmountUrl);
    text("app-label", app.label || "Download our app");
    fitColumn();
  }

  function tick(now) {
    renderFrame(now, { short: true });
    var a = null;
    try { a = activeOccasion(CONTENT, DAYS, now); } catch (e) { a = null; }
    document.getElementById("occasion").hidden = !a;
    document.getElementById("newbuild").hidden = !!a;
    document.body.classList.toggle("occ", !!a);
    if (a) {
      text("o-arabic", a.o.arabic);
      text("o-title", a.o.title);
      text("o-message", a.o.message);
      var rec = DAYS[T.dayKey(now)], day = document.getElementById("oday");
      day.hidden = !(a.ramadanDay && rec);
      if (a.ramadanDay && rec) setHTML("oday", "Day " + a.ramadanDay + " of Ramadan · Maghrib " + fmtTime(rec.begins.maghrib));
    } else if (tick.dirty || tick.last !== T.dayKey(now)) {
      try { renderNewBuild(CONTENT); } catch (e) { if (CONTENT !== window.TT_CONTENT) { CONTENT = window.TT_CONTENT; renderNewBuild(CONTENT); } }
    }
    fitBox(document.getElementById("oin"), "center center", document.getElementById("occasion"));
    tick.dirty = false; tick.last = a ? null : T.dayKey(now);
    fitToViewport();
  }

  /* A volunteer edits this file in GitHub's editor. Valid JSON in the wrong
   * shape (a list typed as text, a section deleted) must not blank the
   * screen: keep the last good copy unless the new one has every part. */
  function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
  function wellFormed(c) {
    if (!isObj(c) || !isObj(c.newBuild) || !isObj(c.occasions)) return false;
    var nb = c.newBuild;
    return typeof nb.heading === "string" && Array.isArray(nb.needs) && Array.isArray(nb.timeline) && isObj(nb.give) &&
      nb.timeline.every(isObj) && nb.needs.every(function (n) { return typeof n === "string"; }) &&
      (c.app === undefined || isObj(c.app));
  }

  function load() {
    fetch("foyer-content.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (json) {
        if (!wellFormed(json)) return;
        CONTENT = json; tick.dirty = true; tick(new Date());
      })
      .catch(function () { /* keep what is showing: the last good copy, or the built-in one */ });
  }

  tick.dirty = true;
  startReliability(tick);
  load();
  setInterval(load, 10 * 60 * 1000);
})();
