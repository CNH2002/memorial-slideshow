import { createSlideshow } from '../slideshow.js';
import { state } from '../state.js';

export function mountPlayer(root, { onExit }) {
  root.innerHTML = `
    <div id="screen-player">
      <div id="media-stage"></div>
      <div id="player-controls" aria-hidden="true">
        <button id="player-prev" aria-label="Previous">&#8592;</button>
        <button id="player-exit" aria-label="Exit">&#x2715;</button>
        <button id="player-next" aria-label="Next">&#8594;</button>
      </div>
    </div>
  `;

  const screenEl = root.querySelector('#screen-player');
  const stage = root.querySelector('#media-stage');
  const controlsEl = root.querySelector('#player-controls');
  const show = createSlideshow(stage, state.files, state.settings);
  let exited = false;
  let wakeLock = null;
  let controlsTimer = null;

  // ── Wake Lock — keep screen on during slideshow ──────────
  async function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch {
      // wake lock unavailable — fine, slideshow continues without it
    }
  }
  // Re-acquire after the tab returns to foreground (iOS releases it on hide)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !exited) acquireWakeLock();
  });
  acquireWakeLock();

  // ── Exit ─────────────────────────────────────────────────
  function exit() {
    if (exited) return;
    exited = true;
    clearTimeout(controlsTimer);
    show.stop();
    document.removeEventListener('keydown', handleKey);
    if (wakeLock) {
      wakeLock.release().catch(() => {});
      wakeLock = null;
    }
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    onExit();
  }

  // ── Keyboard (desktop) ───────────────────────────────────
  function handleKey(e) {
    if (e.key === 'Escape') exit();
    else if (e.key === 'ArrowRight') show.next();
    else if (e.key === 'ArrowLeft') show.prev();
  }
  document.addEventListener('keydown', handleKey);

  // Exit if browser dismisses fullscreen via its own UI
  document.addEventListener(
    'fullscreenchange',
    () => {
      if (!document.fullscreenElement) exit();
    },
    { once: true }
  );

  // ── Touch controls (mobile) ──────────────────────────────
  function showControls() {
    controlsEl.classList.add('visible');
    controlsEl.removeAttribute('aria-hidden');
    clearTimeout(controlsTimer);
    controlsTimer = setTimeout(hideControls, 3500);
  }
  function hideControls() {
    controlsEl.classList.remove('visible');
    controlsEl.setAttribute('aria-hidden', 'true');
  }

  screenEl.addEventListener('click', (e) => {
    if (e.target.closest('#player-controls')) return;
    controlsEl.classList.contains('visible') ? hideControls() : showControls();
  });

  root.querySelector('#player-exit').addEventListener('click', exit);
  root.querySelector('#player-next').addEventListener('click', () => {
    show.next();
    showControls();
  });
  root.querySelector('#player-prev').addEventListener('click', () => {
    show.prev();
    showControls();
  });

  // ── Start ────────────────────────────────────────────────
  // requestFullscreen is unsupported in iOS Safari browser tabs — guard it so
  // it doesn't throw before show.start() runs.
  document.documentElement.requestFullscreen?.()?.catch?.(() => {});
  show.start();
}
