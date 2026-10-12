'use strict';

class Monster {
  constructor(type, x, plat, map, opts = {}) {
    const d = MONSTERS[type];
    this.type = type;
    this.def = d;
    this.plat = plat;

    // Monsters patrol their own platform and never fall off it.
    let lo = plat.x;
    let hi = plat.x + plat.w;
    if (opts.range) {
      lo = opts.range[0];
      hi = opts.range[1];
    } else if (plat.ground) {
      lo = 120; // keep clear of edge portals
      hi = map.width - 120;
    }
    const margin = d.w / 2 + 4;
    this.minX = lo + margin;
    this.maxX = Math.max(this.minX, hi - margin);
    this.x = clamp(x, this.minX, this.maxX);
    this.y = plat.y;

    this.hp = d.hp;
    this.dir = chance(0.5) ? 1 : -1;
    this.state = 'idle';
    this.stateT = rand(0.3, 1.5);
    this.hopY = 0; // vertical offset while hopping (negative = up)
    this.hopVy = 0;
    this.jumpVx = 0;
    this.aggro = 0;
    this.stun = 0;
    this.kb = 0;
    this.flash = 0;
    this.hpBar = 0;
    this.dying = 0;
    this.dead = false;
    this.anim = rand(0, 10);
    this.spawnT = opts.instant ? 0 : 0.5;
    this.temp = !!opts.temp;
    this.bossT = 2.5;
    this.summonT = 9;
  }

  get alive() {
    return this.hp > 0;
  }

  get box() {
    const d = this.def;
    return { x: this.x - d.w / 2, y: this.y + this.hopY - d.h, w: d.w, h: d.h };
  }

  update(dt, game) {
    this.anim += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.hpBar -= dt;
    this.spawnT = Math.max(0, this.spawnT - dt);
    if (!this.alive) {
      this.dying -= dt;
      if (this.dying <= 0) this.dead = true;
      return;
    }
    const p = game.state === 'play' && game.player && !game.player.dead ? game.player : null;
    const d = this.def;

    if (this.hopY < 0 || this.hopVy < 0) {
      this.hopVy += PHYS.gravity * 0.8 * dt;
      this.hopY += this.hopVy * dt;
      if (d.boss) this.x += this.jumpVx * dt;
      if (this.hopY >= 0) {
        this.hopY = 0;
        this.hopVy = 0;
        if (d.boss) this.bossLand(game, p);
      }
    }

    if (this.stun > 0) {
      this.stun -= dt;
      this.x += this.kb * dt;
      this.kb *= Math.pow(0.02, dt);
    } else if (d.boss) {
      this.updateBoss(dt, game, p);
    } else {
      this.updateWander(dt, p);
    }

    if (this.x < this.minX) {
      this.x = this.minX;
      this.dir = 1;
    } else if (this.x > this.maxX) {
      this.x = this.maxX;
      this.dir = -1;
    }

    // Touch damage
    if (p && p.invuln <= 0 && this.spawnT <= 0 && rectsOverlap(this.box, p.box)) {
      p.hurt(d.atk * rand(0.85, 1.1), this.x, game);
    }
  }

  updateWander(dt, p) {
    const d = this.def;
    if (this.aggro > 0 && p) {
      this.aggro -= dt;
      if (Math.abs(p.y - this.y) < 140 && Math.abs(p.x - this.x) > 8) this.dir = p.x > this.x ? 1 : -1;
      this.state = 'walk';
    } else {
      this.stateT -= dt;
      if (this.stateT <= 0) {
        if (this.state === 'walk') {
          this.state = 'idle';
          this.stateT = rand(0.8, 2.2);
        } else {
          this.state = 'walk';
          this.dir = chance(0.5) ? 1 : -1;
          this.stateT = rand(1.5, 4);
        }
      }
    }
    if (this.state !== 'walk') return;
    const sp = d.speed * (this.aggro > 0 ? 1.5 : 1);
    if (d.hop) {
      // Hoppers only move while in the air.
      if (this.hopY === 0 && this.hopVy === 0) this.hopVy = -d.hop * rand(0.8, 1.1);
      else this.x += this.dir * sp * 1.4 * dt;
    } else {
      this.x += this.dir * sp * dt;
    }
  }

  updateBoss(dt, game, p) {
    if (this.hopY < 0) return;
    this.bossT -= dt;
    this.summonT -= dt;
    if (!p) return;
    this.dir = p.x > this.x ? 1 : -1;
    this.x += this.dir * this.def.speed * dt;
    if (this.bossT <= 0 && Math.abs(p.x - this.x) < 700) {
      this.bossT = rand(2.6, 4.2);
      this.hopVy = -880;
      this.jumpVx = clamp((p.x - this.x) * 1.1, -360, 360);
    }
    if (this.summonT <= 0) {
      this.summonT = rand(12, 16);
      game.summonMinions(this, 2);
    }
  }

  // Big landing shockwave: jump to avoid it!
  bossLand(game, p) {
    game.shake = 12;
    Sfx.play('thud');
    game.effects.burst(this.x, this.y - 6, '#9fd8ff', 24, { min: 120, max: 320, up: 40 });
    if (p && p.onGround && p.plat === this.plat && Math.abs(p.x - this.x) < 240) {
      p.hurt(this.def.atk * 0.8, this.x, game);
    }
  }

  takeHit(dmg, dir, game) {
    this.hp -= dmg;
    this.flash = 0.12;
    this.hpBar = 5;
    this.aggro = 10;
    if (!this.def.boss) {
      this.stun = 0.22;
      this.kb = dir * 140;
      this.dir = -dir;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.dying = 0.6;
      game.onMonsterKilled(this);
    }
  }

  draw(ctx) {
    const d = this.def;
    let alpha = 1;
    if (!this.alive) alpha = Math.max(0, this.dying / 0.6);
    else if (this.spawnT > 0) alpha = 1 - this.spawnT / 0.5;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ellipse(ctx, this.x, this.y, d.w * 0.45 * (1 + this.hopY / 300), 4);
    ctx.fill();
    ctx.translate(this.x, this.y + this.hopY - (this.alive ? 0 : (0.6 - this.dying) * 20));
    if (this.dir < 0) ctx.scale(-1, 1);
    drawMonsterSprite(ctx, this);
    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.6;
      drawMonsterSprite(ctx, this);
    }
    ctx.restore();

    if (this.alive && this.hpBar > 0 && !d.boss) {
      const bw = Math.max(40, d.w);
      const bx = this.x - bw / 2;
      const by = this.y + this.hopY - d.h - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
      ctx.fillStyle = '#ff4d4d';
      ctx.fillRect(bx, by, (bw * this.hp) / d.hp, 4);
      const label = `Lv.${d.level} ${d.name}`;
      ctx.font = `800 10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(label, this.x, by - 3);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, this.x, by - 3);
    }
  }
}
