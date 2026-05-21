import { MagicalToast } from './MagicalToast.js';

export class ProfileUI {
    constructor(game) {
        this.game = game;

        // DOM Elements
        this.menuBestScore = document.getElementById('menu-best-score');
        this.menuBestWpm = document.getElementById('menu-best-wpm');
        this.levelEl = document.getElementById('menu-player-level');
        this.xpBarEl = document.getElementById('menu-xp-bar');
        this.wandGlows = document.querySelectorAll('.mage-wand-glow-img');

        // Character selection cards
        this.skinCards = document.querySelectorAll('.skin-card');
        this.setupSkinSelection();
    }

    setupSkinSelection() {
        this.skinCards.forEach(card => {
            card.addEventListener('click', () => {
                const charId = card.getAttribute('data-char');
                if (!this.game.stats) return;

                if (this.game.stats.isCharacterUnlocked(charId)) {
                    this.game.stats.setSelectedCharacter(charId);
                    this.updateSkinCardsUI();
                    
                    let name = charId.toUpperCase();
                    if (charId === 'gojo') name = 'GOJO SATORU';
                    if (charId === 'sukuna') name = 'RYOMEN SUKUNA';
                    
                    MagicalToast.show(`Bound to avatar: <span style="color:#00e5ff; font-weight:bold;">${name}</span>`);
                    if (this.game.audio) this.game.audio.playSound('click'); // optional sound cue
                } else {
                    let req = "";
                    if (charId === 'gojo') req = "Limitless Focus achievement (100+ WPM & 95%+ accuracy)";
                    if (charId === 'sukuna') req = "King of Curses achievement (100x Combo or 10,000+ points)";
                    
                    MagicalToast.show(`<span style="color:#ff1744; font-weight:bold;">LOCKED:</span> Complete "${req}" to unlock this skin!`);
                    if (this.game.audio) this.game.audio.playErrorSound();
                }
            });
        });
    }

    updateSkinCardsUI() {
        if (!this.game.stats) return;
        const currentSelected = this.game.stats.selectedCharacter || 'wizard';

        this.skinCards.forEach(card => {
            const charId = card.getAttribute('data-char');
            const isUnlocked = this.game.stats.isCharacterUnlocked(charId);
            
            // Toggle active state
            if (charId === currentSelected) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }

            // Toggle locked state
            const statusEl = card.querySelector('.skin-status');
            if (isUnlocked) {
                card.classList.remove('locked');
                if (statusEl) {
                    statusEl.innerText = "UNLOCKED";
                    statusEl.style.color = "#00e5ff";
                }
            } else {
                card.classList.add('locked');
                if (statusEl) {
                    statusEl.innerText = "LOCKED";
                    statusEl.style.color = "#ff5252";
                }
            }
        });
    }

    updateProgressionUI() {
        if (!this.game.stats) return;
        if (this.levelEl) this.levelEl.innerText = this.game.stats.playerLevel || 1;
        if (this.xpBarEl) {
            this.xpBarEl.style.width = (this.game.stats.getXPProgress ? this.game.stats.getXPProgress() : 0) + '%';
        }
    }

    updateMenuStats() {
        if (this.menuBestScore) this.menuBestScore.innerText = this.game.stats.bestScore;
        if (this.menuBestWpm) this.menuBestWpm.innerText = this.game.stats.bestWPM;

        // Update Avatar Wand Color
        this.wandGlows.forEach(glow => {
            glow.style.backgroundColor = this.game.stats.wandColor;
            glow.style.boxShadow = `0 0 15px 5px ${this.game.stats.wandColor}66`; // 66 is hex for roughly 40% opacity
        });

        this.updateProgressionUI();
        this.updateSkinCardsUI();
    }
}
