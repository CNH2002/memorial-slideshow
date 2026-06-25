import { createSlideshow } from '../slideshow.js';
import { state } from '../state.js';

export function mountPlayer(root, { onExit }) {
  root.innerHTML = `
    <div id="screen-player">
      <div id="media-stage"></div>
    </div>
  `;

  const stage = root.querySelector('#media-stage');
  const show  = createSlideshow(stage, state.files, state.settings);
  let exited  = false;

  function exit() {
    if (exited) return;
    exited = true;
    show.stop();
    document.removeEventListener('keydown', handleKey);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    onExit();
  }

  function handleKey(e) {
    if      (e.key === 'Escape')     exit();
    else if (e.key === 'ArrowRight') show.next();
    else if (e.key === 'ArrowLeft')  show.prev();
  }

  document.addEventListener('keydown', handleKey);

  // Exit if fullscreen is dismissed via browser UI (not our Esc handler)
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) exit();
  }, { once: true });

  document.documentElement.requestFullscreen().catch(() => {});
  show.start();
}
