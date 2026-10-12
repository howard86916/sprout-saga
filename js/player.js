'use strict';

class Player {
  constructor(save = {}) {
    this.name = save.name || 'Sprout';
    this.level = save.level || 1;
    this.exp = save.exp || 0;
    this.ap = save.ap || 0;
    this.stats = Object.assign({ str: 12, dex: 5, int: 4, luk: 4 }, save.stats);
    this.baseHP = save.baseHP || 50;
    this.baseMP = save.baseMP || 14;
    this.gold = save.gold || 0;
    this.inv = Object.assign({}, save.inv || { redPotion: 10, bluePotion: 5 });
    for (const id of Object.keys(this.inv)) if (!ITEMS[id] || !(this.inv[id] > 0)) delete this.inv[id];
    this.weapon = ITEMS[save.weapon] ? save.weapon : 'woodSword';
    this.hp = clamp(save.hp ?? this.maxHP, 1, this.maxHP);
    this.mp = clamp(save.mp ?? this.maxMP, 0, this.maxMP);

    this.w = 24;
    this.h = 56;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.plat = null;
    this.rope = null;
    this.dropThrough = null;
    this.ropeCd = 0;
    this.stun = 0;
    this.cooldown = 0;
    this.swing = 0;
    this.swingDur = 1;
    this.skill = 'basic';
    this.pendingHit = -1;
    this.dashT = 0;
    this.dashDir = 1;
    this.dashCd = 0;
    this.ghostT = 0;
    this.invuln = 0;
    this.dead = false;
    this.regenT = 0;
    this.walkPhase = 0;
    this.climbPhase = 0;
  }

  /* ---------- derived stats ---------- */

  get maxHP() { return this.baseHP; }
  get maxMP() { return this.baseMP + Math.floor(this.stats.int * 1.5); }
  get watk() { return ITEMS[this.weapon].atk; }
  get job() { return this.level >= 10 ? 'Fighter' : 'Warrior'; }
  get critRate() { return Math.min(0.5, 0.05 + this.stats.luk * 0.005); }
  get avoidRate() { return Math.min(0.3, this.stats.luk * 0.004 + this.stats.dex * 0.002); }

  get damageRange() {
    const max = Math.max(1, Math.floor(((this.stats.str * 4 + this.stats.dex) * this.watk) / 100));
    const mastery = clamp(0.2 + this.stats.dex * 0.01, 0.2, 0.9);
    return [Math.max(1, Math.floor(max * mastery)), max];
  }

  get box() {
    return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
  }

  placeAt(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.plat = null;
    this.rope = null;
    this.dropThrough = null;
    this.dashT = 0;
  }

  /* ---------- update ---------- */

  update(dt, game) {
    const map = game.map;
    this.invuln = Math.max(0, this.invuln - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.ropeCd = Math.max(0, this.ropeCd - dt);
    this.stun = Math.max(0, this.stun - dt);
    if (this.swing > 0) this.swing = Math.max(0, this.swing - dt);
    if (this.pendingHit >= 0) {
      this.pendingHit -= dt;
      if (this.pendingHit < 0) this.resolveHit(game);
    }

    if (this.dead) {
      this.physics(dt, 0, map);
      return;
    }
    this.regen(dt);

    if (this.dashT > 0) {
      this.dashT -= dt;
      this.ghostT -= dt;
      if (this.ghostT <= 0) {
        this.ghostT = 0.035;
        game.effects.ghost(this.x, this.y, this.facing, SKILLS.dash.color);
      }
      if (this.dashT <= 0) this.vx = this.dashDir * PHYS.walk;
      this.physics(dt, 0, map);
      return;
    }

    const dir = (Input.isDown('right') ? 1 : 0) - (Input.isDown('left') ? 1 : 0);
    if (this.rope) {
      this.updateClimb(dt, dir, game);
      return;
    }

    const attacking = this.swing > 0;
    if (dir && !(attacking && this.onGround)) this.facing = dir;

    if (this.onGround && !attacking) {
      if (Input.wasPressed('jump')) {
        if (Input.isDown('down') && !this.plat.solid) {
          this.dropThrough = this.plat;
          this.leaveGround();
          this.vy = 50;
        } else {
          this.leaveGround();
          this.vy = -PHYS.jump;
          Sfx.play('jump');
        }
      } else if (Input.isDown('down')) {
        const r = this.findRope(map, true);
        if (r) {
          this.grabRope(r);
          this.y += 6;
          return;
        }
      }
    }
    if (Input.isDown('up') && !attacking && this.ropeCd <= 0) {
      const r = this.findRope(map, false);
      if (r) {
        this.grabRope(r);
        return;
      }
    }

    if (Input.isDown('skill3') && this.dashCd <= 0 && !attacking) {
      this.tryDash(dir, game);
      if (this.dashT > 0) return;
    }
    if (this.cooldown <= 0) {
      const sk = Input.isDown('skill1') ? 'power'
        : Input.isDown('skill2') ? 'slash'
        : Input.isDown('attack') ? 'basic'
        : null;
      if (sk) this.tryAttack(sk, game);
    }

    this.physics(dt, this.swing > 0 && this.onGround ? 0 : dir, map);
    if (this.onGround && Math.abs(this.vx) > 1) this.walkPhase += dt * 2.4;
    else if (this.onGround) this.walkPhase = 0;
  }

  physics(dt, dir, map) {
    if (this.dashT > 0) {
      this.vx = this.dashDir * SKILLS.dash.speed;
      if (!this.onGround) this.vy = 0; // dash is a straight horizontal burst
    } else if (this.onGround) {
      this.vx = dir * PHYS.walk;
    } else {
      this.vy = Math.min(this.vy + PHYS.gravity * dt, PHYS.maxFall);
      if (dir && this.stun <= 0) this.vx = approach(this.vx, dir * PHYS.walk, PHYS.airAccel * dt);
    }

    const prevX = this.x;
    this.x = clamp(this.x + this.vx * dt, this.w / 2, map.width - this.w / 2);

    if (this.onGround) {
      if (this.x < this.plat.x || this.x > this.plat.x + this.plat.w) {
        this.leaveGround();
        this.vy = 0;
      } else {
        this.y = surfY(this.plat, this.x); // follow bridge sag
      }
      return;
    }

    const prevY = this.y;
    this.y += this.vy * dt;
    if (this.vy >= 0) {
      let land = null;
      let landY = Infinity;
      for (const p of map.platforms) {
        if (p === this.dropThrough || this.x < p.x || this.x > p.x + p.w) continue;
        const s1 = surfY(p, this.x);
        if (prevY <= surfY(p, prevX) + 0.5 && this.y >= s1 && s1 < landY) {
          land = p;
          landY = s1;
        }
      }
      if (land) this.land(land);
    }
    if (this.dropThrough && this.y > surfY(this.dropThrough, this.x) + 12) this.dropThrough = null;
    if (this.y > map.height + 300) this.placeAt(map.def.respawn.x, map.groundY);
  }

  land(p) {
    this.y = surfY(p, this.x);
    this.vy = 0;
    this.onGround = true;
    this.plat = p;
    this.dropThrough = null;
    this.stun = 0;
  }

  leaveGround() {
    this.onGround = false;
    this.plat = null;
  }

  /* ---------- ropes ---------- */

  findRope(map, fromTop) {
    for (const r of map.ropes) {
      if (Math.abs(this.x - r.x) > 14) continue;
      if (fromTop ? Math.abs(this.y - r.top) < 2 : this.y > r.top + 8 && this.y - 34 < r.bottom) return r;
    }
    return null;
  }

  grabRope(r) {
    this.rope = r;
    this.x = r.x;
    this.vx = 0;
    this.vy = 0;
    this.leaveGround();
    this.dropThrough = null;
    this.swing = 0;
  }

  updateClimb(dt, dir, game) {
    const r = this.rope;
    if (Input.wasPressed('jump') && dir) {
      this.rope = null;
      this.ropeCd = 0.35;
      this.facing = dir;
      this.vx = dir * PHYS.walk * 0.85;
      this.vy = -PHYS.jump * 0.55;
      Sfx.play('jump');
      return;
    }
    const v = Input.isDown('up') ? -1 : Input.isDown('down') ? 1 : 0;
    const prevY = this.y;
    this.y += v * PHYS.climb * dt;
    if (v) this.climbPhase += dt * 7;

    if (this.y <= r.top) {
      this.rope = null;
      this.y = r.top;
      const p = game.map.platformAt(this.x, r.top);
      if (p) this.land(p);
      return;
    }
    if (v > 0) {
      for (const p of game.map.platforms) {
        if (this.x < p.x || this.x > p.x + p.w) continue;
        const sy = surfY(p, this.x);
        if (sy > r.top + 4 && prevY <= sy && this.y >= sy) {
          this.rope = null;
          this.land(p);
          return;
        }
      }
    }
    if (this.y - 34 > r.bottom) {
      this.rope = null;
      this.vx = 0;
      this.vy = 0;
    }
  }

  /* ---------- combat ---------- */

  canUse(id, game) {
    const s = SKILLS[id];
    if (this.level < s.reqLv) {
      game.log(`${s.name} unlocks at Lv. ${s.reqLv}.`, '#ff9c9c');
      return false;
    }
    if (this.mp < s.mp) {
      game.log(`Not enough MP for ${s.name}.`, '#ff9c9c');
      Sfx.play('error');
      return false;
    }
    return true;
  }

  tryAttack(id, game) {
    const s = SKILLS[id];
    if (!this.canUse(id, game)) {
      this.cooldown = 0.4;
      return;
    }
    this.mp -= s.mp;
    this.skill = id;
    this.swingDur = s.delay * 0.7;
    this.swing = this.swingDur;
    this.cooldown = s.delay;
    this.pendingHit = 0.08;
    Sfx.play(id === 'basic' ? 'swing' : 'skill');
  }

  tryDash(dir, game) {
    const s = SKILLS.dash;
    if (!this.canUse('dash', game)) {
      this.dashCd = 0.4;
      return;
    }
    this.mp -= s.mp;
    this.dashDir = dir || this.facing;
    this.facing = this.dashDir;
    this.dashT = s.time;
    this.dashCd = s.delay;
    this.invuln = Math.max(this.invuln, s.time + 0.15);
    this.ghostT = 0;
    Sfx.play('swing');
    game.effects.burst(this.x, this.y - 6, '#dfffe6', 8, { min: 40, max: 120, up: 20 });
  }

  resolveHit(game) {
    const s = SKILLS[this.skill];
    const f = this.facing;
    if (s.wave) game.effects.wave(this.x + f * 14, this.y - 30, f, s.color, s.range);
    const hb = { x: f > 0 ? this.x - 12 : this.x - s.range + 12, y: this.y - 78, w: s.range, h: 90 };
    const targets = game.monsters
      .filter(m => m.alive && m.spawnT <= 0 && rectsOverlap(hb, m.box))
      .sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x))
      .slice(0, s.targets);
    if (!targets.length) return;

    const [min, max] = this.damageRange;
    let anyCrit = false;
    for (const m of targets) {
      const gap = m.def.level - this.level;
      for (let line = 0; line < s.lines && m.alive; line++) {
        const hy = m.y + m.hopY - m.def.h - 6;
        if (gap > 0 && chance(Math.min(0.4, gap * 0.04))) {
          game.effects.number(m.x, hy, 'MISS', 'miss', line);
          continue;
        }
        let dmg = randInt(min, max) * s.mult;
        if (gap > 0) dmg *= Math.max(0.6, 1 - gap * 0.03);
        const crit = chance(this.critRate);
        if (crit) {
          dmg *= 1.5;
          anyCrit = true;
        }
        dmg = Math.max(1, Math.round(dmg));
        game.effects.number(m.x, hy, dmg, crit ? 'crit' : 'deal', line);
        m.takeHit(dmg, f, game);
      }
      const sparkColor = this.skill === 'basic' ? '#fff3c4' : s.color;
      game.effects.burst(m.x, m.y + m.hopY - m.def.h / 2, sparkColor, this.skill === 'power' ? 14 : 7, { max: 200 });
    }
    Sfx.play(anyCrit ? 'crit' : 'hit');
  }

  hurt(amount, fromX, game) {
    if (this.invuln > 0 || this.dead) return;
    if (chance(this.avoidRate)) {
      game.effects.number(this.x, this.y - this.h - 10, 'MISS', 'miss');
      this.invuln = 0.6;
      return;
    }
    const dmg = Math.max(1, Math.round(amount));
    this.hp -= dmg;
    game.effects.number(this.x, this.y - this.h - 10, dmg, 'take');
    Sfx.play('hurt');
    this.invuln = 1.4;
    const dir = this.x < fromX ? -1 : 1;
    this.rope = null;
    this.leaveGround();
    this.vx = dir * 230;
    this.vy = -330;
    this.stun = 0.35;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.swing = 0;
      game.onPlayerDeath();
    }
  }

  regen(dt) {
    this.regenT += dt;
    if (this.regenT >= 5) {
      this.regenT = 0;
      this.hp = Math.min(this.maxHP, this.hp + 3 + Math.floor(this.level * 0.6));
      this.mp = Math.min(this.maxMP, this.mp + 2 + Math.floor(this.stats.int / 8));
    }
  }

  gainExp(n, game) {
    if (this.level >= MAX_LEVEL) return;
    this.exp += n;
    game.log(`You have gained experience (+${n})`, '#ffffff');
    while (this.level < MAX_LEVEL && this.exp >= expToLevel(this.level)) {
      this.exp -= expToLevel(this.level);
      this.level++;
      this.ap += 5;
      this.baseHP += randInt(10, 14);
      this.baseMP += randInt(5, 8);
      this.hp = this.maxHP;
      this.mp = this.maxMP;
      game.onLevelUp(this);
    }
  }

  /* ---------- items & stats ---------- */

  addItem(id, n) {
    this.inv[id] = (this.inv[id] || 0) + n;
    UI.dirty = true;
  }

  removeItem(id, n) {
    this.inv[id] = (this.inv[id] || 0) - n;
    if (this.inv[id] <= 0) delete this.inv[id];
    UI.dirty = true;
  }

  useItem(id, game) {
    const it = ITEMS[id];
    if (!it) return;
    if (!this.inv[id]) {
      game.log(`You have no ${it.name}s left.`, '#ff9c9c');
      Sfx.play('error');
      return;
    }
    if (it.type === 'equip') {
      this.equip(id, game);
      return;
    }
    if (it.type !== 'use' || this.dead) return;
    const hpGain = it.full ? this.maxHP : it.hp || 0;
    const mpGain = it.full ? this.maxMP : it.mp || 0;
    if ((hpGain === 0 || this.hp >= this.maxHP) && (mpGain === 0 || this.mp >= this.maxMP)) {
      game.log('You are already at full strength.', '#c8d2ff');
      return;
    }
    const h0 = this.hp;
    const m0 = this.mp;
    this.hp = Math.min(this.maxHP, this.hp + hpGain);
    this.mp = Math.min(this.maxMP, this.mp + mpGain);
    this.removeItem(id, 1);
    let line = 0;
    if (this.hp > h0) game.effects.number(this.x, this.y - 70, '+' + Math.round(this.hp - h0), 'heal', line++);
    if (this.mp > m0) game.effects.number(this.x, this.y - 70, '+' + Math.round(this.mp - m0), 'mana', line);
    game.effects.burst(this.x, this.y - 30, it.full ? '#e3b3ff' : hpGain ? '#ff8a8a' : '#8ac4ff', 10, { up: 120, g: 0, max: 80 });
    Sfx.play('potion');
  }

  equip(id, game) {
    const it = ITEMS[id];
    if (this.level < it.reqLv) {
      game.log(`${it.name} requires Lv. ${it.reqLv}.`, '#ff9c9c');
      Sfx.play('error');
      return;
    }
    this.removeItem(id, 1);
    this.addItem(this.weapon, 1);
    this.weapon = id;
    game.log(`Equipped ${it.name}.`, '#9fe0ff');
    Sfx.play('pickup');
    game.save();
  }

  addStat(k) {
    if (this.ap <= 0) return;
    this.stats[k]++;
    this.ap--;
  }

  autoAssign() {
    while (this.ap > 0) {
      if (this.stats.dex < 4 + this.level) this.stats.dex++;
      else this.stats.str++;
      this.ap--;
    }
  }

  serialize(mapId) {
    return {
      v: 1,
      name: this.name,
      level: this.level,
      exp: this.exp,
      ap: this.ap,
      stats: { ...this.stats },
      baseHP: this.baseHP,
      baseMP: this.baseMP,
      hp: this.dead ? Math.ceil(this.maxHP / 2) : this.hp,
      mp: this.mp,
      gold: this.gold,
      inv: { ...this.inv },
      weapon: this.weapon,
      map: this.dead ? 'town' : mapId,
    };
  }

  /* ---------- drawing ---------- */

  draw(ctx, t) {
    if (this.dead) {
      drawTombstone(ctx, this.x, this.y);
      drawNameTag(ctx, this.name, this.x, this.y + 4);
      return;
    }
    ctx.save();
    if (this.invuln > 0 && this.dashT <= 0 && Math.floor(this.invuln * 14) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.translate(this.x, this.y);
    if (this.onGround || this.rope) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ellipse(ctx, 0, 0, 14, 3.5);
      ctx.fill();
    }
    if (this.facing < 0) ctx.scale(-1, 1);
    const sk = this.swing > 0 ? SKILLS[this.skill] : null;
    drawHumanoid(ctx, {
      look: PLAYER_LOOK,
      t,
      walk: this.walkPhase,
      moving: this.onGround && Math.abs(this.vx) > 1 && this.dashT <= 0,
      air: !this.onGround && !this.rope,
      climb: !!this.rope,
      climbPhase: this.climbPhase,
      dash: this.dashT > 0,
      swing: sk ? 1 - this.swing / this.swingDur : null,
      swingColor: sk && sk.color,
      swingRadius: sk && sk.trail,
      swingWidth: sk && sk.trailW,
      weapon: this.weapon,
      hurt: this.invuln > 1.0,
    });
    ctx.restore();
    drawNameTag(ctx, this.name, this.x, this.y + 4);
  }
}
