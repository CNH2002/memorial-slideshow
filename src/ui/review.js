import { state, removeFile, rotateFile } from '../state.js';

export function mountReview(root, { onDone }) {
  const groups = state.dupGroups; // Array<{ files: fileRecord[], reason: 'exact'|'similar' }>

  root.innerHTML = `
    <div id="screen-review">
      <div class="review-header">
        <h2 class="review-title">Review similar photos</h2>
        <button class="review-done-btn" id="review-done">Done</button>
      </div>
      <div class="review-groups" id="review-groups"></div>
    </div>
  `;

  const groupsEl  = root.querySelector('#review-groups');
  const removeSets = groups.map(() => new Set());

  groups.forEach(({ files, reason }, gi) => {
    const card = document.createElement('div');
    card.className = 'review-card';

    const groupLabel = document.createElement('p');
    groupLabel.className = 'review-group-label';
    groupLabel.textContent = reason === 'exact' ? 'Near-exact duplicate' : 'Visually similar';
    card.appendChild(groupLabel);

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
      badge.className = 'review-badge';
      badge.textContent = 'Keep';
      thumb.appendChild(badge);

      const rotBtn = document.createElement('button');
      rotBtn.className = 'review-rotate-btn';
      rotBtn.setAttribute('aria-label', 'Rotate 90°');
      rotBtn.textContent = '↺';
      rotBtn.addEventListener('click', async e => {
        e.stopPropagation();
        await rotateFile(file.id);
        img.src = file.url;
      });
      thumb.appendChild(rotBtn);

      thumb.addEventListener('click', () => {
        if (removeSets[gi].has(file.id)) {
          removeSets[gi].delete(file.id);
          thumb.classList.remove('removing');
          badge.textContent = 'Keep';
        } else {
          if (files.length - removeSets[gi].size <= 1) return; // must keep one
          removeSets[gi].add(file.id);
          thumb.classList.add('removing');
          badge.textContent = 'Remove';
        }
      });

      thumbsRow.appendChild(thumb);
    });

    card.appendChild(thumbsRow);

    const keepAllBtn = document.createElement('button');
    keepAllBtn.className = 'keep-all-btn';
    keepAllBtn.textContent = 'Keep all in this group';
    keepAllBtn.addEventListener('click', () => {
      removeSets[gi].clear();
      card.querySelectorAll('.review-thumb').forEach(t => {
        t.classList.remove('removing');
        t.querySelector('.review-badge').textContent = 'Keep';
      });
    });
    card.appendChild(keepAllBtn);

    groupsEl.appendChild(card);
  });

  root.querySelector('#review-done').addEventListener('click', () => {
    let removed = 0;
    removeSets.forEach(set => { set.forEach(id => { removeFile(id); removed++; }); });
    state.dupGroups = [];
    onDone(removed);
  });
}
