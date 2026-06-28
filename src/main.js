import { mountSetup } from './ui/setup.js';
import { mountReview } from './ui/review.js';
import { mountPlayer } from './ui/player.js';
import { showUndoToast, dismissToast } from './ui/toast.js';
import { state, addFiles, restoreFiles } from './state.js';
import { dbLoad, dbAdd, dbRemove } from './db.js';

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
      // review.js already called removeFile() for each; sync those deletes to IDB
      // before mounting setup so the restored grid and the DB stay in lockstep.
      if (removed > 0) {
        dbRemove(snapshots.map(s => s.file.id), state.files.map(f => f.id));
      }
      showSetup();
      if (removed > 0) {
        showUndoToast(`${removed} removed`, () => {
          restoreFiles(snapshots);
          dbAdd(snapshots.map(s => s.file), state.files.map(f => f.id));
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

// Restore persisted photos before the first render so the grid is populated
// immediately on load. If IDB is unavailable or empty, fall through to the
// empty state — the app always works without persistence.
dbLoad()
  .then(saved => { if (saved.length) addFiles(saved); })
  .catch(() => {})
  .finally(showSetup);
