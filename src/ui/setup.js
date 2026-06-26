import { processFiles, collectFromEntry } from '../files.js';
import { state, addFiles, removeFile, reorderFile, rotateFile } from '../state.js';
import { detectDuplicates } from '../duplicates.js';

function countLabel(files) {
  const photos = files.filter(f => f.type === 'photo').length;
  const videos = files.filter(f => f.type === 'video').length;
  const parts  = [];
  if (photos) parts.push(`${photos} photo${photos === 1 ? '' : 's'}`);
  if (videos) parts.push(`${videos} video${videos === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

export function mountSetup(root, { onPlay, onReview, removedCount = 0 }) {
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

        <p class="removed-confirm" id="removed-confirm" hidden></p>

        <div class="dup-notice" id="dup-notice" hidden>
          <span class="dup-dot"></span>
          <span id="dup-message"></span>
          <button class="dup-review-btn" id="btn-review">Review</button>
        </div>

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
  const dupNotice = root.querySelector('#dup-notice');
  const dupMsg    = root.querySelector('#dup-message');
  const slider    = root.querySelector('#timing-slider');
  const timingVal = root.querySelector('#timing-value');
  const playBtn   = root.querySelector('#play-btn');

  const removedConfirm = root.querySelector('#removed-confirm');
  if (removedCount > 0) {
    removedConfirm.textContent = `${removedCount} photo${removedCount === 1 ? '' : 's'} removed.`;
    removedConfirm.hidden = false;
    setTimeout(() => { removedConfirm.hidden = true; }, 4000);
  }

  let dragSrcIdx = null;

  function renderDupNotice() {
    const n = state.dupGroups.length;
    dupNotice.hidden = n === 0;
    if (n > 0) dupMsg.textContent = `${n} group${n === 1 ? '' : 's'} of similar photos found`;
  }

  root.querySelector('#btn-review').addEventListener('click', onReview);

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
        img.src     = file.url;
        img.alt     = file.name;
        img.loading = 'lazy';
        img.draggable = false;
        thumb.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.className = 'video-thumb-placeholder';
        ph.textContent = '▶';
        thumb.appendChild(ph);
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

      // Apply CSS rotation for videos (photos have baked blobs)
      if (file.type === 'video' && file.rotation) {
        thumb.querySelector('.video-thumb-placeholder').style.transform =
          `rotate(${file.rotation}deg)`;
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
    renderDupNotice();
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

    // Detect perceptual duplicates; populate state so notice + review screen appear
    detectDuplicates(state.files).then(groups => {
      state.dupGroups = groups;
      renderDupNotice();
    });
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

    // Resolve entries asynchronously (FileSystemEntry objects stay valid after await)
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

    // Fallback: dataTransfer.files — macOS Photos app multi-select drag
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
