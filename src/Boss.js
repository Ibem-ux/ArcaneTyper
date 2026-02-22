export class Boss {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        // Start off-screen top, then slide in
        this.x = canvasWidth / 2;
        this.y = -100;
        this.targetY = 100; // Hover position near the top

        this.maxHealth = 4; // Takes 4 full words to defeat
        this.health = this.maxHealth;
        this.isDead = false;

        this.introFinished = false;

        // Visual properties
        this.scale = 1.2;
        this.flashTimer = 0; // For damage feedback

        // Attack logic
        this.attackTimer = 0;
        this.attackInterval = 4000; // Fire a word every 4 seconds
    }

    update(dt) {
        // Intro animation: slide down
        if (!this.introFinished) {
            const dy = this.targetY - this.y;
            this.y += dy * 2 * dt; // Smooth ease-out
            if (this.y >= this.targetY - 1) {
                this.y = this.targetY;
                this.introFinished = true;
            }
        } else {
            // Hover effect slightly up and down
            this.y = this.targetY + Math.sin(performance.now() / 500) * 10;
        }

        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
        }

        this.attackTimer += dt;
    }

    takeDamage() {
        this.health -= 1;
        this.flashTimer = 0.2; // Flash white for 0.2s
        if (this.health <= 0) {
            this.isDead = true;
        }
    }

    shouldAttack() {
        if (this.introFinished && this.attackTimer >= this.attackInterval) {
            this.attackTimer = 0;
            return true;
        }
        return false;
    }

    draw(ctx) {
        if (this.isDead) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        // Sinister aura
        ctx.shadowColor = this.flashTimer > 0 ? '#ffffff' : '#ff4b4b';
        ctx.shadowBlur = this.flashTimer > 0 ? 30 : 20 + Math.sin(performance.now() / 200) * 10;

        // Draw Rival Wizard Silhouette (similar to player but red highlights & inverted)
        ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : '#2a0808';
        ctx.strokeStyle = '#ff4b4b';
        ctx.lineWidth = 1;

        // Cloak
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.lineTo(-15, 18);
        ctx.quadraticCurveTo(0, 21, 15, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Hat
        ctx.beginPath();
        ctx.moveTo(-11, -21);
        ctx.quadraticCurveTo(0, -18, 11, -21);
        ctx.lineTo(1, -45);
        ctx.lineTo(-1, -45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Optional: Draw a health bar above the boss
        if (this.introFinished) {
            ctx.shadowBlur = 0; // Turn off glow for health bar
            const barWidth = 60;
            const barHeight = 6;
            const yOffset = -60;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(-barWidth / 2, yOffset, barWidth, barHeight);

            // Health
            const healthPct = this.health / this.maxHealth;
            ctx.fillStyle = '#ff4b4b';
            ctx.fillRect(-barWidth / 2, yOffset, barWidth * healthPct, barHeight);

            // Border
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 1;
            ctx.strokeRect(-barWidth / 2, yOffset, barWidth, barHeight);
        }

        ctx.restore();
    }
}
