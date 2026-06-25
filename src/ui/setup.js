import { processFiles, collectFromEntry } from '../files.js';
import { state, addFiles, removeFile, reorderFile } from '../state.js';

function countLabel(files) {
  const photos = files.filter(f => f.type === 'photo').length;
  const videos = files.filter(f => f.type === 'video').length;
  const parts  = [];
  if (photos) parts.push(`${photos} photo${photos === 1 ? '' : 's'}`);
  if (videos) parts.push(`${videos} video${videos === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

export function mountSetup(root, { onPlay, onReview }) {
  root.innerHTML = `
    <div id="screen-setup">
      <div class="setup-inner">
        <div class="drop-zone" id="drop-zone" role="button" tabindex="0">
          <div class="drop-zone-inner">
            <span class="drop-arrow" aria-hidden="true">↓</span>
            <p class="drop-primary" id="drop-primary">Drop your photos and videos here</p>
            <p class="drop-secondary">JPG · PNG · HEIC · WebP · MP4 · MOV</p>
          </div>
          <input type="file" id="file-input" multiple accept="image/*,video/*,.heic,.heif,.mov" hidden>
        </div>

        <p class="file-counts" id="file-counts"></p>
        <div class="media-grid" id="media-grid"></div>

        <div class="timing-row">
          <span class="timing-label">Time per photo</span>
          <span class="timing-value" id="timing-value">7 seconds</span>
        </div>
        <input type="range" id="timing-slider" class="timing-slider" min="1" max="15" value="${state.settings.photoDuration}">

        <button class="play-btn" id="play-btn" disabled>Play slideshow</button>
      </div>
    </div>
  `;

  const screenEl  = root.querySelector('#screen-setup');
  const dropZone  = root.querySelector('#drop-zone');
  const fileInput = root.querySelector('#file-input');
  const dropLabel = root.querySelector('#drop-primary');
  const countsEl  = root.querySelector('#file-counts');
  const gridEl    = root.querySelector('#media-grid');
  const slider    = root.querySelector('#timing-slider');
  const timingVal = root.querySelector('#timing-value');
  const playBtn   = root.querySelector('#play-btn');

  let dragSrcIdx = null;

  function renderGrid() {
    gridEl.innerHTML = '';
    state.files.forEach((file, idx) => {
      const thumb = document.createElement('div');
      thumb.className    = 'media-thumb';
      thumb.draggable    = true;
      thumb.dataset.id   = file.id;
      thumb.dataset.idx  = idx;

      if (file.type === 'photo') {
        const img = document.createElement('img');
        img.src = file.url;
        img.alt = file.name;
        img.draggable = false;
        thumb.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.className = 'video-thumb-placeholder';
        ph.textContent = '▶';
        thumb.appendChild(ph);
      }

      const btn = document.createElement('button');
      btn.className = 'thumb-remove';
      btn.setAttribute('aria-label', 'Remove');
      btn.textContent = '×';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        removeFile(file.id);
        refresh();
      });
      thumb.appendChild(btn);

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

      gridEl.appendChild(thumb);
    });
  }

  function refresh() {
    const hasFiles = state.files.length > 0;
    countsEl.textContent   = countLabel(state.files);
    countsEl.style.display = hasFiles ? '' : 'none';
    playBtn.disabled       = !hasFiles;
    const d = state.settings.photoDuration;
    timingVal.textContent  = `${d} second${d === 1 ? '' : 's'}`;
    slider.value           = d;
    screenEl.classList.toggle('has-files', hasFiles);
    renderGrid();
  }

  async function handleFiles(rawFiles) {
    const arr = Array.from(rawFiles).filter(Boolean);
    if (!arr.length) return;
    dropZone.classList.add('loading');
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
      dropLabel.textContent = 'Drop your photos and videos here';
    }
    refresh();
  }

  // Drop zone — file drop (ignore internal thumb drags)
  dropZone.addEventListener('dragover', e => {
    if (dragSrcIdx !== null) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', e => {
    if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', async e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (dragSrcIdx !== null) return; // internal thumb drag

    const files = [];

    // Primary: items API — supports folders and webkitGetAsEntry
    if (e.dataTransfer.items?.length) {
      for (const item of Array.from(e.dataTransfer.items)) {
        if (item.kind !== 'file') continue;
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          files.push(...await collectFromEntry(entry));
        } else {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
    }

    // Fallback: dataTransfer.files (macOS Photos app and similar sources
    // that populate files but not items with usable entries)
    if (files.length === 0 && e.dataTransfer.files?.length) {
      files.push(...Array.from(e.dataTransfer.files));
    }

    await handleFiles(files);
  });

  // Click-to-browse
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
  });
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));

  // Timing slider
  slider.addEventListener('input', () => {
    const v = +slider.value;
    state.settings.photoDuration = v;
    timingVal.textContent = `${v} second${v === 1 ? '' : 's'}`;
  });

  playBtn.addEventListener('click', () => { if (state.files.length) onPlay(); });

  refresh();
}
