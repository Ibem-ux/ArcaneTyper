import { Particle } from '../Particle.js';
import { FloatingText } from '../FloatingText.js';

export class CombatSystem {
    constructor(game) {
        this.game = game;
    }

    castUltimateSpell() {
        if (!this.game.stats.useMana(100)) return;

        // Mana Overflow Skill: Ultimate restores 1 Barrier
        if (this.game.stats.hasSkill('burst')) {
            const maxAllowedLives = this.game.stats.hasSkill('life') ? 5 : 4;
            if (this.game.stats.lives < maxAllowedLives) {
                this.game.stats.lives++;
                this.game.stats.updateLivesDisplay();
            }
        }

        // Echo Cast Skill: 20% chance to immediately refund 50% max mana
        if (this.game.stats.hasSkill('echo') && Math.random() < 0.20) {
            this.game.stats.mana = Math.min(this.game.stats.maxMana, this.game.stats.mana + (this.game.stats.maxMana * 0.5));
            this.game.stats.updateHUD();
            this.spawnExplosion(this.game.canvas.width / 2, this.game.canvas.height / 2, { particles: ['#FF5722', '#FFE0B2', '#E64A19'] }, 1.5);
        }

        // Chronomancer Discipline Master of Time: Flat refund of 50 mana
        if (this.game.stats.mageClass === 'Chronomancer') {
            this.game.stats.mana = Math.min(this.game.stats.maxMana, this.game.stats.mana + 50);
            this.game.stats.updateHUD();
            // Golden chronomancer particles
            this.spawnExplosion(this.game.canvas.width / 2, this.game.canvas.height / 2, { particles: ['#ffd700', '#ffeb3b', '#fff9c4'] }, 1.0);
        }

        this.game.audio.playExplosion();
        // Massive screen shake for Nova
        this.game.combatSystem.triggerShake(30, 800);

        // Flash screen intensely
        this.game.ctx.fillStyle = 'rgba(0, 229, 255, 0.9)';
        this.game.ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

        // Spawn massive center explosion and Shockwave
        this.spawnExplosion(this.game.canvas.width / 2, this.game.canvas.height / 2, { particles: ['#00e5ff', '#ffffff', '#0077ff'] }, 5.0);
        this.game.particles.push(new Particle(this.game.canvas.width / 2, this.game.canvas.height / 2, 'shockwave'));

        // Destroy all normal words
        for (let i = this.game.words.length - 1; i >= 0; i--) {
            const word = this.game.words[i];

            // Skip if dying or is a boss attack
            if (word.dying || word.isBossAttack) continue;

            this.game.stats.addScore(word.text.length, false);
            word.dying = true;
            this.spawnExplosion(word.x, word.y, word.elementColors, 0.5);

            if (word === this.game.targetedWord) {
                this.game.targetedWord = null;
            }
        }

        // Damage Boss heavily
        if (this.game.isBossPhase && this.game.boss && !this.game.boss.isDead) {
            for (let i = 0; i < 3; i++) {
                this.game.boss.takeDamage();
            }
        }
    }

    spawnExplosion(x, y, elementColors, bonusMultiplier = 0) {
        const colors = elementColors.particles;
        let numParticles = 35 + Math.random() * 20; // More energetic burst
        numParticles *= (1 + bonusMultiplier);

        for (let i = 0; i < numParticles; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const particle = new Particle(x, y, color);

            if (bonusMultiplier > 0) {
                particle.speed *= (1 + bonusMultiplier * 0.5);
                particle.size *= (1 + bonusMultiplier * 0.5);
            }

            this.game.particles.push(particle);
        }
    }

    spawnHitSpark(x, y, elementColors) {
        const colors = elementColors.particles;
        const numParticles = 4 + Math.random() * 3;
        for (let i = 0; i < numParticles; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const p = new Particle(x, y, color);
            p.life = 0.5;
            p.size = Math.random() * 2 + 1;
            p.isRune = false;
            this.game.particles.push(p);
        }
    }

    receiveAttack(type) {
        if (!this.game.isRunning) return;

        if (type === 'blind') {
            const blindDuration = this.game.stats.hasSkill('vision') ? 2000 : 4000;
            this.game.blindTimer = blindDuration;
            this.game.floatingTexts.push(new FloatingText("BLINDED!", this.game.canvas.width / 2, this.game.canvas.height / 2, "#d500f9", 48));
        } else if (type === 'swarm') {
            this.game.floatingTexts.push(new FloatingText("SWARM INBOUND!", this.game.canvas.width / 2, this.game.canvas.height / 2, "#ff4b4b", 48));
            for (let i = 0; i < 4; i++) {
                // Use _spawnSingleWord so the boss counter is NOT incremented
                this.game._spawnSingleWord();
            }
        }
    }

    triggerShake(intensity, duration) {
        this.game.shakeIntensity = intensity;
        this.game.shakeDuration = duration;
    }
}
