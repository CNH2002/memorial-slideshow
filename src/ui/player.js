import { createSlideshow } from '../slideshow.js';
import { state } from '../state.js';

export function mountPlayer(root, { onExit }) {
  root.innerHTML = `
    <div id="screen-player" class="fixed inset-0 bg-[#191b1d] z-[100]">

      <!-- Slideshow mount point — charcoal background prevents flash during cross-fades -->
      <div id="media-stage" class="absolute inset-0 bg-[#191b1d]"></div>

      <!-- 4:3 safe-zone overlay -->
      <div id="safe-zone-overlay" aria-hidden="true">
        <div class="safe-zone-box">
          <span class="safe-zone-label">4:3 Safe Zone</span>
        </div>
      </div>

      <!-- Controls — opacity-only show/hide, never display:none (preserves transition) -->
      <div id="player-controls"
           class="flex items-center gap-4 opacity-0 pointer-events-none
                  transition-opacity duration-[300ms] ease-in-out"
           aria-hidden="true">

        <button id="player-prev"
                class="w-12 h-12 rounded-full bg-black/50 border border-white/[0.14]
                       text-linen/70 flex items-center justify-center text-lg
                       hover:text-linen hover:bg-black/70
                       transition-all duration-[200ms] ease-in-out
                       [-webkit-tap-highlight-color:transparent]"
                aria-label="Previous">
          &#8592;
        </button>

        <button id="player-safe-zone"
                class="w-12 h-12 rounded-full bg-black/50 border border-white/[0.14]
                       text-linen/60 flex items-center justify-center
                       font-body text-[11px] font-semibold tracking-wider
                       hover:text-linen hover:bg-black/70
                       transition-all duration-[200ms] ease-in-out
                       [-webkit-tap-highlight-color:transparent]"
                aria-label="Toggle 4:3 guide"
                aria-pressed="false">
          4:3
        </button>

        <button id="player-exit"
                class="w-12 h-12 rounded-full bg-black/50 border border-white/[0.14]
                       text-linen/60 flex items-center justify-center text-base
                       hover:text-linen hover:bg-black/70
                       transition-all duration-[200ms] ease-in-out
                       [-webkit-tap-highlight-color:transparent]"
                aria-label="Exit">
          &#x2715;
        </button>

        <button id="player-next"
                class="w-12 h-12 rounded-full bg-black/50 border border-white/[0.14]
                       text-linen/70 flex items-center justify-center text-lg
                       hover:text-linen hover:bg-black/70
                       transition-all duration-[200ms] ease-in-out
                       [-webkit-tap-highlight-color:transparent]"
                aria-label="Next">
          &#8594;
        </button>
      </div>
    </div>
  `;

  const screenEl = root.querySelector('#screen-player');
  const stage = root.querySelector('#media-stage');
  const controlsEl = root.querySelector('#player-controls');
  const overlayEl = root.querySelector('#safe-zone-overlay');
  const show = createSlideshow(stage, state.files, state.settings);
  let exited = false;
  let wakeLock = null;
  let controlsTimer = null;
  let safeZoneEnabled = false;

  // ── Wake Lock ─────────────────────────────────────────────
  async function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch {
      // Unavailable — slideshow continues without it
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !exited) acquireWakeLock();
  });
  acquireWakeLock();

  // ── Keyboard ──────────────────────────────────────────────
  function handleKey(e) {
    if (e.key === 'Escape') exit();
    else if (e.key === 'ArrowRight') show.next();
    else if (e.key === 'ArrowLeft') show.prev();
  }

  function handleFullscreenChange() {
    if (!document.fullscreenElement) exit();
  }

  // ── Exit ──────────────────────────────────────────────────
  function exit() {
    if (exited) return;
    exited = true;
    clearTimeout(controlsTimer);
    show.stop();
    document.removeEventListener('keydown', handleKey);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    if (wakeLock) {
      wakeLock.release().catch(() => {});
      wakeLock = null;
    }
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    onExit();
  }

  document.addEventListener('keydown', handleKey);
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  // ── Controls visibility (opacity-only, never display:none) ─
  function showControls() {
    controlsEl.classList.remove('opacity-0', 'pointer-events-none');
    controlsEl.classList.add('opacity-100', 'pointer-events-auto');
    controlsEl.removeAttribute('aria-hidden');
    if (safeZoneEnabled) overlayEl.classList.add('active');
    clearTimeout(controlsTimer);
    controlsTimer = setTimeout(hideControls, 3500);
  }

  function hideControls() {
    controlsEl.classList.remove('opacity-100', 'pointer-events-auto');
    controlsEl.classList.add('opacity-0', 'pointer-events-none');
    controlsEl.setAttribute('aria-hidden', 'true');
    overlayEl.classList.remove('active');
  }

  screenEl.addEventListener('click', (e) => {
    if (e.target.closest('#player-controls')) return;
    controlsEl.classList.contains('opacity-100') ? hideControls() : showControls();
  });

  root.querySelector('#player-safe-zone').addEventListener('click', (e) => {
    e.stopPropagation();
    safeZoneEnabled = !safeZoneEnabled;
    const btn = root.querySelector('#player-safe-zone');
    btn.setAttribute('aria-pressed', safeZoneEnabled);
    if (safeZoneEnabled) {
      btn.classList.add('bg-white/20', 'border-white/40', 'text-linen');
    } else {
      btn.classList.remove('bg-white/20', 'border-white/40', 'text-linen');
    }
    overlayEl.classList.toggle(
      'active',
      safeZoneEnabled && controlsEl.classList.contains('opacity-100')
    );
    showControls();
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

  // ── Start ─────────────────────────────────────────────────
  document.documentElement.requestFullscreen?.()?.catch?.(() => {});
  show.start();
}
