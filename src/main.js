import { inject } from '@vercel/analytics';
inject();

import '@fontsource/cormorant-garamond/latin-300.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';

import { mountLanding } from './ui/landing.js';
import { mountSetup } from './ui/setup.js';
import { mountReview } from './ui/review.js';
import { mountPlayer } from './ui/player.js';
import { mountPrivacy } from './ui/privacy.js';
import { mountTerms } from './ui/terms.js';
import { mountCookieBanner } from './ui/cookie.js';
import { showUndoToast, dismissToast } from './ui/toast.js';
import { state, addFiles, restoreFiles } from './state.js';
import { dbLoad, dbAdd, dbRemove } from './db.js';

const app = document.getElementById('app');

// Register service worker for Web Share Target (lets users share entire albums
// from the iOS Photos app directly into the slideshow).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SHARED_FILES' && event.data.files?.length) {
      window.dispatchEvent(new CustomEvent('slideshow:shared-files', { detail: event.data.files }));
    }
  });
  if (location.search.includes('share-target')) {
    history.replaceState({}, '', '/');
    navigator.serviceWorker.ready.then((r) => r.active?.postMessage({ type: 'GET_SHARED_FILES' }));
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
        dbRemove(
          snapshots.map((s) => s.file.id),
          state.files.map((f) => f.id)
        );
      }
      showSetup();
      if (removed > 0) {
        showUndoToast(`${removed} removed`, () => {
          restoreFiles(snapshots);
          dbAdd(
            snapshots.map((s) => s.file),
            state.files.map((f) => f.id)
          );
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

function showPrivacy() {
  mountPrivacy(app, { onBack: showLanding });
}

function showTerms() {
  mountTerms(app, { onBack: showLanding });
}

function showLanding() {
  mountLanding(app, { onEnter: showSetup, onPrivacy: showPrivacy, onTerms: showTerms });
}

// Cookie consent banner — attaches to document.body, persists across screens
mountCookieBanner();
window.addEventListener('slideshow:show-privacy', showPrivacy);

// Load persisted photos before first render — landing displays while DB reads,
// so photos are ready in state by the time the user clicks Begin.
dbLoad()
  .then((saved) => {
    if (saved.length) addFiles(saved);
  })
  .catch(() => {})
  .finally(showLanding);
