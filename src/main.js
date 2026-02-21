import './style.css';
import { Game } from './Game.js';

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game('game-canvas');

  // UI Elements
  const hud = document.getElementById('hud');
  const startMenu = document.getElementById('start-menu');
  const gameOverMenu = document.getElementById('game-over-menu');

  // Menu Stats
  const menuBestScore = document.getElementById('menu-best-score');
  const menuBestWpm = document.getElementById('menu-best-wpm');

  // Game Over Stats
  const goScore = document.getElementById('go-score');
  const goWpm = document.getElementById('go-wpm');
  const goAcc = document.getElementById('go-acc');

  // Buttons
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');

  // Initialize Menu with local stats
  function updateMenuStats() {
    menuBestScore.innerText = game.stats.bestScore;
    menuBestWpm.innerText = game.stats.bestWPM;
  }

  updateMenuStats();

  // Start Game Flow
  function startGame() {
    startMenu.classList.remove('active');
    startMenu.classList.add('hidden');

    gameOverMenu.classList.remove('active');
    gameOverMenu.classList.add('hidden');

    hud.classList.remove('hidden');

    game.start();
  }

  // Handle Game Over internally from Game.js
  game.onGameOver = (finalStats) => {
    hud.classList.add('hidden');

    // Update game over screen stats
    goScore.innerText = finalStats.score;
    goWpm.innerText = finalStats.getWPM();
    goAcc.innerText = finalStats.getAccuracy() + '%';

    gameOverMenu.classList.remove('hidden');
    gameOverMenu.classList.add('active');

    updateMenuStats(); // Update for next time we show menu
  };

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
});
