export class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;

        // Random velocity in all directions — wider speed range for more energy
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.7 + 0.15;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.curve = (Math.random() - 0.5) * 0.1; // adding slight swerving trajectory

        // Lifespan and size
        this.life = 1.0;
        this.decay = Math.random() * 0.018 + 0.008;
        this.size = Math.random() * 5 + 2;
        this.initialSize = this.size;

        // Gravity — particles arc downward
        this.gravity = 0.0008 + Math.random() * 0.0006;

        // Sometimes draw a rune instead of a circle
        this.isRune = Math.random() > 0.7 && !this.isShockwave;
        this.runeChar = String.fromCharCode(0x16A0 + Math.floor(Math.random() * 80)); // Runic block

        // Setup shockwave properties if indicated
        if (color === 'shockwave') {
            this.isShockwave = true;
            this.isRune = false;
            this.color = 'rgba(255, 215, 0, 0.8)'; // Gold expanding ring
            this.vx = 0;
            this.vy = 0;
            this.gravity = 0;
            this.life = 1.0;
            this.decay = 0.04; // Fast fade
            this.size = 5; // Starting radius
            this.expansionRate = 12; // How fast the ring grows
        } else {
            this.isShockwave = false;
        }
    }

    update(dt) {
        if (this.isShockwave) {
            this.size += this.expansionRate * (dt / 16);
            this.life -= this.decay * (dt / 16);
        } else {
            // organic swerve
            const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            const currentAngle = Math.atan2(this.vy, this.vx);
            this.vx = Math.cos(currentAngle + this.curve) * currentSpeed;
            this.vy = Math.sin(currentAngle + this.curve) * currentSpeed;

            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.life -= this.decay;

            // Gravity pulls particles down
            this.vy += this.gravity * dt;

            // Shrink as they die
            this.size = this.initialSize * this.life;
        }
    }

    draw(ctx) {
        if (this.life <= 0) return;

        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);

        if (this.isShockwave) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = Math.max(1, 10 * this.life); // Ring gets thinner as it fades
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.stroke();
        } else if (this.isRune) {
            ctx.font = `${Math.max(4, this.size * 3)}px serif`;
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 6;
            ctx.fillText(this.runeChar, this.x, this.y);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8;
            ctx.fill();
        }
        ctx.restore();
    }
}
