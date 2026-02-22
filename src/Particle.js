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

        // Lifespan and size
        this.life = 1.0;
        this.decay = Math.random() * 0.018 + 0.008;
        this.size = Math.random() * 5 + 2;
        this.initialSize = this.size;

        // Gravity — particles arc downward
        this.gravity = 0.0008 + Math.random() * 0.0006;

        // Sometimes draw a rune instead of a circle
        this.isRune = Math.random() > 0.7;
        this.runeChar = String.fromCharCode(0x16A0 + Math.floor(Math.random() * 80)); // Runic block
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= this.decay;

        // Gravity pulls particles down
        this.vy += this.gravity * dt;

        // Shrink as they die
        this.size = this.initialSize * this.life;
    }

    draw(ctx) {
        if (this.life <= 0) return;

        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);

        if (this.isRune) {
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
