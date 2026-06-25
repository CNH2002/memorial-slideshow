// Setup screen: drop zone, counts, timing slider, play button
export function mountSetup(root, { onPlay, onReview }) {
  root.innerHTML = `
    <div class="screen" id="screen-setup">
      <span class="skeleton-label">Setup screen</span>
      <button class="skeleton-btn" id="btn-play">Play slideshow</button>
      <button class="skeleton-btn" id="btn-review">Review duplicates</button>
    </div>
  `;
  root.querySelector('#btn-play').addEventListener('click', onPlay);
  root.querySelector('#btn-review').addEventListener('click', onReview);
}
