import { Word } from './Word.js';
import { Boss } from './Boss.js';
import { Projectile } from './Projectile.js';
import { WordDictionary } from './WordDictionary.js';
import { Stats } from './Stats.js';
import { Particle } from './Particle.js';
import { AudioController } from './AudioController.js';
import { FloatingText } from './FloatingText.js';
import { Achievements } from './Achievements.js';
import { InputHandler } from './game/InputHandler.js';
import { CombatSystem } from './game/CombatSystem.js';
import { SigilEventSystem } from './game/SigilEventSystem.js';

export class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.dictionary = new WordDictionary();
        this.audio = new AudioController();
        this.achievements = new Achievements(this.audio);
        this.stats = new Stats(this.achievements);

        this.words = [];
        this.particles = [];
        this.ambientParticles = [];
        this.floatingTexts = [];
        this.targetedWord = null;

        this.lastTime = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 3000; // ms
        this.lastHudUpdate = 0; // For throttled HUD updates

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

        this.inputHandler = new InputHandler(this);
        this.combatSystem = new CombatSystem(this);
        this.sigilSystem = new SigilEventSystem(this);

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

    start(difficulty = 'normal', mode = 'classic', dictionaryType = 'classic') {
        this.difficulty = difficulty;
        this.gameMode = mode;
        this.dictionary.setDictionary(dictionaryType);

        if (this.gameMode === 'daily') {
            const todayStr = new Date().toISOString().split('T')[0];
            this.dictionary.setSeed(todayStr);
            // Force normal difficulty for daily challenges to ensure fairness
            this.difficulty = 'normal';
        } else {
            this.dictionary.setSeed(null);
        }

        this.sigilActive = false;
        this.sigilTimer = 0;
        this.sigilSequence = [];
        this.sigilInputs = [];
        this.sigilMaxTime = 0;

        this.reset();
        this.isRunning = true;
        this.audio.startBackgroundMusic();
        this.inputHandler.enable();
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    stop() {
        this.isRunning = false;
        this.audio.stopBackgroundMusic();
        this.inputHandler.disable();
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
        this.scrambleTimer = 0;

        // Boss phase state
        this.isBossPhase = false;
        this.boss = null;
        this.bossDimensionAlpha = 0;
        this.bossesDefeated = 0;

        // Screen shake
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        // Single run timer
        this.survivalTime = 0;
        this.survivorAwarded = false;

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

        if (this.isRunning) {
            this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
        }

        // Throttled HUD update: only update DOM stats every 200ms
        if (currentTime - this.lastHudUpdate >= 200) {
            this.stats.updateHUD();
            this.lastHudUpdate = currentTime;
        }
    }

    update(dt) {
        this.spawnTimer += dt;
        this.survivalTime += dt;

        if (!this.survivorAwarded && this.survivalTime > 300000) { // 5 minutes
            this.survivorAwarded = true;
            this.achievements.onEvent('time_survived', { time: 300 });
        }

        if (!this.isBossPhase && this.spawnTimer >= this.spawnInterval) {
            this.spawnWord();
            this.spawnTimer = 0;
        }

        // Chaos mode scramble
        if (this.gameMode === 'chaos' && !this.isBossPhase) {
            this.scrambleTimer += dt;
            if (this.scrambleTimer > 3000) { // Scramble every 3.0s
                this.scrambleTimer = 0;
                this.words.forEach(w => {
                    if (!w.isTargeted && w.scramble) w.scramble();
                });
            }
        }

        // Handle Sigil Event Time
        if (this.sigilActive) {
            this.sigilSystem.updateSigilEvent(dt);
            // Freeze everything else while Sigil QTE is active
            return;
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
                this.combatSystem.castBossSpell();
            }

            // Wait for death animation to fully finish before ending phase
            if (this.boss.isFullyDead() && this.words.length === 0 && this.projectiles.length === 0) {
                this.achievements.onEvent('boss_defeated');
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
                        this.combatSystem.triggerShake(15, 600);
                        this.combatSystem.spawnExplosion(this.canvas.width / 2, this.canvas.height / 2, { particles: ['#9C27B0', '#ffffff', '#E040FB'] }, 3.0);

                        for (let j = this.words.length - 1; j >= 0; j--) {
                            const w = this.words[j];
                            if (w.dying || w.isBossAttack) continue;
                            this.stats.addScore(w.text.length, false);
                            w.dying = true;
                            this.combatSystem.spawnExplosion(w.x, w.y, w.elementColors, 0.5);
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
                    this.combatSystem.spawnExplosion(word.x, word.y, { particles: [hitColor, '#ffffff'] });
                    this.combatSystem.triggerShake(5, 200);

                    // Drop combo on taking damage
                    this.stats.combo = 0;
                    this.bloodVignetteIntensity = 1.0;
                    this.stats.updateHUD();
                    this.floatingTexts.push(new FloatingText("Hits Taken", wizX, wizY - 120, hitColor, 28));

                    const isDead = this.stats.loseLife();
                    if (isDead) {
                        this.triggerGameOver();
                    }
                } else if (word.y > this.canvas.height + 150) {
                    // Check if word drifted completely off-screen (missed)
                    this.words.splice(i, 1);
                    if (word === this.targetedWord) this.targetedWord = null;

                    // Treat missed words as damage as well (optional, but typical for typing defense games)
                    this.audio.playShatter();
                    this.combatSystem.triggerShake(5, 200);
                    this.stats.combo = 0;
                    this.bloodVignetteIntensity = 1.0;
                    this.stats.updateHUD();
                    this.floatingTexts.push(new FloatingText("Word Missed", wizX, wizY - 120, hitColor, 28));

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
                    this.combatSystem.spawnExplosion(this.boss.x, this.boss.y, { particles: ['#ffd700', '#ffffff', '#ff4b4b'] });
                    this.combatSystem.triggerShake(7, 250);
                }
            }
        }
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
                const newWord = new Word(text, this.canvas.width, this.canvas.height, this.currentSpeedMultiplier, sx, targetY, { variant: 'swarm', gameMode: this.gameMode });
                // Override spawn position manually
                newWord.x = sx;
                newWord.y = sy;
                this.words.push(newWord);
            }
            return;
        }

        const text = this.dictionary.getWordForDifficulty(this.difficulty);

        // 10% chance for Armored, 10% chance for Ghost, 3% chance for Sigil
        let variant = 'normal';
        const rand = Math.random();
        if (rand < 0.03) variant = 'sigil';
        else if (rand < 0.13) variant = 'armored';
        else if (rand < 0.23) variant = 'ghost';

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

        let wordSpeedMultiplier = this.currentSpeedMultiplier;

        // Cryomancer Discipline: Slower words
        if (this.stats && this.stats.mageClass === 'Cryomancer') {
            wordSpeedMultiplier *= 0.85; // 15% slower
        }

        const newWord = new Word(text, this.canvas.width, this.canvas.height, wordSpeedMultiplier, targetX, targetY, { variant, x: bestX, y: -50, gameMode: this.gameMode });
        this.words.push(newWord);
    }

    startBossPhase() {
        this.isBossPhase = true;

        const elements = ['fire', 'ice', 'lightning', 'void'];
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

    triggerGameOver() {
        this.stop();
        this.stats.updateHUD();
        this.stats.saveHighScore();
        this.stats.addXP(Math.floor(this.stats.score / 10));
        this.stats.logRunToSupabase('arena', this.stats.getSessionWPM(), this.stats.getAccuracy(), this.stats.score);

        if (this.onGameOver) {
            this.onGameOver(this.stats);
        }
    }
}
