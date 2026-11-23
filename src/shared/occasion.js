/* Taiyabah Masjid screens: which greeting (if any) is active right now.
 *
 * Moved out of the foyer screen so the timetable screen can ask the same
 * question — one rule reading one set of dates, not two copies that could
 * drift apart on when Eid starts or how long it lasts. */
"use strict";

function parseHijri(s) {
  var m = /^(\d+)\s+(.+?)\s+(\d+)\s+AH$/.exec(s || "");
  return m ? { day: +m[1], month: m[2] } : null;
}

/* Same rules the foyer has always had: Ramadan for the month; each Eid from
 * its first day for durationDays; enabled:false turns one off. */
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
