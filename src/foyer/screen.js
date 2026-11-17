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

  /* Evenly spaced dots on a gold line, each label centred under its dot. */
  function drawTimeline(items) {
    var W = PORTRAIT ? 952 : 964, n = items.length;
    if (!n) { setHTML("timeline", ""); return; }
    // Label width from the room between dots, so a seventh phase cannot
    // make neighbours collide; the type shrinks with it.
    var w = Math.min(188, (W - 12 * (n - 1)) / n), f = w / 188;  // up to five phases keep full size (24px dates)
    var xs = items.map(function (_, i) { return n === 1 ? W / 2 : w / 2 + i * (W - w) / (n - 1); });
    var act = -1;
    items.forEach(function (t, i) { if (t.status === "active") act = i; });
    var upto = act >= 0 ? act : items.filter(function (t) { return t.status === "done"; }).length - 1;
    var svg = '<svg viewBox="0 0 ' + W + ' 60" preserveAspectRatio="none">';
    if (upto > 0) svg += '<line x1="' + xs[0] + '" y1="24" x2="' + xs[upto] + '" y2="24" stroke="#DCBB63" stroke-width="4"/>';
    if (upto < n - 1) svg += '<line x1="' + xs[Math.max(upto, 0)] + '" y1="24" x2="' + xs[n - 1] + '" y2="24" stroke="rgba(243,239,227,.25)" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>';
    var labs = "";
    items.forEach(function (t, i) {
      var st = t.status || "upcoming";
      svg += '<circle cx="' + xs[i] + '" cy="24" r="' + (st === "active" ? 14 : 9) + '" fill="' + (st === "upcoming" ? "#3C0B2A" : "#DCBB63") + '" stroke="#DCBB63" stroke-width="2.5"/>';
      if (st === "active") svg += '<circle cx="' + xs[i] + '" cy="24" r="26" fill="none" stroke="rgba(220,187,99,.35)" stroke-width="2"/>';
      labs += '<div class="lab ' + esc(st) + '" style="left:' + xs[i] + "px;width:" + w + 'px"><b style="font-size:' + (n <= 5 ? 30 : Math.max(18, 30 * f)) + 'px">' + esc(t.title) + '</b><span style="font-size:' + (n <= 5 ? 24 : Math.max(14, 24 * f)) + 'px">' + esc(t.date) + "</span></div>";
    });
    setHTML("timeline", svg + "</svg>" + labs);
    var tl = document.getElementById("timeline"), h = 0;
    for (var k = 0; k < tl.children.length; k++) h = Math.max(h, tl.children[k].offsetTop + tl.children[k].offsetHeight);
    tl.style.height = h + "px";
  }

  /* Shrink the left column's contents (never clip them) if an edit to
   * foyer-content.json makes them taller than the space. */
  function fitColumn() {
    var col = document.getElementById("nbcol"), fit = document.getElementById("nbfit"), W = PORTRAIT ? 952 : 964;
    fit.style.transform = "none"; fit.style.width = W + "px";
    var k = 1;
    for (var i = 0; i < 12 && fit.scrollHeight * k > col.clientHeight; i++) {
      k -= 0.04;
      fit.style.width = W / k + "px";
    }
    if (k < 1) fit.style.transform = "scale(" + k + ")";
  }

  /* Shrink `el` (never clip it) when its contents need more room than
   * `box` (default: itself) has. Used for the Give/app column and the
   * greeting, after fitColumn did the same for the left column. */
  function fitBox(el, origin, box) {
    if (!el || el.offsetParent === null) return;
    box = box || el;
    el.style.transform = "none";
    var need = box === el ? el.scrollHeight : el.offsetHeight, have = box.clientHeight;
    if (need > have + 1) { el.style.transformOrigin = origin; el.style.transform = "scale(" + (have / need) + ")"; }
  }

  function renderNewBuild(c) {
    var nb = c.newBuild || {}, give = nb.give || {}, app = c.app || {};
    text("nb-eyebrow", nb.eyebrow || "The New Build");
    text("nb-heading", nb.heading);
    text("phase-tag", nb.phaseTag);
    text("phase-title", nb.phaseTitle);
    text("phase-desc", nb.phaseDescription);
    setHTML("needs", (nb.needs || []).map(function (s) { return "<span>" + esc(s) + "</span>"; }).join(""));
    drawTimeline(nb.timeline || []);
    text("qr-label", give.scanLabel || "Scan to give any amount");
    text("qr-sub", give.giftAidNote);
    if (give.otherAmountUrl) drawQR(give.otherAmountUrl);
    text("app-eyebrow", app.eyebrow);
    text("app-heading", app.heading);
    text("app-line", app.line);
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
    fitBox(document.getElementById("side"), "top center");
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
