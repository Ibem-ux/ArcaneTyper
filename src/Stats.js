import { supabase } from './supabaseClient.js';

export class Stats {
    constructor(achievements) {
        this.achievements = achievements;
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
        this.playerLevel = Math.floor(Math.sqrt(this.totalXP / 500)) + 1;
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
            if (this.achievements) this.achievements.onEvent('combo_update', { combo: this.combo });
            // Record timestamp for rolling window calculation
            this._keystrokeTimestamps.push(Date.now());

            // Play milestone jingle when hitting a multiplier cut-off (10, 20, 30, 40, 50)
            if (this.combo === 10 || this.combo === 20 || this.combo === 30 || this.combo === 40 || this.combo === 50) {
                if (window.game && window.game.audio) {
                    window.game.audio.playComboSound(this.combo);
                }
            }
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

    addScore(wordLength, grantMana = true, isPerfect = false) {
        const comboMultiplier = this.getComboMultiplier();
        this.score += Math.floor(wordLength * 10 * comboMultiplier);
        this.wordsTyped++;

        // Philosopher's Focus Skill: +2 XP for perfectly typed words
        if (isPerfect && this.hasSkill('philosopher')) {
            this.addXP(2);
            // Spawn a small gold "+2 XP" particle? Handled silently here for now or we can let Game.js know.
        }

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
        const wpm = Math.round((countInWindow / 5) / windowSpanMin);
        if (this.achievements && wpm > 0) this.achievements.onEvent('wpm_update', { wpm });
        return wpm;
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
        let gainedXP = Math.floor(this.score * 0.1);

        // Mage's Greed Skill: +25% XP
        if (this.hasSkill('greed')) {
            gainedXP = Math.floor(gainedXP * 1.25);
        }

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

    addXP(amount) {
        this.totalXP += amount;
        const oldLevel = this.playerLevel;
        this.playerLevel = Math.floor(Math.sqrt(this.totalXP / 500)) + 1;

        if (this.playerLevel > oldLevel) {
            console.log(`[Stats] Level Up! You are now Level ${this.playerLevel}`);
            if (this.achievements) this.achievements.onEvent('level_up', { level: this.playerLevel });
        }
        this.saveProgression();
    }

    getXPProgress() {
        const currentLevelTarget = Math.pow(this.playerLevel - 1, 2) * 500;
        const nextLevelTarget = Math.pow(this.playerLevel, 2) * 500;
        const xpInCurrentLevel = this.totalXP - currentLevelTarget;
        const xpRequired = nextLevelTarget - currentLevelTarget;
        return Math.min(100, Math.max(0, (xpInCurrentLevel / xpRequired) * 100));
    }

    async logRunToSupabase(mode, wpm, accuracy, score) {
        if (!supabase) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !session.user) return;

            const { error } = await supabase.from('run_history').insert([{
                user_id: session.user.id,
                mode: mode,
                wpm: wpm,
                accuracy: accuracy,
                score: score
            }]);

            if (error) {
                console.warn("[Stats] Error saving run to run_history:", error);
            } else {
                console.log(`[Stats] Saved run to run_history (${mode}, wpm:${wpm})`);
            }
        } catch (e) {
            console.warn("[Stats] Exception logging run to Supabase:", e);
        }
    }

    saveProgression() {
        localStorage.setItem('typerMaster_xp', this.totalXP.toString());
        localStorage.setItem('typerMaster_skills', JSON.stringify(this.unlockedSkills));
        localStorage.setItem('typerMaster_wandColor', this.wandColor);
        if (this.mageName) {
            localStorage.setItem('typerMaster_mageName', this.mageName);
        }

        if (supabase) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session && session.user) {
                    supabase.from('profiles').upsert([{
                        id: session.user.id,
                        total_xp: this.totalXP,
                        player_level: this.playerLevel,
                        username: this.mageName || session.user.email.split('@')[0]
                    }], { onConflict: 'id' }).then(({ error }) => {
                        if (error) console.warn("[Stats] Supabase profiles sync error:", error);
                    });
                }
            });
        }
    }
}
