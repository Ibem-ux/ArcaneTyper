import { Sprite } from './Sprite.js';

export class Word {
    constructor(text, canvasWidth, canvasHeight, speedMultiplier, targetX, targetY, options = {}) {
        this.text = text;
        this.isBossAttack = options.isBossAttack || false;

        this.variant = options.variant || 'normal';
        this.typed = "";
        this.untyped = text;
        this.mistakesMade = 0;

        // Caching text measurements
        this._lastTypedStr = null;
        this._cachedTypedWidth = 0;

        // Setup temporary canvas to pre-calculate static widths
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = 'bold 32px Cinzel';
        this.totalTextWidth = tempCtx.measureText(this.text).width;

        // Pre-calculate sprite target width
        const minSpriteWidth = 100;
        this.spriteTargetWidth = Math.max(this.totalTextWidth, minSpriteWidth);

        // Elements
        const elementNames = ['fire', 'ice', 'lightning', 'void'];
        this.elementName = elementNames[Math.floor(Math.random() * elementNames.length)];
        this.elementColors = Word.ELEMENTS[this.elementName];

        this.sprite = null;
        const spriteMap = {
            'fire': '/fire.png',
            'ice': '/ice.png',
            'lightning': '/lightning.png',
            'void': '/void.png'
        };

        const spriteSrc = spriteMap[this.elementName];
        if (spriteSrc) {
            this.sprite = new Sprite(spriteSrc, 0, 5, 2.5, this.elementName);
        }

        // Position
        if (this.isBossAttack) {
            this.x = canvasWidth / 2;
            this.y = 100; // Boss's targetY
        } else {
            this.y = -50;
            const margin = 100;
            this.x = margin + Math.random() * (canvasWidth - 2 * margin);
        }

        // Scale
        if (this.isBossAttack) {
            this.scale = 0.25 + Math.random() * 0.1;
        } else {
            this.scale = 0.45 + Math.random() * 0.25;
        }

        // Speed
        const baseSpeed = 0.8 + Math.random() * 0.6;
        let finalSpeed = (baseSpeed * speedMultiplier) * (1 - (text.length * 0.02));

        if (this.isBossAttack) {
            finalSpeed *= 0.35;
        } else if (this.variant === 'swarm') {
            finalSpeed *= 1.8; // Swarm is very fast
        } else if (this.variant === 'armored') {
            finalSpeed *= 0.6; // Armored is slow
        }

        this.speed = finalSpeed;

        // Velocity vector towards target
        this.targetX = targetX;
        this.targetY = targetY;

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.vx = (dx / distance) * this.speed * 0.05;
        this.vy = (dy / distance) * this.speed * 0.05;

        this.angle = Math.atan2(dy, dx) - Math.PI / 2;

        this.isTargeted = false;
        this.isDead = false;

        // --- Fade-in animation ---
        this.opacity = 0;
        this.spawnTimer = 0;
        this.spawnDuration = 300; // ms

        // --- Death animation ---
        this.dying = false;
        this.deathTimer = 0;
        this.deathDuration = 200; // ms
        this.deathScale = 1.0; // scale multiplier during death
    }

    update(dt) {
        // Fade-in
        if (this.spawnTimer < this.spawnDuration) {
            this.spawnTimer += dt;
            this.opacity = Math.min(1, this.spawnTimer / this.spawnDuration);
        }

        // Death animation
        if (this.dying) {
            this.deathTimer += dt;
            const progress = Math.min(1, this.deathTimer / this.deathDuration);
            this.opacity = 1.0 - progress;
            this.deathScale = 1.0 + progress * 0.4; // scale up slightly
            if (this.deathTimer >= this.deathDuration) {
                this.isDead = true;
            }
            return; // Don't move while dying
        }

        // Move diagonally towards target
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Ghost oscillating opacity
        if (this.variant === 'ghost' && !this.isTargeted) {
            // Oscillate opacity between 0.0 and 1.0 based on time + unique offset
            const time = performance.now();
            const wave = Math.sin((time / 400) + (this.x / 100)); // Sine wave
            this.opacity = Math.max(0, wave); // Clamp at 0 so it stays invisible for a chunk of the cycle
        } else if (this.variant === 'ghost' && this.isTargeted) {
            this.opacity = 1.0; // Force visible when targeted
        }

        // Update sprite animation frame
        if (this.sprite) {
            this.sprite.update();
        }
    }

    draw(ctx) {
        if (this.isDead) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale * this.deathScale, this.scale * this.deathScale);
        ctx.globalAlpha = this.opacity;

        if (this.isTargeted) {
            ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
            ctx.shadowBlur = 15;
        }

        ctx.font = 'bold 32px Cinzel, serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Cache measured text width
        if (this._lastTypedStr !== this.typed) {
            this._cachedTypedWidth = ctx.measureText(this.typed).width;
            this._lastTypedStr = this.typed;
        }

        const textYOffset = 70;
        const textXOffset = -35;
        const startX = (-this.totalTextWidth / 2) + textXOffset;

        // Draw Animated Sprite above the text
        if (this.sprite) {
            this.sprite.draw(ctx, 0, -15, this.spriteTargetWidth, this.elementName, this.angle);
        }

        ctx.save();
        if (this.isBossAttack) {
            ctx.scale(1.5, 1.5);
        }

        // Text background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        const paddingX = 10;
        const totalTextWidth = this._cachedTypedWidth + ctx.measureText(this.untyped).width;
        const boxWidth = totalTextWidth + paddingX * 2;
        const boxHeight = 40;
        const boxX = startX - paddingX;
        const boxY = textYOffset - boxHeight / 2;

        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 5);
        } else {
            ctx.rect(boxX, boxY, boxWidth, boxHeight);
        }

        // Armored word has a metallic/red border
        if (this.variant === 'armored') {
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#ff4b4b'; // Red armor core
            ctx.stroke();

            // Draw a subtle lock icon next to the word to visually hint it's different
            ctx.fillStyle = '#ff4b4b';
            ctx.font = '16px serif';
            ctx.fillText('🛡️', boxX - 25, textYOffset);

            ctx.font = 'bold 32px Cinzel, serif'; // Restore font
        }

        // Swarm word has a smaller, greener box outline
        if (this.variant === 'swarm') {
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#00e5ff';
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fill();

        // Typed part
        ctx.fillStyle = this.isTargeted ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)';
        ctx.fillText(this.typed, startX, textYOffset);

        // Untyped part
        ctx.fillStyle = this.isTargeted ? '#ffd700' : '#ffffff';
        ctx.fillText(this.untyped, startX + this._cachedTypedWidth, textYOffset);

        ctx.restore();
        ctx.restore();
    }

    typeLetter(letter) {
        if (this.untyped[0] === letter) {
            this.typed += letter;
            this.untyped = this.untyped.slice(1);
            return true;
        }
        return false;
    }

    isCompleted() {
        return this.untyped.length === 0;
    }
}

Word.ELEMENTS = {
    fire: {
        untyped: '#ff7b54',
        untypedTargeted: '#ff4b4b',
        typed: '#4a3b5a',
        typedTargeted: '#b892b0',
        particles: ['#ff4b4b', '#ff7b54', '#ffd700', '#4a0000']
    },
    ice: {
        untyped: '#b3e5fc',
        untypedTargeted: '#29b6f6',
        typed: '#4a3b5a',
        typedTargeted: '#b892b0',
        particles: ['#b3e5fc', '#29b6f6', '#ffffff', '#0277bd']
    },
    lightning: {
        untyped: '#e1bee7',
        untypedTargeted: '#d500f9',
        typed: '#4a3b5a',
        typedTargeted: '#b892b0',
        particles: ['#d500f9', '#ea80fc', '#ffffff', '#4a148c']
    },
    void: {
        untyped: '#80cbc4',
        untypedTargeted: '#00bfa5',
        typed: '#4a3b5a',
        typedTargeted: '#b892b0',
        particles: ['#00bfa5', '#1de9b6', '#004d40', '#000000']
    }
};
