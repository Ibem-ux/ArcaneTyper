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

  // Scribe mode controls
  const scribeModeSelect = document.getElementById('scribe-mode-select');
  const scribeDurationSelect = document.getElementById('scribe-duration-select');
  const scribeTimerContainer = document.getElementById('scribe-timer-container');

  // Difficulty Select
  const difficultySelect = document.getElementById('difficulty-select');
  const leaderboardDifficultyFilter = document.getElementById('leaderboard-difficulty-filter');

  // WPM Graph
  const wpmGraphCanvas = document.getElementById('wpm-graph-canvas');

  let pendingStats = null;
  let pendingScribeStats = null;

  function updateMenuStats() {
    menuBestScore.innerText = game.stats.bestScore;
    menuBestWpm.innerText = game.stats.bestWPM;
  }
  updateMenuStats();

  // ── Scribe mode selector ───────────────────────────────────────────────────

  function applyModeUI() {
    const isTimed = scribeModeSelect.value === 'timed';
    scribeDurationSelect.classList.toggle('hidden', !isTimed);
    scribeTimerContainer.classList.toggle('hidden', !isTimed);
    // Sync the initial timer label to the selected duration
    const timerDisplay = document.getElementById('scribe-timer-display');
    if (timerDisplay) timerDisplay.textContent = scribeDurationSelect.value;
  }
  applyModeUI(); // Set correct initial state

  scribeModeSelect.addEventListener('change', () => {
    applyModeUI();
    // Restart if practice is already active
    if (scribe.isRunning) startPractice();
  });

  scribeDurationSelect.addEventListener('change', () => {
    const timerDisplay = document.getElementById('scribe-timer-display');
    if (timerDisplay) timerDisplay.textContent = scribeDurationSelect.value;
    // Restart if practice is already active
    if (scribe.isRunning) startPractice();
  });

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

    const mode = scribeModeSelect.value;
    const duration = parseInt(scribeDurationSelect.value, 10);

    // Show/hide timer
    const isTimed = mode === 'timed';
    scribeTimerContainer.classList.toggle('hidden', !isTimed);

    scribe.start(mode, duration);
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

  scribe.onTrialComplete = async (wpm, rawWpm, accuracy, consistency, wpmSamples) => {
    // Update accuracy display (already has % in the span)
    const resAcc = document.getElementById('practice-res-acc');
    const resConsistency = document.getElementById('practice-res-consistency');
    if (resAcc) resAcc.innerText = accuracy + '%';
    if (resConsistency) resConsistency.innerText = consistency + '%';

    // Draw WPM graph
    drawWpmGraph(wpmSamples);

    const scribeScore = Math.floor(wpm * (accuracy / 100));

    const qualifies = await leaderboard.isTop10('scribe', scribeScore, wpm, accuracy);

    if (qualifies) {
      scribeHighscoreForm.classList.remove('hidden');
      practiceRetryBtn.classList.add('hidden');
      practiceReturnBtn.classList.add('hidden');
      pendingScribeStats = { wpm, rawWpm, accuracy, consistency, score: scribeScore };
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

  // ── WPM Graph ─────────────────────────────────────────────────────────────

  function drawWpmGraph(samples) {
    if (!wpmGraphCanvas) return;
    const ctx = wpmGraphCanvas.getContext('2d');
    const W = wpmGraphCanvas.width;
    const H = wpmGraphCanvas.height;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = 'rgba(15,10,20,0.9)';
    ctx.fillRect(0, 0, W, H);

    if (!samples || samples.length < 2) {
      ctx.fillStyle = 'rgba(184,146,176,0.4)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Not enough data', W / 2, H / 2);
      return;
    }

    const pad = { top: 12, right: 12, bottom: 22, left: 36 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    const maxWpm = Math.max(...samples, 10);
    const minWpm = Math.max(0, Math.min(...samples) - 5);

    const xStep = chartW / (samples.length - 1);
    const toX = (i) => pad.left + i * xStep;
    const toY = (v) => pad.top + chartH - ((v - minWpm) / (maxWpm - minWpm || 1)) * chartH;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = pad.top + (g / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();

      const label = Math.round(maxWpm - (g / 4) * (maxWpm - minWpm));
      ctx.fillStyle = 'rgba(184,146,176,0.6)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(label, pad.left - 4, y + 3);
    }

    // X-axis: time labels
    ctx.fillStyle = 'rgba(184,146,176,0.5)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    const labelEvery = Math.ceil(samples.length / 6);
    samples.forEach((_, i) => {
      if (i % labelEvery === 0 || i === samples.length - 1) {
        ctx.fillText(`${i + 1}s`, toX(i), H - 4);
      }
    });

    // Gradient fill under the line
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    grad.addColorStop(0, 'rgba(255,215,0,0.25)');
    grad.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(samples[0]));
    samples.forEach((v, i) => ctx.lineTo(toX(i), toY(v)));
    ctx.lineTo(toX(samples.length - 1), pad.top + chartH);
    ctx.lineTo(toX(0), pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Gold line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(samples[0]));
    samples.forEach((v, i) => ctx.lineTo(toX(i), toY(v)));
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255,215,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dots at each data point
    ctx.fillStyle = '#ffd700';
    samples.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(toX(i), toY(v), 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

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
