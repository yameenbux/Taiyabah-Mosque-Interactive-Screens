<div align="center">

# Taiyabah Masjid — Interactive Screens

**Salah times and community displays for the TVs around Taiyabah Masjid.**

Bolton Central Islamic Society · Registered charity 1041569
31a Draycott Street, Bolton BL1 8HD

Companion to the [website](https://yameenbux.github.io/Taiyabah-Mosque-Website-Rebrand/) and the [prayer times app](https://yameenbux.github.io/Taiyabah-Mosque-App/)

</div>

---

## About

Two always-on displays for the six TVs around the masjid — the prayer hall
and downstairs run the Salah timetable, the foyer runs a rotating community
display. Same colours, fonts, logo and geometric motif as the website and
app, so the building reads as one product wherever you're standing in it.

Both pages are single, self-contained HTML files (fonts and images embedded
inline) built to run untouched for months on a browser tab that never
closes — see [Reliability](#reliability--this-is-signage-not-a-webpage)
below for what that actually means in practice.

## What's here

**`timetable.html`** — the Salah times screensaver, for the prayer hall (×2)
and downstairs (×2). Live clock, Gregorian and Hijri date, a countdown to
the next jamā'ah, and the full day's begin/jamā'ah times, with Jumu'ah
automatically replacing Zuhr on Fridays. The whole year's timetable is
embedded in the file itself, so once it's loaded, it needs no network at
all — it will keep showing the correct time for the correct prayer even if
the masjid's Wi-Fi goes down.

**`foyer.html`** — the foyer display (×2). Defaults to the New Build appeal
(current phase, timeline, and how to give — a QR code plus the masjid's
bank details), pulled from the website's New Build page. Automatically
switches to a full-screen "Ramadan Mubarak" or "Eid Mubarak" greeting on
the correct Islamic calendar dates and reverts on its own once the occasion
ends — no one needs to remember to turn it on or off.

**`foyer-content.json`** — the editable text behind `foyer.html`: the New
Build copy and the Ramadan/Eid wording. Edit this file directly on GitHub
(pencil icon → edit → commit) and every foyer TV picks it up within a day,
without anyone touching the screens. Must stay in the same folder as
`foyer.html` — it's loaded by a relative path, and the filenames have to
match exactly (`foyer-content.json`, with the hyphen).

**`SETUP.md`** — the full walkthrough: which TV gets which URL, the
per-TV settings worth changing once (auto power-off, screensaver, clock
sync), and how the annual timetable refresh works.

## Repository structure

```
├── timetable.html        Salah times screensaver — prayer hall & downstairs.
│                          Self-contained; the year's timetable is embedded,
│                          so it needs no network once loaded.
├── foyer.html             Foyer display — New Build appeal by default,
│                          Ramadan/Eid greetings on the right dates.
│                          Fetches foyer-content.json at runtime.
├── foyer-content.json     Editable copy for foyer.html. Edit this, not
│                          foyer.html, to change what the foyer TVs show.
└── SETUP.md               Full setup & maintenance instructions.
```

## Reliability — this is signage, not a webpage

These run for months, unattended, on TVs nobody's actively looking after.
A few things are built in because of that, not despite it:

- **Zero external requests on `timetable.html`.** Fonts, logo and the full
  timetable are embedded as base64 — no CDN, no API, nothing that can fail
  partway through the year.
- **Daily 2am reload on both pages**, timed to sit after the latest Isha
  jamā'ah and before the earliest Fajr begins even at midsummer, to clear
  any memory build-up from weeks of uptime.
- **A stall watchdog** that reloads immediately if the tab was suspended
  or throttled by the TV's browser and has just woken back up, rather than
  carry on with a clock that silently drifted while it was asleep.
- **A slow, near-invisible position drift** (~150 second cycle) as basic
  burn-in protection for content that sits static for hours at a time.
- **`foyer.html` never goes blank on a failed fetch** — if
  `foyer-content.json` can't be reached (e.g. Wi-Fi blips during the
  nightly reload), it falls back to a copy baked into the file itself.

None of this can recover a TV that's been fully power-cycled — that's a
TV-settings problem, not a code problem. See the reliability checklist in
`SETUP.md`.

## Annual refresh

`timetable.html`'s Salah times, and `foyer.html`'s Ramadan/Eid date
detection, both come from the same year's published timetable and are
pinned to that year. When the masjid publishes the next year's timetable,
both files need rebuilding with it — see `SETUP.md` for the exact steps.
`foyer-content.json`'s wording has no such expiry and can be edited any
time.

## Deploying

GitHub Pages, serving from this repo's root on `main`. If Pages isn't
already on: **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
Once live:

```
https://yameenbux.github.io/Taiyabah-Mosque-Interactive-Screens/timetable.html
https://yameenbux.github.io/Taiyabah-Mosque-Interactive-Screens/foyer.html
```

A custom domain later is a `CNAME` file plus one DNS record — doesn't
change anything else about this structure.

## Credits

Built for Bolton Central Islamic Society, sharing its design system with
the [website](https://yameenbux.github.io/Taiyabah-Mosque-Website-Rebrand/)
and the [app](https://yameenbux.github.io/Taiyabah-Mosque-App/). Prayer
times, the Taiyabah Masjid name, and the masjid's logo belong to the
charity.
