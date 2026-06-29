# Memorial Slideshow — PRD

> Detailed blueprint. Claude Code reads this once per build cycle. The lean,
> always-loaded rules live in `CLAUDE.md`. Build in phases (§7); verify each
> before the next.

## 1. Overview

A local, offline, browser slideshow for family photos and videos at a memorial,
projected from a Mac. Flow: drop media in → auto-fix orientation → optionally
remove duplicate photos → press play → it loops cleanly and forever, untouched.

Runs fully offline (the room has no reliable internet) and keeps all media on
the device — nothing is ever uploaded.

## 2. User & context

- **Operator:** one non-technical person, Mac → projector.
- **Setting:** a funeral. Calm and dignified; never feels like consumer software.
- **Pressure:** set up once under time pressure, then left to run. Minimize
  decisions and clicks at showtime.

## 3. Principles

1. **Offline-first.** No runtime network calls. Bundle every library at build.
2. **Privacy.** Media never leaves the device. Never alter files on disk — only
   the in-memory slideshow set.
3. **Zero-friction at showtime.** Drop in → play. The running show needs no
   babysitting and shows no controls.
4. **Dignified, quiet design.** Black canvas, photos never cropped, no chrome
   during playback. No emoji, no bouncy motion, sentence case.
5. **Single-file output.** Production build is one self-contained `.html` — like
   a DVD the operator burned: works forever, needs nothing running.

## 4. Stack

| Choice                     | Plain terms                                  | Why                                                         |
| -------------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| **Vite**                   | Live-preview workshop + final packer         | Fast dev loop; clean static build                           |
| **Vanilla JS**             | Plain browser code, no framework             | App is small and visual; a framework adds weight, no payoff |
| **vite-plugin-singlefile** | Inlines all JS/CSS into one HTML             | Keeps the "just open it offline" property                   |
| **heic2any**               | Converts iPhone HEIC so any browser shows it | Chrome can't render HEIC natively                           |

No backend, database, or accounts.

## 5. Structure

```
memorial-slideshow/
├── index.html            # app shell
├── package.json
├── vite.config.js        # includes vite-plugin-singlefile
├── PRD.md
├── CLAUDE.md
└── src/
    ├── main.js           # entry — wires screens together
    ├── state.js          # single source of truth (files, dup groups, settings)
    ├── files.js          # import, type detection, HEIC convert, orientation fix
    ├── duplicates.js     # perceptual hashing + grouping
    ├── slideshow.js      # playback engine (timing, loop, video)
    ├── styles.css        # design tokens + styles
    └── ui/
        ├── setup.js      # drop zone, counts, timing slider, play
        ├── review.js     # side-by-side duplicate review + manual rotate
        └── player.js     # full-screen player (media only)
```

`state.js` is the source of truth; UI modules read from it and render. Keep each
module single-purpose.

## 6. Features

### F1 — Import

- Drag-and-drop onto a drop zone, click-to-browse, and dropped folders.
- Images: JPG, JPEG, PNG, WebP, HEIC, HEIF. Video: MP4, MOV.
- Detect type by MIME, fall back to extension (HEIC/MOV often have empty MIME on
  macOS).
- Convert HEIC/HEIF to JPEG via `heic2any` on import.
- Show counts: "N photos · M videos".
- **Preserve import order as slideshow order. Never shuffle.**
- Create object URLs for preview; revoke on clear to avoid memory leaks.

### F2 — Automatic orientation (the "right way round" feature)

- Photos must display upright even when imported sideways.
- On import, normalize every image: read its embedded orientation and bake the
  correct rotation into the working copy used for both display and hashing.
- Implementation: `createImageBitmap(blob, { imageOrientation: 'from-image' })`
  → draw to canvas → re-encode to a normalized blob. This applies the photo's
  orientation data with no extra library. Run it _after_ any HEIC conversion,
  since conversion can drop orientation metadata.
- **Manual catch-all:** in the review screen, each photo has a one-tap rotate
  (90° steps) for the rare image whose metadata is missing or wrong. The
  rotation persists into the show.
- Note: full content-based "which way is up" detection needs an ML model and is
  too heavy for an offline single-file build — out of scope. Embedded-orientation
  - manual rotate covers the realistic phone-photo case.

### F3 — Duplicate detection (visual)

- Goal: catch the same photo uploaded by two family members — same image,
  different filename.
- Compute a perceptual hash per image (dHash: downscale to 9×8 grayscale,
  compare adjacent pixels → 64-bit fingerprint). Hash the orientation-normalized
  copy from F2.
- Compare pairs by Hamming distance; group within a tuneable threshold (start
  ≤10 of 64). Group only when 2+ match. Show progress while hashing.
- Videos are not hashed. Detection runs automatically after import; if groups
  exist, surface a calm notice with a "Review" action.

### F4 — Duplicate review

- Its own clean full screen.
- One card per group; similar photos shown side by side.
- Tap a photo to toggle keep/remove (selected = highlighted, unselected =
  dimmed). At least one per group stays selected. Per-card "keep all" escape.
- Includes the manual rotate control from F2.
- "Done" removes unselected photos from the slideshow set (disk untouched),
  returns to setup, confirms how many were removed.

### F5 — Playback

- **Hard cut** between items — no fade, no motion, no black frame.
- Photos: hold for a user-set time (default **7s**, range 1–15s, set on setup).
- Videos: play **full length, muted**, then auto-advance.
- **Loop forever in order.** No end screen, no auto-pause. Runs until Esc.

### F6 — Presented view (controls)

- During the show the screen shows **only the media** on pure black. No control
  bar, no progress bar, no counter, no hover chrome — nothing but the image.
- `object-fit: contain` — whole frame always visible, never cropped; letterbox
  as needed.
- Control is **invisible, keyboard-only:** Esc exits the show; ← / → optionally
  step back/forward. Entering Play goes fullscreen automatically.

## 7. Setup screen design

The setup screen is the only screen with visible UI chrome. It sets the tone for
the whole experience — it should feel quiet, considered, and human. Not an app.

**Palette:** Near-black background (`#0a0a0a`). All text in warm off-white
(`#f0ede8`) — not pure white, which reads clinical. One restrained gold accent
(`#c9a96e`) used only for the active timing value, the play button, and
interactive highlights. Nothing else gets color.

**Drop zone:** Large, centered, generously padded. A single dashed border in the
accent color on hover — otherwise just a subtle border. The instruction copy is
short and direct: "Drop your photos and videos here" with a secondary line for
supported formats. No icon beyond a simple down arrow glyph. The zone should
feel like a calm invitation, not a technical interface.

**File counts:** Once media is loaded, show "N photos · M videos" in a single
quiet line below the drop zone. Small type, muted color. No badges, no bold
numbers — just confirmation.

**Duplicate notice:** If duplicates are detected, a single line appears with a
gold dot pulsing gently and a "Review" text button. Understated — the show can
go ahead without reviewing; this is an offer, not a warning.

**Timing control:** A plain label ("Time per photo"), the current value in gold
(`7 seconds`), and a full-width range slider below. No tick marks, no scale. The
slider thumb is the accent color. This is the only interactive control before
play.

**Play button:** Full-width, gold background, dark text. The only strong visual
element on the screen — everything else recedes so the eye goes here. Label:
"Play slideshow". Disabled and dimmed until at least one media file is loaded.

**Overall feel:** Imagine handing this to someone at a funeral who has never seen
it before. They should understand it in under five seconds and feel calm using
it. Every design decision serves that moment.

## 8. Build workflow

One-time setup (operator runs manually before first session):

```
mkdir memorial-slideshow && cd memorial-slideshow
git init && npm init -y
```

Drop `PRD.md` and `CLAUDE.md` in the root. Then build in phases — verify each in
the browser and commit before moving on:

1. **Skeleton** — Vite + config, structure, three navigable empty screens,
   design tokens.
2. **Import + orientation** — F1 + F2; confirm counts and that sideways photos
   self-correct.
3. **Playback** — F5 + F6 for photos; confirm clean cuts, timing, loop,
   fullscreen, Esc, no on-screen chrome.
4. **Video** — muted full-length video in the loop.
5. **Duplicates** — F3 hashing/grouping, then F4 review (incl. manual rotate).
6. **Polish** — edge/empty states, memory cleanup, single-file build.

After each phase: test on the dev server, then commit. Record a one-line
checkpoint in `CLAUDE.md` so the next session resumes cleanly.

## 9. Acceptance criteria

- Mixed HEIC/JPG/PNG/MP4/MOV import shows correct counts; all images render
  (including HEIC) in any browser.
- A sideways-imported photo displays upright with no manual step.
- Two identical photos with different filenames land in one duplicate group.
- Removing duplicates updates the slideshow set, never disk.
- Show advances with hard cuts, holds photos for the chosen time, plays videos
  full and muted, loops forever in import order.
- Presented view shows media only — no bar, progress, or counter. Esc exits;
  ← / → step.
- Production build is a single `.html` that runs with no network.

## 10. Future roadmap (architect for, don't build)

- Drag-to-reorder before playing.
- Optional gentle crossfade toggle (default stays hard cut).
- Optional captions/names.
- Save/load a "show" so setup survives a restart.

Keep `state.js` and the slideshow engine general enough to absorb these.

## 11. Non-goals

- No audio/music. No cloud, accounts, or sharing. No photo editing beyond
  rotation. No mobile layout — this is a Mac-to-projector tool.
