import { Word } from './Word.js';
import { Sprite } from './Sprite.js';

export class BossWord extends Word {
    constructor(text, canvasWidth, canvasHeight, speedMultiplier, targetX, targetY) {
        super(text, canvasWidth, canvasHeight, speedMultiplier, targetX, targetY);

        // Core Boss Properties
        this.isBoss = true;

        // Massive slowdown (e.g. 25% of normal speed)
        this.speed = this.speed * 0.25;
        this.vx = this.vx * 0.25;
        this.vy = this.vy * 0.25;

        // Scale it up
        this.scale = 1.3 + Math.random() * 0.3;

        // Visual setup for the multi-element mechanic
        this.segments = text.split('-');
        this.currentSegmentIndex = 0;

        // Generate random elements for each segment ensuring they are different consecutively
        this.elementSequence = [];
        const elementNames = ['fire', 'ice', 'lightning', 'void'];
        let lastElement = '';
        for (let i = 0; i < this.segments.length; i++) {
            let ele;
            do {
                ele = elementNames[Math.floor(Math.random() * elementNames.length)];
            } while (ele === lastElement);
            this.elementSequence.push(ele);
            lastElement = ele;
        }

        this.applyCurrentElement();
    }

    applyCurrentElement() {
        this.elementName = this.elementSequence[this.currentSegmentIndex];
        this.elementColors = Word.ELEMENTS[this.elementName];

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
    }

    // Override typeLetter to check for segment completion
    // Returns { correct: boolean, segmentComplete: boolean }
    typeBossLetter(letter) {
        if (this.untyped[0] === letter) {
            this.typed += letter;
            this.untyped = this.untyped.slice(1);

            // Check if we just typed a hyphen (meaning we completed a segment)
            // or if we finished the entire word
            if (letter === '-' && this.untyped.length > 0) {
                this.currentSegmentIndex++;
                this.applyCurrentElement(); // Shift visual element immediately
                return { correct: true, segmentComplete: true };
            }

            return { correct: true, segmentComplete: false };
        }
        return { correct: false, segmentComplete: false };
    }

    draw(ctx) {
        if (this.isDead) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        // Intimidating red shadow always present for boss, gold if targeted
        ctx.shadowColor = this.isTargeted ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 0, 0, 0.6)';
        ctx.shadowBlur = this.isTargeted ? 20 : 10;

        ctx.font = 'bold 32px Cinzel';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        if (this._lastTypedStr !== this.typed) {
            this._cachedTypedWidth = ctx.measureText(this.typed).width;
            this._lastTypedStr = this.typed;
        }

        const textYOffset = 70;
        const textXOffset = -35;
        const startX = (-this.totalTextWidth / 2) + textXOffset;

        if (this.sprite) {
            // Boss sprites are slightly wider/larger
            this.sprite.draw(ctx, 0, -20, this.spriteTargetWidth * 1.2, this.elementName, this.angle);
        }

        // Draw typed part
        ctx.fillStyle = this.isTargeted ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.4)';
        ctx.fillText(this.typed, startX, textYOffset);

        // Draw untyped part
        // Always red/glowing for boss if untargeted, gold if targeted
        ctx.fillStyle = this.isTargeted ? '#ffd700' : '#ff4b4b';
        ctx.fillText(this.untyped, startX + this._cachedTypedWidth, textYOffset);

        ctx.restore();
    }
}
