import { processFiles, collectFromEntry } from '../files.js';
import { state, addFiles, removeFile, reorderFile, rotateFile, restoreFiles } from '../state.js';
import { detectDuplicates, detectExactGroups } from '../duplicates.js';
import { showUndoToast, dismissToast } from './toast.js';

// Module-level: updated each mount so shared files always go to the active instance.
let _activeHandleFiles = null;
window.addEventListener('slideshow:shared-files', e => _activeHandleFiles?.(e.detail));

// Capture the first readable frame of a video as a square-cropped blob URL.
function captureVideoThumbnail(src) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted      = true;
    video.playsInline = true;
    video.preload    = 'metadata';

    const fail = () => { video.src = ''; reject(new Error('thumb')); };

    video.addEventListener('error', fail, { once: true });
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = Math.min(0.5, video.duration / 4 || 0);
    }, { once: true });
    video.addEventListener('seeked', () => {
      try {
        const W = video.videoWidth, H = video.videoHeight;
        if (!W || !H) { fail(); return; }
        const size = Math.min(W, H);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        canvas.getContext('2d').drawImage(
          video, (W - size) / 2, (H - size) / 2, size, size, 0, 0, size, size
        );
        video.src = '';
        canvas.toBlob(b => b ? resolve(URL.createObjectURL(b)) : fail(), 'image/jpeg', 0.82);
      } catch { fail(); }
    }, { once: true });

    video.src = src;
  });
}

function countLabel(files) {
  const photos = files.filter(f => f.type === 'photo').length;
  const videos = files.filter(f => f.type === 'video').length;
  const parts  = [];
  if (photos) parts.push(`${photos} photo${photos === 1 ? '' : 's'}`);
  if (videos) parts.push(`${videos} video${videos === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

export function mountSetup(root, { onPlay, onReview }) {
  const isTouch = window.matchMedia('(hover: none)').matches;

  root.innerHTML = `
    <div id="screen-setup">

      <!-- Empty state: large centered drop zone (no files loaded) -->
      <div class="setup-empty-zone">
        <div class="drop-zone" id="drop-zone" role="button" tabindex="0">
          <div class="drop-zone-inner">
            <span class="drop-arrow" aria-hidden="true">↓</span>
            <p class="drop-primary" id="drop-primary">${isTouch ? 'Tap to add photos and videos' : 'Drop your photos and videos here'}</p>
            <p class="drop-secondary">${isTouch ? 'Choose from your photo library' : 'JPG · PNG · HEIC · WebP · MP4 · MOV'}</p>
          </div>
        </div>
      </div>

      <!-- Loaded state: top bar (file count + similar notice + add-more) -->
      <div class="setup-topbar">
        <span class="file-counts" id="file-counts"></span>
        <div class="dup-notice" id="dup-notice" hidden>
          <span class="dup-dot"></span>
          <span id="dup-message"></span>
          <button class="dup-review-btn" id="btn-review">Review</button>
        </div>
        <p class="removed-confirm" id="removed-confirm" hidden></p>
        <button class="add-more-btn" id="add-more-btn">+ Add more</button>
      </div>

      <!-- Loaded state: scrolling grid (only this zone scrolls) -->
      <div class="setup-grid-wrap">
        <div class="media-grid" id="media-grid"></div>
      </div>

      <!-- Loaded state: bottom bar (timing + play) -->
      <div class="setup-bottombar">
        <div class="timing-row">
          <span class="timing-label">Time per photo</span>
          <span class="timing-value" id="timing-value">7 seconds</span>
        </div>
        <input type="range" id="timing-slider" class="timing-slider" min="1" max="15" value="${state.settings.photoDuration}">
        <button class="play-btn" id="play-btn" disabled>Play slideshow</button>
      </div>

      <input type="file" id="file-input" multiple accept="image/*,video/*,.heic,.heif,.mov" hidden>
    </div>
  `;

  const screenEl   = root.querySelector('#screen-setup');
  const dropZone   = root.querySelector('#drop-zone');
  const fileInput  = root.querySelector('#file-input');
  const dropLabel  = root.querySelector('#drop-primary');
  const countsEl   = root.querySelector('#file-counts');
  const gridEl     = root.querySelector('#media-grid');
  const dupNotice  = root.querySelector('#dup-notice');
  const dupMsg     = root.querySelector('#dup-message');
  const slider     = root.querySelector('#timing-slider');
  const timingVal  = root.querySelector('#timing-value');
  const playBtn    = root.querySelector('#play-btn');
  const addMoreBtn = root.querySelector('#add-more-btn');

  const removedConfirm = root.querySelector('#removed-confirm');

  let dragSrcIdx = null;

  // Cache blob URLs for video thumbnails (keyed by file id); revoke on unmount not needed
  // since the app is single-page and thumbnails live as long as the session.
  const videoThumbCache = new Map();

  // Touch drag state (long-press to initiate, then drag to reorder)
  let touchActive   = false;
  let touchTimer    = null;
  let touchStartX   = 0;
  let touchStartY   = 0;

  function renderDupNotice() {
    const n = state.dupGroups.length;
    dupNotice.hidden = n === 0;
    dupNotice.classList.remove('checking');
    if (n > 0) dupMsg.textContent = `${n} group${n === 1 ? '' : 's'} of similar photos found`;
  }

  let detectionGen = 0;
  function runDetection() {
    const photoCount = state.files.filter(f => f.type === 'photo').length;
    if (photoCount < 2) {
      state.dupGroups = [];
      renderDupNotice();
      return;
    }
    dupNotice.hidden = false;
    dupNotice.classList.add('checking');
    dupMsg.textContent = 'Checking for similar photos…';
    const gen = ++detectionGen;
    detectDuplicates(state.files)
      .then(groups => {
        if (gen !== detectionGen) return;
        state.dupGroups = groups;
        renderDupNotice();
      })
      .catch(err => {
        console.error('[duplicates]', err);
        if (gen !== detectionGen) return;
        state.dupGroups = [];
        renderDupNotice();
      });
  }

  root.querySelector('#btn-review').addEventListener('click', () => {
    if (state.dupGroups.length > 0) { dismissToast(); onReview(); }
  });

  function renderGrid() {
    // Clear any stale drag state from a previous render
    clearTimeout(touchTimer);
    touchTimer    = null;
    touchActive   = false;
    dragSrcIdx    = null;
    gridEl.innerHTML = '';
    state.files.forEach((file, idx) => {
      const thumb = document.createElement('div');
      thumb.className   = 'media-thumb';
      thumb.draggable   = true;
      thumb.dataset.id  = file.id;
      thumb.dataset.idx = idx;

      if (file.type === 'photo') {
        const img = document.createElement('img');
        img.src       = file.url;
        img.alt       = file.name;
        img.loading   = 'lazy';
        img.draggable = false;
        thumb.appendChild(img);
      } else {
        // Show a real video frame with a play-icon overlay
        const img = document.createElement('img');
        img.alt       = file.name;
        img.draggable = false;
        img.className = 'video-thumb-img';
        thumb.appendChild(img);

        const overlay = document.createElement('div');
        overlay.className = 'video-play-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.textContent = '▶';
        thumb.appendChild(overlay);

        if (videoThumbCache.has(file.id)) {
          img.src = videoThumbCache.get(file.id);
        } else {
          captureVideoThumbnail(file.url).then(url => {
            videoThumbCache.set(file.id, url);
            // Only update the DOM if this thumb is still in the grid
            const live = gridEl.querySelector(`[data-id="${file.id}"] .video-thumb-img`);
            if (live) live.src = url;
          }).catch(() => {});
        }
      }

      const rotBtn = document.createElement('button');
      rotBtn.className = 'thumb-rotate';
      rotBtn.setAttribute('aria-label', 'Rotate 90°');
      rotBtn.textContent = '↺';
      rotBtn.addEventListener('click', async e => {
        e.stopPropagation();
        await rotateFile(file.id);
        refresh();
      });
      thumb.appendChild(rotBtn);

      if (file.type === 'video' && file.rotation) {
        thumb.querySelector('.video-thumb-placeholder').style.transform =
          `rotate(${file.rotation}deg)`;
      }

      const removeBtn = document.createElement('button');
      removeBtn.className = 'thumb-remove';
      removeBtn.setAttribute('aria-label', 'Remove');
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', e => {
        e.stopPropagation();
        const snapshot = { file, idx };
        dismissToast();
        removeFile(file.id);
        refresh();
        showUndoToast('1 removed', () => {
          restoreFiles([snapshot]);
          refresh();
          if (state.files.filter(f => f.type === 'photo').length >= 2) runDetection();
        });
      });
      thumb.appendChild(removeBtn);

      // Drag-to-reorder
      thumb.addEventListener('dragstart', e => {
        dragSrcIdx = idx;
        e.dataTransfer.effectAllowed = 'move';
        thumb.classList.add('dragging');
      });
      thumb.addEventListener('dragend', () => {
        dragSrcIdx = null;
        thumb.classList.remove('dragging');
        gridEl.querySelectorAll('.drag-target').forEach(el => el.classList.remove('drag-target'));
      });
      thumb.addEventListener('dragover', e => {
        e.preventDefault();
        e.stopPropagation();
        if (dragSrcIdx !== null && dragSrcIdx !== idx) thumb.classList.add('drag-target');
      });
      thumb.addEventListener('dragleave', () => thumb.classList.remove('drag-target'));
      thumb.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        thumb.classList.remove('drag-target');
        if (dragSrcIdx !== null && dragSrcIdx !== idx) {
          reorderFile(dragSrcIdx, idx);
          refresh();
        }
      });

      // ── Touch drag-to-reorder (long press → drag) ────────
      thumb.addEventListener('touchstart', e => {
        if (touchActive) return;
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchTimer = setTimeout(() => {
          touchActive = true;
          dragSrcIdx  = idx;
          thumb.classList.add('dragging');
          navigator.vibrate?.(20);
        }, 350);
      }, { passive: true });

      thumb.addEventListener('touchmove', e => {
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
        const t   = e.touches[0];
        const el  = document.elementFromPoint(t.clientX, t.clientY)?.closest?.('.media-thumb');
        gridEl.querySelectorAll('.drag-target').forEach(d => d.classList.remove('drag-target'));
        if (el && el !== thumb) el.classList.add('drag-target');
      }, { passive: false });

      const endTouchDrag = e => {
        clearTimeout(touchTimer);
        touchTimer = null;
        if (!touchActive) return;
        const t = e.changedTouches?.[0] ?? e.touches?.[0];
        if (t) {
          const el   = document.elementFromPoint(t.clientX, t.clientY)?.closest?.('.media-thumb');
          const tIdx = el ? +el.dataset.idx : null;
          gridEl.querySelectorAll('.drag-target').forEach(d => d.classList.remove('drag-target'));
          if (tIdx !== null && tIdx !== idx) { reorderFile(idx, tIdx); refresh(); }
        }
        thumb.classList.remove('dragging');
        touchActive = false;
        dragSrcIdx  = null;
      };
      thumb.addEventListener('touchend',    endTouchDrag);
      thumb.addEventListener('touchcancel', endTouchDrag);

      gridEl.appendChild(thumb);
    });
  }

  function refresh() {
    const hasFiles = state.files.length > 0;
    countsEl.textContent  = countLabel(state.files);
    playBtn.disabled      = !hasFiles;
    const d = state.settings.photoDuration;
    timingVal.textContent = `${d} second${d === 1 ? '' : 's'}`;
    slider.value          = d;
    screenEl.classList.toggle('loaded', hasFiles);
    renderGrid();
    renderDupNotice();
  }

  async function handleFiles(rawFiles) {
    const arr = Array.from(rawFiles).filter(Boolean);
    if (!arr.length) return;
    dropZone.classList.add('loading');
    addMoreBtn.disabled = true;
    dropLabel.textContent = 'Processing…';
    try {
      const records = await processFiles(arr, (done, total) => {
        dropLabel.textContent = `Processing… ${done} / ${total}`;
      });
      addFiles(records);
    } catch (err) {
      console.error('Import error:', err);
    } finally {
      dropZone.classList.remove('loading');
      addMoreBtn.disabled = false;
      dropLabel.textContent = 'Drop your photos and videos here';
    }
    refresh();

    // Show checking indicator immediately so there's no silent gap before detection starts
    if (state.files.filter(f => f.type === 'photo').length >= 2) {
      dupNotice.hidden = false;
      dupNotice.classList.add('checking');
      dupMsg.textContent = 'Checking for similar photos…';
    }

    // Auto-remove near-exact duplicates silently (no user input needed)
    const exactGroups = await detectExactGroups(state.files);
    let autoRemoved = 0;
    for (const group of exactGroups) {
      const best = group.reduce((a, b) => a.blob.size > b.blob.size ? a : b);
      for (const f of group) {
        if (f.id !== best.id) { removeFile(f.id); autoRemoved++; }
      }
    }
    if (autoRemoved > 0) {
      refresh();
      removedConfirm.textContent = `${autoRemoved} near-identical photo${autoRemoved === 1 ? '' : 's'} removed automatically.`;
      removedConfirm.hidden = false;
      setTimeout(() => { removedConfirm.hidden = true; }, 5000);
    }

    runDetection();
  }

  // File drop — on screenEl so it works in both empty and loaded states
  screenEl.addEventListener('dragover', e => {
    if (dragSrcIdx !== null) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  screenEl.addEventListener('dragleave', e => {
    if (!screenEl.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
  });
  screenEl.addEventListener('drop', async e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (dragSrcIdx !== null) return; // internal thumb drag

    // Snapshot ALL item refs synchronously — DataTransferItems go null after the
    // first await, so getAsFile()/webkitGetAsEntry() must be called here.
    const itemRefs = [];
    if (e.dataTransfer.items?.length) {
      for (const item of Array.from(e.dataTransfer.items)) {
        if (item.kind !== 'file') continue;
        itemRefs.push({
          entry: item.webkitGetAsEntry?.() || null,
          file:  item.getAsFile() || null,
        });
      }
    }

    const files = [];
    for (const { entry, file } of itemRefs) {
      if (entry) {
        try {
          files.push(...await collectFromEntry(entry));
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

  // Click-to-browse (empty state)
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
  });

  // Add-more button (loaded state top bar)
  addMoreBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    // Snapshot immediately — iOS Safari FileList references can expire after async gaps
    const files = Array.from(fileInput.files || []);
    fileInput.value = ''; // reset so the same files can be re-selected later
    if (files.length) handleFiles(files);
  });

  // Timing slider
  slider.addEventListener('input', () => {
    const v = +slider.value;
    state.settings.photoDuration = v;
    timingVal.textContent = `${v} second${v === 1 ? '' : 's'}`;
  });

  playBtn.addEventListener('click', () => { if (state.files.length) { dismissToast(); onPlay(); } });

  refresh();

  // Re-run detection on every mount so returning from review/player always refreshes the notice.
  if (state.files.filter(f => f.type === 'photo').length >= 2) runDetection();

  // Register this mount's handleFiles as the target for Web Share Target deliveries.
  _activeHandleFiles = handleFiles;
}
