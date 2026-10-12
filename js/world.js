'use strict';

class Npc {
  constructor(def, groundY) {
    Object.assign(this, def);
    this.lookData = NPC_LOOKS[def.look];
    this.y = def.y ?? groundY;
    this.w = 36;
    this.h = 66;
    this.bubble = null;
    this.bubbleT = rand(1.5, 5);
    this.near = false;
  }

  get box() {
    return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
  }

  update(dt) {
    this.bubbleT -= dt;
    if (this.bubbleT <= 0) {
      if (this.bubble) {
        this.bubble = null;
        this.bubbleT = rand(5, 10);
      } else {
        this.bubble = pick(this.chatter);
        this.bubbleT = 3.5;
      }
    }
  }

  draw(ctx, t) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ellipse(ctx, 0, 0, 15, 3.5);
    ctx.fill();
    if (this.facing < 0) ctx.scale(-1, 1);
    drawHumanoid(ctx, { look: this.lookData, t: t + this.x, walk: 0, moving: false, air: false, swing: null, weapon: null });
    ctx.restore();
    drawNameTag(ctx, this.name, this.x, this.y + 4, '#ffe066');
    if (this.near) drawUpArrow(ctx, this.x, this.y - this.h - 18, t);
    else if (this.bubble) drawSpeechBubble(ctx, this.bubble, this.x, this.y - this.h - 6);
  }
}

// Height of a platform's walkable surface at x. Flat platforms return p.y;
// rope bridges sag between their two end points.
function surfY(p, x) {
  const b = p.bridge;
  if (!b) return p.y;
  const t = clamp((x - b.x1) / (b.x2 - b.x1), 0, 1);
  return lerp(b.y1, b.y2, t) + b.sag * 4 * t * (1 - t);
}

function makeBridge(b) {
  const bridge = { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, sag: b.sag ?? 30 };
  return { x: b.x1, w: b.x2 - b.x1, y: Math.min(b.y1, b.y2), solid: false, ground: false, bridge };
}

class GameMap {
  constructor(id) {
    const def = MAPS[id];
    this.id = id;
    this.def = def;
    this.name = def.name;
    this.area = def.area;
    this.width = def.width;
    this.height = def.height;
    this.groundY = def.groundY;
    this.theme = THEMES[def.theme];
    this.platforms = def.platforms.map(p => ({ x: p.x, y: p.y, w: p.w, solid: false, ground: false, branch: p.branch }));
    this.bridges = (def.bridges || []).map(makeBridge);
    this.platforms.push(...this.bridges);
    this.ground = { x: 0, y: def.groundY, w: def.width, solid: true, ground: true };
    this.platforms.push(this.ground);
    this.trunks = def.trunks || [];
    this.ropes = def.ropes.map(r => ({ ...r }));
    this.portals = def.portals.map(p => ({ ...p, y: p.y ?? def.groundY }));
    this.npcs = (def.npcs || []).map(n => new Npc(n, def.groundY));
    this.buildDecor();
    this.art = this.theme.painter === 'forest' ? getForestArt(this) : null;
  }

  platformAt(x, y) {
    return this.platforms.find(p => x >= p.x && x <= p.x + p.w && Math.abs(surfY(p, x) - y) < 1) || null;
  }

  buildDecor() {
    const rng = mulberry32(hashString(this.id));
    const kind = this.theme.decor;
    this.back = [];
    this.front = [];
    for (const h of this.def.houses || []) this.back.push({ type: 'house', ...h, y: this.groundY });
    if (kind === 'forest') {
      // the painted-forest renderer supplies its own scenery
      this.clouds = [];
      this.stars = null;
      this.seed = 0;
      return;
    }

    const busy = x =>
      this.portals.some(p => p.y === this.groundY && Math.abs(p.x - x) < 70) ||
      this.npcs.some(n => Math.abs(n.x - x) < 50) ||
      (this.def.houses || []).some(h => x > h.x - 40 && x < h.x + h.w + 40);

    for (let x = 30 + rng() * 60; x < this.width - 30; x += 70 + rng() * 150) {
      const r = rng();
      if (kind === 'den') {
        this.back.push({ type: r < 0.5 ? 'crystal' : 'rock', x, y: this.groundY, s: 0.6 + rng() * 0.8, hue: 250 + rng() * 80 });
      } else if (r < 0.3 && !busy(x)) {
        this.back.push({ type: kind === 'hills' ? 'bigshroom' : 'tree', x, y: this.groundY, s: 0.75 + rng() * 0.5, hue: rng() });
      } else {
        this.front.push({ type: rng() < 0.6 ? 'flower' : 'tuft', x, y: this.groundY, hue: rng() });
      }
    }
    for (const p of this.platforms) {
      if (p.ground || kind === 'den') continue;
      for (let x = p.x + 16 + rng() * 30; x < p.x + p.w - 16; x += 45 + rng() * 70) {
        this.front.push({ type: rng() < 0.5 ? 'flower' : 'tuft', x, y: p.y, hue: rng() });
      }
    }
    this.clouds = Array.from({ length: 9 }, () => ({
      x: rng() * (VIEW_W + 400), y: 20 + rng() * 170, s: 0.6 + rng() * 0.8, speed: 4 + rng() * 10,
    }));
    this.stars = kind === 'den'
      ? Array.from({ length: 50 }, () => ({ x: rng() * VIEW_W, y: rng() * VIEW_H * 0.8, p: rng() * 6, r: 0.8 + rng() * 1.6 }))
      : null;
    this.seed = rng() * 1000;
  }

  /* ---------- screen-space background ---------- */

  drawBackground(ctx, cam, t) {
    if (this.art) {
      drawForestBackground(ctx, this, cam, t);
      return;
    }
    const th = this.theme;
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, th.skyTop);
    sky.addColorStop(1, th.skyBot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // How far the camera is above the bottom of the map; used for vertical parallax.
    const lift = Math.max(0, this.height - VIEW_H) - cam.y;

    if (th.sun) {
      const sx = VIEW_W * 0.8 - cam.x * 0.02;
      const sy = 80 + lift * 0.04;
      const g = ctx.createRadialGradient(sx, sy, 10, sx, sy, 90);
      g.addColorStop(0, th.sun);
      g.addColorStop(0.35, th.sun + 'aa');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      circle(ctx, sx, sy, 90);
      ctx.fill();
    }
    if (this.stars) {
      for (const s of this.stars) {
        ctx.fillStyle = `rgba(220,200,255,${0.35 + 0.35 * Math.sin(t * 2 + s.p)})`;
        const x = ((s.x - cam.x * 0.05) % VIEW_W + VIEW_W) % VIEW_W;
        circle(ctx, x, s.y + lift * 0.05, s.r);
        ctx.fill();
      }
    }
    if (th.cloud) {
      const span = VIEW_W + 400;
      for (const c of this.clouds) {
        const x = (((c.x + t * c.speed - cam.x * 0.08) % span) + span) % span - 200;
        drawCloud(ctx, x, c.y + lift * 0.08, c.s);
      }
    }
    this.drawHills(ctx, cam.x * 0.15, VIEW_H * 0.6 + lift * 0.12, 60, 0.004, th.far, 1);
    this.drawHills(ctx, cam.x * 0.35, VIEW_H * 0.74 + lift * 0.28, 45, 0.007, th.near, 2);
    if (th.decor === 'den') this.drawStalactites(ctx, cam);
  }

  drawHills(ctx, offX, baseY, amp, freq, color, layer) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, VIEW_H);
    for (let sx = 0; sx <= VIEW_W + 8; sx += 8) {
      const wx = sx + offX + layer * 1000 + this.seed;
      const y = baseY - (Math.sin(wx * freq) * 0.6 + Math.sin(wx * freq * 2.3 + layer) * 0.3 + Math.sin(wx * freq * 5.1) * 0.1) * amp - amp * 0.5;
      ctx.lineTo(sx, y);
    }
    ctx.lineTo(VIEW_W, VIEW_H);
    ctx.closePath();
    ctx.fill();
  }

  drawStalactites(ctx, cam) {
    ctx.fillStyle = '#24163d';
    const off = cam.x * 0.3;
    const start = Math.floor(off / 70) - 1;
    for (let i = start; i < start + VIEW_W / 70 + 3; i++) {
      const r = mulberry32(i * 7919 + 13)();
      const x = i * 70 - off;
      const len = 30 + r * 90;
      const w = 18 + r * 22;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, 0);
      ctx.lineTo(x, len);
      ctx.lineTo(x + w / 2, 0);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* ---------- world-space terrain ---------- */

  // Screen-space effects drawn on top of everything in the world.
  drawOverlay(ctx, cam, t) {
    if (this.art) drawForestOverlay(ctx, this, cam, t);
  }

  drawWorld(ctx, cam, t) {
    if (this.art) {
      drawForestWorld(ctx, this, cam, t);
      return;
    }
    const x0 = cam.x - 220;
    const x1 = cam.x + VIEW_W + 220;
    for (const d of this.back) {
      if (d.type === 'house') {
        if (d.x + d.w > x0 && d.x < x1) drawHouse(ctx, d);
        continue;
      }
      if (d.x < x0 || d.x > x1) continue;
      if (d.type === 'tree') drawTree(ctx, d.x, d.y, d.s);
      else if (d.type === 'bigshroom') drawBigShroom(ctx, d.x, d.y, d.s, d.hue);
      else if (d.type === 'crystal') drawCrystal(ctx, d.x, d.y, d.s, d.hue);
      else if (d.type === 'rock') drawRock(ctx, d.x, d.y, d.s);
    }
    this.drawGround(ctx, cam);
    for (const r of this.ropes) if (r.x > x0 && r.x < x1) this.drawRope(ctx, r);
    for (const p of this.bridges) if (p.x < x1 && p.x + p.w > x0) drawBridge(ctx, p);
    for (const p of this.platforms) if (!p.ground && !p.bridge && p.x + p.w > x0 && p.x < x1) this.drawPlatform(ctx, p);
    for (const d of this.front) {
      if (d.x < x0 || d.x > x1) continue;
      if (d.type === 'flower') drawFlower(ctx, d.x, d.y, d.hue);
      else drawTuft(ctx, d.x, d.y, this.theme.grassDark);
    }
    for (const p of this.portals) if (p.x > x0 && p.x < x1) this.drawPortal(ctx, p, t);
  }

  drawGround(ctx, cam) {
    const th = this.theme;
    const gy = this.groundY;
    const x0 = Math.max(0, cam.x - 10);
    const x1 = Math.min(this.width, cam.x + VIEW_W + 10);
    ctx.fillStyle = th.dirt;
    ctx.fillRect(x0, gy, x1 - x0, this.height - gy + 60);

    ctx.fillStyle = th.dirtDark;
    ctx.beginPath();
    for (let gx = Math.floor(x0 / 46) * 46; gx < x1; gx += 46) {
      const r = mulberry32(gx + 99)();
      const ex = gx + r * 30;
      const ey = gy + 30 + r * 30;
      ctx.moveTo(ex + 6 + r * 6, ey);
      ctx.ellipse(ex, ey, 6 + r * 6, 3 + r * 3, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.fillStyle = th.grass;
    ctx.fillRect(x0, gy - 3, x1 - x0, 13);
    ctx.beginPath();
    for (let gx = Math.floor(x0 / 14) * 14; gx < x1; gx += 14) {
      ctx.moveTo(gx + 14, gy + 9);
      ctx.arc(gx + 7, gy + 9, 7, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x0, gy - 3, x1 - x0, 3);
  }

  drawPlatform(ctx, p) {
    const th = this.theme;
    ctx.fillStyle = th.dirtDark;
    roundRect(ctx, p.x + 2, p.y + 4, p.w - 4, 26, 10);
    ctx.fill();
    ctx.fillStyle = th.dirt;
    roundRect(ctx, p.x, p.y, p.w, 22, 9);
    ctx.fill();
    ctx.fillStyle = th.grass;
    roundRect(ctx, p.x - 5, p.y - 3, p.w + 10, 11, 5);
    ctx.fill();
    ctx.beginPath();
    for (let x = p.x - 2; x < p.x + p.w - 4; x += 12) {
      ctx.moveTo(x + 12, p.y + 7);
      ctx.arc(x + 6, p.y + 7, 6, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(ctx, p.x - 3, p.y - 3, p.w + 6, 3, 1.5);
    ctx.fill();
  }

  // Twisted hemp rope hanging from a wooden peg.
  drawRope(ctx, r) {
    const top = r.top - 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8a7650';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(r.x, top);
    ctx.lineTo(r.x, r.bottom);
    ctx.stroke();
    ctx.strokeStyle = '#e4d6a8';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = '#a8936a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let y = top + 4; y < r.bottom; y += 6) {
      ctx.moveTo(r.x - 2, y);
      ctx.lineTo(r.x + 2, y + 4);
    }
    ctx.stroke();
    ctx.fillStyle = '#6b4a26';
    roundRect(ctx, r.x - 5, top - 14, 10, 18, 3);
    ctx.fill();
    ctx.fillStyle = '#9a7040';
    roundRect(ctx, r.x - 5, top - 14, 4, 18, 2);
    ctx.fill();
    ctx.fillStyle = '#c9b88a';
    circle(ctx, r.x, r.bottom, 3.5);
    ctx.fill();
  }

  drawPortal(ctx, p, t) {
    const cx = p.x;
    const cy = p.y - 40;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 44);
    g.addColorStop(0, 'rgba(230,250,255,0.95)');
    g.addColorStop(0.45, 'rgba(110,190,255,0.55)');
    g.addColorStop(1, 'rgba(80,140,255,0)');
    ctx.fillStyle = g;
    ellipse(ctx, cx, cy, 26, 44);
    ctx.fill();
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = t * (3 + i) + i * 2.1;
      ctx.strokeStyle = `rgba(255,255,255,${0.75 - i * 0.18})`;
      ctx.lineWidth = 3 - i * 0.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 10 + i * 6, 30 + i * 6, 0, a, a + 3.6);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const k = (t * 0.7 + i / 8) % 1;
      ctx.fillStyle = `rgba(200,240,255,${1 - k})`;
      circle(ctx, cx + Math.sin(t * 3 + i * 2.3) * 16, cy + 38 - k * 80, 2);
      ctx.fill();
    }
  }
}
