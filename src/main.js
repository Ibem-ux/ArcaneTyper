import './style.css';
import { Game } from './Game.js';
import { Leaderboard } from './Leaderboard.js';
import { Scribe } from './Scribe.js';
import { Duel } from './Duel.js';
import { MagicalToast } from './ui/MagicalToast.js';
import { ProfileUI } from './ui/ProfileUI.js';
import { AuthUI } from './ui/AuthUI.js';
import { MenuUI } from './ui/MenuUI.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Ultra-strict font preloader for Canvas
  // This physically forces the browser to download and parse the font before
  // any Javascript rendering logic continues.
  try {
    const cinzelFont = new FontFace('Cinzel', 'url(https://fonts.gstatic.com/s/cinzel/v19/8vIJ7ww63mVu7gtzRzj2-Bs.woff2)');
    await cinzelFont.load();
    document.fonts.add(cinzelFont);
  } catch (e) {
    console.warn("Manual font preload failed, relying on CSS fallback. Error:", e);
  }
  await document.fonts.ready;

  const game = new Game('game-canvas');
  const leaderboard = new Leaderboard();
  const scribe = new Scribe(game.dictionary, game.stats);

  MagicalToast.init();
  const profileUI = new ProfileUI(game);
  const authUI = new AuthUI(game, document.getElementById('start-menu'), document.getElementById('profile-menu'));
  const menuUI = new MenuUI(game, document.getElementById('start-menu'));

  menuUI.init();

  // UI Elements
  const hud = document.getElementById('hud');
  const startMenu = document.getElementById('start-menu');
  const gameOverMenu = document.getElementById('game-over-menu');
  const leaderboardMenu = document.getElementById('leaderboard-menu');
  const practiceUi = document.getElementById('practice-ui');
  const workshopMenu = document.getElementById('workshop-menu');
  const achievementsMenu = document.getElementById('achievements-menu');

  const menuMageTitle = document.getElementById('menu-mage-title');
  const openAchievementsBtn = document.getElementById('open-achievements-icon-btn');
  const closeAchievementsBtn = document.getElementById('close-achievements-btn');
  const achievementsList = document.getElementById('achievements-list');

  // Duel UI
  const duelLobbyMenu = document.getElementById('duel-lobby-menu');
  const duelLobbyIdlePanel = document.getElementById('duel-lobby-idle');
  const duelLobbyWaitingPanel = document.getElementById('duel-lobby-waiting');
  const duelHud = document.getElementById('duel-hud');
  const duelResultMenu = document.getElementById('duel-result-menu');
  const duelRoomInput = document.getElementById('duel-room-input');
  const duelRoomCodeDisplay = document.getElementById('duel-room-code-display');
  const duelLobbyError = document.getElementById('duel-lobby-error');
  const duelOppName = document.getElementById('duel-opp-name');
  const duelOppScore = document.getElementById('duel-opp-score');
  const duelOppWpm = document.getElementById('duel-opp-wpm');
  const duelOppBarriers = document.getElementById('duel-opp-barriers');
  const duelTimerDisplay = document.getElementById('duel-timer-display');
  const duelResultTitle = document.getElementById('duel-result-title');
  const duelResultSubtitle = document.getElementById('duel-result-subtitle');
  const duelResMyScore = document.getElementById('duel-res-my-score');
  const duelResOppScore = document.getElementById('duel-res-opp-score');

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
  const returnDashboardBtn = document.getElementById('return-dashboard-btn');
  const forfeitBtn = document.getElementById('forfeit-btn');
  const openLeaderboardBtn = document.getElementById('open-leaderboard-btn');
  const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
  const workshopBtn = document.getElementById('workshop-btn');
  const closeWorkshopBtn = document.getElementById('close-workshop-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');

  // Workshop Elements
  const workshopXp = document.getElementById('workshop-xp');
  const workshopLevel = document.getElementById('workshop-level');
  const skillNodes = document.querySelectorAll('.skill-node');
  const wandBtns = document.querySelectorAll('.wand-style-btn');

  // Scribe mode controls
  const scribeModeSelect = document.getElementById('scribe-mode-select');
  const scribeDurationSelect = document.getElementById('scribe-duration-select');
  const scribeTimerContainer = document.getElementById('scribe-timer-container');

  // Difficulty & Mode Select
  const difficultySelect = document.getElementById('difficulty-select');
  const modeSelect = document.getElementById('mode-select');
  const dictionarySelect = document.getElementById('dictionary-select');
  const leaderboardDifficultyFilter = document.getElementById('leaderboard-difficulty-filter');

  // WPM Graph
  const wpmGraphCanvas = document.getElementById('wpm-graph-canvas');

  // Mobile Support
  const mobileInput = document.getElementById('mobile-input');
  const mobileNovaBtn = document.getElementById('mobile-nova-btn');

  let pendingStats = null;
  let pendingScribeStats = null;

  // Duel State
  let duel = null;
  let duelBroadcastInterval = null;
  let duelTimerInterval = null;
  let duelSecondsLeft = 90;
  let duelActive = false;

  // Global State
  let isGuest = false;

  authUI.init(() => {
    profileUI.updateMenuStats();
  });

  // ========== ACHIEVEMENTS SYSTEM ==========
  const initTitle = localStorage.getItem('typerMaster_equippedTitle') || 'Apprentice';
  if (menuMageTitle) menuMageTitle.innerText = initTitle;

  openAchievementsBtn.addEventListener('click', () => {
    startMenu.classList.remove('active');
    startMenu.classList.add('hidden');
    achievementsMenu.classList.remove('hidden');
    populateAchievements();
    setTimeout(() => achievementsMenu.classList.add('active'), 10);
  });

  closeAchievementsBtn.addEventListener('click', () => {
    achievementsMenu.classList.remove('active');
    achievementsMenu.classList.add('hidden');
    startMenu.classList.remove('hidden');
    startMenu.classList.add('active');
  });

  function populateAchievements() {
    if (!achievementsList) return;
    achievementsList.innerHTML = '';
    const allDefs = game.achievements.definitions;
    const unlocked = game.achievements.unlocked;
    const equippedTitle = localStorage.getItem('typerMaster_equippedTitle') || null;

    if (equippedTitle && menuMageTitle) {
      menuMageTitle.innerText = equippedTitle;
    }

    for (const id in allDefs) {
      const def = allDefs[id];
      const isUnlocked = unlocked.has(id);
      const isEquipped = equippedTitle === def.title;

      const card = document.createElement('div');
      card.style.background = isUnlocked ? 'linear-gradient(135deg, rgba(20,10,40,0.8), rgba(40,20,60,0.9))' : 'rgba(10,5,20,0.8)';
      card.style.border = isUnlocked ? '1px solid #f9a825' : '1px solid #333';
      card.style.borderRadius = '8px';
      card.style.padding = '15px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '8px';

      card.innerHTML = `
          <h3 style="color: ${isUnlocked ? '#f9a825' : '#666'}; margin: 0; font-family: Cinzel, serif; letter-spacing: 1px;">${isUnlocked ? def.name : '???'}</h3>
          <p style="color: ${isUnlocked ? '#ccc' : '#444'}; font-size: 0.85rem; margin: 0; line-height: 1.4;">${isUnlocked ? def.description : 'Locked Achievement'}</p>
          ${isUnlocked ? `<div style="margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255,215,0,0.2);"><p style="color: #b892b0; font-size: 0.8rem; margin: 0;">Unlocks Title: <span style="color: #fff; font-weight: bold;">${def.title}</span></p></div>` : ''}
      `;

      if (isUnlocked) {
        const equipBtn = document.createElement('button');
        equipBtn.className = 'primary-btn';
        equipBtn.style.padding = '5px 10px';
        equipBtn.style.fontSize = '0.8rem';
        equipBtn.style.width = '100%';
        equipBtn.style.marginTop = '10px';
        equipBtn.innerText = isEquipped ? 'EQUIPPED' : 'EQUIP TITLE';
        if (isEquipped) {
          equipBtn.style.background = 'rgba(76, 175, 80, 0.2)';
          equipBtn.style.border = '1px solid #4CAF50';
          equipBtn.style.color = '#4CAF50';
        } else {
          equipBtn.style.background = 'linear-gradient(45deg, #1b0a2a, #3a155c)';
          equipBtn.style.border = '1px solid #d500f9';
        }
        equipBtn.onclick = () => {
          localStorage.setItem('typerMaster_equippedTitle', def.title);
          populateAchievements(); // re-render list to update buttons
        };
        card.appendChild(equipBtn);
      }

      achievementsList.appendChild(card);
    }
  }

  // Hook into in-game toasts
  game.achievements.onUnlockCallback = (def) => {
    MagicalToast.show(`🏆 <b>Achievement Unlocked</b><br><span style="color: #f9a825;">${def.name}</span><br><span style="font-size: 0.8rem; color: var(--text-muted);">${def.title}</span>`, 4000);
  };

  profileUI.updateMenuStats();

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

    const modeSelectElement = document.getElementById('mode-select');
    const selectedMode = modeSelectElement ? modeSelectElement.value : 'classic';

    const dictionarySelectElement = document.getElementById('dictionary-select');
    const selectedDictionary = dictionarySelectElement ? dictionarySelectElement.value : 'classic';

    game.start(difficultySelect.value, selectedMode, selectedDictionary);

    // Focus invisible input to trigger mobile keyboard
    mobileInput.value = '';
    mobileInput.focus();
  }

  function startPractice(skipFocus = false) {
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

    // Show/hide timer element and the associated duration dropdown
    const isTimed = mode === 'timed';
    scribeTimerContainer.classList.toggle('hidden', !isTimed);
    scribeDurationSelect.classList.toggle('hidden', !isTimed);

    scribe.start(mode, duration);

    // Focus invisible input to trigger mobile keyboard, 
    // but skip it if we're just refreshing settings via dropdown
    if (!skipFocus && typeof skipFocus !== 'object') {
      mobileInput.value = '';
      mobileInput.focus();
    }
  }

  function quitPractice() {
    scribe.stop();
    game.stop();
    game.reset(); // Clear underlying canvas elements

    // Clear the physical canvas frame to remove static drawings
    const ctx = game.canvas.getContext('2d');
    ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);

    practiceUi.classList.remove('active');
    practiceUi.classList.add('hidden');
    document.getElementById('practice-results').classList.add('hidden');
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

    // Bypassing prompt: auto submit if they have a profile
    if (qualifies && game.stats.mageName) {
      await leaderboard.addScore(
        game.difficulty, // Daily uses 'normal' effectively
        game.stats.mageName,
        finalStats.score,
        finalStats.getSessionWPM(),
        finalStats.getAccuracy()
      );
    }

    if (game.gameMode === 'daily') {
      const todayStr = new Date().toISOString().split('T')[0];
      const lastCompleted = localStorage.getItem('typerMaster_dailyCompleted');
      if (lastCompleted !== todayStr) {
        localStorage.setItem('typerMaster_dailyCompleted', todayStr);
        game.stats.addXP(500); // Generous daily reward!
        if (typeof showMagicalToast === 'function') {
          showMagicalToast("🌟 Daily Challenge Complete! +500 XP Awarded 🌟", 5000);
        }
      } else {
        if (typeof showMagicalToast === 'function') {
          showMagicalToast("Daily Challenge Replayed. (Rewards already claimed today)", 3000);
        }
      }
    }

    restartBtn.classList.remove('hidden');
  };

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

    // Auto submit to leaderboard since we have a mage name
    if (qualifies && game.stats.mageName) {
      await leaderboard.addScore('scribe', game.stats.mageName, scribeScore, wpm, accuracy);
    }

    scribeHighscoreForm.classList.add('hidden');
    practiceRetryBtn.classList.remove('hidden');
    practiceReturnBtn.classList.remove('hidden');
  };

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
  if (returnDashboardBtn) {
    returnDashboardBtn.addEventListener('click', () => {
      game.stop();
      game.reset();
      const ctx = game.canvas.getContext('2d');
      ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);

      gameOverMenu.classList.add('hidden');
      gameOverMenu.classList.remove('active');
      startMenu.classList.remove('hidden');
      startMenu.classList.add('active');
    });
  }
  practiceBtn.addEventListener('click', () => startPractice());
  practiceReturnBtn.addEventListener('click', quitPractice);
  practiceRetryBtn.addEventListener('click', () => startPractice());

  scribeModeSelect.addEventListener('change', () => {
    // Dynamically toggle the UI elements without completely restarting until they start typing
    const isTimed = scribeModeSelect.value === 'timed';
    scribeTimerContainer.classList.toggle('hidden', !isTimed);
    scribeDurationSelect.classList.toggle('hidden', !isTimed);

    // Only restart the trial if we're actively viewing the menu
    if (practiceUi.classList.contains('active')) {
      startPractice(true);
    }
  });

  scribeDurationSelect.addEventListener('change', () => {
    if (practiceUi.classList.contains('active')) {
      startPractice(true);
    }
  });

  // ── Mage Class Selection ──────────────────────────────────────────────────

  if (mageClassSelect && game.stats.mageClass) {
    mageClassSelect.value = game.stats.mageClass;
  }

  mageClassSelect.addEventListener('change', (e) => {
    game.stats.setMageClass(e.target.value);
  });

  forfeitBtn.addEventListener('click', () => {
    // Instantly drain lives and trigger game over logic
    game.stats.lives = 0;
    game.triggerGameOver();
  });
  openLeaderboardBtn.addEventListener('click', () => openLeaderboard('score'));
  closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardMenu.classList.remove('active');
    leaderboardMenu.classList.add('hidden');
    startMenu.classList.remove('hidden');
    startMenu.classList.add('active');

    startMenu.style.pointerEvents = 'auto';
    startMenu.style.opacity = '';
    startMenu.style.filter = '';
  });

  // Profile Listeners
  const backgroundMage = document.getElementById('background-mage');

  let profileChartInstance = null;
  function renderProfileChart(runs) {
    const ctx = document.getElementById('profile-history-chart').getContext('2d');
    if (profileChartInstance) {
      profileChartInstance.destroy();
    }

    const labels = runs.map((run, index) => `#${index + 1}`);
    const dataStr = runs.map(run => run.wpm);

    profileChartInstance = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'WPM',
          data: dataStr,
          borderColor: '#29b6f6',
          backgroundColor: 'rgba(41, 182, 246, 0.2)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#ffd700'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
          x: { grid: { color: 'rgba(255, 255, 255, 0.1)' } }
        }
      }
    });
  }

  const openProfileHandler = async () => {
    startMenu.classList.remove('active');
    startMenu.classList.add('hidden');

    // Populate stats
    profileNickname.innerText = game.stats.mageName || 'Unknown Mage';

    // Try to get username and class from Supabase session
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // First try to use the stored true_name metadata
        if (session.user.user_metadata && session.user.user_metadata.true_name) {
          profileUsernameUI.innerText = session.user.user_metadata.true_name;
        } else if (session.user.email) {
          // Fallback to legacy email parsing if true_name metadata is missing
          profileUsernameUI.innerText = session.user.email.split('@')[0];
        }

        if (session.user.user_metadata && session.user.user_metadata.discipline) {
          mageClassSelect.value = session.user.user_metadata.discipline;
        } else {
          mageClassSelect.value = 'Novice'; // Default
        }

        // Fetch Run History for Graph
        const { data: runs } = await supabase
          .from('run_history')
          .select('wpm, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (runs && runs.length > 0) {
          renderProfileChart(runs.reverse());
        }
      }
    } else {
      profileUsernameUI.innerText = 'Local Profile';
      profileClassUI.innerText = 'The Scholar (Balanced)';
    }

    profileMenu.classList.remove('hidden');
    profileMenu.classList.add('active');
  };

  if (backgroundMage) {
    backgroundMage.addEventListener('click', openProfileHandler);
  }

  closeProfileBtn.addEventListener('click', () => {
    profileMenu.classList.remove('active');
    profileMenu.classList.add('hidden');
    startMenu.classList.remove('hidden');
    startMenu.classList.add('active');

    // Safety check: ensure main menu isn't blurred or locked
    startMenu.style.pointerEvents = 'auto';
    startMenu.style.opacity = '';
    startMenu.style.filter = '';
  });

  logoutBtn.addEventListener('click', async () => {
    if (supabase && !isGuest) {
      await supabase.auth.signOut();
    }
    // Clear local profile reference so they are prompted to login again
    game.stats.mageName = "";
    localStorage.removeItem('typerMaster_mageName'); // Explicitly wipe — saveProgression only writes if truthy
    game.stats.saveProgression();

    // Reset guest status
    isGuest = false;

    profileMenu.classList.remove('active');
    profileMenu.classList.add('hidden');

    // reset to login mode visually
    isLoginMode = true;
    ccTitle.innerText = "MAGE RECOGNITION";
    ccSubtitle.innerText = "Speak your Owl Delivery and Incantation.";
    ccClassContainer.style.display = 'none';
    ccNicknameContainer.style.display = 'none';
    if (ccEmailContainer) ccEmailContainer.style.display = 'none';
    if (ccUsernameLabel) ccUsernameLabel.innerText = "Owl Delivery (Email Address):";
    ccUsername.placeholder = "e.g. mage@library.com";
    ccCreateBtn.innerText = "ENTER LIBRARY";
    ccToggleMode.innerText = "I need to register a new Mage Card.";
    ccUsername.value = '';
    ccName.value = '';
    if (ccEmail) ccEmail.value = '';

    if (ccPassword) {
      ccPassword.value = '';
      ccPassword.type = 'password';
    }
    if (togglePasswordBtn) {
      togglePasswordBtn.classList.remove('revealed');
      togglePasswordBtn.title = "Dispel Illusion (Reveal Password)";
    }
    if (ccErrorMsg) ccErrorMsg.innerText = '';

    showCharacterCreation();
  });


  // Workshop Listeners
  workshopBtn.addEventListener('click', () => {
    if (isGuest) {
      showMagicalToast("The Workshop requires a sealed Mage Card!<br><span style='font-size: 0.8em; color: var(--text-muted);'>Please log in or register to unlock upgrades.</span>");
      return;
    }
    startMenu.classList.remove('active');
    startMenu.classList.add('hidden');
    workshopMenu.classList.remove('hidden');
    workshopMenu.classList.add('active');
    updateWorkshopUI();
  });

  closeWorkshopBtn.addEventListener('click', () => {
    workshopMenu.classList.remove('active');
    workshopMenu.classList.add('hidden');
    startMenu.classList.remove('hidden');
    startMenu.classList.add('active');

    startMenu.style.pointerEvents = 'auto';
    startMenu.style.opacity = '';
    startMenu.style.filter = '';
  });

  // ── Mage Duels ─────────────────────────────────────────────────────────────

  function openDuelLobby() {
    startMenu.style.pointerEvents = 'none';
    startMenu.style.opacity = '0.5';
    startMenu.style.filter = 'blur(4px)';

    // Using a setTimeout allows display: flex to apply before we trigger the CSS transition
    setTimeout(() => {
      duelLobbyMenu.classList.add('active');
    }, 10);

    duelLobbyIdlePanel.style.display = 'flex';
    duelLobbyWaitingPanel.style.display = 'none';
    duelLobbyError.innerText = '';
  }

  // Duel button on Start Menu
  const duelMageSilhouette = document.getElementById('duel-mage');
  if (duelMageSilhouette) {
    duelMageSilhouette.addEventListener('click', () => {
      if (isGuest) {
        showMagicalToast("The Arena requires a sealed Mage Card!<br><span style='font-size: 0.8em; color: var(--text-muted);'>Please log in or register to duel other mages.</span>");
        return;
      }
      if (!supabase) {
        showMagicalToast("The Arena requires a Supabase connection.<br><span style='font-size: 0.8em; color: var(--text-muted);'>Please configure your environment variables.</span>");
        return;
      }
      startMenu.classList.remove('active');
      startMenu.classList.add('hidden');
      duelLobbyMenu.classList.remove('hidden');
      openDuelLobby();
    });
  }
  function closeDuelLobby() {
    if (duel) { duel.disconnect(); duel = null; }
    startMenu.style.pointerEvents = 'auto';
    startMenu.style.opacity = '';
    startMenu.style.filter = '';

    duelLobbyMenu.classList.remove('active');
    duelLobbyMenu.classList.add('hidden');
    startMenu.classList.remove('hidden');
    startMenu.classList.add('active');
  }

  function startDuel(opponentName) {
    duelActive = true;
    duelSecondsLeft = 90;
    duelOpponentLastState = null;

    // Dimension shift immediately
    document.body.classList.add('duel-dimension');

    // Close lobby, hide library dashboard, show game HUD
    duelLobbyMenu.classList.remove('active');
    duelLobbyMenu.classList.add('hidden');
    startMenu.classList.remove('active');
    startMenu.classList.add('hidden');
    duelHud.classList.remove('hidden');
    duelOppName.innerText = opponentName;

    // Override game over: in duel mode, declare the local player lost
    game.onGameOver = () => endDuel(false);

    // Sync Sabotage Events
    game.onAttackCast = (type) => {
      if (duel) duel.broadcastAttack(type);

      const announcement = document.createElement('div');
      announcement.innerText = `CAST ${type.toUpperCase()} ON ${opponentName}!`;
      announcement.style.position = 'absolute';
      announcement.style.top = '30%';
      announcement.style.left = '50%';
      announcement.style.transform = 'translate(-50%, -50%)';
      announcement.style.color = '#ffd700';
      announcement.style.fontSize = '2rem';
      announcement.style.fontWeight = 'bold';
      announcement.style.textShadow = '0 0 10px #ffd700';
      announcement.style.pointerEvents = 'none';
      announcement.style.zIndex = '1000';
      announcement.style.animation = 'floatUpFade 2s forwards';
      document.getElementById('game-container').appendChild(announcement);
      setTimeout(() => announcement.remove(), 2000);
    };

    if (duel) {
      duel.onOpponentAttack = (type) => {
        game.receiveAttack(type);
      };
    }

    // 3.. 2.. 1.. FIGHT overlay
    const countdownOverlay = document.createElement('div');
    countdownOverlay.style.position = 'absolute';
    countdownOverlay.style.inset = '0';
    countdownOverlay.style.display = 'flex';
    countdownOverlay.style.alignItems = 'center';
    countdownOverlay.style.justifyContent = 'center';
    countdownOverlay.style.background = 'rgba(0,0,0,0.7)';
    countdownOverlay.style.zIndex = '2000';
    document.getElementById('game-container').appendChild(countdownOverlay);

    const countdownText = document.createElement('h1');
    countdownText.style.fontSize = '8rem';
    countdownText.style.color = '#fff';
    countdownText.style.textShadow = '0 0 30px #29b6f6';
    countdownOverlay.appendChild(countdownText);

    let count = 3;
    countdownText.innerText = count;

    const countInterval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownText.innerText = count;
      } else if (count === 0) {
        countdownText.innerText = 'FIGHT!';
        countdownText.style.color = '#ff4b4b';
        countdownText.style.textShadow = '0 0 40px #ff4b4b';
      } else {
        clearInterval(countInterval);
        countdownOverlay.remove();

        // --- START THE REAL MATCH HERE ---
        game.start(difficultySelect.value || 'normal');
        hud.classList.remove('hidden');

        // Broadcast loop: send local state every 500ms
        duelBroadcastInterval = setInterval(() => {
          if (!duelActive || !duel) return;
          duel.broadcast({
            score: game.stats.score,
            wpm: game.stats.getWPM(),
            barriers: game.stats.lives,
            status: 'alive'
          });
        }, 500);

        // Countdown timer
        updateDuelTimerDisplay();
        duelTimerInterval = setInterval(() => {
          duelSecondsLeft--;
          updateDuelTimerDisplay();
          if (duelSecondsLeft <= 0) {
            clearInterval(duelTimerInterval);
            // Time's up — whoever has the highest score wins
            const myScore = game.stats.score;
            const oppScore = duelOpponentLastState ? duelOpponentLastState.score : 0;
            endDuel(myScore >= oppScore);
          }
        }, 1000);
      }
    }, 1000);
  }

  function updateDuelTimerDisplay() {
    const m = Math.floor(duelSecondsLeft / 60);
    const s = duelSecondsLeft % 60;
    duelTimerDisplay.innerText = `${m}:${s.toString().padStart(2, '0')}`;
    duelTimerDisplay.style.color = duelSecondsLeft <= 15 ? '#ff4b4b' : '#29b6f6';
  }

  function endDuel(isWinner) {
    if (!duelActive) return;
    duelActive = false;

    clearInterval(duelBroadcastInterval);
    clearInterval(duelTimerInterval);

    // Stop underlying game if still running
    if (game.isRunning) game.stop();

    // Save highscore and XP — normally done by triggerGameOver, but duel
    // ends the game directly via stop(), so we must save manually here.
    game.stats.saveHighScore();

    // Broadcast defeat/victory to opponent
    if (duel) {
      duel.broadcast({ status: isWinner ? 'won' : 'dead', score: game.stats.score });
      duel.disconnect();
      duel = null;
    }

    // Hide game UI & revert dimensions
    document.body.classList.remove('duel-dimension');
    hud.classList.add('hidden');
    duelHud.classList.add('hidden');

    // Show result screen
    const oppScore = duelOpponentLastState ? duelOpponentLastState.score : 0;
    duelResMyScore.innerText = game.stats.score;
    duelResOppScore.innerText = oppScore;

    if (isWinner) {
      duelResultTitle.innerText = '⚔️ VICTORY!';
      duelResultTitle.style.color = '#ffd700';
      duelResultSubtitle.innerText = 'You have vanquished your foe!';
    } else {
      duelResultTitle.innerText = '💀 DEFEATED';
      duelResultTitle.style.color = '#ff4b4b';
      duelResultSubtitle.innerText = 'Your barriers have crumbled...';
    }

    duelResultMenu.classList.remove('hidden');
    duelResultMenu.classList.add('active');
  }

  // Duel button on Start Menu
  document.getElementById('duel-mage').addEventListener('click', () => {
    if (!supabase) {
      alert('Mage Duels require a Supabase connection. Please configure your environment variables.');
      return;
    }
    openDuelLobby();
  });

  // Close lobby
  document.getElementById('duel-lobby-close-btn').addEventListener('click', closeDuelLobby);

  // Create room
  document.getElementById('duel-create-btn').addEventListener('click', async () => {
    if (!game.stats.mageName) {
      duelLobbyError.innerText = 'You must be logged in to create a duel.';
      return;
    }
    duelLobbyError.innerText = '';
    duel = new Duel(supabase, game.stats.mageName);

    duel.onOpponentJoined = () => {
      // Read the opponent's display name from the presence payload
      const state = duel.channel.presenceState();
      const opponentPresenceKey = Object.keys(state).find(k => k !== duel.presenceKey);
      let opponentName = 'Unknown Mage';
      if (opponentPresenceKey) {
        const presences = state[opponentPresenceKey];
        opponentName = presences?.[0]?.player_name || 'Unknown Mage';
      }
      startDuel(opponentName);
    };

    duel.onOpponentUpdate = (state) => {
      const prevBarriers = duelOpponentLastState ? duelOpponentLastState.barriers : 4;
      duelOpponentLastState = state;
      duelOppScore.innerText = state.score ?? 0;
      duelOppWpm.innerText = state.wpm ?? 0;
      duelOppBarriers.innerText = state.barriers ?? '?';
      if (state.barriers < prevBarriers) {
        duelOppBarriers.style.animation = 'none';
        void duelOppBarriers.offsetWidth; // trigger reflow
        duelOppBarriers.style.animation = 'damageFlash 0.5s ease';
      }
      if (state.status === 'dead') endDuel(true);
    };

    duel.onOpponentLeft = () => {
      if (duelActive) endDuel(true); // If opponent disconnects mid-lobby, host wins
    };

    const code = await duel.create();
    duelRoomCodeDisplay.innerText = code;
    duelLobbyIdlePanel.style.display = 'none';
    duelLobbyWaitingPanel.style.display = 'flex';
  });

  // Join room
  document.getElementById('duel-join-btn').addEventListener('click', async () => {
    const code = duelRoomInput.value.trim().toUpperCase();
    if (code.length < 6) {
      duelLobbyError.innerText = 'Please enter a valid 6-character room code.';
      return;
    }
    if (!game.stats.mageName) {
      duelLobbyError.innerText = 'You must be logged in to join a duel.';
      return;
    }
    duelLobbyError.innerText = 'Joining room ' + code + '...';
    duel = new Duel(supabase, game.stats.mageName);

    duel.onOpponentUpdate = (state) => {
      const prevBarriers = duelOpponentLastState ? duelOpponentLastState.barriers : 4;
      duelOpponentLastState = state;
      duelOppScore.innerText = state.score ?? 0;
      duelOppWpm.innerText = state.wpm ?? 0;
      duelOppBarriers.innerText = state.barriers ?? '?';
      if (state.barriers < prevBarriers) {
        duelOppBarriers.style.animation = 'none';
        void duelOppBarriers.offsetWidth; // trigger reflow
        duelOppBarriers.style.animation = 'damageFlash 0.5s ease';
      }
      if (state.status === 'dead') endDuel(true);
    };

    duel.onOpponentLeft = () => {
      if (duelActive) endDuel(true); // If opponent disconnects, local player wins
    };

    const hostKey = await duel.join(code);
    duelLobbyError.innerText = '';

    startDuel(hostKey);
  });

  // Rematch — re-open lobby
  document.getElementById('duel-rematch-btn').addEventListener('click', () => {
    game.stop();
    game.reset();

    const ctx = game.canvas.getContext('2d');
    ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);

    duelResultMenu.classList.remove('active');
    duelResultMenu.classList.add('hidden');
    openDuelLobby();
  });

  // Return to Library from result screen
  document.getElementById('duel-result-close-btn').addEventListener('click', () => {
    game.stop();
    game.reset(); // Clear underlying canvas elements

    // Clear the physical canvas frame to remove static drawings
    const ctx = game.canvas.getContext('2d');
    ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);

    duelResultMenu.classList.remove('active');
    duelResultMenu.classList.add('hidden');
    startMenu.classList.remove('hidden');
    startMenu.classList.add('active');

    // Remove the lobby blur effects from the main menu
    startMenu.style.pointerEvents = 'auto';
    startMenu.style.opacity = '1';
    startMenu.style.filter = 'none';

    updateMenuStats();
  });

  function updateWorkshopUI() {
    workshopXp.innerText = game.stats.totalXP;
    workshopLevel.innerText = game.stats.playerLevel;

    // Update skills
    skillNodes.forEach(node => {
      const skillId = node.id.replace('skill-', '').replace('-btn', '');
      if (game.stats.hasSkill(skillId)) {
        node.classList.remove('locked');
        node.classList.add('unlocked');
      } else {
        node.classList.remove('unlocked');
        const cost = parseInt(node.dataset.cost, 10);
        if (game.stats.totalXP >= cost) {
          node.classList.remove('locked');
        } else {
          node.classList.add('locked');
        }
      }
    });

    // Update wands
    wandBtns.forEach(btn => {
      if (btn.dataset.color === game.stats.wandColor) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  skillNodes.forEach(node => {
    node.addEventListener('click', () => {
      const skillId = node.id.replace('skill-', '').replace('-btn', '');
      if (game.stats.hasSkill(skillId)) return; // Already unlocked

      const cost = parseInt(node.dataset.cost, 10);
      if (game.stats.spendXP(cost)) {
        game.stats.unlockSkill(skillId);
        updateWorkshopUI();

        // Play purchase sound
        game.audio.playExplosionSound();
      }
    });
  });

  wandBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      game.stats.setWandColor(color);
      updateWorkshopUI();
    });
  });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => renderLeaderboard(e.target.dataset.category));
  });

  leaderboardDifficultyFilter.addEventListener('change', () => {
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) renderLeaderboard(activeTab.dataset.category);
  });

  window.addEventListener('keydown', (e) => {
    // Dismiss any active magical toasts instantly
    if (e.key === 'Escape' && toastContainer && toastContainer.children.length > 0) {
      toastContainer.innerHTML = '';
      return;
    }

    // If the Duel Lobby is active, Escape closes it and unblurs the dashboard
    if (e.key === 'Escape' && duelLobbyMenu.classList.contains('active')) {
      closeDuelLobby();
      return;
    }

    if (scribe.isRunning) {
      if (e.key === 'Escape') {
        quitPractice();
        return;
      }

      // Stop the event from propagating to the hidden mobile input on Desktop
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.preventDefault) e.preventDefault();
      }

      scribe.handleKeyDown(e);
    }
  });

  // ── Mobile Support ────────────────────────────────────────────────────────

  // Ensure mobile keyboard stays open or re-opens if they tap the screen while playing
  document.addEventListener('touchstart', (e) => {
    // Only intercept if we are actively playing and NOT touching a UI button or dropdown
    const ignoreTags = ['BUTTON', 'SELECT', 'OPTION'];
    if ((game.isRunning || scribe.isRunning) && !ignoreTags.includes(e.target.tagName)) {
      // Small timeout helps bypass iOS Safari's aggressive focus blocking
      setTimeout(() => {
        mobileInput.focus();
      }, 50);
    }
  });

  document.addEventListener('click', (e) => {
    const ignoreTags = ['BUTTON', 'SELECT', 'OPTION'];
    if ((game.isRunning || scribe.isRunning) && !ignoreTags.includes(e.target.tagName)) {
      mobileInput.focus();
    }
  });

  // Intercept virtual keyboard input (since 'keydown' is unreliable on Android/iOS)
  mobileInput.addEventListener('input', (e) => {
    if (!game.isRunning && !scribe.isRunning) return;

    // e.data contains the character that was just typed
    const char = e.data;
    if (char && char.length === 1) {
      const syntheticEvent = {
        key: char,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        preventDefault: () => { }
      };

      if (game.isRunning) {
        game.handleKeyDown(syntheticEvent);
      } else if (scribe.isRunning) {
        scribe.handleKeyDown(syntheticEvent);
      }
    }

    // Clear the input immediately so it's ready for the next letter
    mobileInput.value = '';
  });

  // Mobile Ultimate Button
  const castNovaMobile = (e) => {
    e.preventDefault(); // prevent double-trigger from click if touchstart fires first
    if (game.isRunning) {
      game.castUltimateSpell();
      // Keep focus on the typing field after casting
      mobileInput.focus();
    }
  };

  mobileNovaBtn.addEventListener('click', castNovaMobile);
  mobileNovaBtn.addEventListener('touchstart', castNovaMobile);

});
