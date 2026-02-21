export class Stats {
    constructor() {
        this.score = 0;
        this.keystrokes = 0;
        this.correctKeystrokes = 0;
        this.startTime = null;

        this.lives = 4; // 3 barriers + 1 final hit on wizard

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
        this.updateHUD();
        this.updateLivesDisplay();
    }

    recordStroke(isCorrect) {
        this.keystrokes++;
        if (isCorrect) this.correctKeystrokes++;
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
        if (!this.startTime || this.keystrokes === 0) return 0;
        const minutesElapsed = (Date.now() - this.startTime) / 60000;
        // Standard WPM calculation: (Gross Keystrokes / 5) / minutes
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

        // Ensure there are hearts to update, index matches the barrier.
        // lives = 4 -> all 3 barriers active
        // lives = 3 -> barriers 0, 1 active. barrier 2 lost.
        // lives = 2 -> barrier 0 active. barriers 1, 2 lost.
        // lives = 1 -> barriers 0, 1, 2 lost. (Wizard exposed)

        hearts.forEach((heart, index) => {
            // Because there are 3 barriers and lives go from 4 down to 1.
            // If lives is 4, all barriers (index 0,1,2) are active.
            // If lives is 3, barrier 2 is lost.
            if (index >= this.lives - 1) {
                heart.classList.add('lost');
            } else {
                heart.classList.remove('lost');
            }
        });
    }

    saveHighScore() {
        const finalWPM = this.getWPM();
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
