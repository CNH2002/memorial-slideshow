import { mountSetup } from './ui/setup.js';
import { mountReview } from './ui/review.js';
import { mountPlayer } from './ui/player.js';
import { showUndoToast, dismissToast } from './ui/toast.js';
import { restoreFiles } from './state.js';

const app = document.getElementById('app');

// Register service worker for Web Share Target (lets users share entire albums
// from the iOS Photos app directly into the slideshow).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'SHARED_FILES' && event.data.files?.length) {
      window.dispatchEvent(new CustomEvent('slideshow:shared-files', { detail: event.data.files }));
    }
  });
  if (location.search.includes('share-target')) {
    history.replaceState({}, '', '/');
    navigator.serviceWorker.ready.then(r => r.active?.postMessage({ type: 'GET_SHARED_FILES' }));
  }
}

function showSetup() {
  mountSetup(app, { onPlay: showPlayer, onReview: showReview });
}

function showReview() {
  dismissToast();
  mountReview(app, {
    onDone: (removed, snapshots) => {
      showSetup();
      if (removed > 0) {
        showUndoToast(`${removed} removed`, () => {
          restoreFiles(snapshots);
          showSetup();
        });
      }
    },
  });
}

function showPlayer() {
  dismissToast();
  mountPlayer(app, { onExit: showSetup });
}

showSetup();
