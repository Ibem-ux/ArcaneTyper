import { FloatingText } from '../FloatingText.js';

export class SigilEventSystem {
    constructor(game) {
        this.game = game;
    }

    startSigilEvent() {
        if (this.game.sigilActive) return; // Prevent overlapping events
        this.game.sigilActive = true;
        this.game.sigilInputs = [];

        // Generate random sequence of 4 arrows (Up=W, Down=S, Left=A, Right=D)
        const possibleKeys = ['w', 'a', 's', 'd'];
        const sequenceLength = 4;
        this.game.sigilSequence = [];
        for (let i = 0; i < sequenceLength; i++) {
            this.game.sigilSequence.push(possibleKeys[Math.floor(Math.random() * possibleKeys.length)]);
        }

        this.game.sigilTimer = 0;
        this.game.sigilMaxTime = 3000; // 3 seconds to complete

        // UI Updates
        const container = document.getElementById('sigil-event-container');
        const prompts = document.getElementById('sigil-prompts');
        if (container && prompts) {
            container.classList.remove('hidden');
            this.renderSigilPrompts();
        }

        this.game.audio.playLevelUp(); // Temporary sound queue
        this.game.floatingTexts.push(new FloatingText("SIGIL ACTIVATED!", this.game.canvas.width / 2, this.game.canvas.height / 2 - 100, "#00e5ff", 36));

        // Darken the background to focus on UI
        this.game.blindTimer = this.game.sigilMaxTime;
    }

    renderSigilPrompts() {
        const prompts = document.getElementById('sigil-prompts');
        if (!prompts) return;
        prompts.innerHTML = '';

        const arrowMap = { 'w': '↑', 'a': '←', 's': '↓', 'd': '→' };

        this.game.sigilSequence.forEach((key, index) => {
            const span = document.createElement('span');
            span.innerText = arrowMap[key];
            if (index < this.game.sigilInputs.length) {
                // Already successfully pressed
                span.style.color = '#00e5ff';
                span.style.textShadow = '0 0 10px #00e5ff';
                span.style.transform = 'scale(1.2)';
            } else if (index === this.game.sigilInputs.length) {
                // Next required key
                span.style.color = '#ffffff';
                span.style.animation = 'pulse 1s infinite';
            } else {
                // Pending key
                span.style.color = 'rgba(255, 255, 255, 0.3)';
            }
            prompts.appendChild(span);
        });
    }

    updateSigilEvent(dt) {
        this.game.sigilTimer += dt;

        // Update timer bar UI
        const bar = document.getElementById('sigil-timer-bar');
        if (bar) {
            const pct = Math.max(0, 100 - (this.game.sigilTimer / this.game.sigilMaxTime) * 100);
            bar.style.width = pct + '%';
        }

        if (this.game.sigilTimer >= this.game.sigilMaxTime) {
            this.failSigilEvent("Time Expired!");
        }
    }

    handleSigilInput(e) {
        let key = e.key.toLowerCase();
        // Map arrow keys to WASD for flexibility
        if (key === 'arrowup') key = 'w';
        if (key === 'arrowdown') key = 's';
        if (key === 'arrowleft') key = 'a';
        if (key === 'arrowright') key = 'd';

        const expectedKey = this.game.sigilSequence[this.game.sigilInputs.length];

        if (key === expectedKey) {
            this.game.sigilInputs.push(key);
            this.game.audio.playTypeSound();
            this.renderSigilPrompts();

            if (this.game.sigilInputs.length === this.game.sigilSequence.length) {
                this.succeedSigilEvent();
            }
        } else {
            this.game.audio.playErrorSound();
            this.failSigilEvent("Wrong Input!");
        }
    }

    failSigilEvent(reason) {
        this.game.sigilActive = false;
        this.game.blindTimer = 0; // Remove dark background overlay

        const container = document.getElementById('sigil-event-container');
        if (container) container.classList.add('hidden');

        this.game.floatingTexts.push(new FloatingText(`Sigil Failed: ${reason}`, this.game.canvas.width / 2, this.game.canvas.height / 2, "#ff4b4b", 36));
        this.game.audio.playShatter();
        this.game.combatSystem.triggerShake(10, 300);
    }

    succeedSigilEvent() {
        this.game.sigilActive = false;
        this.game.blindTimer = 0;

        const container = document.getElementById('sigil-event-container');
        if (container) container.classList.add('hidden');

        this.game.floatingTexts.push(new FloatingText("SIGIL UNLEASHED!", this.game.canvas.width / 2, this.game.canvas.height / 2, "#ffd700", 48));
        this.game.stats.addScore(500); // Massive point bonus
        this.game.stats.mana = Math.min(this.game.stats.maxMana, this.game.stats.mana + 100); // Full mana restore
        this.game.stats.updateHUD();

        // Screen clear effect similar to Ultimate but free
        this.game.audio.playExplosion();
        this.game.combatSystem.triggerShake(40, 1000);
        this.game.combatSystem.spawnExplosion(this.game.canvas.width / 2, this.game.canvas.height / 2, { particles: ['#00e5ff', '#ffd700', '#ffffff'] }, 5.0);

        for (let i = this.game.words.length - 1; i >= 0; i--) {
            const word = this.game.words[i];
            if (word.dying || word.isBossAttack) continue;
            this.game.stats.addScore(word.text.length, false);
            word.dying = true;
            this.game.combatSystem.spawnExplosion(word.x, word.y, word.elementColors, 1.0);
            if (word === this.game.targetedWord) this.game.targetedWord = null;
        }

        if (this.game.isBossPhase && this.game.boss && !this.game.boss.isDead) {
            for (let i = 0; i < 5; i++) this.game.boss.takeDamage();
        }
    }
}
