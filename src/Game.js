import { Word } from './Word.js';
import { Boss } from './Boss.js';
import { Projectile } from './Projectile.js';
import { WordDictionary } from './WordDictionary.js';
import { Stats } from './Stats.js';
import { Particle } from './Particle.js';
import { AudioController } from './AudioController.js';
import { FloatingText } from './FloatingText.js';

export class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.dictionary = new WordDictionary();
        this.stats = new Stats();
        this.audio = new AudioController();

        this.words = [];
        this.particles = [];
        this.ambientParticles = [];
        this.floatingTexts = [];
        this.targetedWord = null;

        this.lastTime = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 3000; // ms

        this.isRunning = false;
        this.animationFrameId = null;

        this.playerAnimTimer = 0;

        // Screen shake
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        // Star field (initialized in reset)
        this.stars = [];

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.onGameOver = () => { };
    }

    resizeCanvas() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;

        // Re-generate star field when canvas resizes
        this._initStars();
    }

    _initStars() {
        this.stars = [];
        const count = 80;
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 1.5 + 0.3,
                speed: Math.random() * 800 + 400,   // twinkle speed (ms per cycle)
                phase: Math.random() * Math.PI * 2, // random starting phase
                brightness: Math.random() * 0.5 + 0.3
            });
        }

        // Init ambient atmospheric particles (dust motes)
        this.ambientParticles = [];
        for (let i = 0; i < 40; i++) {
            this.ambientParticles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                vx: (Math.random() - 0.5) * 0.05,
                vy: (Math.random() - 0.5) * 0.05 - 0.02, // slight upward drift
                alpha: Math.random() * 0.3 + 0.1
            });
        }
    }

    start(difficulty = 'normal') {
        this.difficulty = difficulty;
        this.reset();
        this.isRunning = true;
        this.audio.startBackgroundMusic();
        window.addEventListener('keydown', this.handleKeyDown);
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    stop() {
        this.isRunning = false;
        this.audio.stopBackgroundMusic();
        window.removeEventListener('keydown', this.handleKeyDown);
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    reset() {
        this.words = [];
        this.particles = [];
        this.projectiles = [];
        this.floatingTexts = [];
        this.targetedWord = null;
        this.spawnTimer = 0;
        this.spawnCount = 0;

        // Boss phase state
        this.isBossPhase = false;
        this.boss = null;
        this.bossDimensionAlpha = 0;
        this.bossesDefeated = 0;

        // Screen shake
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        // Difficulty settings
        const difficultySettings = {
            'easy': { speed: 0.8, spawnInt: 2500 },
            'normal': { speed: 1.2, spawnInt: 1800 },
            'hard': { speed: 1.6, spawnInt: 1200 },
            'hell': { speed: 2.2, spawnInt: 800 }
        };
        const settings = difficultySettings[this.difficulty] || difficultySettings['normal'];

        this.currentSpeedMultiplier = settings.speed;
        this.spawnInterval = settings.spawnInt;

        if (this.stats.hasSkill('clairvoyance')) {
            this.spawnInterval *= 1.25; // 25% slower spawns
        }

        this.precognitionUsed = false;

        this.blindTimer = 0; // Tracks active Blind spell duration

        this.stats.reset();
        this._initStars();
    }

    gameLoop(currentTime) {
        if (!this.isRunning) return;

        let dt = currentTime - this.lastTime;
        dt = Math.min(dt, 50);
        this.lastTime = currentTime;

        this.update(dt);
        this.draw();

        if (Math.random() < 0.1) {
            this.stats.updateHUD();
        }

        if (this.isRunning) {
            this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    update(dt) {
        this.spawnTimer += dt;

        if (!this.isBossPhase && this.spawnTimer >= this.spawnInterval) {
            this.spawnWord();
            this.spawnTimer = 0;
        }

        // Pocket Dimension fade
        if (this.isBossPhase && this.bossDimensionAlpha < 1) {
            this.bossDimensionAlpha = Math.min(1, this.bossDimensionAlpha + dt * 0.001);
        } else if (!this.isBossPhase && this.bossDimensionAlpha > 0) {
            this.bossDimensionAlpha = Math.max(0, this.bossDimensionAlpha - dt * 0.001);
        }

        if (this.playerAnimTimer > 0) {
            this.playerAnimTimer = Math.max(0, this.playerAnimTimer - dt);
        }

        // Visual effect decay
        if (this.bloodVignetteIntensity > 0) {
            this.bloodVignetteIntensity = Math.max(0, this.bloodVignetteIntensity - 0.0005 * dt);
        }

        if (this.blindTimer > 0) {
            this.blindTimer -= dt;
        }

        // Decay screen shake
        if (this.shakeTimer > 0) {
            this.shakeTimer = Math.max(0, this.shakeTimer - dt);
        }

        // Boss Logic
        if (this.isBossPhase && this.boss) {
            this.boss.update(dt);

            if (this.boss.shouldAttack()) {
                this.spawnBossAttack();
            }

            if (this.boss.shouldCastSpell()) {
                this.castBossSpell();
            }

            // Wait for death animation to fully finish before ending phase
            if (this.boss.isFullyDead() && this.words.length === 0 && this.projectiles.length === 0) {
                this.endBossPhase();
            }
        }

        const wizX = this.canvas.width / 2;
        const wizY = this.canvas.height;

        let activeRadius = 30;
        let hitColor = '#ff4b4b';

        if (this.stats.lives >= 4) { activeRadius = 110; hitColor = '#ffd700'; }
        else if (this.stats.lives === 3) { activeRadius = 85; hitColor = '#d500f9'; }
        else if (this.stats.lives === 2) { activeRadius = 60; hitColor = '#29b6f6'; }

        for (let i = this.words.length - 1; i >= 0; i--) {
            const word = this.words[i];
            word.update(dt);

            // Only do collision check on words that are NOT dying
            if (!word.dying) {
                const dx = word.x - wizX;
                const dy = word.y - wizY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const textHitboxSize = 20;

                if (distance < activeRadius + textHitboxSize) {
                    if (this.stats.hasSkill('precognition') && !this.precognitionUsed) {
                        this.precognitionUsed = true;
                        this.words.splice(i, 1);
                        if (word === this.targetedWord) this.targetedWord = null;

                        // Free Nova Cast
                        this.audio.playExplosion();
                        this._triggerShake(15, 600);
                        this.spawnExplosion(this.canvas.width / 2, this.canvas.height / 2, { particles: ['#9C27B0', '#ffffff', '#E040FB'] }, 3.0);

                        for (let j = this.words.length - 1; j >= 0; j--) {
                            const w = this.words[j];
                            if (w.dying || w.isBossAttack) continue;
                            this.stats.addScore(w.text.length, false);
                            w.dying = true;
                            this.spawnExplosion(w.x, w.y, w.elementColors, 0.5);
                            if (w === this.targetedWord) this.targetedWord = null;
                        }

                        if (this.isBossPhase && this.boss && !this.boss.isDead) {
                            for (let j = 0; j < 3; j++) this.boss.takeDamage();
                        }
                        continue;
                    }

                    this.words.splice(i, 1);
                    if (word === this.targetedWord) this.targetedWord = null;

                    this.audio.playShatter();
                    this.spawnExplosion(word.x, word.y, { particles: [hitColor, '#ffffff'] });
                    this._triggerShake(5, 200);

                    // Drop combo on taking damage
                    this.stats.combo = 0;
                    this.bloodVignetteIntensity = 1.0;
                    this.stats.updateHUD();
                    this.floatingTexts.push(new FloatingText("Hits Taken", wizX, wizY - 120, hitColor, 28));

                    const isDead = this.stats.loseLife();
                    if (isDead) {
                        this.triggerGameOver();
                    }
                }
            }

            // Remove words whose death animation has completed
            if (word.isDead) {
                this.words.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(dt);
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.update(dt);
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // Update ambient particles
        for (let i = 0; i < this.ambientParticles.length; i++) {
            const ap = this.ambientParticles[i];
            ap.x += ap.vx * dt;
            ap.y += ap.vy * dt;
            // Wrap around
            if (ap.y < -10) ap.y = this.canvas.height + 10;
            if (ap.y > this.canvas.height + 10) ap.y = -10;
            if (ap.x < -10) ap.x = this.canvas.width + 10;
            if (ap.x > this.canvas.width + 10) ap.x = -10;
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.update(dt);

            if (proj.isDead) {
                this.projectiles.splice(i, 1);

                if (this.isBossPhase && this.boss && !this.boss.isDead) {
                    this.boss.takeDamage();
                    this.audio.playExplosion();
                    this.spawnExplosion(this.boss.x, this.boss.y, { particles: ['#ffd700', '#ffffff', '#ff4b4b'] });
                    this._triggerShake(7, 250);
                }
            }
        }
    }

    _triggerShake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeTimer = duration;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // --- Screen shake offset ---
        let shakeX = 0;
        let shakeY = 0;
        if (this.shakeTimer > 0) {
            shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
            shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
        }

        this.ctx.save();
        this.ctx.translate(shakeX, shakeY);

        // --- Dynamic Background based on Combo ---
        // Combo 0-20: Normal
        // Combo 20-50+: Red/Violet vignette and faster starfield
        const comboIntensity = Math.min(1.0, this.stats.combo / 50);

        if (comboIntensity > 0.1) {
            const bgVignette = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.4,
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width
            );
            bgVignette.addColorStop(0, 'transparent');
            bgVignette.addColorStop(1, `rgba(100, 0, 80, ${comboIntensity * 0.6})`);
            this.ctx.fillStyle = bgVignette;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // --- Star field ---
        this._drawStars(comboIntensity);

        // --- Pocket Dimension Background ---
        if (this.bossDimensionAlpha > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = this.bossDimensionAlpha;

            // Base radial gradient
            const gradient = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, 50,
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 1.5
            );
            gradient.addColorStop(0, '#2a0808');
            gradient.addColorStop(1, '#05020a');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Pulsing edge vignette
            const vignetteAlpha = 0.4 + Math.sin(performance.now() / 600) * 0.15;
            const vignette = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.3,
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.75
            );
            vignette.addColorStop(0, 'transparent');
            vignette.addColorStop(1, `rgba(80, 0, 20, ${vignetteAlpha})`);
            this.ctx.fillStyle = vignette;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.restore();
        }

        // --- Wizard and Barriers ---
        this.ctx.save();
        const wizX = this.canvas.width / 2;
        const wizY = this.canvas.height;

        const barriers = [
            { radius: 60, color: '#29b6f6', active: this.stats.lives >= 2 },
            { radius: 85, color: '#d500f9', active: this.stats.lives >= 3 },
            { radius: 110, color: '#ffd700', active: this.stats.lives >= 4 }
        ];

        barriers.forEach(barrier => {
            if (barrier.active) {
                this.ctx.beginPath();
                this.ctx.arc(wizX, wizY, barrier.radius, Math.PI, 0, false);
                this.ctx.strokeStyle = barrier.color;
                this.ctx.lineWidth = 3;
                this.ctx.shadowColor = barrier.color;
                this.ctx.shadowBlur = 15;
                this.ctx.stroke();
            }
        });

        this.ctx.shadowBlur = 0;

        // --- Staff ---
        this.ctx.save();
        const animProgress = this.playerAnimTimer > 0 ? this.playerAnimTimer / 200 : 0;
        const staffAngle = (Math.PI / 6) * (1 - animProgress);
        const staffBaseX = wizX + 10;
        const staffBaseY = wizY - 5;

        this.ctx.translate(staffBaseX, staffBaseY);
        this.ctx.rotate(staffAngle);

        // Pole
        this.ctx.fillStyle = '#4a3320';
        this.ctx.fillRect(-2, -40, 5, 45);

        // Pulsing gem glow
        const gemGlow = 12 + Math.sin(performance.now() / 300) * 8;
        this.ctx.beginPath();
        this.ctx.arc(0, -42, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = this.stats.wandColor;
        this.ctx.shadowColor = this.stats.wandColor;
        this.ctx.shadowBlur = gemGlow;
        this.ctx.fill();

        this.ctx.restore();
        this.ctx.shadowBlur = 0;

        // --- Wizard Silhouette ---
        this.ctx.fillStyle = '#110a17';
        this.ctx.strokeStyle = '#3a2b52';
        this.ctx.lineWidth = 1;

        // Cloak
        this.ctx.beginPath();
        this.ctx.moveTo(wizX, wizY - 24);
        this.ctx.lineTo(wizX - 15, wizY + 18);
        this.ctx.quadraticCurveTo(wizX, wizY + 21, wizX + 15, wizY + 18);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Hat
        this.ctx.beginPath();
        this.ctx.moveTo(wizX - 11, wizY - 21);
        this.ctx.quadraticCurveTo(wizX, wizY - 18, wizX + 11, wizY - 21);
        this.ctx.lineTo(wizX + 1, wizY - 45);
        this.ctx.lineTo(wizX - 1, wizY - 45);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.restore();

        // --- Boss ---
        if (this.isBossPhase && this.boss) {
            this.boss.draw(this.ctx);
        }

        // --- Words ---
        this.words.forEach(word => !word.isTargeted && word.draw(this.ctx));
        if (this.targetedWord && !this.targetedWord.isDead) {
            this.targetedWord.draw(this.ctx);
        }

        // --- Ambient Dust ---
        this.ctx.save();
        this.ambientParticles.forEach(ap => {
            this.ctx.globalAlpha = ap.alpha;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(ap.x, ap.y, ap.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.restore();

        // --- Projectiles ---
        this.projectiles.forEach(p => p.draw(this.ctx));

        // --- Particles ---
        this.particles.forEach(p => p.draw(this.ctx));

        // --- Floating Texts ---
        this.floatingTexts.forEach(ft => ft.draw(this.ctx));

        // --- Blind Overlay ---
        if (this.blindTimer > 0) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(20, 0, 40, 0.95)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }

        // --- Blood Vignette ---
        if (this.bloodVignetteIntensity > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = this.bloodVignetteIntensity * 0.5; // Max 50% opacity
            const vignette = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.2,
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.6
            );
            vignette.addColorStop(0, 'transparent');
            vignette.addColorStop(1, 'rgba(255, 0, 0, 1)');
            this.ctx.fillStyle = vignette;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }

        this.ctx.restore(); // Restore from screen shake translate
    }

    _drawStars(comboIntensity = 0) {
        const now = performance.now();
        this.ctx.save();
        this.stars.forEach(star => {
            // Stars twinkle and move faster at high combo
            const speedMod = 1 + (comboIntensity * 2);
            const twinkle = star.brightness + Math.sin((now / (star.speed / speedMod)) + star.phase) * 0.25;

            // Move stars slowly downwards to give a feeling of forward momentum
            star.y += (1 + comboIntensity * 5) * 0.2;
            if (star.y > this.canvas.height) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }

            const alpha = Math.max(0.05, Math.min(1, twinkle));
            this.ctx.globalAlpha = alpha;

            // Stars shift from white to slight reddish/purple at max combo
            if (comboIntensity > 0.5) {
                this.ctx.fillStyle = '#ffccdd';
                this.ctx.shadowColor = '#ff2266';
            } else {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.shadowColor = '#aaaaff';
            }

            this.ctx.shadowBlur = star.size * 2 + (comboIntensity * 4);
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.restore();
    }

    spawnWord() {
        this.spawnCount++;

        const targetX = this.canvas.width / 2;
        const targetY = this.canvas.height;

        // Boss triggers every 50 standard spawns
        if (this.spawnCount > 0 && this.spawnCount % 50 === 0 && !this.isBossPhase) {
            this.startBossPhase();
            return;
        }

        // Swarm chance: 5% (spawns 3-5 very short words at once)
        if (Math.random() < 0.05) {
            const numSwarm = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < numSwarm; i++) {
                // Find a short word manually, or just use easy dict
                let text = this.dictionary.getRandomWord('easy');
                // Ensure it's very short for a swarm
                while (text.length > 4) text = this.dictionary.getRandomWord('easy');

                const sx = targetX + (Math.random() - 0.5) * 400;
                const sy = -100 - Math.random() * 100;
                const newWord = new Word(text, this.canvas.width, this.canvas.height, this.currentSpeedMultiplier, sx, targetY, { variant: 'swarm' });
                // Override spawn position manually
                newWord.x = sx;
                newWord.y = sy;
                this.words.push(newWord);
            }
            return;
        }

        const text = this.dictionary.getWordForDifficulty(this.difficulty);

        // 10% chance for Armored, 10% chance for Ghost
        let variant = 'normal';
        const rand = Math.random();
        if (rand < 0.1) variant = 'armored';
        else if (rand < 0.2) variant = 'ghost';

        const margin = 100;
        let bestX = margin + Math.random() * (this.canvas.width - 2 * margin);

        // Try up to 10 times to find a spawn X that is far enough from recent words (top of the screen)
        for (let tries = 0; tries < 10; tries++) {
            let tooClose = false;
            for (const w of this.words) {
                // Only care about words recently spawned (y < 150)
                if (w.y < 150 && Math.abs(w.x - bestX) < 180) {
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose) break;
            bestX = margin + Math.random() * (this.canvas.width - 2 * margin);
        }

        const newWord = new Word(text, this.canvas.width, this.canvas.height, this.currentSpeedMultiplier, targetX, targetY, { variant, x: bestX, y: -50 });
        this.words.push(newWord);
    }

    startBossPhase() {
        this.isBossPhase = true;

        const elements = ['fire', 'ice', 'thunder', 'dark'];
        const randomElement = elements[Math.floor(Math.random() * elements.length)];
        const difficultyScale = 1 + (this.bossesDefeated * 0.25);

        this.boss = new Boss(this.canvas.width, this.canvas.height, randomElement, difficultyScale);
        this.audio.playExplosion();
    }

    spawnBossAttack() {
        const isEpic = Math.random() > 0.5;
        const text = this.dictionary.getRandomWord(isEpic ? 'epic' : 'hard');

        const targetX = this.canvas.width / 2;
        const targetY = this.canvas.height;

        const magicBullet = new Word(text, this.canvas.width, this.canvas.height, this.currentSpeedMultiplier, targetX, targetY, { isBossAttack: true });
        this.words.push(magicBullet);
    }

    castBossSpell() {
        // Currently only Blind is implemented. Can add curses here later!
        this.receiveAttack('blind');

        // Visual indication that Boss casted a spell
        this.spawnExplosion(this.boss.x, this.boss.y, { particles: ['#8a2be2', '#4b0082', '#000000'] });
        this.audio.playExplosion();
    }

    endBossPhase() {
        this.stats.addScore(1000);
        this.isBossPhase = false;
        this.boss = null;
        this.audio.playLevelUp();
        this.bossesDefeated++;
        this.floatingTexts.push(new FloatingText("Level Cleared!", this.canvas.width / 2, this.canvas.height / 2, "#ffd700", 48));

        // Sabotage trigger
        if (this.onAttackCast) this.onAttackCast('swarm');

        if (this.stats.hasSkill('siphon')) {
            this.stats.mana = Math.min(this.stats.maxMana, this.stats.mana + (this.stats.maxMana * 0.5));
            this.stats.updateHUD();
        }

        this.spawnTimer = -2000;
    }

    handleKeyDown(e) {
        if (!this.isRunning) return;

        // Check for Ultimate Spell (Tab or Enter key)
        if (e.key === 'Tab' || e.key === 'Enter') {
            if (e.preventDefault) e.preventDefault(); // Prevent focus switching
            this.castUltimateSpell();
            return;
        }

        if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) return;

        // Ignore Spacebar so players don't accidentally break combo after finishing a word
        if (e.key === ' ') {
            if (e.preventDefault) e.preventDefault();
            return;
        }

        // Extremely important: prevent default to stop Desktop browsers from 
        // also typing this letter into the hidden `mobileInput`, which would 
        // cause a synthetic double-fire event!
        if (e.preventDefault) e.preventDefault();

        const letter = e.key.toLowerCase();

        if (this.targetedWord) {
            this.processKeystroke(this.targetedWord, letter);
        } else {
            let potentialTargets = this.words.filter(w => !w.dying && w.untyped[0] === letter);
            if (potentialTargets.length > 0) {
                potentialTargets.sort((a, b) => b.y - a.y);
                this.targetedWord = potentialTargets[0];
                this.targetedWord.isTargeted = true;
                this.processKeystroke(this.targetedWord, letter);
            } else {
                this.stats.recordStroke(false);
                this.audio.playErrorSound();
                this.stats.updateHUD(); // Ensure combo break is visible
            }
        }
    }

    processKeystroke(word, letter) {
        if (word.untyped[0] === letter) {
            word.typed += letter;
            word.untyped = word.untyped.slice(1);
            this.stats.recordStroke(true);
            this.audio.playTypeSound();

            // Spark at typed position
            this.ctx.font = 'bold 32px Cinzel, serif';
            const fullWidth = this.ctx.measureText(word.text).width;
            const typedWidth = this.ctx.measureText(word.typed).width;
            const textXOffset = -35;
            const sparkX = word.x + (-fullWidth / 2 + textXOffset + typedWidth) * word.scale;
            const sparkY = word.y + 70 * word.scale;
            this.spawnHitSpark(sparkX, sparkY, word.elementColors);

            if (word.untyped.length === 0) {
                // Word fully typed — trigger death animation
                this.stats.addScore(word.text.length, true, word.mistakesMade === 0);
                word.dying = true; // Let the animation play instead of instant splice
                this.audio.playExplosion();
                this.floatingTexts.push(new FloatingText(`+${word.text.length * 10}`, word.x, word.y - 15 * word.scale, "#00e5ff", 28));

                // Increase explosion size based on combo
                const comboBonus = Math.min(this.stats.combo, 50) / 50;
                this.spawnExplosion(word.x, word.y + 15 * word.scale, word.elementColors, comboBonus);
                this.playerAnimTimer = 200;
                this._triggerShake(4 + comboBonus * 4, 150 + comboBonus * 100);

                // Combustion Talent (Explosion AoE)
                if (this.stats.hasSkill('combustion') && this.stats.combo >= 50) {
                    const radius = 150;
                    for (let j = this.words.length - 1; j >= 0; j--) {
                        const otherW = this.words[j];
                        if (!otherW.dying && !otherW.isBossAttack && otherW !== word) {
                            const dist = Math.hypot(otherW.x - word.x, otherW.y - word.y);
                            if (dist < radius) {
                                otherW.dying = true;
                                this.stats.addScore(otherW.text.length, false);
                                this.spawnExplosion(otherW.x, otherW.y, otherW.elementColors, 0.5);
                                if (otherW === this.targetedWord) this.targetedWord = null;
                            }
                        }
                    }
                }

                // Fire counter-attack projectile at boss
                if (this.isBossPhase && this.boss && !this.boss.isDead && word.isBossAttack) {
                    const startX = this.canvas.width / 2 + 10;
                    const startY = this.canvas.height - 45;
                    const targetXOffset = (Math.random() - 0.5) * 100;
                    const projectile = new Projectile(startX, startY, this.boss.x + targetXOffset, this.boss.y + 20, word.elementColors.particles);
                    this.projectiles.push(projectile);
                }

                // Release targeting immediately so player can type next word
                this.targetedWord = null;
            }
        } else {
            this.stats.recordStroke(false);
            this.audio.playErrorSound();
            if (word) word.mistakesMade++;

            // Armored words reset on typo!
            if (word.variant === 'armored' && word.typed.length > 0) {
                word.untyped = word.typed + word.untyped;
                word.typed = "";
                word.isTargeted = false;
                this.targetedWord = null;
                this.audio.playShatter();
                this.floatingTexts.push(new FloatingText("Armor Repaired!", word.x, word.y - 30, "#a0a0a0", 20));

                // Visual feedback for armor regenerating
                this.ctx.font = 'bold 32px Cinzel, serif';
                const sparkX = word.x - this.ctx.measureText(word.text).width / 2 * word.scale;
                this.spawnHitSpark(sparkX, word.y, word.elementColors);
            }
        }

        this.stats.updateHUD();

        // Update audio intensity based on combo (0.0 to 1.0, maxing at 50 combo)
        this.audio.setMusicIntensity(this.stats.combo / 50);
    }

    castUltimateSpell() {
        if (!this.stats.useMana(100)) return;

        // Mana Overflow Skill: Ultimate restores 1 Barrier
        if (this.stats.hasSkill('burst')) {
            const maxAllowedLives = this.stats.hasSkill('life') ? 5 : 4;
            if (this.stats.lives < maxAllowedLives) {
                this.stats.lives++;
                this.stats.updateLivesDisplay();
            }
        }

        // Echo Cast Skill: 20% chance to immediately refund 50% max mana
        if (this.stats.hasSkill('echo') && Math.random() < 0.20) {
            this.stats.mana = Math.min(this.stats.maxMana, this.stats.mana + (this.stats.maxMana * 0.5));
            this.stats.updateHUD();
            this.spawnExplosion(this.canvas.width / 2, this.canvas.height / 2, { particles: ['#FF5722', '#FFE0B2', '#E64A19'] }, 1.5);
        }

        this.audio.playExplosion();
        // Massive screen shake for Nova
        this._triggerShake(30, 800);

        // Flash screen intensely
        this.ctx.fillStyle = 'rgba(0, 229, 255, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Spawn massive center explosion and Shockwave
        this.spawnExplosion(this.canvas.width / 2, this.canvas.height / 2, { particles: ['#00e5ff', '#ffffff', '#0077ff'] }, 5.0);
        this.particles.push(new Particle(this.canvas.width / 2, this.canvas.height / 2, 'shockwave'));

        // Destroy all normal words
        for (let i = this.words.length - 1; i >= 0; i--) {
            const word = this.words[i];

            // Skip if dying or is a boss attack
            if (word.dying || word.isBossAttack) continue;

            this.stats.addScore(word.text.length, false);
            word.dying = true;
            this.spawnExplosion(word.x, word.y, word.elementColors, 0.5);

            if (word === this.targetedWord) {
                this.targetedWord = null;
            }
        }

        // Damage Boss heavily
        if (this.isBossPhase && this.boss && !this.boss.isDead) {
            for (let i = 0; i < 3; i++) {
                this.boss.takeDamage();
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

            this.particles.push(particle);
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
            this.particles.push(p);
        }
    }

    receiveAttack(type) {
        if (!this.isRunning) return;

        if (type === 'blind') {
            const blindDuration = this.stats.hasSkill('vision') ? 2000 : 4000;
            this.blindTimer = blindDuration;
            this.floatingTexts.push(new FloatingText("BLINDED!", this.canvas.width / 2, this.canvas.height / 2, "#d500f9", 48));
        } else if (type === 'swarm') {
            this.floatingTexts.push(new FloatingText("SWARM INBOUND!", this.canvas.width / 2, this.canvas.height / 2, "#ff4b4b", 48));
            for (let i = 0; i < 4; i++) {
                // Assuming _spawnWord is a helper for spawnWord, or spawnWord can take a type
                // For now, calling spawnWord directly, it has logic for swarm
                this.spawnWord();
            }
        }
    }

    triggerGameOver() {
        this.stop();
        this.stats.updateHUD();
        this.stats.saveHighScore();

        if (this.onGameOver) {
            this.onGameOver(this.stats);
        }
    }
}
