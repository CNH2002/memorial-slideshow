import { mountSetup } from './ui/setup.js';
import { mountReview } from './ui/review.js';
import { mountPlayer } from './ui/player.js';

const app = document.getElementById('app');

function showSetup(removedCount = 0) {
  mountSetup(app, { onPlay: showPlayer, onReview: showReview, removedCount });
}

function showReview() {
  mountReview(app, { onDone: (removed) => showSetup(removed) });
}



function showPlayer() {
  mountPlayer(app, { onExit: showSetup });
}

showSetup();
