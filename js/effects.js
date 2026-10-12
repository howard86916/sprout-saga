'use strict';

const NUM_STYLES = {
  deal: { top: '#fff1a8', bot: '#ff8a1f', stroke: '#3a1a00', size: 26 },
  crit: { top: '#ffe0ee', bot: '#ff2f6d', stroke: '#3a0016', size: 31 },
  take: { top: '#f1dcff', bot: '#9a4dff', stroke: '#22003d', size: 24 },
  heal: { top: '#e0ffd8', bot: '#35c24e', stroke: '#0b2e10', size: 20 },
  mana: { top: '#dff0ff', bot: '#3d8bff', stroke: '#0b1a3a', size: 20 },
  miss: { top: '#eef3ff', bot: '#7d93cc', stroke: '#141c33', size: 20 },
};

class Effects {
  constructor() {
    this.clear();
  }

  clear() {
    this.nums = [];
    this.parts = [];
    this.waves = [];
    this.glows = [];
    this.ghosts = [];
  }

  // Floating damage/heal numbers. `line` stacks multi-hit numbers upward.
  number(x, y, value, kind = 'deal', line = 0) {
    this.nums.push({ x, y: y - line * 27, text: String(value), kind, t: -line * 0.07, life: 1.05 });
  }

  burst(x, y, color, n = 10, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(o.min ?? 60, o.max ?? 220);
      const life = rand(0.35, 0.75);
      const size = o.size ?? 2;
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up ?? 80),
        life, max: life, color, size: rand(size, size + 2.5), g: o.g ?? 600,
      });
    }
  }

  // Crescent shockwave used by Slash Blast.
  wave(x, y, dir, color, range) {
    this.waves.push({ x, y, dir, color, range, t: 0, life: 0.3 });
  }

  // Afterimage used by Dash.
  ghost(x, y, facing, color) {
    this.ghosts.push({ x, y, facing, color, t: 0, life: 0.25 });
  }

  levelUp(target) {
    this.glows.push({ target, t: 0, life: 2.4 });
  }

  update(dt) {
    for (const n of this.nums) n.t += dt;
    this.nums = this.nums.filter(n => n.t < n.life);

    for (const p of this.parts) {
      p.life -= dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
    }
    this.parts = this.parts.filter(p => p.life > 0);

    for (const w of this.waves) w.t += dt;
    this.waves = this.waves.filter(w => w.t < w.life);

    for (const g of this.ghosts) g.t += dt;
    this.ghosts = this.ghosts.filter(g => g.t < g.life);

    for (const gl of this.glows) {
      gl.t += dt;
      if (Math.random() < dt * 30) {
        const p = gl.target;
        this.parts.push({
          x: p.x + rand(-26, 26), y: p.y - rand(0, 20), vx: 0, vy: rand(-160, -80),
          life: 1, max: 1, color: chance(0.5) ? '#ffe066' : '#fff6c9', size: rand(2, 4), g: 0,
        });
      }
    }
    this.glows = this.glows.filter(gl => gl.t < gl.life);
  }

  draw(ctx) {
    for (const gl of this.glows) this.drawLevelGlow(ctx, gl);

    for (const g of this.ghosts) {
      const a = (1 - g.t / g.life) * 0.45;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = g.color;
      roundRect(ctx, g.x - 12, g.y - 58, 24, 58, 10);
      ctx.fill();
      ctx.restore();
    }

    for (const w of this.waves) {
      const k = w.t / w.life;
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.scale(w.dir, 1);
      ctx.globalAlpha = (1 - k) * 0.85;
      ctx.strokeStyle = w.color;
      ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        const r = w.range * (0.45 + 0.55 * k) - i * 14;
        if (r <= 0) continue;
        ctx.lineWidth = (12 - i * 5) * (1 - k) + 2;
        ctx.beginPath();
        ctx.arc(-10, 0, r, -0.9, 0.9);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const p of this.parts) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      circle(ctx, p.x, p.y, p.size);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    for (const n of this.nums) {
      if (n.t < 0) continue;
      const st = NUM_STYLES[n.kind];
      const k = n.t / n.life;
      const pop = n.t < 0.08 ? 1 + (0.08 - n.t) * 5 : 1;
      const y = n.y - Math.min(n.t, 0.5) * 70 - Math.max(0, n.t - 0.5) * 15;
      ctx.save();
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.translate(n.x, y);
      ctx.scale(pop, pop);
      ctx.font = `900 ${st.size}px ${FONT}`;
      const g = ctx.createLinearGradient(0, -st.size * 0.8, 0, 0);
      g.addColorStop(0, st.top);
      g.addColorStop(1, st.bot);
      ctx.lineWidth = 5;
      ctx.strokeStyle = st.stroke;
      ctx.strokeText(n.text, 0, 0);
      ctx.fillStyle = g;
      ctx.fillText(n.text, 0, 0);
      ctx.restore();
    }
  }

  drawLevelGlow(ctx, gl) {
    const p = gl.target;
    const k = gl.t / gl.life;
    const a = k < 0.1 ? k / 0.1 : 1 - Math.max(0, (k - 0.6) / 0.4);
    ctx.save();
    ctx.globalAlpha = a * 0.55;
    const g = ctx.createLinearGradient(0, p.y - 160, 0, p.y);
    g.addColorStop(0, 'rgba(255,230,120,0)');
    g.addColorStop(1, 'rgba(255,230,120,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - 30, p.y - 160, 60, 160);
    ctx.globalAlpha = a;
    ctx.font = `900 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#4a2a00';
    const ty = p.y - 96 - k * 24;
    ctx.strokeText('LEVEL UP!', p.x, ty);
    const tg = ctx.createLinearGradient(0, ty - 24, 0, ty);
    tg.addColorStop(0, '#fff7c2');
    tg.addColorStop(1, '#ffb52e');
    ctx.fillStyle = tg;
    ctx.fillText('LEVEL UP!', p.x, ty);
    ctx.restore();
  }
}

/* ---------- loot on the ground ---------- */

class Drop {
  constructor(kind, value, x, y, plat, minX, maxX) {
    this.kind = kind; // 'gold' | 'item'
    this.value = value; // gold amount or item id
    this.x = x;
    this.y = y;
    this.plat = plat; // the platform it lands on
    this.minX = minX;
    this.maxX = maxX;
    this.vx = rand(-70, 70);
    this.vy = rand(-420, -340);
    this.settled = false;
    this.t = 0;
    this.life = 90;
    this.spin = 0;
    this.collected = false;
    this.pickT = 0;
  }

  get icon() {
    if (this.kind === 'item') return ITEMS[this.value].icon;
    return this.value >= 100 ? 'goldBag' : this.value >= 25 ? 'goldPile' : 'gold';
  }

  get gone() {
    return this.life <= 0 || (this.collected && this.pickT <= 0);
  }

  update(dt, game) {
    this.t += dt;
    this.life -= dt;
    if (this.collected) {
      this.pickT -= dt;
      const p = game.player;
      if (p) {
        this.x = lerp(this.x, p.x, 0.3);
        this.y = lerp(this.y, p.y - 30, 0.3);
      }
      return;
    }
    if (!this.settled) {
      this.vy += PHYS.gravity * dt;
      this.x = clamp(this.x + this.vx * dt, this.minX, this.maxX);
      this.y += this.vy * dt;
      this.spin += dt * 10;
      const floor = surfY(this.plat, this.x);
      if (this.vy > 0 && this.y >= floor) {
        this.y = floor;
        this.settled = true;
      }
    }
  }

  draw(ctx) {
    const bob = this.settled ? Math.sin(this.t * 3) * 2.5 : 0;
    ctx.save();
    if (this.collected) ctx.globalAlpha = clamp(this.pickT / 0.18, 0, 1);
    else if (this.life < 5 && Math.floor(this.life * 8) % 2 === 0) ctx.globalAlpha = 0.4;
    ctx.translate(this.x, this.y - 14 + bob);
    if (!this.settled) ctx.rotate(this.spin);
    drawIcon(ctx, this.icon, 26);
    ctx.restore();
  }
}
