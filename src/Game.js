import { Word } from './Word.js';
import { WordDictionary } from './WordDictionary.js';
import { Stats } from './Stats.js';
import { Particle } from './Particle.js';

export class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.dictionary = new WordDictionary();
        this.stats = new Stats();

        this.words = [];
        this.particles = [];
        this.targetedWord = null;

        this.lastTime = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 3000; // ms

        this.isRunning = false;
        this.animationFrameId = null;

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

    start() {
        this.reset();
        this.isRunning = true;
        window.addEventListener('keydown', this.handleKeyDown);
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    stop() {
        this.isRunning = false;
        window.removeEventListener('keydown', this.handleKeyDown);
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    reset() {
        this.words = [];
        this.particles = [];
        this.targetedWord = null;
        this.spawnTimer = 0;
        this.spawnInterval = 3000;
        this.stats.reset();
    }

    gameLoop(currentTime) {
        if (!this.isRunning) return;

        const dt = currentTime - this.lastTime;
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

        // Difficulty scaling: spawn aster the more score we have
        let currentSpawnInterval = Math.max(600, this.spawnInterval - (this.stats.score * 0.8));

        if (this.spawnTimer >= currentSpawnInterval) {
            this.spawnWord();
            this.spawnTimer = 0;
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
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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

        // Draw all words
        // Draw untargeted first so targeted is always on top
        this.words.forEach(word => !word.isTargeted && word.draw(this.ctx));
        if (this.targetedWord) {
            this.targetedWord.draw(this.ctx);
        }

        // Draw particles on top of words
        this.particles.forEach(p => p.draw(this.ctx));
    }

    spawnWord() {
        const text = this.dictionary.getWordByDifficultyScore(this.stats.score);
        // Speed multiplier increases gently every 200 points
        const speedMultiplier = 1 + Math.floor(this.stats.score / 200) * 0.05;

        // Wizard's center position
        const targetX = this.canvas.width / 2;
        const targetY = this.canvas.height; // Exactly at the bottom border

        const newWord = new Word(text, this.canvas.width, this.canvas.height, speedMultiplier, targetX, targetY);
        this.words.push(newWord);
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
            // Correct!
            word.typed += letter;
            word.untyped = word.untyped.slice(1);
            this.stats.recordStroke(true);

            // Spawn a small spark for typing feedback
            this.ctx.font = 'bold 32px Cinzel'; // Ensure font match for measurement
            const fullWidth = this.ctx.measureText(word.text).width;
            const typedWidth = this.ctx.measureText(word.typed).width;
            const textXOffset = -35; // Aligns with Word.js offset
            this.spawnHitSpark(word.x - fullWidth / 2 + textXOffset + typedWidth, word.y + 70, word.elementColors);

            if (word.untyped.length === 0) {
                // Word is fully typed!
                this.stats.addScore(word.text.length);
                word.isDead = true;

                // Spawn particle burst at word's location
                this.spawnExplosion(word.x, word.y + 15, word.elementColors);

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
