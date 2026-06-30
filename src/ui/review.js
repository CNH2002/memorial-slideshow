import { state, removeFile, rotateFile, bakeRotation } from '../state.js';
import { dbUpdate } from '../db.js';

export function mountReview(root, { onDone }) {
  const groups = state.dupGroups
    .map((g) => ({ ...g, files: g.files.filter((f) => state.files.some((sf) => sf.id === f.id)) }))
    .filter((g) => g.files.length >= 2);

  if (groups.length === 0) {
    state.dupGroups = [];
    onDone(0, []);
    return;
  }

  root.innerHTML = `
    <div id="screen-review" class="min-h-dvh bg-bg flex flex-col">

      <header class="flex items-start justify-between gap-6 px-5 py-5 md:px-8 md:py-6
                     border-b border-white/[0.05] shrink-0">
        <div class="flex flex-col gap-1.5">
          <h2 class="font-display font-light text-linen text-xl md:text-2xl tracking-wide">
            Review Similar Photos
          </h2>
          <p class="font-body text-muted text-xs leading-relaxed max-w-sm">
            Tap any photo to mark it for removal. You can undo straight after.
          </p>
        </div>
        <button id="review-done"
                class="shrink-0 px-5 py-2 border border-white/[0.12] rounded
                       font-body text-xs text-muted uppercase tracking-[0.15em]
                       transition-all duration-[200ms] ease-in-out
                       hover:border-white/30 hover:text-linen
                       whitespace-nowrap">
          Done
        </button>
      </header>

      <div id="review-groups"
           class="flex-1 flex flex-col divide-y divide-white/[0.05]
                  px-5 md:px-8 pb-12 max-w-4xl w-full mx-auto">
      </div>
    </div>
  `;

  const groupsEl = root.querySelector('#review-groups');
  const doneBtn = root.querySelector('#review-done');
  const removeSets = groups.map(() => new Set());

  const baseBtnCls = [
    'shrink-0 px-5 py-2 rounded border font-body text-xs uppercase tracking-[0.15em]',
    'transition-all duration-[200ms] ease-in-out whitespace-nowrap',
  ].join(' ');

  function updateDoneBtn() {
    const total = removeSets.reduce((n, s) => n + s.size, 0);
    doneBtn.textContent = total > 0 ? `Remove ${total} photo${total === 1 ? '' : 's'}` : 'Done';
    if (total > 0) {
      doneBtn.className = `${baseBtnCls} bg-sage border-sage text-bg hover:opacity-85`;
    } else {
      doneBtn.className = `${baseBtnCls} border-white/[0.12] text-muted hover:border-white/30 hover:text-linen`;
    }
  }

  groups.forEach(({ files, reason }, gi) => {
    const card = document.createElement('div');
    card.className = 'flex flex-col gap-4 py-6';

    const label = document.createElement('p');
    label.className = 'font-body text-[10px] text-muted uppercase tracking-[0.14em]';
    const prefix = groups.length > 1 ? `Group ${gi + 1} of ${groups.length}  ·  ` : '';
    label.textContent =
      prefix + (reason === 'exact' ? 'Near-exact duplicates' : 'Visually similar');
    card.appendChild(label);

    const thumbsRow = document.createElement('div');
    thumbsRow.className = 'review-thumbs grid gap-2.5';
    thumbsRow.style.gridTemplateColumns = 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))';

    files.forEach((file) => {
      const thumb = document.createElement('div');
      thumb.className =
        'review-thumb relative rounded overflow-hidden cursor-pointer ' +
        'ring-1 ring-white/[0.06] transition-opacity duration-[200ms] ease-in-out';
      thumb.dataset.id = file.id;

      const img = document.createElement('img');
      img.src = file.url;
      img.alt = file.name;
      img.className = 'w-full object-cover select-none pointer-events-none';
      img.style.aspectRatio = '4 / 3';
      img.draggable = false;
      if (file.rotation) img.style.transform = `rotate(${file.rotation}deg)`;
      thumb.appendChild(img);

      // Badge overlay (Keep / Remove state)
      const badge = document.createElement('div');
      badge.className =
        'review-badge absolute bottom-0 inset-x-0 py-1 text-center ' +
        'font-body text-[10px] font-medium uppercase tracking-[0.1em] ' +
        'transition-all duration-[200ms] ease-in-out';
      badge.style.display = 'none';
      thumb.appendChild(badge);

      const rotBtn = document.createElement('button');
      rotBtn.className =
        'review-rotate-btn absolute top-2 right-2 w-7 h-7 rounded-full ' +
        'bg-black/60 text-linen/70 flex items-center justify-center text-sm ' +
        'hover:text-linen opacity-0 hover:opacity-100 ' +
        'transition-opacity duration-[200ms] ease-in-out';
      rotBtn.setAttribute('aria-label', 'Rotate 90°');
      rotBtn.textContent = '↺';
      rotBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        rotateFile(file.id);
        img.style.transform = file.rotation ? `rotate(${file.rotation}deg)` : '';
        const deg = file.rotation;
        bakeRotation(file.blob, deg)
          .then((newBlob) => {
            if (file.rotation !== deg) return;
            URL.revokeObjectURL(file.url);
            file.blob = newBlob;
            file.url = URL.createObjectURL(newBlob);
            file.rotation = 0;
            img.style.transform = '';
            dbUpdate(file);
          })
          .catch(() => {});
      });
      thumb.appendChild(rotBtn);

      thumb.addEventListener('click', () => {
        if (removeSets[gi].has(file.id)) {
          removeSets[gi].delete(file.id);
        } else {
          removeSets[gi].add(file.id);
        }
        syncGroupState();
      });

      thumbsRow.appendChild(thumb);
    });

    card.appendChild(thumbsRow);

    // Group actions
    const groupActions = document.createElement('div');
    groupActions.className = 'review-group-actions flex gap-5';

    const keepAllBtn = document.createElement('button');
    keepAllBtn.className =
      'font-body text-xs text-muted/60 hover:text-linen ' +
      'transition-colors duration-[200ms] ease-in-out';
    keepAllBtn.textContent = 'Keep all';
    groupActions.appendChild(keepAllBtn);

    const removeAllBtn = document.createElement('button');
    removeAllBtn.className =
      'font-body text-xs text-muted/60 hover:text-red-400/70 ' +
      'transition-colors duration-[200ms] ease-in-out';
    removeAllBtn.textContent = 'Remove all';
    groupActions.appendChild(removeAllBtn);

    card.appendChild(groupActions);

    // Collapsed notice
    const collapsedEl = document.createElement('div');
    collapsedEl.className = 'review-card-collapsed flex items-center gap-4 py-1';
    collapsedEl.hidden = true;

    const collapsedMsg = document.createElement('span');
    collapsedMsg.className = 'font-body text-xs text-muted/60 italic';
    collapsedEl.appendChild(collapsedMsg);

    const collapsedKeepAll = document.createElement('button');
    collapsedKeepAll.className =
      'font-body text-xs text-muted/50 hover:text-linen ' +
      'transition-colors duration-[200ms] ease-in-out';
    collapsedKeepAll.textContent = 'Keep all';
    collapsedEl.appendChild(collapsedKeepAll);

    card.appendChild(collapsedEl);
    groupsEl.appendChild(card);

    function doKeepAll() {
      removeSets[gi].clear();
      syncGroupState();
    }

    keepAllBtn.addEventListener('click', doKeepAll);
    collapsedKeepAll.addEventListener('click', doKeepAll);

    removeAllBtn.addEventListener('click', () => {
      files.forEach((f) => removeSets[gi].add(f.id));
      syncGroupState();
    });

    function syncGroupState() {
      const visibleCount = files.filter((f) => !removeSets[gi].has(f.id)).length;
      const collapse = visibleCount === 0;

      files.forEach((f) => {
        const t = thumbsRow.querySelector(`[data-id="${f.id}"]`);
        if (!t) return;
        const marked = removeSets[gi].has(f.id);
        t.hidden = marked;
        const b = t.querySelector('.review-badge');
        if (b) {
          if (marked) {
            b.style.display = 'block';
            b.style.background = 'rgba(180,55,55,0.88)';
            b.style.color = '#fff';
            b.textContent = 'Remove';
          } else {
            b.style.display = 'none';
          }
        }
      });

      thumbsRow.hidden = collapse;
      groupActions.hidden = collapse;
      collapsedEl.hidden = !collapse;

      if (collapse) {
        const n = removeSets[gi].size;
        collapsedMsg.textContent =
          n === files.length
            ? `All ${n} marked for removal`
            : `${n} of ${files.length} marked for removal, 1 kept`;
      }

      updateDoneBtn();
    }
  });

  updateDoneBtn();

  doneBtn.addEventListener('click', () => {
    const snapshots = [];
    removeSets.forEach((set) => {
      set.forEach((id) => {
        const idx = state.files.findIndex((f) => f.id === id);
        if (idx >= 0) snapshots.push({ file: state.files[idx], idx });
      });
    });
    snapshots.sort((a, b) => b.idx - a.idx);
    for (const { file } of snapshots) removeFile(file.id);
    onDone(snapshots.length, snapshots);
  });
}
