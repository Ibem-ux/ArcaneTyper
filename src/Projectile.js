export class Projectile {
    constructor(x, y, targetX, targetY, colors) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.colors = colors || ['#ffd700', '#ffffff'];

        this.speed = 400; // pixels per second (fast)
        this.radius = 8;
        this.isDead = false;

        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.vx = (dx / distance) * this.speed;
        this.vy = (dy / distance) * this.speed;

        this.trail = []; // Keep a short history for trailing effects
    }

    update(dt) {
        if (this.isDead) return;

        // Save history for trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 5) {
            this.trail.shift();
        }

        this.x += this.vx * (dt / 1000);
        this.y += this.vy * (dt / 1000);

        // Check if we reached/passed the target (roughly)
        // Since we are shooting UP at the boss, checking Y is easiest.
        if (this.y <= this.targetY + 20) { // +20 gives some padding so it hits bottom of boss
            this.isDead = true;
        }
    }

    draw(ctx) {
        if (this.isDead) return;

        ctx.save();

        // Draw trail
        if (this.trail.length > 0) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.lineTo(this.x, this.y);
            ctx.strokeStyle = this.colors[0];
            ctx.lineWidth = this.radius;
            ctx.lineCap = 'round';
            ctx.globalAlpha = 0.5;
            ctx.stroke();
        }

        // Draw core
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.colors[1];
        ctx.shadowColor = this.colors[0];
        ctx.shadowBlur = 15;
        ctx.fill();

        ctx.restore();
    }
}
