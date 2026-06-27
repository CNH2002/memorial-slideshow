import { state, removeFile, rotateFile } from '../state.js';

export function mountReview(root, { onDone }) {
  // Filter each group to only files that still exist in state.
  // Files deleted from the grid after detection ran would otherwise appear as
  // broken images (their object URLs were revoked by removeFile).
  const groups = state.dupGroups
    .map(g => ({ ...g, files: g.files.filter(f => state.files.some(sf => sf.id === f.id)) }))
    .filter(g => g.files.length >= 2);

  if (groups.length === 0) {
    state.dupGroups = [];
    onDone(0, []);
    return;
  }

  root.innerHTML = `
    <div id="screen-review">
      <div class="review-header">
        <div class="review-header-text">
          <h2 class="review-title">Review similar photos</h2>
          <p class="review-subtitle">Keep the ones you want and tap the rest to remove them — you can remove all of a group if you'd like. You can undo straight after.</p>
        </div>
        <button class="review-done-btn" id="review-done">Done</button>
      </div>
      <div class="review-groups" id="review-groups"></div>
    </div>
  `;

  const groupsEl  = root.querySelector('#review-groups');
  const doneBtn   = root.querySelector('#review-done');
  const removeSets = groups.map(() => new Set());

  function updateDoneBtn() {
    const total = removeSets.reduce((n, s) => n + s.size, 0);
    doneBtn.textContent = total > 0 ? `Remove ${total} photo${total === 1 ? '' : 's'}` : 'Done';
    doneBtn.classList.toggle('review-done-active', total > 0);
  }

  groups.forEach(({ files, reason }, gi) => {
    const card = document.createElement('div');
    card.className = 'review-card';

    const label = document.createElement('p');
    label.className = 'review-group-label';
    const prefix = groups.length > 1 ? `Group ${gi + 1} of ${groups.length}  ·  ` : '';
    label.textContent = prefix + (reason === 'exact' ? 'Near-exact duplicates' : 'Visually similar');
    card.appendChild(label);

    // Scrolling grid of photos
    const thumbsRow = document.createElement('div');
    thumbsRow.className = 'review-thumbs';

    files.forEach(file => {
      const thumb = document.createElement('div');
      thumb.className = 'review-thumb';
      thumb.dataset.id = file.id;

      const img = document.createElement('img');
      img.src = file.url;
      img.alt = file.name;
      thumb.appendChild(img);

      const rotBtn = document.createElement('button');
      rotBtn.className = 'review-rotate-btn';
      rotBtn.setAttribute('aria-label', 'Rotate 90°');
      rotBtn.textContent = '↺';
      rotBtn.addEventListener('click', async e => {
        e.stopPropagation();
        try {
          await rotateFile(file.id);
          img.src = '';
          img.src = file.url;
        } catch (err) {
          console.error('[rotate]', err);
        }
      });
      thumb.appendChild(rotBtn);

      thumb.addEventListener('click', () => {
        removeSets[gi].add(file.id);
        syncGroupState();
      });

      thumbsRow.appendChild(thumb);
    });

    card.appendChild(thumbsRow);

    // Expanded actions row (keep all / remove all)
    const groupActions = document.createElement('div');
    groupActions.className = 'review-group-actions';

    const keepAllBtn = document.createElement('button');
    keepAllBtn.className = 'keep-all-btn';
    keepAllBtn.textContent = 'Keep all';
    groupActions.appendChild(keepAllBtn);

    const removeAllBtn = document.createElement('button');
    removeAllBtn.className = 'keep-all-btn remove-all-btn';
    removeAllBtn.textContent = 'Remove all';
    groupActions.appendChild(removeAllBtn);

    card.appendChild(groupActions);

    // Collapsed notice — shown when ≤1 photo remains visible
    const collapsedEl = document.createElement('div');
    collapsedEl.className = 'review-card-collapsed';
    collapsedEl.hidden = true;

    const collapsedMsg = document.createElement('span');
    collapsedMsg.className = 'review-card-collapsed-msg';
    collapsedEl.appendChild(collapsedMsg);

    const collapsedKeepAll = document.createElement('button');
    collapsedKeepAll.className = 'keep-all-btn';
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
      files.forEach(f => removeSets[gi].add(f.id));
      syncGroupState();
    });

    // Re-render this group's visual state from removeSets[gi].
    // Called after every mark/unmark action so the grid always matches.
    function syncGroupState() {
      const visibleCount = files.filter(f => !removeSets[gi].has(f.id)).length;
      const collapse = visibleCount <= 1;

      files.forEach(f => {
        const t = thumbsRow.querySelector(`[data-id="${f.id}"]`);
        if (t) t.hidden = removeSets[gi].has(f.id);
      });

      thumbsRow.hidden  = collapse;
      groupActions.hidden = collapse;
      collapsedEl.hidden  = !collapse;

      if (collapse) {
        const n = removeSets[gi].size;
        collapsedMsg.textContent = n === files.length
          ? `All ${n} marked for removal`
          : `${n} of ${files.length} marked for removal, 1 kept`;
      }

      updateDoneBtn();
    }
  });

  updateDoneBtn();

  doneBtn.addEventListener('click', () => {
    const snapshots = [];
    removeSets.forEach(set => {
      set.forEach(id => {
        const idx = state.files.findIndex(f => f.id === id);
        if (idx >= 0) snapshots.push({ file: state.files[idx], idx });
      });
    });
    snapshots.sort((a, b) => b.idx - a.idx);
    for (const { file } of snapshots) removeFile(file.id);
    onDone(snapshots.length, snapshots);
  });
}
