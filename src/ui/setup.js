import { processFiles, collectFromEntry } from '../files.js';
import {
  state,
  addFiles,
  clearFiles,
  removeFile,
  reorderFile,
  rotateFile,
  bakeRotation,
  restoreFiles,
} from '../state.js';
import { detectDuplicates, detectExactGroups } from '../duplicates.js';
import { showUndoToast, dismissToast } from './toast.js';
import { dbAdd, dbUpdate, dbRemove, dbSaveOrder, dbClear } from '../db.js';

let _activeHandleFiles = null;
window.addEventListener('slideshow:shared-files', (e) => _activeHandleFiles?.(e.detail));

function countLabel(files) {
  const photos = files.filter((f) => f.type === 'photo').length;
  const videos = files.filter((f) => f.type === 'video').length;
  const parts = [];
  if (photos) parts.push(`${photos} photo${photos === 1 ? '' : 's'}`);
  if (videos) parts.push(`${videos} video${videos === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

export function mountSetup(root, { onPlay, onReview }) {
  const isTouch = window.matchMedia('(hover: none)').matches;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isInstalled =
    window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

  function albumGuideHTML() {
    if (!isTouch) return '';
    if (isIOS && !isInstalled) {
      return `
        <div class="mt-8 max-w-xs text-left border border-sage/30 rounded p-4 bg-sage/5">
          <p class="font-body text-[10px] text-sage uppercase tracking-[0.14em] mb-3">To import a full album</p>
          <ol class="font-body text-xs text-muted/70 space-y-2 list-decimal list-inside leading-relaxed">
            <li class="text-sage/80">Tap <strong>Share ⬆</strong> in Safari → <strong>Add to Home Screen</strong> → <strong>Add</strong></li>
            <li class="text-sage/80">Open <strong>Slideshow</strong> from your Home Screen</li>
            <li>In <strong class="text-linen/60">Photos</strong>: open album → tap <strong class="text-linen/60">Select</strong></li>
            <li>Tap <strong class="text-linen/60">Select All</strong></li>
            <li>Tap <strong class="text-linen/60">Share ⬆</strong> → choose <strong class="text-linen/60">Slideshow</strong></li>
          </ol>
        </div>`;
    }
    return `
      <div class="mt-8 max-w-xs text-left border border-white/[0.06] rounded p-4">
        <p class="font-body text-[10px] text-muted uppercase tracking-[0.14em] mb-3">To import a full album</p>
        <ol class="font-body text-xs text-muted/60 space-y-2 list-decimal list-inside leading-relaxed">
          <li>In <strong class="text-linen/60">Photos</strong>: open album → tap <strong class="text-linen/60">Select</strong></li>
          <li>Tap <strong class="text-linen/60">Select All</strong></li>
          <li>Tap <strong class="text-linen/60">Share ⬆</strong> → choose <strong class="text-linen/60">Slideshow</strong></li>
        </ol>
      </div>`;
  }

  root.innerHTML = `
    <div id="screen-setup" class="flex flex-col h-dvh bg-bg overflow-hidden">

      <!-- Empty state -->
      <div id="setup-empty-zone" class="setup-empty px-6 py-8">
        <div id="drop-zone" role="button" tabindex="0"
             class="drop-zone w-full max-w-md border border-white/[0.08] rounded-lg
                    flex flex-col items-center justify-center py-16 px-8
                    cursor-pointer select-none
                    transition-colors duration-[200ms] ease-in-out
                    hover:border-white/20 hover:bg-white/[0.015]
                    focus:outline-none focus:border-sage/40">
          <span class="block text-3xl text-linen/15 mb-5 select-none" aria-hidden="true">↓</span>
          <p id="drop-primary" class="font-body text-linen/40 text-sm text-center mb-2">
            ${isTouch ? 'Tap to add photos and videos' : 'Drop your photos and videos here'}
          </p>
          <p class="font-body text-muted/60 text-xs text-center tracking-wide">
            ${isTouch ? 'Or import a full album — see below' : 'JPG · PNG · HEIC · WebP · MP4 · MOV'}
          </p>
        </div>
        <button id="folder-btn" type="button"
                class="folder-btn-desktop font-body text-muted/60 text-xs mt-4
                       hover:text-linen transition-colors duration-[200ms] ease-in-out
                       underline underline-offset-2">
          or pick a folder
        </button>
        ${albumGuideHTML()}
      </div>

      <!-- Topbar (loaded) -->
      <header class="setup-loaded setup-topbar shrink-0 flex items-center gap-2 px-4 py-3
                     border-b border-white/[0.05]">
        <span id="file-counts" class="font-body text-xs text-muted tabular-nums shrink-0"></span>

        <div id="dup-notice" class="dup-notice flex items-center gap-2 ml-2" hidden>
          <span class="dup-dot w-1.5 h-1.5 rounded-full bg-sage flex-none shrink-0"></span>
          <span id="dup-message" class="font-body text-xs text-muted"></span>
          <button id="btn-review"
                  class="font-body text-xs text-sage shrink-0
                         hover:opacity-70 transition-opacity duration-[200ms] ease-in-out">
            Review
          </button>
        </div>

        <p id="removed-confirm" class="font-body text-xs text-muted/60 ml-2" hidden></p>

        <div class="flex items-center gap-3 ml-auto shrink-0">
          <button id="add-more-btn"
                  class="font-body text-xs text-muted
                         hover:text-linen transition-colors duration-[200ms] ease-in-out">
            + Add
          </button>
          <button id="add-folder-btn"
                  class="add-folder-btn font-body text-xs text-muted
                         hover:text-linen transition-colors duration-[200ms] ease-in-out">
            + Folder
          </button>
          <button id="clear-all-btn"
                  class="font-body text-xs text-muted/35
                         hover:text-red-400/70 transition-colors duration-[200ms] ease-in-out">
            Clear
          </button>
        </div>
      </header>

      <!-- Scrollable grid (loaded) -->
      <main class="setup-loaded setup-grid flex-1 min-h-0 overflow-y-auto px-3 py-3 md:px-4 md:py-4">
        <div id="media-grid"
             class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
        </div>
      </main>

      <!-- Bottom bar (loaded) -->
      <footer class="setup-loaded setup-footer shrink-0 flex flex-wrap items-center gap-3 md:gap-5
                     px-4 py-3 md:px-5 md:py-4 border-t border-white/[0.05]"
              style="padding-bottom: max(0.75rem, calc(0.5rem + env(safe-area-inset-bottom)))">

        <!-- Duration slider -->
        <div class="flex items-center gap-2 shrink-0">
          <span class="font-body text-[10px] text-muted uppercase tracking-[0.12em] hidden sm:inline">
            Duration
          </span>
          <input type="range" id="timing-slider" min="1" max="15"
                 value="${state.settings.photoDuration}"
                 class="w-20 md:w-28 cursor-pointer">
          <span id="timing-value"
                class="font-body text-xs text-muted tabular-nums w-6 shrink-0">
            ${state.settings.photoDuration}s
          </span>
        </div>

        <p id="saved-indicator"
           class="font-body text-[10px] text-muted/30 hidden sm:inline ml-1" hidden>
          Saved on this device
        </p>

        <button id="play-btn" disabled
                class="ml-auto px-5 py-2 md:px-6 md:py-2.5
                       bg-sage text-bg font-body font-medium
                       text-[11px] uppercase tracking-[0.18em] rounded
                       transition-opacity duration-[200ms] ease-in-out
                       hover:opacity-85 active:opacity-70
                       disabled:opacity-25 disabled:cursor-not-allowed">
          Play
        </button>
      </footer>

      <input type="file" id="file-input" multiple accept="image/*,video/*,.heic,.heif,.mov" class="hidden">
      <input type="file" id="folder-input" webkitdirectory accept="image/*,video/*,.heic,.heif,.mov" class="hidden">
    </div>
  `;

  const screenEl = root.querySelector('#screen-setup');
  const dropZone = root.querySelector('#drop-zone');
  const fileInput = root.querySelector('#file-input');
  const folderInput = root.querySelector('#folder-input');
  const dropLabel = root.querySelector('#drop-primary');
  const countsEl = root.querySelector('#file-counts');
  const gridEl = root.querySelector('#media-grid');
  const dupNotice = root.querySelector('#dup-notice');
  const dupMsg = root.querySelector('#dup-message');
  const slider = root.querySelector('#timing-slider');
  const timingVal = root.querySelector('#timing-value');
  const playBtn = root.querySelector('#play-btn');
  const addMoreBtn = root.querySelector('#add-more-btn');
  const addFolderBtn = root.querySelector('#add-folder-btn');
  const folderBtn = root.querySelector('#folder-btn');
  const removedConfirm = root.querySelector('#removed-confirm');
  const savedIndicator = root.querySelector('#saved-indicator');

  let dragSrcIdx = null;
  let touchActive = false;
  let touchTimer = null;
  let touchStartX = 0;
  let touchStartY = 0;

  // ── Duplicate notice ─────────────────────────────────────
  function renderDupNotice() {
    const n = state.dupGroups.length;
    dupNotice.hidden = n === 0;
    dupNotice.classList.remove('checking');
    if (n > 0) dupMsg.textContent = `${n} group${n === 1 ? '' : 's'} of similar photos found`;
  }

  let detectionGen = 0;
  function runDetection() {
    const photoCount = state.files.filter((f) => f.type === 'photo').length;
    if (photoCount < 2) {
      state.dupGroups = [];
      renderDupNotice();
      return;
    }
    dupNotice.hidden = false;
    dupNotice.classList.add('checking');
    dupMsg.textContent = 'Checking for similar photos…';
    const gen = ++detectionGen;
    detectDuplicates(state.files, (done, total) => {
      if (gen !== detectionGen) return;
      dupMsg.textContent = `Checking… ${done} / ${total}`;
    })
      .then((groups) => {
        if (gen !== detectionGen) return;
        state.dupGroups = groups;
        renderDupNotice();
      })
      .catch((err) => {
        console.error('[duplicates]', err);
        if (gen !== detectionGen) return;
        state.dupGroups = [];
        renderDupNotice();
      });
  }

  root.querySelector('#btn-review').addEventListener('click', () => {
    if (state.dupGroups.length > 0) {
      dismissToast();
      onReview();
    }
  });

  // ── Grid ─────────────────────────────────────────────────
  function makeThumb(file, idx) {
    const thumb = document.createElement('div');
    thumb.className =
      'media-thumb relative aspect-square rounded overflow-hidden group ' +
      'ring-1 ring-white/[0.05] bg-surface cursor-grab active:cursor-grabbing';
    thumb.draggable = true;
    thumb.dataset.id = file.id;
    thumb.dataset.idx = idx;

    if (file.type === 'photo') {
      const img = document.createElement('img');
      img.src = file.url;
      img.alt = file.name;
      img.loading = 'lazy';
      img.draggable = false;
      img.className = 'w-full h-full object-cover select-none';
      if (file.rotation) img.style.transform = `rotate(${file.rotation}deg)`;
      thumb.appendChild(img);
    } else {
      const vid = document.createElement('video');
      vid.className = 'w-full h-full object-cover select-none';
      vid.muted = true;
      vid.playsInline = true;
      vid.preload = 'metadata';
      vid.src = file.url;
      if (file.rotation) vid.style.transform = `rotate(${file.rotation}deg)`;
      thumb.appendChild(vid);

      const overlay = document.createElement('div');
      overlay.className =
        'absolute inset-0 flex items-center justify-center ' +
        'text-linen/50 text-2xl pointer-events-none select-none';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.textContent = '▶';
      thumb.appendChild(overlay);
    }

    // Hover overlay (opacity-only per design constraints)
    const hoverOverlay = document.createElement('div');
    hoverOverlay.className =
      'absolute inset-0 bg-bg/55 opacity-0 group-hover:opacity-100 ' +
      'transition-opacity duration-[200ms] ease-in-out ' +
      'flex items-end justify-between p-1.5';
    thumb.appendChild(hoverOverlay);

    // Rotate button
    const rotBtn = document.createElement('button');
    rotBtn.className =
      'thumb-action w-7 h-7 rounded-full bg-black/60 text-linen/70 ' +
      'flex items-center justify-center text-sm ' +
      'hover:text-linen opacity-0 group-hover:opacity-100 ' +
      'transition-opacity duration-[200ms] ease-in-out';
    rotBtn.setAttribute('aria-label', 'Rotate 90°');
    rotBtn.textContent = '↺';
    rotBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      rotateFile(file.id);
      refresh();
      const updated = state.files.find((f) => f.id === file.id);
      if (!updated) return;
      if (updated.type === 'photo') {
        const deg = updated.rotation;
        bakeRotation(updated.blob, deg)
          .then((newBlob) => {
            if (updated.rotation !== deg) return;
            URL.revokeObjectURL(updated.url);
            updated.blob = newBlob;
            updated.url = URL.createObjectURL(newBlob);
            updated.rotation = 0;
            dbUpdate(updated);
          })
          .catch(() => {});
      } else {
        dbUpdate(updated);
      }
    });
    hoverOverlay.appendChild(rotBtn);

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className =
      'thumb-action w-7 h-7 rounded-full bg-black/60 text-linen/50 ' +
      'flex items-center justify-center text-sm leading-none ' +
      'hover:text-linen opacity-0 group-hover:opacity-100 ' +
      'transition-opacity duration-[200ms] ease-in-out';
    removeBtn.setAttribute('aria-label', 'Remove');
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const snapshot = { file, idx };
      dismissToast();
      removeFile(file.id);
      dbRemove(
        file.id,
        state.files.map((f) => f.id)
      );
      refresh();
      showUndoToast('1 removed', () => {
        restoreFiles([snapshot]);
        dbAdd(
          [snapshot.file],
          state.files.map((f) => f.id)
        );
        refresh();
        if (state.files.filter((f) => f.type === 'photo').length >= 2) runDetection();
      });
    });
    hoverOverlay.appendChild(removeBtn);

    // Desktop drag-to-reorder
    thumb.addEventListener('dragstart', (e) => {
      dragSrcIdx = idx;
      e.dataTransfer.effectAllowed = 'move';
      thumb.classList.add('dragging');
    });
    thumb.addEventListener('dragend', () => {
      dragSrcIdx = null;
      thumb.classList.remove('dragging');
      gridEl.querySelectorAll('.drag-target').forEach((el) => el.classList.remove('drag-target'));
    });
    thumb.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragSrcIdx !== null && dragSrcIdx !== idx) thumb.classList.add('drag-target');
    });
    thumb.addEventListener('dragleave', () => thumb.classList.remove('drag-target'));
    thumb.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      thumb.classList.remove('drag-target');
      if (dragSrcIdx !== null && dragSrcIdx !== idx) {
        reorderFile(dragSrcIdx, idx);
        dbSaveOrder(state.files.map((f) => f.id));
        refresh();
      }
    });

    // Touch drag-to-reorder (long-press → drag)
    thumb.addEventListener(
      'touchstart',
      (e) => {
        if (touchActive) return;
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchTimer = setTimeout(() => {
          touchActive = true;
          dragSrcIdx = idx;
          thumb.classList.add('dragging');
          navigator.vibrate?.(20);
        }, 350);
      },
      { passive: true }
    );

    thumb.addEventListener(
      'touchmove',
      (e) => {
        if (!touchActive) {
          if (touchTimer) {
            const t = e.touches[0];
            if (Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY) > 8) {
              clearTimeout(touchTimer);
              touchTimer = null;
            }
          }
          return;
        }
        e.preventDefault();
        const t = e.touches[0];
        const el = document.elementFromPoint(t.clientX, t.clientY)?.closest?.('.media-thumb');
        gridEl.querySelectorAll('.drag-target').forEach((d) => d.classList.remove('drag-target'));
        if (el && el !== thumb) el.classList.add('drag-target');
      },
      { passive: false }
    );

    const endTouchDrag = (e) => {
      clearTimeout(touchTimer);
      touchTimer = null;
      if (!touchActive) return;
      const t = e.changedTouches?.[0] ?? e.touches?.[0];
      if (t) {
        const el = document.elementFromPoint(t.clientX, t.clientY)?.closest?.('.media-thumb');
        const tIdx = el ? +el.dataset.idx : null;
        gridEl.querySelectorAll('.drag-target').forEach((d) => d.classList.remove('drag-target'));
        if (tIdx !== null && tIdx !== idx) {
          reorderFile(idx, tIdx);
          dbSaveOrder(state.files.map((f) => f.id));
          refresh();
        }
      }
      thumb.classList.remove('dragging');
      touchActive = false;
      dragSrcIdx = null;
    };
    thumb.addEventListener('touchend', endTouchDrag);
    thumb.addEventListener('touchcancel', endTouchDrag);

    return thumb;
  }

  function renderGrid() {
    clearTimeout(touchTimer);
    touchTimer = null;
    touchActive = false;
    dragSrcIdx = null;
    gridEl.innerHTML = '';
    state.files.forEach((file, idx) => gridEl.appendChild(makeThumb(file, idx)));
  }

  // Appends only the newly-added batch to the grid without touching existing thumbnails.
  // Called during import so in-progress thumbs don't flash when new files arrive.
  function appendThumbs(batch) {
    const baseIdx = state.files.length - batch.length;
    batch.forEach((file, i) => gridEl.appendChild(makeThumb(file, baseIdx + i)));
    countsEl.textContent = countLabel(state.files);
    playBtn.disabled = false;
    savedIndicator.hidden = false;
    screenEl.classList.add('loaded');
  }

  function refresh() {
    const hasFiles = state.files.length > 0;
    countsEl.textContent = countLabel(state.files);
    playBtn.disabled = !hasFiles;
    savedIndicator.hidden = !hasFiles;
    const d = state.settings.photoDuration;
    timingVal.textContent = `${d}s`;
    slider.value = d;
    screenEl.classList.toggle('loaded', hasFiles);
    renderGrid();
    renderDupNotice();
  }

  // ── File handling ─────────────────────────────────────────
  async function handleFiles(rawFiles) {
    const arr = Array.from(rawFiles).filter(Boolean);
    if (!arr.length) return;
    const preImportIds = new Set(state.files.map((f) => f.id));
    dropZone.classList.add('loading');
    addMoreBtn.disabled = true;
    addFolderBtn.disabled = true;
    if (folderBtn) folderBtn.disabled = true;
    dropLabel.textContent = 'Processing…';
    try {
      await processFiles(
        arr,
        (done, total) => {
          dropLabel.textContent = `Processing… ${done} / ${total}`;
        },
        (batch) => {
          addFiles(batch);
          appendThumbs(batch);
        }
      );
    } catch (err) {
      console.error('Import error:', err);
    } finally {
      dropZone.classList.remove('loading');
      addMoreBtn.disabled = false;
      addFolderBtn.disabled = false;
      if (folderBtn) folderBtn.disabled = false;
      dropLabel.textContent = isTouch
        ? 'Tap to add photos and videos'
        : 'Drop your photos and videos here';
    }
    refresh();

    const photoCount = state.files.filter((f) => f.type === 'photo').length;
    if (photoCount >= 2) {
      dupNotice.hidden = false;
      dupNotice.classList.add('checking');
      dupMsg.textContent = 'Scanning for duplicates…';
    }

    const exactGroups = await detectExactGroups(state.files, (done, total) => {
      if (photoCount >= 2) dupMsg.textContent = `Scanning… ${done} / ${total}`;
    });
    let autoRemoved = 0;
    for (const group of exactGroups) {
      const best = group.reduce((a, b) => (a.blob.size > b.blob.size ? a : b));
      for (const f of group) {
        if (f.id !== best.id) {
          removeFile(f.id);
          autoRemoved++;
        }
      }
    }
    if (autoRemoved > 0) {
      refresh();
      removedConfirm.textContent = `${autoRemoved} near-identical photo${autoRemoved === 1 ? '' : 's'} removed automatically.`;
      removedConfirm.hidden = false;
      setTimeout(() => {
        removedConfirm.hidden = true;
      }, 5000);
    }

    const newFiles = state.files.filter((f) => !preImportIds.has(f.id));
    if (newFiles.length)
      dbAdd(
        newFiles,
        state.files.map((f) => f.id)
      );

    runDetection();
  }

  // ── Drop / drag events ────────────────────────────────────
  gridEl.addEventListener('contextmenu', (e) => e.preventDefault());

  screenEl.addEventListener('dragover', (e) => {
    if (dragSrcIdx !== null) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  screenEl.addEventListener('dragleave', (e) => {
    if (!screenEl.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
  });
  screenEl.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (dragSrcIdx !== null) return;

    const itemRefs = [];
    if (e.dataTransfer.items?.length) {
      for (const item of Array.from(e.dataTransfer.items)) {
        if (item.kind !== 'file') continue;
        itemRefs.push({ entry: item.webkitGetAsEntry?.() || null, file: item.getAsFile() || null });
      }
    }

    const files = [];
    for (const { entry, file } of itemRefs) {
      if (entry) {
        try {
          files.push(...(await collectFromEntry(entry)));
        } catch {
          if (file) files.push(file);
        }
      } else if (file) {
        files.push(file);
      }
    }

    if (files.length === 0 && e.dataTransfer.files?.length) {
      files.push(...Array.from(e.dataTransfer.files));
    }

    await handleFiles(files);
  });

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
  });

  addMoreBtn.addEventListener('click', () => fileInput.click());
  addFolderBtn.addEventListener('click', () => folderInput.click());
  if (folderBtn) folderBtn.addEventListener('click', () => folderInput.click());

  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files || []);
    fileInput.value = '';
    if (files.length) handleFiles(files);
  });

  folderInput.addEventListener('change', () => {
    const files = Array.from(folderInput.files || []);
    folderInput.value = '';
    if (files.length) handleFiles(files);
  });

  slider.addEventListener('input', () => {
    const v = +slider.value;
    state.settings.photoDuration = v;
    timingVal.textContent = `${v}s`;
  });

  playBtn.addEventListener('click', () => {
    if (state.files.length) {
      dismissToast();
      onPlay();
    }
  });

  root.querySelector('#clear-all-btn').addEventListener('click', () => {
    if (!confirm('Remove all photos and videos?')) return;
    clearFiles();
    dbClear();
    refresh();
  });

  refresh();

  if (state.files.filter((f) => f.type === 'photo').length >= 2) runDetection();

  _activeHandleFiles = handleFiles;
}
