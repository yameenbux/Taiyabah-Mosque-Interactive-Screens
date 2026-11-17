# Taiyabah Masjid — TV signage setup

Five files, one small job on GitHub, then a bookmark on each TV.

## 1. Put the files on GitHub Pages

*(Already done. This is how it works if it ever needs doing again.)*

Add these files to a repo that has GitHub Pages enabled — keep `foyer.html`,
`foyervertical.html` and `foyer-content.json` all in the **same folder**,
since both foyer pages fetch `foyer-content.json` by a relative path:

```
timetable.html            → Salah times screensaver — landscape TVs
timetablevertical.html     → Salah times screensaver — portrait TVs
foyer.html                  → foyer display — landscape TVs
foyervertical.html           → foyer display — portrait TVs
foyer-content.json            → editable text for both foyer pages — see section 3
```

Once pushed, they'll be reachable at something like:
`https://yameenbux.github.io/<repo-name>/timetable.html`
`https://yameenbux.github.io/<repo-name>/foyer.html`
(and the same with `vertical` appended for the portrait screens, e.g.
`timetablevertical.html`)

## 2. Point each TV at the right page

- **Prayer hall (2 TVs) + downstairs (2 TVs), landscape orientation:** open
  `timetable.html`'s URL, go fullscreen (double-click the screen, or press F
  if a keyboard's plugged in), bookmark it or set it as the browser's home
  page.
- **Any of those mounted in portrait instead:** use `timetablevertical.html`
  on that TV instead of `timetable.html` — same content, laid out as a
  vertical list rather than a row of cards.
- **Foyer (2 TVs):** `foyer.html` if landscape, `foyervertical.html` if
  portrait.

Do this once per TV. See the reliability checklist below — there are a
couple of settings worth changing in each TV's own menu at the same time.

## 3. Editing the foyer content yourself

Open `foyer-content.json` on GitHub (the pencil icon), change the text after any colon, leave the field names alone, and commit. Both foyer TVs read the file every ten minutes, so a change shows within about twenty minutes. You don't need to touch the TVs.

- `newBuild`: the appeal. The screen shows `eyebrow` and `phaseTag` on the gold line, `phaseTitle` as the big title (it sizes itself to fit one line), and `needs` on one line under it. **The QR code is drawn from `give.otherAmountUrl`**, so changing that link changes the code; scan it with a phone afterwards to check.
- The progress bar: its dot sits at whichever `timeline` stage has `"status": "active"`, so moving to the next phase is one word changed. The three words under the bar are `progress.done`, `progress.now` and `progress.next`.
- `app.label`: the words above the App Store and Google Play badges ("Download our app"). The badges are fixed artwork.
- `occasions`: the Ramadan and Eid greetings. They switch on and off by themselves from the Hijri dates in the timetable. Set `"enabled": false` to turn one off; `durationDays` sets how many days an Eid greeting stays up.
- Kept in the file but **not shown on the screens**: `heading`, `tagline`, `phaseDescription`, the timeline's own wording, and the bank details. Nobody copies an account number off a TV.

If you break the JSON (a missing comma or a stray quote), GitHub usually warns you before you commit. If something does slip through, the screens don't go blank: they keep showing the last good words, or the copy built into the page.

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

The prayer times for every year in `data/` are built into all four pages, and the foyer's Ramadan and Eid dates come from the same files. When the masjid publishes a new year:

1. Parse it into the app repo's `data/timetable-YYYY.json`, as the app's `data/README.md` describes.
2. Copy that file into this repo's `data/`.
3. Run `python3 build.py`, then `npm test`.
4. Commit and push to `main`. Every TV has the new year after its next 2am reload.

2026 and 2027 are both built in now. Do this for 2028 before December 2027.

## 6. Custom domain, later

Whenever you're ready: add a `CNAME` file to the repo with your domain in
it, and point a DNS `A`/`CNAME` record at GitHub Pages. Doesn't change
anything about the structure above — just moves the base URL.
