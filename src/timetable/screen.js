/* Taiyabah Masjid screens: the timetable (prayer hall and downstairs).
 * The day's arc, the five prayer cards and the bar, redrawn every second
 * from TT_DATA. All the arithmetic is in times.js. */
"use strict";
(function () {
  var PORTRAIT = document.body.classList.contains("portrait");
  var ICON = {
    fajr: '<path d="M8 34h32M14 28a10 10 0 0 1 20 0M24 10v6M12 16l3 3M36 16l-3 3"/>',
    zuhr: '<circle cx="24" cy="24" r="8"/><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11 11l3.5 3.5M33.5 33.5L37 37M37 11l-3.5 3.5M14.5 33.5L11 37"/>',
    asr: '<circle cx="24" cy="26" r="7"/><path d="M24 10v5M10 26h5M33 26h5M14 16l3 3M34 16l-3 3M8 40h32"/>',
    maghrib: '<path d="M8 32h32M14 32a10 10 0 0 1 20 0M24 22v-12M19 15l5 5 5-5M10 39h28"/>',
    isha: '<path d="M30 8a15 15 0 1 0 10 25A13 13 0 0 1 30 8z" stroke-linejoin="round"/>',
  };
  var MARKS = [["fajr", "Fajr"], ["sunrise", "Sunrise"], ["zuhr", "Zuhr"], ["asr", "Asr"], ["maghrib", "Maghrib"], ["isha", "Isha"]];

  function icon(key) {
    return '<svg class="ic" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' + ICON[key] + "</svg>";
  }

  /* The arc from Fajr to Isha, solid gold up to now. */
  function drawArc(rec, now) {
    var W = PORTRAIT ? 952 : 1640, H = PORTRAIT ? 300 : 240, base = H - 10, rise = H - 50;
    function xy(f) { return [f * W, base - Math.sin(f * Math.PI) * rise]; }
    function line(f0, f1) {
      var pts = [];
      for (var i = 0; i <= 80; i++) { var p = xy(f0 + (f1 - f0) * i / 80); pts.push(p[0].toFixed(1) + "," + p[1].toFixed(1)); }
      return pts.join(" ");
    }
    var f = T.arcFraction(DAYS, now), nowP = xy(f), svg = "";
    svg += '<polyline points="' + line(0, 1) + '" fill="none" stroke="rgba(243,239,227,.18)" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>';
    svg += '<polyline points="' + line(0, f) + '" fill="none" stroke="#DCBB63" stroke-width="4" stroke-linecap="round"/>';
    // Dots first; then each label takes the first spot (above or below its
    // dot, near or further out) clear of the line, every dot, the "now"
    // marker and the labels already placed. Begin times bunch together on
    // winter days and summer evenings, so no fixed rule works all year.
    var line_ = [], k;
    for (k = 0; k <= 200; k++) line_.push(xy(k / 200));
    var taken = [{ x0: nowP[0] - 34, x1: nowP[0] + 34, y0: nowP[1] - 34, y1: nowP[1] + 34 }];
    // The next-jamāʿah pill sits over the arc: keep labels off it too.
    var el0 = document.getElementById("arc"), pill = document.getElementById("next");
    if (pill && pill.offsetWidth) {
      var k0 = W / el0.clientWidth;   // layout px -> arc units (unscaled layout)
      taken.push({ x0: (pill.offsetLeft - pill.offsetWidth / 2) * k0 - 8, x1: (pill.offsetLeft + pill.offsetWidth / 2) * k0 + 8,
                   y0: pill.offsetTop * k0 - 8, y1: (pill.offsetTop + pill.offsetHeight) * k0 + 8 });
    }
    var marks = MARKS.map(function (m) { var p = T.arcPos(rec, m[0], now); return { m: m, p: p, q: xy(p) }; });
    marks.forEach(function (o) {
      svg += '<circle cx="' + o.q[0].toFixed(1) + '" cy="' + o.q[1].toFixed(1) + '" r="7" fill="' + (o.p <= f ? "#DCBB63" : "#3C0B2A") + '" stroke="#DCBB63" stroke-width="2.5"/>';
      taken.push({ x0: o.q[0] - 10, x1: o.q[0] + 10, y0: o.q[1] - 10, y1: o.q[1] + 10 });
    });
    function clear(r) {
      for (var i = 0; i < taken.length; i++) { var t = taken[i]; if (r.x0 < t.x1 && t.x0 < r.x1 && r.y0 < t.y1 && t.y0 < r.y1) return false; }
      for (var j = 0; j < line_.length; j++) { var l = line_[j]; if (l[0] > r.x0 - 3 && l[0] < r.x1 + 3 && l[1] > r.y0 - 3 && l[1] < r.y1 + 3) return false; }
      return true;
    }
    marks.forEach(function (o) {
      var label = o.m[1].toUpperCase(), w = label.length * 14 + 6, x = o.q[0], y = o.q[1];
      var anchor = o.p < 0.02 ? "start" : o.p > 0.98 ? "end" : "middle";
      var x0 = anchor === "start" ? x - 4 : anchor === "end" ? x - w + 4 : x - w / 2;
      var spots = [-22, 38, -46, 62, -70, 86], base = spots[0], box;
      for (var s2 = 0; s2 < spots.length; s2++) {
        box = { x0: x0, x1: x0 + w, y0: y + spots[s2] - 16, y1: y + spots[s2] + 3 };
        if (clear(box)) { base = spots[s2]; break; }
      }
      taken.push({ x0: x0 - 6, x1: x0 + w + 6, y0: y + base - 16, y1: y + base + 3 });
      svg += '<text x="' + x.toFixed(1) + '" y="' + (y + base).toFixed(1) + '" text-anchor="' + anchor + '">' + label + "</text>";
    });
    svg += '<circle cx="' + nowP[0].toFixed(1) + '" cy="' + nowP[1].toFixed(1) + '" r="16" fill="#DCBB63"/>';
    svg += '<circle cx="' + nowP[0].toFixed(1) + '" cy="' + nowP[1].toFixed(1) + '" r="30" fill="none" stroke="rgba(220,187,99,.35)" stroke-width="2"/>';
    var el = document.getElementById("arc");
    el.setAttribute("viewBox", "0 0 " + W + " " + H);
    if (el.__svg !== svg) { el.innerHTML = svg; el.__svg = svg; }
  }

  function card(slot, rec, passed, nextKey) {
    var cls = "card " + slot.key + (passed.has(slot.key) ? " past" : "") + (slot.key === nextKey ? " isnext" : "");
    var begins = fmtTime(rec.begins[slot.key]);
    var jam = slot.jum
      ? '<div class="j two"><div><span class="lab">1st</span>' + fmtTime(rec.jummah.first) + '</div><div><span class="lab">2nd</span>' + fmtTime(rec.jummah.second) + "</div></div>"
      : '<div class="j">' + fmtTime(rec.jamaat[slot.key]) + "</div>";
    var name = '<div class="nm">' + nameHTML(slot.en) + '</div><div class="ar">' + slot.ar + "</div>";
    if (PORTRAIT) {
      return '<div class="' + cls + '">' + icon(slot.key) + '<div class="who">' + name + "</div>" +
        '<div class="bk"><div class="k">Begins</div><div class="b">' + begins + "</div></div>" +
        '<div class="jk"><div class="k">Jamāʿah</div>' + jam + "</div></div>";
    }
    return '<div class="' + cls + '">' + icon(slot.key) + name +
      '<div class="k">Begins</div><div class="b">' + begins + "</div>" +
      '<div class="k">Jamāʿah</div>' + jam + "</div>";
  }

  function tick(now) {
    var rec = renderFrame(now);
    var have = !!rec;
    document.getElementById("nodata").hidden = have;
    document.getElementById("cards").hidden = !have;
    document.getElementById("arcwrap").hidden = !have;
    document.getElementById("sun").hidden = !have;
    if (have) {
      var n = T.nextJamaah(DAYS, now);
      var nextKey = n && T.dayKey(n.at) === T.dayKey(now) ? n.key : null;
      var passed = T.passedKeys(DAYS, now);
      setHTML("cards", T.slotsFor(DAYS, now).map(function (s) { return card(s, rec, passed, nextKey); }).join(""));
      setHTML("sun", "Sunrise " + fmtTime(rec.begins.sunrise) + " · Sunset " + fmtTime(rec.begins.maghrib));
      drawArc(rec, now);
    }
    fitToViewport();
  }

  startReliability(tick);
})();
