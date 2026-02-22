import { Sprite } from './Sprite.js';

export class Word {
    constructor(text, canvasWidth, canvasHeight, speedMultiplier, targetX, targetY, isBossAttack = false) {
        this.text = text;
        this.typed = "";
        this.untyped = text;
        this.isBossAttack = isBossAttack;

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
            // Boss attacks spawn from the center top (where the boss is)
            this.x = canvasWidth / 2;
            this.y = 100; // Boss's targetY
        } else {
            // Normal attacks start off-screen top, random X
            this.y = -50;
            const margin = 100;
            this.x = margin + Math.random() * (canvasWidth - 2 * margin);
        }

        // Optional aesthetic props
        if (this.isBossAttack) {
            this.scale = 0.25 + Math.random() * 0.1; // Make the sprite/hitbox smaller for Boss bullets
        } else {
            this.scale = 0.45 + Math.random() * 0.25;
        }

        // Speed varies slightly by word length and random factor
        const baseSpeed = 0.8 + Math.random() * 0.6;
        let finalSpeed = (baseSpeed * speedMultiplier) * (1 - (text.length * 0.02));

        // Boss attacks are significantly slower to make them fair despite being hard words
        if (this.isBossAttack) {
            finalSpeed *= 0.35;
        }

        this.speed = finalSpeed;

        // Calculate velocity vector towards target
        this.targetX = targetX;
        this.targetY = targetY;

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize and multiply by speed (multiplied by 0.05 to match original downward speed scaling)
        this.vx = (dx / distance) * this.speed * 0.05;
        this.vy = (dy / distance) * this.speed * 0.05;

        // Calculate angle pointing towards the wizard (straight down is 0 rotation visually, so we adjust atan2)
        // Math.atan2(dy, dx) gives the absolute angle. Since the sprites are drawn naturally pointing "up" or neutral,
        // we might just need the direct angle + an offset depending on the sprite sheet's default orientation.
        // Assuming sprite default points DOWN (-Y in canvas space), the default dx,dy is (0, 1), which is PI/2.
        // So angle = atan2(dy, dx) - PI/2 gives the rotation needed.
        this.angle = Math.atan2(dy, dx) - Math.PI / 2;

        this.isTargeted = false;
        this.isDead = false;
        this.opacity = 1;

    }

    update(dt) {
        // Move diagonally towards target
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Update sprite animation frame
        if (this.sprite) {
            this.sprite.update();
        }
    }

    draw(ctx) {
        if (this.isDead) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        if (this.isTargeted) {
            // Glow effect for targeted word
            ctx.shadowColor = 'rgba(255, 215, 0, 0.8)'; // gold glow
            ctx.shadowBlur = 15;
        }

        ctx.font = 'bold 32px Cinzel';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Cache the measured text width to save expensive Canvas computations
        if (this._lastTypedStr !== this.typed) {
            this._cachedTypedWidth = ctx.measureText(this.typed).width;
            this._lastTypedStr = this.typed;
        }

        const textYOffset = 70; // Move text further below the elemental sprite
        const textXOffset = -35; // Manually shift text slightly left to align with the sprite's visual center

        const startX = (-this.totalTextWidth / 2) + textXOffset;

        // Draw Animated Sprite above the text
        if (this.sprite) {
            // Draw perfectly centered at 0, passing the angle
            this.sprite.draw(ctx, 0, -15, this.spriteTargetWidth, this.elementName, this.angle);
        }

        // To make the text bigger while the sprite/hitbox is smaller:
        // Reverse some of the scaling just for the text rendering
        ctx.save();
        if (this.isBossAttack) {
            // Boss attack sprites are scaled down heavily (e.g. 0.25)
            // If we want the text larger, we scale it back up relative to the sprite
            ctx.scale(1.5, 1.5);
        }

        // Draw typed part (dimmed white)
        ctx.fillStyle = this.isTargeted ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)';
        ctx.fillText(this.typed, startX, textYOffset);

        // Draw untyped part (bright white / gold if targeted)
        ctx.fillStyle = this.isTargeted ? '#ffd700' : '#ffffff';
        ctx.fillText(this.untyped, startX + this._cachedTypedWidth, textYOffset);

        ctx.restore(); // Restore from text-specific scale
        ctx.restore(); // Restore from world scale
    }

    typeLetter(letter) {
        if (this.untyped[0] === letter) {
            this.typed += letter;
            this.untyped = this.untyped.slice(1);
            return true; // Correct letter
        }
        return false; // Wrong letter
    }

    isCompleted() {
        return this.untyped.length === 0;
    }
}

Word.ELEMENTS = {
    fire: {
        untyped: '#ff7b54',        // Soft orange
        untypedTargeted: '#ff4b4b',// Hot red
        typed: '#4a3b5a',
        typedTargeted: '#b892b0',
        particles: ['#ff4b4b', '#ff7b54', '#ffd700', '#4a0000']
    },
    ice: {
        untyped: '#b3e5fc',        // Soft cyan
        untypedTargeted: '#29b6f6',// Bright cyan/blue
        typed: '#4a3b5a',
        typedTargeted: '#b892b0',
        particles: ['#b3e5fc', '#29b6f6', '#ffffff', '#0277bd']
    },
    lightning: {
        untyped: '#e1bee7',        // Soft pink/purple
        untypedTargeted: '#d500f9',// Shocking violet
        typed: '#4a3b5a',
        typedTargeted: '#b892b0',
        particles: ['#d500f9', '#ea80fc', '#ffffff', '#4a148c']
    },
    void: {
        untyped: '#80cbc4',        // Deep teal
        untypedTargeted: '#00bfa5',// Bright poison green
        typed: '#4a3b5a',
        typedTargeted: '#b892b0',
        particles: ['#00bfa5', '#1de9b6', '#004d40', '#000000']
    }
};
