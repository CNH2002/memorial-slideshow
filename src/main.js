import { mountSetup } from './ui/setup.js';
import { mountReview } from './ui/review.js';
import { mountPlayer } from './ui/player.js';

const app = document.getElementById('app');

function showSetup() {
  mountSetup(app, { onPlay: showPlayer, onReview: showReview });
}

function showReview() {
  mountReview(app, { onDone: showSetup });
}

function showPlayer() {
  mountPlayer(app, { onExit: showSetup });
}

showSetup();
