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

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Bind global keyboard event
        this.handleKeyDown = this.handleKeyDown.bind(this);

        // Event callbacks array for UI orchestration
        this.onGameOver = () => { };
    }

    resizeCanvas() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
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
        this.spawnCount = 0; // Track spawns for boss mechanic

        // Boss phase state
        this.isBossPhase = false;
        this.boss = null;
        this.bossDimensionAlpha = 0; // For background fade effect
        this.bossesDefeated = 0;

        // Define difficulty constraints
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
    }

    gameLoop(currentTime) {
        if (!this.isRunning) return;

        let dt = currentTime - this.lastTime;

        // Clamp dt to a maximum of 50ms to prevent massive unplayable lag spikes 
        // if the browser tab goes into the background or execution stalls.
        dt = Math.min(dt, 50);

        this.lastTime = currentTime;

        this.update(dt);
        this.draw();

        // Occasional stats UI update
        if (Math.random() < 0.1) {
            this.stats.updateHUD();
        }

        if (this.isRunning) {
            this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    update(dt) {
        this.spawnTimer += dt;

        // Difficulty scaling is now constant per difficulty level.
        if (!this.isBossPhase && this.spawnTimer >= this.spawnInterval) {
            this.spawnWord();
            this.spawnTimer = 0;
        }

        // Pocket Dimension Transition
        if (this.isBossPhase && this.bossDimensionAlpha < 1) {
            this.bossDimensionAlpha = Math.min(1, this.bossDimensionAlpha + dt * 0.001); // 1-second fade
        } else if (!this.isBossPhase && this.bossDimensionAlpha > 0) {
            this.bossDimensionAlpha = Math.max(0, this.bossDimensionAlpha - dt * 0.001);
        }

        if (this.playerAnimTimer > 0) {
            this.playerAnimTimer = Math.max(0, this.playerAnimTimer - dt);
        }

        // Boss Logic
        if (this.isBossPhase && this.boss) {
            this.boss.update(dt);

            // Boss attacks
            if (this.boss.shouldAttack() && !this.boss.isDead) {
                this.spawnBossAttack();
            }

            // If boss is defeated, return to normal phase
            if (this.boss.isDead && this.words.length === 0 && this.projectiles.length === 0) {
                this.endBossPhase();
            }
        }

        const wizX = this.canvas.width / 2;
        const wizY = this.canvas.height; // Target hit box is at the bottom center

        // Active barrier radius mapping
        // lives 4 = 110 radius
        // lives 3 = 85 radius
        // lives 2 = 60 radius
        // lives 1 = 30 radius (wizard hit box)
        let activeRadius = 30;
        let hitColor = '#ff4b4b'; // Default blood red if wizard hit

        if (this.stats.lives >= 4) { activeRadius = 110; hitColor = '#ffd700'; }
        else if (this.stats.lives === 3) { activeRadius = 85; hitColor = '#d500f9'; }
        else if (this.stats.lives === 2) { activeRadius = 60; hitColor = '#29b6f6'; }

        for (let i = this.words.length - 1; i >= 0; i--) {
            const word = this.words[i];
            word.update(dt);

            // Distance collision check
            const dx = word.x - wizX;
            const dy = word.y - wizY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // We subtract a little bit off the word's radius for a tighter hitbox
            const textHitboxSize = 20;

            if (distance < activeRadius + textHitboxSize) {
                this.words.splice(i, 1);
                if (word === this.targetedWord) this.targetedWord = null;

                // Play glassy shatter sound
                this.audio.playShatter();

                // Spawn barrier breaking / hit effect
                this.spawnExplosion(word.x, word.y, { particles: [hitColor, '#ffffff'] });

                const isDead = this.stats.loseLife();
                if (isDead) {
                    this.triggerGameOver();
                }
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

            // Check collision with boss
            if (proj.isDead) {
                this.projectiles.splice(i, 1);

                if (this.isBossPhase && this.boss && !this.boss.isDead) {
                    this.boss.takeDamage();
                    this.audio.playExplosion();
                    this.spawnExplosion(this.boss.x, this.boss.y, { particles: ['#ffd700', '#ffffff', '#ff4b4b'] });
                }
            }
        }
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Pocket Dimension Background if active
        if (this.bossDimensionAlpha > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = this.bossDimensionAlpha;
            const gradient = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, 50,
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 1.5
            );
            gradient.addColorStop(0, '#2a0808'); // Blood red center
            gradient.addColorStop(1, '#05020a'); // Void edges
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }

        // Draw Wizard and Barriers
        this.ctx.save();
        const wizX = this.canvas.width / 2;
        const wizY = this.canvas.height; // Pushed all the way to bottom edge to overlap

        // Draw active barriers (arcs) around the wizard
        // lives: 4 = 3 barriers, 3 = 2 barriers, 2 = 1 barrier
        const barriers = [
            { radius: 60, color: '#29b6f6', active: this.stats.lives >= 2 }, // Inner (Cyan)
            { radius: 85, color: '#d500f9', active: this.stats.lives >= 3 }, // Middle (Purple)
            { radius: 110, color: '#ffd700', active: this.stats.lives >= 4 }  // Outer (Gold)
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

        // Clear shadow for wizard
        this.ctx.shadowBlur = 0;

        // Draw Staff
        this.ctx.save();

        // Animation logic (raise staff quickly, then ease down)
        const animProgress = this.playerAnimTimer > 0 ? this.playerAnimTimer / 200 : 0;
        const staffAngle = (Math.PI / 6) * (1 - animProgress); // Rest = ~30 deg right (PI/6), Raised = 0 deg

        // Position of wizard hand holding the staff
        const staffBaseX = wizX + 10;
        const staffBaseY = wizY - 5; // A bit up from the bottom

        this.ctx.translate(staffBaseX, staffBaseY);
        this.ctx.rotate(staffAngle);

        // Draw pole
        this.ctx.fillStyle = '#4a3320'; // Dark brown wood
        this.ctx.fillRect(-2, -40, 5, 45); // 45px long

        // Draw gem at top
        this.ctx.beginPath();
        this.ctx.arc(0, -42, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ff00ff'; // Magic gem color (magenta-ish to match theme)
        this.ctx.shadowColor = '#ff00ff';
        this.ctx.shadowBlur = 15;
        this.ctx.fill();

        this.ctx.restore();
        this.ctx.shadowBlur = 0; // Reset shadow for wizard

        // Draw Wizard Silhouette
        this.ctx.fillStyle = '#110a17'; // very dark purple/black
        this.ctx.strokeStyle = '#3a2b52';
        this.ctx.lineWidth = 1;

        // Cloak (triangle with curved bottom)
        this.ctx.beginPath();
        this.ctx.moveTo(wizX, wizY - 24); // Top of cloak (neck)
        this.ctx.lineTo(wizX - 15, wizY + 18); // Bottom left
        this.ctx.quadraticCurveTo(wizX, wizY + 21, wizX + 15, wizY + 18); // Curved bottom
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Hat (pointy wizard hat)
        this.ctx.beginPath();
        this.ctx.moveTo(wizX - 11, wizY - 21); // Brim left
        this.ctx.quadraticCurveTo(wizX, wizY - 18, wizX + 11, wizY - 21); // Brim curve
        this.ctx.lineTo(wizX + 1, wizY - 45); // Hat tip
        this.ctx.lineTo(wizX - 1, wizY - 45);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.restore();

        // Draw Boss
        if (this.isBossPhase && this.boss) {
            this.boss.draw(this.ctx);
        }

        // Draw all words
        // Draw untargeted first so targeted is always on top
        this.words.forEach(word => !word.isTargeted && word.draw(this.ctx));
        if (this.targetedWord) {
            this.targetedWord.draw(this.ctx);
        }

        // Draw projectiles AFTER words so magic bullets appear on top
        this.projectiles.forEach(p => p.draw(this.ctx));

        // Draw particles on top of words
        this.particles.forEach(p => p.draw(this.ctx));
    }

    spawnWord() {
        this.spawnCount++;

        // Wizard's center position
        const targetX = this.canvas.width / 2;
        const targetY = this.canvas.height;

        // Trigger boss phase every 100 standard spawns
        if (this.spawnCount > 0 && this.spawnCount % 100 === 0 && !this.isBossPhase) {
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

        // Every boss beaten increases stats by +25%
        const difficultyScale = 1 + (this.bossesDefeated * 0.25);

        this.boss = new Boss(this.canvas.width, this.canvas.height, randomElement, difficultyScale);
        this.audio.playExplosion(); // Dramatic entrance

        // Optionally clear current board words to focus purely on boss, 
        // but leaving them creates a cool transition chaos.
    }

    spawnBossAttack() {
        // Boss always fires hard or epic words
        const isEpic = Math.random() > 0.5;
        const text = this.dictionary.getRandomWord(isEpic ? 'epic' : 'hard');

        const targetX = this.canvas.width / 2;
        const targetY = this.canvas.height;

        // isBossAttack = true makes it spawn exactly on the boss and move slowly
        const magicBullet = new Word(text, this.canvas.width, this.canvas.height, this.currentSpeedMultiplier, targetX, targetY, true);
        this.words.push(magicBullet);
    }

    endBossPhase() {
        this.stats.addScore(1000); // Massive point bonus
        this.isBossPhase = false;
        this.boss = null;
        this.audio.playExplosion(); // Victory explosion
        this.bossesDefeated++;

        // Small delay before normal spawning resumes
        this.spawnTimer = -2000;
    }

    handleKeyDown(e) {
        if (!this.isRunning) return;

        // Ignore meta keys
        if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) return;

        const letter = e.key.toLowerCase();

        // Are we already targeting a word?
        if (this.targetedWord) {
            this.processKeystroke(this.targetedWord, letter);
        } else {
            // Find a word starting with this letter (lock-on mechanic)
            // Prioritize the one furthest down (largest y, closer to ward)
            let potentialTargets = this.words.filter(w => w.untyped[0] === letter);
            if (potentialTargets.length > 0) {
                potentialTargets.sort((a, b) => b.y - a.y);
                this.targetedWord = potentialTargets[0];
                this.targetedWord.isTargeted = true;
                this.processKeystroke(this.targetedWord, letter);
            } else {
                // Wrong initial keypress
                this.stats.recordStroke(false);
            }
        }
    }

    processKeystroke(word, letter) {
        if (word.untyped[0] === letter) {
            // Correct standard letter!
            word.typed += letter;
            word.untyped = word.untyped.slice(1);
            this.stats.recordStroke(true);
            this.audio.playMagicSpark();

            // Spawn a small spark for typing feedback
            this.ctx.font = 'bold 32px Cinzel'; // Ensure font match for measurement
            const fullWidth = this.ctx.measureText(word.text).width;
            const typedWidth = this.ctx.measureText(word.typed).width;
            const textXOffset = -35;

            // Adjust hit spark location based on word.scale
            const sparkX = word.x + (-fullWidth / 2 + textXOffset + typedWidth) * word.scale;
            const sparkY = word.y + 70 * word.scale;

            this.spawnHitSpark(sparkX, sparkY, word.elementColors);

            if (word.untyped.length === 0) {
                // Word is fully typed!
                this.stats.addScore(word.text.length);
                word.isDead = true;
                this.audio.playExplosion();

                // Spawn particle burst at word's location
                this.spawnExplosion(word.x, word.y + 15 * word.scale, word.elementColors);

                // Trigger "raise staff" animation
                this.playerAnimTimer = 200; // 200ms

                // If this was a boss attack (bullet), fire a projectile back at the boss
                if (this.isBossPhase && this.boss && !this.boss.isDead && word.isBossAttack) {
                    // Fire from the raised staff tip (wizX + 10, wizY - 45)
                    const startX = this.canvas.width / 2 + 10;
                    const startY = this.canvas.height - 45;
                    // Target slightly off-center to avoid perfectly overlapping paths with incoming words
                    const targetXOffset = (Math.random() - 0.5) * 100; // Spread projectiles out along the boss
                    const projectile = new Projectile(startX, startY, this.boss.x + targetXOffset, this.boss.y + 20, word.elementColors.particles);
                    this.projectiles.push(projectile);
                }

                this.words = this.words.filter(w => w !== word);
                this.targetedWord = null;
            }
        } else {
            // Wrong keystroke on targeted word
            this.stats.recordStroke(false);
        }

        this.stats.updateHUD(); // force immediate update on stroke
    }

    spawnExplosion(x, y, elementColors) {
        const colors = elementColors.particles;
        const numParticles = 20 + Math.random() * 15;
        for (let i = 0; i < numParticles; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push(new Particle(x, y, color));
        }
    }

    spawnHitSpark(x, y, elementColors) {
        const colors = elementColors.particles;
        const numParticles = 3 + Math.random() * 2;
        for (let i = 0; i < numParticles; i++) {
            // Pick a random color from the element's palette for variety
            const color = colors[Math.floor(Math.random() * colors.length)];
            const p = new Particle(x, y, color);
            p.life = 0.5; // die faster
            p.size = Math.random() * 2 + 1; // smaller
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
