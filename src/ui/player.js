// Player screen: full-screen, media only
export function mountPlayer(root, { onExit }) {
  root.innerHTML = `
    <div class="screen" id="screen-player">
      <span class="skeleton-label">Player screen</span>
      <button class="skeleton-btn" id="btn-exit">Exit (Esc)</button>
    </div>
  `;
  root.querySelector('#btn-exit').addEventListener('click', onExit);

  function handleKey(e) {
    if (e.key === 'Escape') { document.removeEventListener('keydown', handleKey); onExit(); }
  }
  document.addEventListener('keydown', handleKey);
}
