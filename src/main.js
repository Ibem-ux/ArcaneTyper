import './style.css';
import { Game } from './Game.js';
import { Leaderboard } from './Leaderboard.js';

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game('game-canvas');
  const leaderboard = new Leaderboard();

  // UI Elements
  const hud = document.getElementById('hud');
  const startMenu = document.getElementById('start-menu');
  const gameOverMenu = document.getElementById('game-over-menu');
  const leaderboardMenu = document.getElementById('leaderboard-menu');

  // Menu Stats
  const menuBestScore = document.getElementById('menu-best-score');
  const menuBestWpm = document.getElementById('menu-best-wpm');

  // Game Over Stats
  const goScore = document.getElementById('go-score');
  const goWpm = document.getElementById('go-wpm');
  const goAcc = document.getElementById('go-acc');

  // Highscore Form
  const newHighscoreForm = document.getElementById('new-highscore-form');
  const playerNameInput = document.getElementById('player-name-input');
  const submitScoreBtn = document.getElementById('submit-score-btn');

  // Buttons
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const openLeaderboardBtn = document.getElementById('open-leaderboard-btn');
  const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');

  // Difficulty Select
  const difficultySelect = document.getElementById('difficulty-select');
  const leaderboardDifficultyFilter = document.getElementById('leaderboard-difficulty-filter');

  let pendingStats = null; // Store stats if they get a high score

  // Initialize Menu with local stats (from previous simple logic)
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
    leaderboardMenu.classList.remove('active');
    leaderboardMenu.classList.add('hidden');

    hud.classList.remove('hidden');

    const selectedDifficulty = difficultySelect.value;
    game.start(selectedDifficulty);
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
    updateMenuStats();

    // Check High Score
    if (leaderboard.isTop10(game.difficulty, finalStats.score, finalStats.getWPM(), finalStats.getAccuracy())) {
      newHighscoreForm.classList.remove('hidden');
      restartBtn.classList.add('hidden');
      pendingStats = finalStats;
      playerNameInput.value = "";
      playerNameInput.focus();
    } else {
      newHighscoreForm.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  };

  // Submit High Score
  submitScoreBtn.addEventListener('click', () => {
    if (!pendingStats) return;
    const name = playerNameInput.value.trim() || 'Anonymous Mage';
    leaderboard.addScore(game.difficulty, name, pendingStats.score, pendingStats.getWPM(), pendingStats.getAccuracy());

    // Hide form, show restart button
    newHighscoreForm.classList.add('hidden');
    restartBtn.classList.remove('hidden');
    pendingStats = null;

    // Automatically open leaderboard
    gameOverMenu.classList.remove('active');
    gameOverMenu.classList.add('hidden');
    openLeaderboard('score');
  });

  // Leaderboard Logic
  function openLeaderboard(category = 'score') {
    startMenu.classList.remove('active');
    startMenu.classList.add('hidden');
    leaderboardMenu.classList.remove('hidden');
    leaderboardMenu.classList.add('active');

    // Default the specific difficulty to whatever they played last
    if (game.difficulty) {
      leaderboardDifficultyFilter.value = game.difficulty;
    }

    renderLeaderboard(category);
  }

  function renderLeaderboard(category) {
    // Update active tab
    tabBtns.forEach(btn => {
      if (btn.dataset.category === category) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';
    const difficulty = leaderboardDifficultyFilter.value;
    const scores = leaderboard.getTopScores(difficulty, category);

    if (scores.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">The Hall of Fame is empty. Create your legacy!</td></tr>';
      return;
    }

    scores.forEach((entry, index) => {
      const tr = document.createElement('tr');
      const rankClass = index === 0 ? 'top-rank' : '';
      tr.innerHTML = `
        <td class="rank-text ${rankClass}">#${index + 1}</td>
        <td class="${rankClass}">${entry.name}</td>
        <td>${entry.score}</td>
        <td>${entry.wpm}</td>
        <td>${entry.accuracy}%</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Event Listeners
  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  openLeaderboardBtn.addEventListener('click', () => openLeaderboard('score'));
  closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardMenu.classList.remove('active');
    leaderboardMenu.classList.add('hidden');
    startMenu.classList.remove('hidden');
    startMenu.classList.add('active');
  });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      renderLeaderboard(e.target.dataset.category);
    });
  });

  leaderboardDifficultyFilter.addEventListener('change', () => {
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) {
      renderLeaderboard(activeTab.dataset.category);
    }
  });
});
