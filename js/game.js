'use strict';

const SAVE_KEY = 'sproutSaga.save.v1';
const MUTE_KEY = 'sproutSaga.muted';
const STEP = 1 / 60;

const Game = {
  state: 'title', // 'title' | 'play'
  time: 0,
  scale: 1,
  map: null,
  player: null,
  monsters: [],
  drops: [],
  spawns: [],
  messages: [],
  bannerData: null,
  shake: 0,
  transition: null,
  cam: { x: 0, y: 0 },
  deathT: 0,
  saveT: 15,
  pickupT: 0,

  init() {
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.root = document.getElementById('game');
    this.effects = new Effects();
    try {
      Sfx.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch (e) { /* storage unavailable */ }

    Input.init();
    UI.init();
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.canvas.addEventListener('mousedown', e => this.onCanvasClick(e));

    this.loadMap('meadow'); // title screen backdrop
    this.last = performance.now();
    this.acc = 0;
    requestAnimationFrame(t => this.frame(t));
  },

  resize() {
    const s = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
    this.scale = s;
    const k = Math.min(s * Math.min(window.devicePixelRatio || 1, 2), 3);
    this.canvas.width = Math.round(VIEW_W * k);
    this.canvas.height = Math.round(VIEW_H * k);
    const ox = (window.innerWidth - VIEW_W * s) / 2;
    const oy = (window.innerHeight - VIEW_H * s) / 2;
    this.root.style.transform = `translate(${ox}px, ${oy}px) scale(${s})`;
  },

  frame(now) {
    try {
      this.acc += Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      while (this.acc >= STEP) {
        this.update(STEP);
        Input.endStep();
        this.acc -= STEP;
      }
      this.render();
      UI.tick();
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame(t => this.frame(t));
  },

  /* ---------- game flow ---------- */

  newGame(name) {
    this.player = new Player({ name });
    this.state = 'play';
    this.messages = [];
    UI.hideTitle();
    this.loadMap('town');
    this.log(`Welcome to Sprout Saga, ${name}!`, '#ffe48a');
    this.log('Talk to Guide Lily (press ↑ next to her) for tips.', '#ffe48a');
    UI.open('help');
  },

  continueGame() {
    const s = this.readSave();
    if (!s) {
      this.newGame('Sprout');
      return;
    }
    this.player = new Player(s);
    this.state = 'play';
    this.messages = [];
    UI.hideTitle();
    this.loadMap(s.map);
    this.log(`Welcome back, ${s.name}!`, '#ffe48a');
  },

  loadMap(id, portalId) {
    if (!MAPS[id]) id = 'town';
    this.map = new GameMap(id);
    this.monsters = [];
    this.drops = [];
    this.effects.clear();
    this.spawns = (this.map.def.spawns || []).map(s => ({ ...s, monster: null, timer: s.delay || 0 }));
    for (const s of this.spawns) if (s.timer <= 0) this.spawnFromPoint(s, true);

    const p = this.player;
    if (p && this.state === 'play') {
      const portal = portalId ? this.map.portals.find(pt => pt.id === portalId) : null;
      p.placeAt(portal ? portal.x : this.map.def.respawn.x, portal ? portal.y : this.map.groundY);
      this.banner(this.map.name, this.map.area);
      this.save();
    }
    this.updateCamera(0, true);
  },

  spawnFromPoint(s, instant) {
    const plat = s.b != null ? this.map.bridges[s.b] : s.p != null ? this.map.platforms[s.p] : this.map.ground;
    const m = new Monster(s.type, s.x, plat, this.map, { range: s.range, instant });
    s.monster = m;
    this.monsters.push(m);
    if (m.def.boss && this.state === 'play') {
      this.banner(`${m.def.name} has appeared!`, 'Jump to dodge its shockwave!', '#ff8a8a');
      Sfx.play('boss');
      this.shake = 8;
    }
  },

  summonMinions(boss, n) {
    const alive = this.monsters.filter(m => m.temp && m.alive).length;
    for (let i = 0; i < n && alive + i < 4; i++) {
      const m = new Monster('slime', boss.x + rand(-140, 140), boss.plat, this.map, { temp: true });
      m.aggro = 6;
      this.monsters.push(m);
      this.effects.burst(m.x, m.y - 20, '#9fe8ff', 10);
    }
  },

  /* ---------- update ---------- */

  update(dt) {
    this.time += dt;
    if (Input.wasPressed('mute')) this.toggleMute();
    const p = this.player;

    if (this.state === 'play') {
      if (Input.wasPressed('inv')) UI.toggle('inv');
      if (Input.wasPressed('stats')) UI.toggle('stats');
      if (Input.wasPressed('help')) UI.toggle('help');
      if (Input.wasPressed('close')) UI.closeTop();

      if (!this.transition && !p.dead) this.handleInteract();
      if (!this.transition) p.update(dt, this);
      if (!this.transition && !p.dead) this.handleItems(dt);

      if (p.dead && this.deathT > 0) {
        this.deathT -= dt;
        if (this.deathT <= 0) this.showDeathDialog();
      }
      this.saveT -= dt;
      if (this.saveT <= 0) {
        this.saveT = 15;
        this.save();
      }
    }

    for (const s of this.spawns) {
      if (!s.monster || !s.monster.alive) {
        s.timer -= dt;
        if (s.timer <= 0) this.spawnFromPoint(s, false);
      }
    }
    for (const m of this.monsters) m.update(dt, this);
    this.monsters = this.monsters.filter(m => !m.dead);
    for (const d of this.drops) d.update(dt, this);
    this.drops = this.drops.filter(d => !d.gone);
    for (const n of this.map.npcs) {
      n.update(dt);
      n.near = !!p && this.state === 'play' && !p.dead && Math.abs(n.x - p.x) < 50 && Math.abs(n.y - p.y) < 40;
    }
    this.effects.update(dt);

    if (this.bannerData) {
      this.bannerData.t += dt;
      if (this.bannerData.t >= this.bannerData.life) this.bannerData = null;
    }
    this.shake = Math.max(0, this.shake - dt * 30);
    this.updateTransition(dt);
    this.updateCamera(dt, false);
  },

  handleInteract() {
    const p = this.player;
    if (!Input.wasPressed('up') || p.rope) return;
    for (const n of this.map.npcs) {
      if (n.near) {
        this.talkTo(n);
        return;
      }
    }
    for (const pt of this.map.portals) {
      if (Math.abs(pt.x - p.x) < 26 && Math.abs(pt.y - p.y) < 24) {
        Sfx.play('portal');
        this.transition = { t: 0, phase: 'out', to: pt.to, portal: pt.toPortal };
        return;
      }
    }
  },

  handleItems(dt) {
    const p = this.player;
    if (Input.wasPressed('hp')) p.useItem('redPotion', this);
    if (Input.wasPressed('mp')) p.useItem('bluePotion', this);
    if (Input.wasPressed('elixir')) p.useItem('elixir', this);
    this.pickupT -= dt;
    if (Input.isDown('pickup') && this.pickupT <= 0 && this.tryPickup()) this.pickupT = 0.12;
  },

  tryPickup() {
    const p = this.player;
    let best = null;
    let bestDist = Infinity;
    for (const d of this.drops) {
      if (d.collected || (!d.settled && d.t < 0.3)) continue;
      const dx = Math.abs(d.x - p.x);
      const dy = Math.abs(d.y - p.y);
      if (dx < 36 && dy < 50 && dx + dy < bestDist) {
        best = d;
        bestDist = dx + dy;
      }
    }
    if (!best) return false;
    if (best.kind === 'gold') {
      p.gold += best.value;
      this.log(`You have gained gold (+${best.value})`, '#ffd76a');
      Sfx.play('coin');
      UI.dirty = true;
    } else {
      p.addItem(best.value, 1);
      this.log(`You have gained an item (${ITEMS[best.value].name})`, '#9fe0ff');
      Sfx.play('pickup');
    }
    best.collected = true;
    best.pickT = 0.18;
    return true;
  },

  updateTransition(dt) {
    const tr = this.transition;
    if (!tr) return;
    tr.t += dt;
    if (tr.phase === 'out' && tr.t >= 0.3) {
      this.loadMap(tr.to, tr.portal);
      tr.phase = 'in';
      tr.t = 0;
    } else if (tr.phase === 'in' && tr.t >= 0.35) {
      this.transition = null;
    }
  },

  updateCamera(dt, snap) {
    const m = this.map;
    let tx;
    let ty;
    if (this.player && this.state === 'play') {
      tx = this.player.x - VIEW_W / 2;
      ty = this.player.y - VIEW_H * 0.62;
    } else {
      tx = (Math.sin(this.time * 0.08) * 0.5 + 0.5) * (m.width - VIEW_W);
      ty = m.height - VIEW_H;
    }
    tx = clamp(tx, 0, Math.max(0, m.width - VIEW_W));
    ty = clamp(ty, 0, Math.max(0, m.height - VIEW_H));
    if (snap) {
      this.cam.x = tx;
      this.cam.y = ty;
    } else {
      const k = 1 - Math.exp(-dt * 8);
      this.cam.x += (tx - this.cam.x) * k;
      this.cam.y += (ty - this.cam.y) * k * 0.8;
    }
  },

  /* ---------- events ---------- */

  onMonsterKilled(m) {
    const d = m.def;
    Sfx.play('kill');
    this.effects.burst(m.x, m.y - d.h / 2, d.color, d.boss ? 40 : 12, { max: d.boss ? 360 : 220 });
    if (this.player) this.player.gainExp(d.exp, this);

    const loot = [];
    if (d.boss || chance(0.7)) loot.push({ kind: 'gold', value: randInt(d.gold[0], d.gold[1]) });
    for (const [id, pr] of d.drops) if (chance(pr)) loot.push({ kind: 'item', value: id });
    const lo = m.plat.x + 8;
    const hi = m.plat.x + m.plat.w - 8;
    loot.forEach((it, i) => {
      const x = clamp(m.x + (i - (loot.length - 1) / 2) * 22, lo, hi);
      this.drops.push(new Drop(it.kind, it.value, x, m.y - d.h / 2, m.plat, lo, hi));
    });

    const s = this.spawns.find(sp => sp.monster === m);
    if (s) s.timer = d.respawn || 7;
    if (d.boss) {
      this.banner(`${d.name} defeated!`, 'It will return in 90 seconds...', '#ffe066');
      this.shake = 14;
      for (const mo of this.monsters) if (mo.temp && mo.alive) mo.takeHit(mo.hp, 1, this);
    }
  },

  onLevelUp(p) {
    Sfx.play('levelup');
    this.effects.levelUp(p);
    this.log(`Level up! You are now Lv. ${p.level}. (+5 AP, press C)`, '#ffe066');
    for (const s of Object.values(SKILLS)) {
      if (s.reqLv === p.level && p.level > 1) {
        this.banner(`New skill: ${s.name}!`, `Press ${s.key} to use it.`, '#7fe9ff');
      }
    }
    UI.dirty = true;
    this.save();
  },

  onPlayerDeath() {
    Sfx.play('die');
    this.log('You have died...', '#ff9c9c');
    this.deathT = 1.4;
  },

  showDeathDialog() {
    UI.showDialog({
      name: 'Notice',
      text: 'You have fallen in battle. Return to Hearthvale to recover? (You lose 10% of this level\'s EXP.)',
      buttons: [{ label: 'Return to town', fn: () => UI.close('dialog') }],
      onClose: () => this.revive(),
    });
  },

  revive() {
    const p = this.player;
    if (!p.dead) return;
    const loss = Math.floor(expToLevel(p.level) * 0.1);
    p.exp = Math.max(0, p.exp - loss);
    p.dead = false;
    p.hp = Math.ceil(p.maxHP * 0.5);
    p.mp = Math.ceil(p.maxMP * 0.5);
    p.invuln = 2;
    this.transition = { t: 0, phase: 'out', to: 'town', portal: null };
  },

  talkTo(npc) {
    Sfx.play('click');
    if (npc.shop) UI.openShop(npc);
    else if (npc.talk) this.showTalk(npc, 0);
  },

  showTalk(npc, i) {
    const last = i >= npc.talk.length - 1;
    const buttons = [];
    if (i > 0) buttons.push({ label: 'Back', alt: true, fn: () => this.showTalk(npc, i - 1) });
    buttons.push(last
      ? { label: 'Got it!', fn: () => UI.close('dialog') }
      : { label: 'Next', fn: () => this.showTalk(npc, i + 1) });
    UI.showDialog({ name: npc.name, text: npc.talk[i], buttons });
  },

  buy(id, qty) {
    const p = this.player;
    const it = ITEMS[id];
    const cost = it.price * qty;
    if (p.gold < cost) {
      Sfx.play('error');
      this.log('Not enough gold.', '#ff9c9c');
      return;
    }
    p.gold -= cost;
    p.addItem(id, qty);
    Sfx.play('coin');
    this.log(`Bought ${qty > 1 ? qty + ' × ' : ''}${it.name}.`, '#9fe0ff');
    this.save();
  },

  sell(id, qty) {
    const p = this.player;
    const have = p.inv[id] || 0;
    const n = qty === 'all' ? have : Math.min(qty, have);
    if (n <= 0) return;
    p.removeItem(id, n);
    p.gold += ITEMS[id].sell * n;
    Sfx.play('coin');
    this.log(`Sold ${n > 1 ? n + ' × ' : ''}${ITEMS[id].name}.`, '#ffd76a');
    this.save();
  },

  onCanvasClick(e) {
    const p = this.player;
    if (this.state !== 'play' || !p || p.dead) return;
    const r = this.canvas.getBoundingClientRect();
    const wx = ((e.clientX - r.left) / r.width) * VIEW_W + this.cam.x;
    const wy = ((e.clientY - r.top) / r.height) * VIEW_H + this.cam.y;
    for (const n of this.map.npcs) {
      const b = n.box;
      if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h + 16) {
        if (Math.abs(n.x - p.x) < 500) this.talkTo(n);
        else this.log('Move closer to talk.', '#ff9c9c');
        return;
      }
    }
  },

  /* ---------- helpers ---------- */

  log(text, color = '#ffffff') {
    const last = this.messages[this.messages.length - 1];
    if (last && last.text === text && this.time - last.t < 1.5) {
      last.t = this.time;
      return;
    }
    this.messages.push({ text, color, t: this.time });
    if (this.messages.length > 30) this.messages.shift();
  },

  banner(title, sub, color = '#ffffff') {
    this.bannerData = { title, sub, color, t: 0, life: 3 };
  },

  toggleMute() {
    Sfx.muted = !Sfx.muted;
    try {
      localStorage.setItem(MUTE_KEY, Sfx.muted ? '1' : '0');
    } catch (e) { /* storage unavailable */ }
    UI.updateMuteLabel();
  },

  save() {
    if (!this.player || this.state !== 'play') return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.player.serialize(this.map.id)));
    } catch (e) { /* storage unavailable */ }
  },

  readSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      return s && s.v === 1 ? s : null;
    } catch (e) {
      return null;
    }
  },

  /* ---------- render ---------- */

  render() {
    const ctx = this.ctx;
    const k = this.canvas.width / VIEW_W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const map = this.map;
    const t = this.time;
    const sx = this.shake ? rand(-1, 1) * this.shake : 0;
    const sy = this.shake ? rand(-1, 1) * this.shake : 0;
    const cam = { x: Math.round(this.cam.x + sx), y: Math.round(this.cam.y + sy) };

    map.drawBackground(ctx, cam, t);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    map.drawWorld(ctx, cam, t);
    for (const n of map.npcs) n.draw(ctx, t);
    for (const d of this.drops) d.draw(ctx);
    for (const m of this.monsters) m.draw(ctx);
    const p = this.player;
    if (p && this.state === 'play') {
      if (!p.dead) {
        for (const pt of map.portals) {
          if (Math.abs(pt.x - p.x) < 26 && Math.abs(pt.y - p.y) < 24) drawUpArrow(ctx, pt.x, pt.y - 100, t);
        }
      }
      p.draw(ctx, t);
    }
    this.effects.draw(ctx);
    ctx.restore();
    map.drawOverlay(ctx, cam, t);

    if (map.theme.vignette) {
      const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(8,0,20,0.6)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.state === 'play') Hud.draw(ctx, this);

    const tr = this.transition;
    if (tr) {
      const a = tr.phase === 'out' ? tr.t / 0.3 : 1 - tr.t / 0.35;
      ctx.fillStyle = `rgba(0,0,0,${clamp(a, 0, 1)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  },
};

window.addEventListener('load', () => Game.init());
