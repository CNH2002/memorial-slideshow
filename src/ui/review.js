// Review screen: side-by-side duplicate review + manual rotate
export function mountReview(root, { onDone }) {
  root.innerHTML = `
    <div class="screen" id="screen-review">
      <span class="skeleton-label">Review screen</span>
      <button class="skeleton-btn" id="btn-done">Done</button>
    </div>
  `;
  root.querySelector('#btn-done').addEventListener('click', onDone);
}
