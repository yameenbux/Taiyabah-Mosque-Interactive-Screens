# Taiyabah Masjid — TV signage setup

Five files, one small job on GitHub, then a bookmark on each TV.

## 1. Put the files on GitHub Pages

Add these files to a repo that has GitHub Pages enabled — keep `foyer.html`,
`foyer-vertical.html` and `foyer-content.json` all in the **same folder**,
since both foyer pages fetch `foyer-content.json` by a relative path:

```
timetable.html            → Salah times screensaver — landscape TVs
timetable-vertical.html    → Salah times screensaver — portrait TVs
foyer.html                  → foyer display — landscape TVs
foyer-vertical.html          → foyer display — portrait TVs
foyer-content.json            → editable text for both foyer pages — see section 3
```

Once pushed, they'll be reachable at something like:
`https://yameenbux.github.io/<repo-name>/timetable.html`
`https://yameenbux.github.io/<repo-name>/foyer.html`
(and the same with `-vertical` for the portrait screens)

## 2. Point each TV at the right page

- **Prayer hall (2 TVs) + downstairs (2 TVs), landscape orientation:** open
  `timetable.html`'s URL, go fullscreen (double-click the screen, or press F
  if a keyboard's plugged in), bookmark it or set it as the browser's home
  page.
- **Any of those mounted in portrait instead:** use `timetable-vertical.html`
  on that TV instead of `timetable.html` — same content, laid out as a
  vertical list rather than a row of cards.
- **Foyer (2 TVs):** `foyer.html` if landscape, `foyer-vertical.html` if
  portrait.

Do this once per TV. See the reliability checklist below — there are a
couple of settings worth changing in each TV's own menu at the same time.

## 3. Editing the foyer content yourself

Open `foyer-content.json` on GitHub (the pencil/edit icon), change the text
after any colon, leave the field names alone, and commit. Every foyer TV —
landscape or portrait, both read the same file — picks up the change within
24 hours on its own (nightly 2am refresh) — you don't need to touch the TVs.

- `newBuild` — the everyday default: appeal status, phase, timeline, the
  give/donate details. All sourced from your website's New Build page.
- `occasions` — the Ramadan/Eid greetings. These switch on and off
  **automatically** based on the Islamic calendar dates already in your
  timetable data, so you don't need to do anything for them to appear —
  only edit them if you want to change the wording.
  - Set `"enabled": false` on any occasion to turn its auto-switch off
    entirely.
  - `durationDays` controls how many days an Eid greeting stays up before
    it reverts to the New Build screen.

If you ever break the JSON syntax (a missing comma, a stray quote), GitHub
will usually warn you before you can commit. If something does slip through,
the screens don't go blank — they fall back to the last version that worked.

**One thing that *won't* auto-update from this file:** the QR code on the
give card is generated from `newBuild.give.otherAmountUrl` at the moment
I built these files. If you change that URL in the JSON, the donate *text*
updates everywhere, but the QR image itself was baked in from the old URL
— come back to me (or re-run the build) if the donate link ever changes.

## 4. Reliability checklist — do this once per TV

This matters more than anything in the files themselves. Both pages reload
themselves nightly at 2am and recover from a stalled tab on their own, but
nothing running in a browser tab can survive the TV itself losing power. So:

- Turn off each TV's own auto power-off / "no signal" standby / built-in
  screensaver, in the TV's own settings — separate from anything here.
- Set date, time and time zone to automatic/network-synced, not manual —
  both pages trust the TV's own clock completely.
- Bookmark the page / set it as the browser's home page, so if a power cut
  does knock a TV back to its home screen, reopening it is two taps, not a
  message to me.
- Ask whoever's usually in the building to glance at a screen occasionally
  and check the time looks right, not just that something's on screen — a
  frozen clock still looks fine from across a room.

## 5. Next year's Salah timetable

`timetable.html` and `timetable-vertical.html` both have the whole year's
timetable embedded directly in the file (for maximum reliability — zero
network needed once loaded, unlike the foyer pages). When the masjid
publishes next year's times, regenerate `timetable-2026.json`-equivalent
for the new year the same way your app does, then ask me to rebuild all
four files with it — the foyer pages' Ramadan/Eid date detection reads the
same data, so all four need refreshing together, not just the two
timetable ones.

## 6. Custom domain, later

Whenever you're ready: add a `CNAME` file to the repo with your domain in
it, and point a DNS `A`/`CNAME` record at GitHub Pages. Doesn't change
anything about the structure above — just moves the base URL.
