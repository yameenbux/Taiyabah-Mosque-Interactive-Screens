# TV screens — design B, built from one source

Date: 16 November 2026 · Status: draft for approval · scope widened 16 Nov to all six TVs

## Why

The masjid's website and app share one look: plum `#3C0B2A`, gold
`#C6A24C`/`#DCBB63`, cream `#F5F1E8`, Fraunces + Hanken Grotesk + Amiri, the
calligraphic logo and the eight-pointed star. The TV screens already share
the colours and fonts but not the details. They write times three ways
("13:05", "3:00pm"; the app writes "12:45 pm"). Sunrise is shown twice and
sunset repeats Maghrib. The star motif is missing. The aim is that someone
who uses the app, then walks into the prayer hall, sees the same product.

The second reason is maintenance. Each screen is a 550 KB hand-uploaded file
carrying its own copy of the code, fonts and a whole year of times. A design
change has to be made in every copy, and a new year's times have to be pasted
into each one. The embedded data runs out on **31 December 2026**: from
1 January every prayer-hall TV shows "This screen doesn't have a timetable
loaded" unless 2027 is added.

## Scope

**In** (decided by the masjid, 16 Nov):
- **All four timetable TVs**, two in the prayer hall and two downstairs, switch
  to design B together. They already share `timetable.html` and
  `timetablevertical.html`.
- **The two foyer TVs** (`foyer.html`, `foyervertical.html`) move into the
  same source and take on design B's visual language. Their **content and
  behaviour stay as they are**: the New Build appeal by default; the Ramadan
  and Eid greetings switching on by Hijri date; text from
  `foyer-content.json`, fetched at runtime with a baked-in fallback.
- **Hijri dates for the foyer** come from the same `data/` files, so one
  build covers all six TVs each year.

**Out (non-goals):** new content such as notices, announcements or an iqāmah
overlay. Also out: any network dependency for showing times. The foyer's
existing fetch of its own text file stays.

**Anti-goals: it has failed, even if it looks right, if any of these happen:**
- a TV needs a new URL or someone has to touch it to get the new version;
- the screen needs the network after it has loaded once;
- a wrong time is shown. A screen that is blank or says it has no data is
  better than one confidently showing a wrong jamāʿah;
- it is visibly busier or more distracting than today. No ticking seconds
  anywhere, and nothing that blinks;
- a human face appears in any asset (the masjid's standing rule).

## The approach chosen

Three were considered:

1. **Edit the two HTML files in place.** Fastest, but it keeps the problem of
   duplicated code and per-year copy-paste. Rejected.
2. **One source, a build script, generated self-contained files.**
   **Chosen.**
3. **Pages fetch their times at runtime.** Simplest code, but it makes the
   timetable depend on the masjid's Wi-Fi. That is exactly the failure the
   current design avoids. Rejected.

## How it is built (option 2)

```
src/
  timetable/            the timetable screen (prayer hall + downstairs)
    page.html           markup with placeholders
    screen.css          both orientations; portrait via a body class
    screen.js           arc, cards, timetable-specific logic
  foyer/                the foyer screen
    page.html, screen.css, screen.js   appeal, occasions, content fetch
  shared/
    tokens.css          colours, type scale, [hidden] rule
    frame.css/.js       header, clock, dates, next-jamāʿah pill, star,
                        reliability net (guarded reload, watchdog, drift,
                        fit-to-viewport, fullscreen); used by both screens
    fonts/              woff2 subsets actually used
    logo.svg            from the app's logo.svg, ink set by CSS
data/
  timetable-2026.json   identical format to the app's data/timetable-2026.json
build.py                inlines fonts, logo, CSS, JS and every data/*.json
                        into all four screen files at the repo root
tests/                  checks the build output (below)
```

- **Output files keep their current names and stay at the repo root**, so
  every TV URL is unchanged. GitHub Pages keeps serving the root.
- **Generated files are committed**, because Pages serves them and there is
  no CI build step in this repo. Each generated file opens with a comment
  saying it is generated and must not be edited by hand. This is the website's
  `index.html` convention.
- **Data:** `build.py` embeds every `data/timetable-*.json` it finds, merged
  by date, so 2026 and 2027 can both be present over new year. The format is
  the app's (`days[YYYY-MM-DD] = {hijri, begins{…}, jamaat{…}, jummah?{first,
  second}}`). The build **refuses** to run on a malformed file (missing
  prayer, time out of order, bad date) instead of embedding it.
- **Standard library only.** Python 3 with no dependencies, because a
  volunteer must be able to run it.
- **New year procedure:** copy the app's new `timetable-YYYY.json` into
  `data/`, run `python3 build.py`, commit. It is documented in `SETUP.md`.

## What the screen shows (design B)

Reference render: the approved mockup B (1920×1080) from the design
conversation, plum ground with the arc and five cards.

**Landscape, 1920×1080 reference:**
- **Top left:** the logo in gold.
- **Top centre:** the clock in Fraunces, 12-hour, hours and minutes, "pm" in
  small gold. No seconds.
- **Top right:** the Gregorian date, with the Hijri date from the data file
  below it in gold (e.g. "6 Jumada al-Thani 1448 AH", spelled as the app
  spells it).
- **The day arc:** a dotted curve from Fajr's begin time to Isha's. Marked
  points at Fajr, Sunrise, Zuhr, Asr, Maghrib and Isha, placed by their begin
  times. The part already passed is drawn solid gold, and a gold dot sits at
  "now". Before Fajr and after Isha the dot sits at the matching end.
- **The next-jamāʿah pill** sits under the arc: "NEXT JAMĀʿAH · Asr · 3:00 pm
  · in 1h 54m". The countdown is hours and minutes only, and under one hour
  just minutes ("in 23m"). In the last minute it shows "now", not "0m".
- **Five cards: Fajr, Zuhr, Asr, Maghrib, Isha.** Each has an icon, the
  English and Arabic name, "Begins" and the time, then "Jamāʿah" and the
  larger gold time.
  - The card for the next jamāʿah gets the gold border and glow.
  - Cards whose jamāʿah has already passed today are faded to about 45%.
  - Sunrise is **not** a card. It appears on the arc and in the bottom bar.
- **Bottom bar:** Jumuʿah with the coming Friday's date and its 1st and 2nd
  times (today's on a Friday), then "Sunrise 7:38 am · Sunset 4:16 pm".
  Sunset is Maghrib's begin time, as today.
- The large faint star sits behind the clock as a watermark.

**Portrait, 1080×1920 reference:** the same elements stacked: logo and date,
clock, a narrower arc, the pill, then the five prayers as full-width **rows**
(icon · name + Arabic · begins · jamāʿah), then the Jumuʿah bar. The same
states and rules apply.

**Times are always written "3:00 pm" style:** 12-hour, no leading zero,
lowercase am/pm with a thin space before it, set smaller. This is the app's
format.

### Behaviour through the day

- **Next jamāʿah:** the first of today's five jamāʿah times (Jumuʿah's first
  time instead of Zuhr's on Friday) that is still in the future. After Isha's
  jamāʿah it is tomorrow's Fajr. This matches the current screen.
- **Faded cards** follow the same rule: once a card's jamāʿah has passed it
  fades. After Isha's jamāʿah, all five are faded until midnight, then reset
  to the new day.
- **Fridays:** the Zuhr card becomes "Jumuʿah / الجمعة". Its Begins line shows
  Zuhr's begin time, and the Jamāʿah line shows both times ("12:45 & 1:40
  pm"). When the 1st time passes, the next jamāʿah becomes Asr. The 2nd
  Jumuʿah is not a separate "next" target, as today.
- **Maghrib**, where begins equals jamāʿah, shows both, as the app does.
- **No data for today:** the cards, arc and pill are replaced by a plain
  message: "Prayer times for this date are not loaded. Please use the printed
  timetable." The clock and date stay. This message is visible to worshippers,
  so it must not mention maintenance or files.

### Kept from the current screens (unchanged behaviour)

- Reload every day at 02:00 local time, **but only if the network can serve
  the page** *(builder's call, changed from today)*. Before reloading, fetch
  the page's own URL with `cache: "no-store"`. Reload only on a 200 response
  whose body contains the generated-file marker. Otherwise keep running the
  copy already loaded and try again in 15 minutes. Today's plain
  `location.reload()` swaps the timetable for the browser's "no internet"
  page if the Wi-Fi is down at 2am, and the TV stays that way until someone
  touches it. The reload is also how updates reach the TVs, so it stays.
- The stall watchdog: if a tick arrives more than 15 s late, or the tab
  becomes visible after a long gap, reload, using the same guarded reload.
- Slow burn-in drift, about a 150-second cycle and a few pixels.
- Fit-to-viewport: scale down, never up, so nothing is ever clipped at an odd
  TV resolution.
- F key or double-click toggles fullscreen.
- The TV's own clock is trusted. `SETUP.md` already tells staff to keep it
  network-synced.

## The foyer in design B

The foyer keeps its two-column structure and its copy. It takes the
timetable's frame and components so the six TVs read as one set:

- **Same header as the timetable:** the logo top left, the clock at top
  centre (12-hour, no seconds), and the Gregorian and Hijri dates top right.
- **The same plum radial ground and star watermark**, card style, gold
  eyebrows and type scale.
- **A next-jamāʿah and Jumuʿah bar** along the bottom, the same as the
  timetable's (kept by the masjid, 16 Nov).
- **Ramadan and Eid greetings** sit on the same ground as everything else,
  with the same date-driven switching as today (`durationDays` and `enabled`
  are honoured).
- **The Give card shows no bank details** (the masjid, 16 Nov: nobody copies
  an account number off a TV). It holds only the eyebrow "Give to the New
  Build", a large donate QR code (about 380 px at 1080p), "Scan to give any
  amount" in 52 px Fraunces, and the Gift Aid line. It is the largest element
  on the screen and takes the space the bank rows had. The `bank` fields stay
  in `foyer-content.json`, unused by the screen, so nothing that reads that
  file breaks. The right column is 740 px wide.
- **The QR code is drawn as one crisp vector path:** square modules,
  `shape-rendering: crispEdges`, ink `#261B22` on a cream `#FCFAF3` tile, and a
  quiet zone of at least three modules inside the tile's rounded corners, so
  the rounding never clips a module. It is never a scaled bitmap.
- **An app card under the Give card** (the masjid, 16 Nov). Its eyebrow reads
  "The Taiyabah Masjid app" and its heading "Now available on the app
  stores", with the line: Search "Taiyabah Masjid" · prayer times, notices,
  live radio. Under it sit the **official** "Download on the App Store" and
  "Get it on Google Play" badges, copied unmodified from the app repo's
  `docs/store-assets/poster/badges/` (see its README: never redrawn,
  recoloured or cropped, only scaled whole). Google's badge carries its clear
  space inside the image, so it is drawn about 1.5× Apple's height to read
  the same size. **No app QR codes:** the masjid chose badges over codes, so
  the donate code is the only QR on the screen. To make room, the
  next-jamāʿah bar sits under the left column only, and the right column runs
  to the bottom.
- **The test suite decodes the donate QR code** on the rendered foyer page
  and checks that it equals the URL in the JSON.
- **The QR code is drawn live from `give.otherAmountUrl`** in
  `foyer-content.json`, by a small QR library embedded in the page. That is
  how the current foyer already works, whatever SETUP.md says, so the
  library comes across. Editing the link in the JSON changes the code within
  a day. The link it holds today is
  `taiyabahmasjid.com/product/dome-donation/`, on a domain the website's own
  notes say is not yet settled. **Before go-live, the masjid confirms that
  link still takes money.** SETUP.md's paragraph saying the QR is baked in is
  corrected.

Mockups of the landscape default and Ramadan states were shown on 16 Nov.
They add one line to the Ramadan greeting that is not in today's foyer: "Day
11 of Ramadan · Maghrib 5:31 pm", taken from that day's Maghrib time in the
data. The masjid chose the word "Maghrib", not "Iftār", on 16 Nov. The New Build timeline is drawn as a gold line with dots, echoing the
timetable's arc.

## Checks (`tests/`)

Run with `python3 tests/run.py`, which drives the built files in headless
Chromium through Playwright, the way the website's `_test/` suites do:

1. **Times are right:** for a set of fixed clock times on real 2026 dates,
   the next-jamāʿah name, time and countdown, and which cards are faded,
   match values computed independently from the JSON. The set covers before
   Fajr, between jamāʿahs, after Isha, a Friday before and after Jumuʿah,
   both clock-change days (29 Mar, 25 Oct), and 31 Dec 23:59 rolling into a
   day with no data.
2. **Embedded data equals `data/`:** every date's times in the built file
   equal the JSON. The 2026 file also equals the app repo's copy byte for
   byte; the check is skipped when the app repo isn't beside it.
3. **No network:** loading the built file makes zero requests other than the
   file itself. The guarded reload's one same-URL request is the only
   exception. A test covers it: with the network blocked, the 02:00 reload
   leaves the timetable on screen.
4. **Foyer occasions:** on dates inside Ramadan, Eid al-Fitr and Eid al-Adha
   in the data (2026, and 2027 once added), the matching greeting shows; the
   day after `durationDays` it reverts. With `foyer-content.json` unreachable
   the page still renders from its fallback.
5. **Nothing clipped:** screenshots at 1920×1080, 1366×768, 3840×2160,
   1080×1920 and 768×1366, with every element inside the viewport.
6. **The guards can fail:** the test suite proves at least one of the checks
   above goes red against a deliberately broken throwaway copy of the build,
   never by breaking the real one.

## Getting it approved before it is live

There is no staging site: Pages serves `main`, and every TV picks up `main`
at its next 02:00 reload. So the branch *is* the staging. Before anything
reaches `main`, screenshots of the built landscape **and portrait** files go
to the masjid for sign-off: the timetable at several times of day and on a
Friday, and the foyer in its default, Ramadan and Eid states. Portrait and the
foyer have no approved mockup yet, so this is their approval step *(builder's
call)*. All six TVs switch on the same night.

## Left to the builder

- Exact icon drawings. Match the app's prayer icons where they exist in
  `native/src`, otherwise keep the mockup's.
- The exact arc geometry and how labels avoid each other on short winter
  days. The rule is that no label may overlap another or the clock, which
  check 4 verifies.
- Font subsetting. Embed only the weights used.
- Language level of `screen.js`. Modern JS is fine, since the current screens
  already use it on these TVs, but nothing newer than what they already use.

## Open: needs the masjid, not code

- **The 2027 timetable** has been received and parsed into the app repo's
  `data/timetable-2027.json` (branch `claude/mosque-screen-display-design-q965ww`).
  It is copied into this repo's `data/` as part of the build. One value is
  inferred: 2nd Jumuʿah on Fri 31 Dec 2027, which the printed list omits. The
  parser carries 24 Dec's 1:40 pm forward, and the masjid confirms it.
  The app does not need a store release for 2027: it downloads published
  years from the committee's database. The committee publishes 2027 from the
  admin side.
- **The foyer QR link**, as above.
