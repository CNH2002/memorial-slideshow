# CLAUDE.md

Standing instructions. Loaded every session — kept lean on purpose. Full spec is
in `PRD.md`; read it before building a feature.

## What this is

Local, offline, browser slideshow for family photos and videos at a memorial,
projected from a Mac. Drop media in → orientation auto-fixes → optionally remove
duplicate photos → press play → it loops cleanly forever, untouched.

## Hard rules

- **Offline only.** No runtime network calls. Bundle every library at build.
- **Privacy.** Media never leaves the device. Never alter files on disk — only
  the in-memory slideshow set.
- **Dignified UI.** Black canvas, photos never cropped. No emoji, no bouncy
  motion, sentence case.
- **Presented view = media only.** During the show, nothing on screen but the
  image: no control bar, no progress bar, no counter, no hover chrome. Control
  is invisible/keyboard-only (Esc exits; ← / → step). Setup screen keeps its
  controls; the running show shows none.
- **Single-file build.** Production output is one self-contained `.html`.

## Stack

Vite · vanilla JS (no framework) · `vite-plugin-singlefile` (one HTML out) ·
`heic2any` (HEIC → displayable). No backend, database, or accounts.

## Commit Rules & Automation

- A pre-commit hook using `lint-staged` is active.
- Never manually run global formatting or linting commands before a commit.
- Simply execute the git commit. The hook automatically cleans and formats only modified files.

## Commands

- `npm install` — dependencies
- `npm run dev` — dev server, live reload
- `npm run build` — single-file `.html` in `dist/`
- `npm run preview` — serve the built file
- `npm run lint` — check for issues without changing anything
- `npm run lint:fix` — auto-fix ESLint issues
- `npm run format` — reformat all files with Prettier

## Layout

`state.js` is the single source of truth; UI reads from it and renders.

- `src/main.js` — entry; wires the three screens
- `src/state.js` — files, dup groups, settings
- `src/files.js` — import, type detection, HEIC convert, orientation fix
- `src/duplicates.js` — perceptual hashing + grouping
- `src/slideshow.js` — playback engine (timing, loop, video)
- `src/ui/setup.js` — drop zone, counts, timing slider, play
- `src/ui/review.js` — side-by-side duplicate review + manual rotate
- `src/ui/player.js` — full-screen player, media only

## Setup screen design

Near-black bg (`#0a0a0a`) · warm off-white text (`#f0ede8`) · single gold accent
(`#c9a96e`) for the timing value, play button, and interactive highlights only.
Drop zone: large, calm, dashed border on hover. Counts: one quiet line of small
muted text. Play button: full-width gold, the only strong element on screen.
Full spec in `PRD.md` §7.

## Easy to get wrong

- Slideshow order = import order. Never shuffle.
- Transitions are hard cuts. No fade, no motion, no black frame.
- Photos hold for the user's time (default 7s, 1–15s). Videos play full, **muted**, then auto-advance.
- The loop never ends on its own — only Esc.
- Auto-orient on import via `createImageBitmap(blob,{imageOrientation:'from-image'})` → canvas → blob, **after** HEIC conversion. Hash the normalized copy.
- Detect type by MIME, fall back to extension (HEIC/MOV often empty MIME on macOS).
- Revoke object URLs on clear (memory leaks).

## Workflow

Build in `PRD.md` §7 phases; verify each in the browser and commit before the
next. Keep "how-to" detail in `PRD.md`, not here. Add a one-line checkpoint
below as each phase lands.

## Checkpoints

- Phase 0–1 done: Vite + vite-plugin-singlefile + heic2any installed; full src/ structure; three navigable skeleton screens; dev server confirmed at localhost:5173.

## Workflow

When given a task:

- Create a minimal plan if needed
- Break into small steps when complexity requires it
- Execute incrementally using todo.md if helpful
- Update progress as work is completed

## Core Principles

- Prioritize correctness first
- Prefer smallest effective change
- Avoid unnecessary refactors or abstractions
- Keep implementation simple and readable

## Debugging

- Follow code flow only when necessary to locate issues
- Avoid over-analysis on simple problems

## Mocking

- If external dependencies are missing, use mock responses so UI and logic can still be developed

## Output Style

- Keep explanations concise
- Focus on what changed and why only when relevant
