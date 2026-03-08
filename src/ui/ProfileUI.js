export class ProfileUI {
    constructor(game) {
        this.game = game;

        // DOM Elements
        this.menuBestScore = document.getElementById('menu-best-score');
        this.menuBestWpm = document.getElementById('menu-best-wpm');
        this.levelEl = document.getElementById('menu-player-level');
        this.xpBarEl = document.getElementById('menu-xp-bar');
        this.wandGlows = document.querySelectorAll('.mage-wand-glow-img');
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
    }
}
