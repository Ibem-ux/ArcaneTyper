export class Stats {
    constructor() {
        this.score = 0;
        this.keystrokes = 0;
        this.correctKeystrokes = 0;
        this.wordsTyped = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.mana = 0;
        this.maxMana = 100;
        this.startTime = null;

        this.lives = 4; // 3 barriers + 1 final hit on wizard

        // Rolling WPM: store timestamp of each correct keystroke
        this._keystrokeTimestamps = [];
        this._rollingWindowMs = 10000; // 10-second window

        this.bestScore = parseInt(localStorage.getItem('typerMaster_score') || '0', 10);
        this.bestWPM = parseInt(localStorage.getItem('typerMaster_wpm') || '0', 10);

        // --- RPG Elements ---
        this.totalXP = parseInt(localStorage.getItem('typerMaster_xp') || '0', 10);
        this.playerLevel = parseInt(localStorage.getItem('typerMaster_level') || '1', 10);
        this.unlockedSkills = JSON.parse(localStorage.getItem('typerMaster_skills') || '[]');
        this.wandColor = localStorage.getItem('typerMaster_wandColor') || '#ff00ff';
        this.mageName = localStorage.getItem('typerMaster_mageName') || null;

        this.bindDOM();
    }

    bindDOM() {
        this.scoreEl = document.getElementById('score-display');
        this.comboEl = document.getElementById('combo-display');
        this.multiplierEl = document.getElementById('multiplier-display');
        this.manaFillEl = document.getElementById('mana-bar-fill');
        this.manaTextEl = document.getElementById('mana-text');
        this.manaHintEl = document.getElementById('mana-hint');
        this.wpmEl = document.getElementById('wpm-display');
        this.accEl = document.getElementById('acc-display');
        this.livesContainer = document.getElementById('lives-display');
    }

    reset() {
        this.score = 0;
        this.keystrokes = 0;
        this.correctKeystrokes = 0;
        this.wordsTyped = 0;

        // Passive: Starting Combo
        this.combo = this.hasSkill('combo') ? 10 : 0;

        this.mana = 0;

        // Passive: Max Mana
        this.maxMana = this.hasSkill('mana') ? 120 : 100;

        this.startTime = Date.now();

        // Passive: Extra Barrier
        this.lives = this.hasSkill('life') ? 5 : 4;

        this._keystrokeTimestamps = [];
        this.updateHUD();
        this.updateLivesDisplay();
    }

    recordStroke(isCorrect) {
        this.keystrokes++;
        if (isCorrect) {
            this.correctKeystrokes++;
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
            // Record timestamp for rolling window calculation
            this._keystrokeTimestamps.push(Date.now());
        } else {
            this.combo = 0;
        }
    }

    getComboMultiplier() {
        if (this.combo >= 50) return 4.0;
        if (this.combo >= 40) return 3.0;
        if (this.combo >= 30) return 2.5;
        if (this.combo >= 20) return 2.0;
        if (this.combo >= 10) return 1.5;
        return 1.0;
    }

    addScore(wordLength, grantMana = true) {
        const comboMultiplier = this.getComboMultiplier();
        this.score += Math.floor(wordLength * 10 * comboMultiplier);
        this.wordsTyped++;

        // Add mana per word completed based on length
        if (grantMana && this.mana < this.maxMana) {
            this.mana = Math.min(this.maxMana, this.mana + wordLength * 2);
        }
    }

    useMana(amount) {
        if (this.mana >= amount) {
            this.mana -= amount;
            this.updateHUD();
            return true;
        }
        return false;
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

        if (this.comboEl) {
            this.comboEl.innerText = this.combo;

            if (this.multiplierEl) {
                const mult = this.getComboMultiplier();
                this.multiplierEl.innerText = `x${mult.toFixed(1)}`;
                // Only fade the multiplier text in if it's > 1.0
                this.multiplierEl.style.opacity = mult > 1.0 ? '0.9' : '0';
            }

            if (this.combo >= 20) {
                this.comboEl.classList.add('high-combo');
            } else {
                this.comboEl.classList.remove('high-combo');
            }
        }

        if (this.manaFillEl && this.manaTextEl) {
            const manaPercent = (this.mana / this.maxMana) * 100;
            this.manaFillEl.style.width = manaPercent + '%';
            this.manaTextEl.innerText = `${this.mana} / ${this.maxMana}`;

            if (this.mana >= this.maxMana) {
                this.manaFillEl.classList.add('full');
                this.manaHintEl.classList.remove('hidden');
            } else {
                this.manaFillEl.classList.remove('full');
                this.manaHintEl.classList.add('hidden');
            }
        }
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

        // Convert score to XP (10% of score becomes XP)
        const gainedXP = Math.floor(this.score * 0.1);
        if (gainedXP > 0) this.addXP(gainedXP);
    }

    // --- Progression Methods ---
    addXP(amount) {
        this.totalXP += amount;

        // Simple level up formula: level = 1 + floor(sqrt(xp / 100))
        const newLevel = 1 + Math.floor(Math.sqrt(this.totalXP / 100));
        if (newLevel > this.playerLevel) {
            this.playerLevel = newLevel;
            localStorage.setItem('typerMaster_level', this.playerLevel.toString());
        }

        this.saveProgression();
    }

    spendXP(amount) {
        if (this.totalXP >= amount) {
            this.totalXP -= amount;
            this.saveProgression();
            return true;
        }
        return false;
    }

    unlockSkill(skillId) {
        if (!this.unlockedSkills.includes(skillId)) {
            this.unlockedSkills.push(skillId);
            this.saveProgression();
            return true;
        }
        return false;
    }

    hasSkill(skillId) {
        return this.unlockedSkills.includes(skillId);
    }

    setWandColor(colorHex) {
        this.wandColor = colorHex;
        this.saveProgression();
    }

    saveProgression() {
        localStorage.setItem('typerMaster_xp', this.totalXP.toString());
        localStorage.setItem('typerMaster_skills', JSON.stringify(this.unlockedSkills));
        localStorage.setItem('typerMaster_wandColor', this.wandColor);
        if (this.mageName) {
            localStorage.setItem('typerMaster_mageName', this.mageName);
        }
    }
}
