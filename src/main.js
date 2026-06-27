import { mountSetup } from './ui/setup.js';
import { mountReview } from './ui/review.js';
import { mountPlayer } from './ui/player.js';
import { showUndoToast, dismissToast } from './ui/toast.js';
import { restoreFiles } from './state.js';

const app = document.getElementById('app');

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
