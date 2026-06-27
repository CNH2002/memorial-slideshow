import { state, removeFile, rotateFile } from '../state.js';


export function mountReview(root, { onDone }) {
  const groups = state.dupGroups; // Array<{ files: fileRecord[], reason: 'exact'|'similar' }>

  root.innerHTML = `
    <div id="screen-review">
      <div class="review-header">
        <div class="review-header-text">
          <h2 class="review-title">Review similar photos</h2>
          <p class="review-subtitle">Keep the ones you want and tap the rest to mark them for removal — you can remove all of a group if you'd like. You can undo straight after.</p>
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

      const badge = document.createElement('span');
      badge.className = 'review-badge keep';
      badge.textContent = 'Keep';
      thumb.appendChild(badge);

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
        if (removeSets[gi].has(file.id)) {
          removeSets[gi].delete(file.id);
          thumb.classList.remove('removing');
          badge.className = 'review-badge keep';
          badge.textContent = 'Keep';
        } else {
          removeSets[gi].add(file.id);
          thumb.classList.add('removing');
          badge.className = 'review-badge remove';
          badge.textContent = 'Remove';
        }
        updateDoneBtn();
      });

      thumbsRow.appendChild(thumb);
    });

    card.appendChild(thumbsRow);

    const groupActions = document.createElement('div');
    groupActions.className = 'review-group-actions';

    const keepAllBtn = document.createElement('button');
    keepAllBtn.className = 'keep-all-btn';
    keepAllBtn.textContent = 'Keep all';
    keepAllBtn.addEventListener('click', () => {
      removeSets[gi].clear();
      card.querySelectorAll('.review-thumb').forEach(t => {
        t.classList.remove('removing');
        const b = t.querySelector('.review-badge');
        b.className = 'review-badge keep';
        b.textContent = 'Keep';
      });
      updateDoneBtn();
    });
    groupActions.appendChild(keepAllBtn);

    const removeAllBtn = document.createElement('button');
    removeAllBtn.className = 'keep-all-btn remove-all-btn';
    removeAllBtn.textContent = 'Remove all';
    removeAllBtn.addEventListener('click', () => {
      files.forEach(f => {
        removeSets[gi].add(f.id);
        const t = card.querySelector(`[data-id="${f.id}"]`);
        if (t) {
          t.classList.add('removing');
          const b = t.querySelector('.review-badge');
          b.className = 'review-badge remove';
          b.textContent = 'Remove';
        }
      });
      updateDoneBtn();
    });
    groupActions.appendChild(removeAllBtn);

    card.appendChild(groupActions);

    groupsEl.appendChild(card);
  });

  updateDoneBtn();

  doneBtn.addEventListener('click', () => {
    // Capture snapshots BEFORE removal — removeFile revokes the object URL.
    const snapshots = [];
    removeSets.forEach(set => {
      set.forEach(id => {
        const idx = state.files.findIndex(f => f.id === id);
        if (idx >= 0) snapshots.push({ file: state.files[idx], idx });
      });
    });
    // Remove highest indices first so earlier indices stay stable.
    snapshots.sort((a, b) => b.idx - a.idx);
    for (const { file } of snapshots) removeFile(file.id);
    onDone(snapshots.length, snapshots);
  });
}
