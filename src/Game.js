import { Word } from './Word.js';
import { Boss } from './Boss.js';
import { Projectile } from './Projectile.js';
import { WordDictionary } from './WordDictionary.js';
import { Stats } from './Stats.js';
import { Particle } from './Particle.js';
import { AudioController } from './AudioController.js';

export class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.dictionary = new WordDictionary();
        this.stats = new Stats();
        this.audio = new AudioController();

        this.words = [];
        this.particles = [];
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
                    this.words.splice(i, 1);
                    if (word === this.targetedWord) this.targetedWord = null;

                    this.audio.playShatter();
                    this.spawnExplosion(word.x, word.y, { particles: [hitColor, '#ffffff'] });
                    this._triggerShake(5, 200);

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

        // --- Star field ---
        this._drawStars();

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
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.shadowColor = '#ff00ff';
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

        // --- Projectiles ---
        this.projectiles.forEach(p => p.draw(this.ctx));

        // --- Particles ---
        this.particles.forEach(p => p.draw(this.ctx));

        this.ctx.restore(); // Restore from screen shake translate
    }

    _drawStars() {
        const now = performance.now();
        this.ctx.save();
        this.stars.forEach(star => {
            const twinkle = star.brightness + Math.sin((now / star.speed) + star.phase) * 0.25;
            const alpha = Math.max(0.05, Math.min(1, twinkle));
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.shadowColor = '#aaaaff';
            this.ctx.shadowBlur = star.size * 2;
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

        const text = this.dictionary.getWordForDifficulty(this.difficulty);
        const newWord = new Word(text, this.canvas.width, this.canvas.height, this.currentSpeedMultiplier, targetX, targetY);
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

        const magicBullet = new Word(text, this.canvas.width, this.canvas.height, this.currentSpeedMultiplier, targetX, targetY, true);
        this.words.push(magicBullet);
    }

    endBossPhase() {
        this.stats.addScore(1000);
        this.isBossPhase = false;
        this.boss = null;
        this.audio.playExplosion();
        this.bossesDefeated++;

        this.spawnTimer = -2000;
    }

    handleKeyDown(e) {
        if (!this.isRunning) return;
        if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) return;

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
            }
        }
    }

    processKeystroke(word, letter) {
        if (word.untyped[0] === letter) {
            word.typed += letter;
            word.untyped = word.untyped.slice(1);
            this.stats.recordStroke(true);
            this.audio.playMagicSpark();

            // Spark at typed position
            this.ctx.font = 'bold 32px Cinzel';
            const fullWidth = this.ctx.measureText(word.text).width;
            const typedWidth = this.ctx.measureText(word.typed).width;
            const textXOffset = -35;
            const sparkX = word.x + (-fullWidth / 2 + textXOffset + typedWidth) * word.scale;
            const sparkY = word.y + 70 * word.scale;
            this.spawnHitSpark(sparkX, sparkY, word.elementColors);

            if (word.untyped.length === 0) {
                // Word fully typed — trigger death animation
                this.stats.addScore(word.text.length);
                word.dying = true; // Let the animation play instead of instant splice
                this.audio.playExplosion();

                this.spawnExplosion(word.x, word.y + 15 * word.scale, word.elementColors);
                this.playerAnimTimer = 200;
                this._triggerShake(4, 150);

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
        }

        this.stats.updateHUD();
    }

    spawnExplosion(x, y, elementColors) {
        const colors = elementColors.particles;
        const numParticles = 35 + Math.random() * 20; // More energetic burst
        for (let i = 0; i < numParticles; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push(new Particle(x, y, color));
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

    triggerGameOver() {
        this.stop();
        this.stats.updateHUD();
        this.stats.saveHighScore();

        if (this.onGameOver) {
            this.onGameOver(this.stats);
        }
    }
}
