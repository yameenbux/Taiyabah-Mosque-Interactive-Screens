/* Taiyabah Masjid screens: the timetable (prayer hall and downstairs).
 * Five prayer cards and the Jumuʿah bar, redrawn every second from TT_DATA.
 * All the arithmetic is in times.js.
 *
 * Every card has the same parts in the same order, so that each line sits
 * at the same height across all five (or in the same column down all five
 * rows in portrait): icon, name, Arabic name, Begins, Jamāʿah, and a
 * countdown line that is empty except on the card whose jamāʿah is next. */
"use strict";
(function () {
  var ICON = {
    fajr: '<path d="M8 34h32M14 28a10 10 0 0 1 20 0M24 10v6M12 16l3 3M36 16l-3 3"/>',
    zuhr: '<circle cx="24" cy="24" r="8"/><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11 11l3.5 3.5M33.5 33.5L37 37M37 11l-3.5 3.5M14.5 33.5L11 37"/>',
    asr: '<circle cx="24" cy="26" r="7"/><path d="M24 10v5M10 26h5M33 26h5M14 16l3 3M34 16l-3 3M8 40h32"/>',
    maghrib: '<path d="M8 32h32M14 32a10 10 0 0 1 20 0M24 22v-12M19 15l5 5 5-5M10 39h28"/>',
    isha: '<path d="M30 8a15 15 0 1 0 10 25A13 13 0 0 1 30 8z" stroke-linejoin="round"/>',
  };

  var SUN = {
    sunrise: '<path d="M6 34h36M13 34a11 11 0 0 1 22 0M24 19V6M18 12l6-6 6 6M10 41h28"/>',
    sunset: '<path d="M6 34h36M13 34a11 11 0 0 1 22 0M24 6v13M18 13l6 6 6-6M10 41h28"/>',
  };
  function sunPart(key, label, hhmm) {
    return '<div class="sunpart ' + key + '"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      SUN[key] + '</svg><div><div class="k">' + label + '</div><div class="t">' + fmtTime(hhmm) + "</div></div></div>";
  }

  function icon(key) {
    return '<svg class="ic" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">' + ICON[key] + "</svg>";
  }

  function card(slot, rec, passed, nextKey, countdown) {
    var isNext = slot.key === nextKey;
    var cls = "card " + slot.key + (passed.has(slot.key) ? " past" : "") + (isNext ? " isnext" : "");
    var jam = slot.jum
      ? '<div class="j two"><div><span class="lab">1st</span>' + fmtTime(rec.jummah.first) + '</div><div><span class="lab">2nd</span>' + fmtTime(rec.jummah.second) + "</div></div>"
      : '<div class="j">' + fmtTime(rec.jamaat[slot.key]) + "</div>";
    return '<div class="' + cls + '">' + icon(slot.key) +
      '<div class="who"><div class="nm">' + nameHTML(slot.en) + '</div><div class="ar" lang="ar">' + slot.ar + "</div></div>" +
      '<div class="bk"><div class="k">Begins</div><div class="b">' + fmtTime(rec.begins[slot.key]) + "</div></div>" +
      '<div class="jk"><div class="k">Jamāʿah</div>' + jam + '<div class="cd">' + (isNext ? countdown : "") + "</div></div>" +
      "</div>";
  }

  function tick(now) {
    var rec = renderFrame(now, { short: true });
    var have = !!rec;
    document.getElementById("nodata").hidden = have;
    document.getElementById("cards").hidden = !have;
    document.getElementById("sbox").hidden = !have;
    var j = T.nextJumuah(DAYS, now);
    document.getElementById("jbox").hidden = !j;
    if (j) setHTML("jtimes", '<span class="lab">1st</span><b>' + fmtTime(j.first) + '</b><span class="lab">2nd</span><b>' + fmtTime(j.second) + "</b>");
    if (have) {
      var n = T.nextJamaah(DAYS, now);
      // Only today's next jamāʿah is marked: after Isha the next one is
      // tomorrow's Fajr, and the cards still show today.
      var nextKey = n && T.dayKey(n.at) === T.dayKey(now) ? n.key : null;
      var countdown = nextKey ? T.countdown(n.at - now) : "";
      var passed = T.passedKeys(DAYS, now);
      setHTML("cards", T.slotsFor(DAYS, now).map(function (s) { return card(s, rec, passed, nextKey, countdown); }).join(""));
      setHTML("sbox", sunPart("sunrise", "Sunrise", rec.begins.sunrise) + sunPart("sunset", "Sunset", rec.begins.maghrib));
    }
    fitToViewport();
  }

  startReliability(tick);
})();
