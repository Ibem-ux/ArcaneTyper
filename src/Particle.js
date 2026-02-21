export class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;

        // Random velocity in all directions
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.4 + 0.1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // Lifespan and size
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
        this.size = Math.random() * 4 + 2;

        // Sometimes draw a rune instead of a circle
        this.isRune = Math.random() > 0.7;
        this.runeChar = String.fromCharCode(0x16A0 + Math.floor(Math.random() * 80)); // Runic block
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= this.decay;

        // Add a slight upward drift to simulate magic dust
        this.vy -= 0.0005 * dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.life;

        if (this.isRune) {
            ctx.font = `${this.size * 3}px serif`;
            ctx.fillStyle = this.color;
            ctx.fillText(this.runeChar, this.x, this.y);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        ctx.restore();
    }
}
