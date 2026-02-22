import './style.css';
import { Game } from './Game.js';
import { Leaderboard } from './Leaderboard.js';
import { Scribe } from './Scribe.js';

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game('game-canvas');
  const leaderboard = new Leaderboard();
  const scribe = new Scribe(game.dictionary, game.stats);

  // UI Elements
  const hud = document.getElementById('hud');
  const startMenu = document.getElementById('start-menu');
  const gameOverMenu = document.getElementById('game-over-menu');
  const leaderboardMenu = document.getElementById('leaderboard-menu');
  const practiceUi = document.getElementById('practice-ui');

  // Menu Stats
  const menuBestScore = document.getElementById('menu-best-score');
  const menuBestWpm = document.getElementById('menu-best-wpm');

  // Game Over Stats
  const goScore = document.getElementById('go-score');
  const goWords = document.getElementById('go-words');
  const goWpm = document.getElementById('go-wpm');
  const goAcc = document.getElementById('go-acc');

  // Highscore Forms
  const newHighscoreForm = document.getElementById('new-highscore-form');
  const playerNameInput = document.getElementById('player-name-input');
  const submitScoreBtn = document.getElementById('submit-score-btn');

  const scribeHighscoreForm = document.getElementById('scribe-highscore-form');
  const scribeNameInput = document.getElementById('scribe-name-input');
  const scribeSubmitBtn = document.getElementById('scribe-submit-btn');

  // Buttons
  const startBtn = document.getElementById('start-btn');
  const practiceBtn = document.getElementById('practice-btn');
  const practiceReturnBtn = document.getElementById('practice-return-btn');
  const practiceRetryBtn = document.getElementById('practice-retry-btn');
  const restartBtn = document.getElementById('restart-btn');
  const openLeaderboardBtn = document.getElementById('open-leaderboard-btn');
  const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');

  // Difficulty Select
  const difficultySelect = document.getElementById('difficulty-select');
  const leaderboardDifficultyFilter = document.getElementById('leaderboard-difficulty-filter');

  let pendingStats = null;
  let pendingScribeStats = null;

  function updateMenuStats() {
    menuBestScore.innerText = game.stats.bestScore;
    menuBestWpm.innerText = game.stats.bestWPM;
  }
  updateMenuStats();

  // ── Game Flow ─────────────────────────────────────────────────────────────

  function startGame() {
    startMenu.classList.remove('active');
    startMenu.classList.add('hidden');
    gameOverMenu.classList.remove('active');
    gameOverMenu.classList.add('hidden');
    leaderboardMenu.classList.remove('active');
    leaderboardMenu.classList.add('hidden');
    practiceUi.classList.remove('active');
    practiceUi.classList.add('hidden');

    hud.classList.remove('hidden');
    game.start(difficultySelect.value);
  }

  function startPractice() {
    startMenu.classList.remove('active');
    startMenu.classList.add('hidden');

    practiceUi.classList.remove('hidden');
    practiceUi.classList.add('active');

    scribeHighscoreForm.classList.add('hidden');
    practiceRetryBtn.classList.remove('hidden');
    practiceReturnBtn.classList.remove('hidden');

    practiceBtn.blur();
    practiceRetryBtn.blur();

    scribe.start();
  }

  function quitPractice() {
    scribe.stop();
    practiceUi.classList.remove('active');
    practiceUi.classList.add('hidden');
    startMenu.classList.remove('hidden');
    startMenu.classList.add('active');
  }

  // ── Game Over ─────────────────────────────────────────────────────────────

  game.onGameOver = async (finalStats) => {
    hud.classList.add('hidden');

    goScore.innerText = finalStats.score;
    goWords.innerText = finalStats.wordsTyped;
    goWpm.innerText = finalStats.getSessionWPM();
    goAcc.innerText = finalStats.getAccuracy() + '%';

    gameOverMenu.classList.remove('hidden');
    gameOverMenu.classList.add('active');
    updateMenuStats();

    // Check against global top 10 (async)
    const qualifies = await leaderboard.isTop10(
      game.difficulty,
      finalStats.score,
      finalStats.getSessionWPM(),
      finalStats.getAccuracy()
    );

    if (qualifies) {
      newHighscoreForm.classList.remove('hidden');
      restartBtn.classList.add('hidden');
      pendingStats = finalStats;
      playerNameInput.value = '';
      playerNameInput.focus();
    } else {
      newHighscoreForm.classList.add('hidden');
      restartBtn.classList.remove('hidden');
    }
  };

  // ── Submit Arcane Defense Score ───────────────────────────────────────────

  submitScoreBtn.addEventListener('click', async () => {
    if (!pendingStats) return;

    submitScoreBtn.disabled = true;
    submitScoreBtn.innerText = 'Sealing...';

    const name = playerNameInput.value.trim() || 'Anonymous Mage';
    await leaderboard.addScore(
      game.difficulty, name,
      pendingStats.score,
      pendingStats.getSessionWPM(),
      pendingStats.getAccuracy()
    );

    submitScoreBtn.disabled = false;
    submitScoreBtn.innerText = 'SEAL IN HISTORY';

    newHighscoreForm.classList.add('hidden');
    restartBtn.classList.remove('hidden');
    pendingStats = null;

    gameOverMenu.classList.remove('active');
    gameOverMenu.classList.add('hidden');
    openLeaderboard('score');
  });

  // ── Scribe Trial ──────────────────────────────────────────────────────────

  scribe.onTrialComplete = async (wpm, accuracy) => {
    const scribeScore = Math.floor(wpm * (accuracy / 100));

    const qualifies = await leaderboard.isTop10('scribe', scribeScore, wpm, accuracy);

    if (qualifies) {
      scribeHighscoreForm.classList.remove('hidden');
      practiceRetryBtn.classList.add('hidden');
      practiceReturnBtn.classList.add('hidden');
      pendingScribeStats = { wpm, accuracy, score: scribeScore };
      scribeNameInput.value = '';
      scribeNameInput.focus();
    } else {
      scribeHighscoreForm.classList.add('hidden');
      practiceRetryBtn.classList.remove('hidden');
      practiceReturnBtn.classList.remove('hidden');
    }
  };

  scribeSubmitBtn.addEventListener('click', async () => {
    if (!pendingScribeStats) return;

    scribeSubmitBtn.disabled = true;
    scribeSubmitBtn.innerText = 'Sealing...';

    const name = scribeNameInput.value.trim() || 'Anonymous Scribe';
    await leaderboard.addScore(
      'scribe', name,
      pendingScribeStats.score,
      pendingScribeStats.wpm,
      pendingScribeStats.accuracy
    );

    scribeSubmitBtn.disabled = false;
    scribeSubmitBtn.innerText = 'SEAL IN HISTORY';

    scribeHighscoreForm.classList.add('hidden');
    practiceRetryBtn.classList.remove('hidden');
    practiceReturnBtn.classList.remove('hidden');
    pendingScribeStats = null;

    quitPractice();
    openLeaderboard('wpm', 'scribe');
  });

  // ── Leaderboard ───────────────────────────────────────────────────────────

  function openLeaderboard(category = 'score', forceDifficulty = null) {
    startMenu.classList.remove('active');
    startMenu.classList.add('hidden');
    leaderboardMenu.classList.remove('hidden');
    leaderboardMenu.classList.add('active');

    if (forceDifficulty) {
      leaderboardDifficultyFilter.value = forceDifficulty;
    } else if (game.difficulty && leaderboardDifficultyFilter.value !== 'scribe') {
      leaderboardDifficultyFilter.value = game.difficulty;
    }

    renderLeaderboard(category);
  }

  async function renderLeaderboard(category) {
    // Update active tab
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });

    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding: 1rem;">Loading Hall of Fame...</td></tr>';

    const difficulty = leaderboardDifficultyFilter.value;
    const scores = await leaderboard.getTopScores(difficulty, category);

    tbody.innerHTML = '';

    if (!scores || scores.length === 0) {
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

  // ── Event Listeners ───────────────────────────────────────────────────────

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  practiceBtn.addEventListener('click', startPractice);
  practiceReturnBtn.addEventListener('click', quitPractice);
  practiceRetryBtn.addEventListener('click', startPractice);
  openLeaderboardBtn.addEventListener('click', () => openLeaderboard('score'));
  closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardMenu.classList.remove('active');
    leaderboardMenu.classList.add('hidden');
    startMenu.classList.remove('hidden');
    startMenu.classList.add('active');
  });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => renderLeaderboard(e.target.dataset.category));
  });

  leaderboardDifficultyFilter.addEventListener('change', () => {
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) renderLeaderboard(activeTab.dataset.category);
  });

  window.addEventListener('keydown', (e) => {
    if (scribe.isRunning) {
      scribe.handleKeyDown(e);
      if (e.key === ' ') e.preventDefault();
    }
    if (e.key === 'Escape' && scribe.isRunning) {
      quitPractice();
    }
  });
});
