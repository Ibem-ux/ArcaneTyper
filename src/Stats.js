export class Stats {
    constructor() {
        this.score = 0;
        this.keystrokes = 0;
        this.correctKeystrokes = 0;
        this.startTime = null;

        this.lives = 4; // 3 barriers + 1 final hit on wizard

        // Rolling WPM: store timestamp of each correct keystroke
        this._keystrokeTimestamps = [];
        this._rollingWindowMs = 10000; // 10-second window

        this.bestScore = parseInt(localStorage.getItem('typerMaster_score') || '0', 10);
        this.bestWPM = parseInt(localStorage.getItem('typerMaster_wpm') || '0', 10);

        this.bindDOM();
    }

    bindDOM() {
        this.scoreEl = document.getElementById('score-display');
        this.wpmEl = document.getElementById('wpm-display');
        this.accEl = document.getElementById('acc-display');
        this.livesContainer = document.getElementById('lives-display');
    }

    reset() {
        this.score = 0;
        this.keystrokes = 0;
        this.correctKeystrokes = 0;
        this.startTime = Date.now();
        this.lives = 4;
        this._keystrokeTimestamps = [];
        this.updateHUD();
        this.updateLivesDisplay();
    }

    recordStroke(isCorrect) {
        this.keystrokes++;
        if (isCorrect) {
            this.correctKeystrokes++;
            // Record timestamp for rolling window calculation
            this._keystrokeTimestamps.push(Date.now());
        }
    }

    addScore(wordLength) {
        this.score += wordLength * 10;
    }

    loseLife() {
        this.lives--;
        this.updateLivesDisplay();
        return this.lives <= 0;
    }

    getWPM() {
        const now = Date.now();
        const cutoff = now - this._rollingWindowMs;

        // Drop keystrokes older than the window
        this._keystrokeTimestamps = this._keystrokeTimestamps.filter(t => t >= cutoff);

        const countInWindow = this._keystrokeTimestamps.length;
        if (countInWindow === 0) return 0;

        // Determine the actual window span (from oldest timestamp to now)
        // This avoids inflating WPM at the very start of the game
        const oldest = this._keystrokeTimestamps[0];
        const windowSpanMs = Math.max(1000, now - oldest); // minimum 1s to avoid NaN/Infinity
        const windowSpanMin = windowSpanMs / 60000;

        // Standard WPM: keystrokes / 5 / minutes
        return Math.round((countInWindow / 5) / windowSpanMin);
    }

    // Full-session WPM — used for leaderboard saving
    getSessionWPM() {
        if (!this.startTime || this.correctKeystrokes === 0) return 0;
        const minutesElapsed = (Date.now() - this.startTime) / 60000;
        return Math.round((this.correctKeystrokes / 5) / minutesElapsed);
    }

    getAccuracy() {
        if (this.keystrokes === 0) return 100;
        return Math.round((this.correctKeystrokes / this.keystrokes) * 100);
    }

    updateHUD() {
        if (!this.scoreEl) return;
        this.scoreEl.innerText = this.score;
        this.wpmEl.innerText = this.getWPM();
        this.accEl.innerText = this.getAccuracy() + '%';
    }

    updateLivesDisplay() {
        if (!this.livesContainer) return;
        const hearts = this.livesContainer.querySelectorAll('.barrier');

        hearts.forEach((heart, index) => {
            if (index >= this.lives - 1) {
                heart.classList.add('lost');
            } else {
                heart.classList.remove('lost');
            }
        });
    }

    saveHighScore() {
        // Use full-session WPM for leaderboard (more stable/fair)
        const finalWPM = this.getSessionWPM();
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('typerMaster_score', this.bestScore);
        }
        if (finalWPM > this.bestWPM) {
            this.bestWPM = finalWPM;
            localStorage.setItem('typerMaster_wpm', this.bestWPM);
        }
    }
}
