# Taiyabah Masjid — Interactive Screens

**Salah times and community displays for the TVs around Taiyabah Masjid.**

Bolton Central Islamic Society · Registered charity 1041569
31a Draycott Street, Bolton BL1 8HD

Companion to the [website](https://yameenbux.github.io/Taiyabah-Mosque-Website-Rebrand/) and the [prayer times app](https://yameenbux.github.io/Taiyabah-Mosque-App/)

## About

Four always-on displays for the six TVs around the masjid — the prayer hall and downstairs run the Salah timetable, the foyer runs a rotating community display. Each comes in a landscape and a portrait version, so it doesn't matter which way a given TV is mounted. Same colours, fonts, logo and geometric motif as the website and app, so the building reads as one product wherever you're standing in it.

All four pages are single, self-contained HTML files (fonts and images embedded inline) built to run untouched for months on a browser tab that never closes — see [Reliability](#reliability--this-is-signage-not-a-webpage) below for what that actually means in practice.

## What's here

**`timetable.html`** / **`timetablevertical.html`**: Salah times for the prayer hall (×2) and downstairs (×2), landscape and portrait. Design B: the clock, an arc across the day from Fajr to Isha with a gold dot at "now", the next jamāʿah and how long until it, and the day's five prayers with their beginning and jamāʿah times. Prayers whose jamāʿah has passed fade. On a Friday, Zuhr becomes Jumuʿah with both times, labelled 1st and 2nd. Every year of prayer times in `data/` is built into the file, so once loaded it needs no network.

**`foyer.html`** / **`foyervertical.html`**: the foyer (×2), landscape and portrait. The New Build appeal, a large donate QR code, and a card saying the app is on the App Store and Google Play. During Ramadan and for the days of each Eid it shows the greeting instead, switching on and off by itself from the Hijri dates in the timetable. A bar along the bottom shows the next jamāʿah and Jumuʿah.

**`foyer-content.json`**: the foyer's words, the donate link and the app card. Edit it on GitHub and the foyer TVs pick it up within about twenty minutes. See SETUP.md.

**The four `.html` files are built, not written.** The source is in `src/`. Change it there and run `python3 build.py`. Line 1 of each built file says so.

## Repository structure

```
├── timetable.html, timetablevertical.html,
│   foyer.html, foyervertical.html   BUILT by build.py; the TVs open these.
├── foyer-content.json     Editable foyer words, donate link, app card.
├── build.py               Builds the four pages (Python 3, no installs).
├── data/
│   └── timetable-YYYY.json   One per year, copied from the app repo.
├── src/
│   ├── shared/            Colours, fonts, logo, store badges, the frame
│   │                      (clock, dates, bar, reliability), times.js (the
│   │                      prayer-time rules), the QR code library.
│   ├── timetable/         The timetable screen.
│   └── foyer/             The foyer screen.
├── tests/                 npm test: the rules, both screens, the build, and
│                          checks that the checks can fail.
├── docs/superpowers/      The design and the plan behind design B.
└── SETUP.md               Which TV gets which page, and the yearly update.
```

## Reliability: this is signage, not a webpage

These run for months on TVs nobody is looking after.

- **No network needed for the times.** Fonts, logo, badges and every year of prayer times are inside each page.
- **A 2am reload, but only if the network can serve the page.** If the Wi-Fi is down, the screen keeps what it has and tries again every fifteen minutes, rather than showing the browser's error page. The reload is also how an update reaches the TVs.
- **A stall watchdog.** If the TV's browser froze the tab and has just woken it, the page reloads (the same guarded way) instead of showing a clock that stopped.
- **A slow drift** of a few pixels every 150 seconds, against burn-in.
- **Fit to screen.** Each page is laid out at 1920×1080 (or 1080×1920) and scaled down to the TV, never up, so nothing is ever cut off.
- **The foyer never goes blank.** If `foyer-content.json` cannot be reached, it shows the copy built into the page.
- **No data, no guess.** On a date with no prayer times the timetable says so ("Please use the printed timetable"). It never shows a time it is not sure of.

## Each new year

Copy the app repo's `data/timetable-YYYY.json` into `data/`, then:

```bash
python3 build.py
```

```bash
npm test
```

Commit, and every TV has the new year after its next 2am reload. `build.py` refuses a timetable with a missing or out-of-order time. Both 2026 and 2027 are in already.

## Building and testing

`python3 build.py` needs only Python 3. `npm test` needs Node 22 and Playwright: `npm install`, and `npm i -D playwright` plus `npx playwright install chromium` if Playwright is not already there. The tests drive the built pages in a real browser at fixed times on real dates: midnight, after Isha, a Friday between the two Jumuʿahs, both clock changes, Ramadan, both Eids, and the end of the data. They decode the donate QR code, check nothing runs off the screen at five TV sizes, and prove each check can fail.

## Deploying

GitHub Pages, from this repo's root on `main`. A push to `main` reaches every TV at its next 2am reload, so test before merging. The four addresses are unchanged:

```
https://yameenbux.github.io/Taiyabah-Mosque-Interactive-Screens/timetable.html
https://yameenbux.github.io/Taiyabah-Mosque-Interactive-Screens/timetablevertical.html
https://yameenbux.github.io/Taiyabah-Mosque-Interactive-Screens/foyer.html
https://yameenbux.github.io/Taiyabah-Mosque-Interactive-Screens/foyervertical.html
```

## Credits

Built for Bolton Central Islamic Society, sharing its design system with the [website](https://yameenbux.github.io/Taiyabah-Mosque-Website-Rebrand/) and the [app](https://yameenbux.github.io/Taiyabah-Mosque-App/). Prayer times, the Taiyabah Masjid name, and the masjid's logo belong to the charity.
