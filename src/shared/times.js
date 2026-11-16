/* Taiyabah Masjid screens: the prayer-time arithmetic.
 *
 * Plain functions over the timetable data ("days", a map of YYYY-MM-DD to
 * {hijri, begins, jamaat, jummah?}) and a Date. They are the same in the page
 * and in Node, which is how tests/logic.test.mjs checks them against the real
 * timetables. Times in the data are local wall-clock (Europe/London) with the
 * clock changes already applied, so they are read as local time.
 */
(function (root) {
  "use strict";

  var PRAYERS = [
    { key: "fajr", en: "Fajr", ar: "الفجر" },
    { key: "zuhr", en: "Zuhr", ar: "الظهر" },
    { key: "asr", en: "Asr", ar: "العصر" },
    { key: "maghrib", en: "Maghrib", ar: "المغرب" },
    { key: "isha", en: "Isha", ar: "العشاء" },
  ];
  var JUMUAH = { en: "Jumuʿah", ar: "الجمعة" };

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function dayKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  function addDays(d, n) { var r = new Date(d); r.setDate(r.getDate() + n); return r; }

  /* "15:00" -> {t:"3:00", ap:"pm"}. The masjid's format everywhere. */
  function hm12(hhmm) {
    var h = +hhmm.slice(0, 2), m = hhmm.slice(3, 5);
    return { t: (h % 12 === 0 ? 12 : h % 12) + ":" + m, ap: h < 12 ? "am" : "pm" };
  }

  /* A Date for that day's HH:MM. */
  function at(d, hhmm) {
    var r = new Date(d);
    r.setHours(+hhmm.slice(0, 2), +hhmm.slice(3, 5), 0, 0);
    return r;
  }

  function isFriday(d) { return d.getDay() === 5; }

  /* The five jamāʿah slots for one date, Jumuʿah's 1st time standing in for
   * Zuhr on a Friday. Empty when the date has no data: nothing is guessed. */
  function slotsFor(days, d) {
    var rec = days[dayKey(d)];
    if (!rec) return [];
    return PRAYERS.map(function (p) {
      if (p.key === "zuhr" && isFriday(d) && rec.jummah) {
        return { key: "zuhr", en: JUMUAH.en, ar: JUMUAH.ar, at: at(d, rec.jummah.first), jum: true };
      }
      return { key: p.key, en: p.en, ar: p.ar, at: at(d, rec.jamaat[p.key]) };
    });
  }

  /* The next jamāʿah still to come: today's, else tomorrow's Fajr, else null
   * (the end of the data, never a guess). */
  function nextJamaah(days, now) {
    var today = slotsFor(days, now);
    for (var i = 0; i < today.length; i++) if (today[i].at > now) return today[i];
    var tomorrow = slotsFor(days, addDays(now, 1));
    return tomorrow.length ? tomorrow[0] : null;
  }

  /* Keys of today's slots whose jamāʿah has been reached. */
  function passedKeys(days, now) {
    var s = new Set();
    slotsFor(days, now).forEach(function (x) { if (x.at <= now) s.add(x.key); });
    return s;
  }

  /* 6840000 -> "in 1h 54m"; under an hour "in 23m"; under a minute "now". */
  function countdown(ms) {
    if (ms < 60000) return "now";
    var mins = Math.floor(ms / 60000), h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? "in " + h + "h " + m + "m" : "in " + m + "m";
  }

  /* Today's Jumuʿah if it is Friday and the 2nd has not passed, else the
   * coming Friday's. null if no Friday ahead has data. */
  function nextJumuah(days, now) {
    for (var i = 0; i < 8; i++) {
      var d = addDays(now, i);
      if (!isFriday(d)) continue;
      var rec = days[dayKey(d)];
      if (!rec || !rec.jummah) continue;
      if (i === 0 && at(d, rec.jummah.second) <= now) continue;
      return { date: at(d, "00:00"), first: rec.jummah.first, second: rec.jummah.second };
    }
    return null;
  }

  /* Where "now" sits on the day's arc: 0 at Fajr begins, 1 at Isha begins. */
  function arcFraction(days, now) {
    var rec = days[dayKey(now)];
    if (!rec) return 0;
    var a = at(now, rec.begins.fajr), b = at(now, rec.begins.isha);
    return Math.max(0, Math.min(1, (now - a) / (b - a)));
  }

  /* Position (0..1) of a begin time on that arc. */
  function arcPos(rec, key, d) {
    var a = at(d, rec.begins.fajr), b = at(d, rec.begins.isha);
    return (at(d, rec.begins[key]) - a) / (b - a);
  }

  var api = {
    PRAYERS: PRAYERS, JUMUAH: JUMUAH, pad: pad, dayKey: dayKey, addDays: addDays, hm12: hm12, at: at,
    isFriday: isFriday, slotsFor: slotsFor, nextJamaah: nextJamaah, passedKeys: passedKeys,
    countdown: countdown, nextJumuah: nextJumuah, arcFraction: arcFraction, arcPos: arcPos,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TT_TIMES = api;
})(this);
