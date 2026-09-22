# Tatyana Faradilla R. — personal portfolio

A small, hand-written static website. No build step, no frameworks, no backend.
Open `index.html` in a browser and it runs.

---

## Files

```
tatyana-portfolio/
├── index.html              all the text and structure — edit this most
├── css/style.css           all the styling (colours and fonts at the top)
├── css/city.css            motion layer + the holographic contact panel
├── js/main.js              menu, scroll reveals, project filter, copy button
├── js/living-city.js       the neon city that runs behind every section
├── js/city.js              scroll choreography, drifting particles, card tilt
├── assets/
│   ├── fonts/              Instrument Serif, Pinyon Script, Karla (+ licences)
│   └── images/
│       ├── placeholder-*.svg      temporary images — replace with your own
│       └── city-window.svg        site icon
└── README.md
```

## Running it on Windows

Double-clicking `index.html` works for everything except the "copy email" button,
which browsers only allow on a real address (`http://` or `https://`).

For editing, VS Code with the **Live Server** extension is easiest: right-click
`index.html` → *Open with Live Server*. The page reloads as you save.

---

## What to edit

Every section in `index.html` starts with a comment block telling you what it is.

| What you want to change | Where |
|---|---|
| Your introduction, role line, corner notes | `SECTION 1 — INTRODUCTION` |
| The five things you do | `SECTION 2 — WHAT I DO` |
| Skills (just `<li>` items, add or remove freely) | `SECTION 3 — HARD SKILLS` |
| Projects | `SECTION 4 — PROJECTS` |
| Experience (timeline) | `SECTION 5 — EXPERIENCE` |
| Education and languages | `SECTION 5b — EDUCATION & LANGUAGES` |
| How you work | `SECTION 6 — HOW I WORK` |
| Email, WhatsApp, iMessage | `SECTION 7 — CONTACT` |

### Projects (they open live)

Each project lives in its own folder and runs inside the page:

```
projects/
├── hotel-sriwidjaja/   index.html (guest site) + admin.html (admin panel)
├── egg-timer/          index.html
└── tourify/            index.html
```

These files are the original offline builds, unchanged. Clicking a card opens
the real project in a full-screen viewer (`js/projects.js`, `css/projects.css`)
that grows out of the card. "Back to portfolio" (or Esc while the bar has focus)
shrinks it back. Closing removes the project, so its sound and timers stop.

- Ctrl/Cmd-click or middle-click a card still opens the project in a new tab.
- Links like `index.html#project/tourify` open a project directly.
- Hotel Sriwidjaja has two tabs in the viewer. Both pages share browser storage,
  so a booking made on the guest site appears in the admin panel.

### Adding a project

1. Put the project in `projects/<name>/`. Its `index.html` must work on its own.
2. Copy one `<article class="work">…</article>` block inside `<div class="works">`.
3. Change `data-project` (short id), `data-category` (one or more of `web`, `app`,
   `uiux`, `interior`, `video`, separated by spaces), every `href` into `projects/`,
   the preview images, the texts and the facts (Purpose, Key features, Built with,
   My contribution). The element with `data-origin` is where the viewer grows from.
4. Links with `data-view` become the viewer's tabs; `data-label` is the tab name.
   One `data-view` link means no tabs.
5. `<template class="project__tips">` is the "How to try it" list in the viewer.

Filter buttons with no matching project hide themselves and come back once you
add one.

Preview images are real screenshots of each project (`shot-*.jpg`), shown
inside CSS browser and phone frames. `hotel_sriwidjaja.png`,
`eggtimer_d.png` and `school_team_project.png` are no longer used and can be
deleted.

### Adding an experience entry

Copy one `<li class="tl">…</li>` block inside `<ol class="timeline">` (most recent
first) and fill in the dates, role, organization and description. The glowing
line and the dots light up on their own as you scroll.

### Contact

Each contact method is one `<li class="reach__item">` with a link and a Copy
button (`data-copy` is what gets copied).

- WhatsApp: `https://wa.me/6287815055573`, the number in international format
  (country code, no `+`, no leading `0`).
- iMessage: an `sms:` link, which opens Messages on iPhone, iPad and Mac. On other
  devices the click copies the address instead and says why.

---

## Replacing the images

All placeholders live in `assets/images/`. Put your own file in the same folder
and point the `src` at it. Suggested sizes:

| Placeholder | Used for | Good size |
|---|---|---|
| `placeholder-portrait.svg` | hero photo | about 900 × 1150 px (portrait) |
| `placeholder-workspace.svg` | "How I work" photo | about 1600 × 1000 px |
| `placeholder-project-01…06.svg` | project thumbnails | about 1280 × 960 px (4:3) |

Example:

```html
<img src="assets/images/portrait.jpg" alt="Tatyana at her desk" width="900" height="1150">
```

Keep files under roughly 400 KB each so the page stays fast. Update the `alt` text
to describe the picture — it matters for screen readers and for search engines.

---

## Colours and fonts

Both are at the top of `css/style.css` in one `:root` block. Changing
`--amber` recolours every accent on the site at once.

```css
--night-1: #070B18;   /* page base */
--amber:   #E9B87C;   /* street-light accent */
--ink:     #ECEFF7;   /* main text */
```

Fonts are bundled, so the site works offline and looks the same on every computer:
**Instrument Serif** (headings), **Pinyon Script** (the handwritten accent) and
**Karla** (body text). All three are open source under the SIL Open Font License —
the licence files are in `assets/fonts/`. Keep them if you publish the site.

---

## Putting it online

**GitHub Pages** — create a repository, upload this whole folder, then
Settings → Pages → Branch: `main`, Folder: `/root`. Your site appears at
`https://your-username.github.io/repository-name/`.

**Netlify** — go to app.netlify.com, drag the folder onto the page. Done.

Before publishing, update the `og:` tags in `<head>` so link previews show your
own photo and description.

---

## Notes

- Experience, education and languages come from the resume, word for word.
- Two "My contribution" lines (Egg Timer, Tourify) are marked `CONFIRM` in
  `index.html`: they are not in the resume or the project files, so check them
  before publishing.
- The site is responsive down to small phones, keyboard-navigable, and respects
  the system "reduce motion" setting.
- No analytics, no cookies, no trackers.

---

## The neon city (behind every section)

`js/living-city.js` paints one fixed canvas behind the whole page, modelled on a
violet synthwave highway: neon barriers, curved lamps that shrink toward the
vanishing point, a cream moon with a violet halo, coloured stars, and pink, cyan
and violet towers. Towers are painted once in three depth layers; each frame only
composites them and animates the small things.

- **Travel:** the road, posts and lamps move toward you slowly, and faster as you scroll.
- **Life:** flowing light ribbons, oncoming headlights and leaving taillights,
  windows and billboards that flicker independently, a shooting star now and then.
- **Districts:** the sky, horizon glow, moon and road height change with scroll, so
  each section sits in its own part of the city (edit `STOPS` at the top of the file).
- **Contact:** the contact block is a floating glass panel over the open highway.
- **Phones:** fewer cars, ribbons, stars and windows, no cursor effects.
- **Reduce motion:** one calm still frame; nothing animates.

**Colours** live in `css/style.css` (`--amber` is the cyan accent, hot pink and
violet are used directly); the city's palette is at the top of `living-city.js`.

**Digits:** the bundled *So Simple* font has empty glyphs for 0-9, so the
stylesheet routes digits to Karla. Years and numbers you add will show.
