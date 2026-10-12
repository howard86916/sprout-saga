'use strict';

/* DOM windows: stats, inventory, shop, dialog, help and the title screen. */

const STAT_INFO = {
  str: 'Raises max damage',
  dex: 'Raises min damage',
  int: 'Raises max MP',
  luk: 'Crit & avoid',
};

const UI = {
  dirty: false,
  z: 20,
  shopNpc: null,
  invTab: 'use',
  drag: null,
  dialogOnClose: null,

  init() {
    this.root = document.getElementById('game');
    this.tip = document.getElementById('tooltip');
    this.apBadge = document.getElementById('ap-badge');
    this.muteBtn = document.getElementById('btn-mute');

    document.querySelectorAll('#topbar [data-win]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.currentTarget.blur();
        Sfx.init();
        this.toggle(btn.dataset.win);
      });
    });
    this.muteBtn.addEventListener('click', e => {
      e.currentTarget.blur();
      Sfx.init();
      Game.toggleMute();
    });

    for (const win of document.querySelectorAll('.window')) {
      win.querySelector('.win-close').addEventListener('click', () => this.close(win.dataset.name));
      win.querySelector('.win-head').addEventListener('mousedown', e => {
        if (e.target.closest('.win-close')) return;
        this.drag = { win, sx: e.clientX, sy: e.clientY, x: win.offsetLeft, y: win.offsetTop };
        e.preventDefault();
      });
      win.addEventListener('mousedown', () => this.front(win));
    }
    window.addEventListener('mousemove', e => {
      const d = this.drag;
      if (!d) return;
      const s = Game.scale;
      d.win.style.left = clamp(d.x + (e.clientX - d.sx) / s, 0, VIEW_W - d.win.offsetWidth) + 'px';
      d.win.style.top = clamp(d.y + (e.clientY - d.sy) / s, 0, VIEW_H - 40) + 'px';
    });
    window.addEventListener('mouseup', () => {
      this.drag = null;
    });

    this.buildStats();
    this.initTitle();
    this.updateMuteLabel();
  },

  /* ---------- window management ---------- */

  win(name) {
    return document.getElementById('win-' + name);
  },

  isOpen(name) {
    return !this.win(name).hidden;
  },

  open(name) {
    const w = this.win(name);
    w.hidden = false;
    this.front(w);
    this.render(name);
  },

  close(name) {
    const w = this.win(name);
    if (!w || w.hidden) return;
    w.hidden = true;
    this.hideTip();
    if (name === 'shop') this.shopNpc = null;
    if (name === 'dialog' && this.dialogOnClose) {
      const cb = this.dialogOnClose;
      this.dialogOnClose = null;
      cb();
    }
  },

  toggle(name) {
    if (Game.state !== 'play') return;
    if (this.isOpen(name)) this.close(name);
    else this.open(name);
  },

  closeTop() {
    let top = null;
    for (const w of document.querySelectorAll('.window')) {
      if (!w.hidden && (!top || +w.style.zIndex > +top.style.zIndex)) top = w;
    }
    if (top) this.close(top.dataset.name);
  },

  front(w) {
    w.style.zIndex = ++this.z;
  },

  render(name) {
    if (name === 'stats') this.updateStats();
    else if (name === 'inv') this.renderInv();
    else if (name === 'shop') this.renderShop();
  },

  // Called once per frame.
  tick() {
    const p = Game.player;
    if (!p) return;
    if (this.isOpen('stats')) this.updateStats();
    if (this.dirty) {
      this.dirty = false;
      if (this.isOpen('inv')) this.renderInv();
      if (this.isOpen('shop')) this.renderShop();
    }
    const showAp = p.ap > 0;
    if (this.apBadge.hidden === showAp) this.apBadge.hidden = !showAp;
  },

  updateMuteLabel() {
    this.muteBtn.firstChild.textContent = Sfx.muted ? 'Muted' : 'Sound';
    this.muteBtn.classList.toggle('off', Sfx.muted);
  },

  /* ---------- stats window ---------- */

  buildStats() {
    const body = this.win('stats').querySelector('.win-body');
    const rows = ['str', 'dex', 'int', 'luk'].map(k => `
      <div class="stat-row">
        <span class="stat-name">${k.toUpperCase()}</span><b data-s="${k}"></b>
        <small>${STAT_INFO[k]}</small><button class="btn plus" data-add="${k}">+</button>
      </div>`).join('');
    body.innerHTML = `
      <div class="stat-grid">
        <span>Name</span><b data-s="name"></b>
        <span>Job</span><b data-s="job"></b>
        <span>Level</span><b data-s="level"></b>
        <span>HP</span><b data-s="hp"></b>
        <span>MP</span><b data-s="mp"></b>
        <span>EXP</span><b data-s="exp"></b>
        <span>Damage</span><b data-s="dmg"></b>
        <span>Weapon</span><b data-s="weapon"></b>
        <span>Crit / Avoid</span><b data-s="crit"></b>
      </div>
      <div class="ap-row"><span>Ability Points</span><b data-s="ap"></b><button class="btn small" data-auto>Auto</button></div>
      ${rows}`;
    body.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
      if (!Game.player) return;
      Game.player.addStat(b.dataset.add);
      Sfx.play('click');
      this.updateStats();
    }));
    body.querySelector('[data-auto]').addEventListener('click', () => {
      if (!Game.player) return;
      Game.player.autoAssign();
      Sfx.play('click');
      this.updateStats();
    });
    this.statEls = {};
    body.querySelectorAll('[data-s]').forEach(el => {
      this.statEls[el.dataset.s] = el;
    });
    this.plusBtns = [...body.querySelectorAll('[data-add], [data-auto]')];
  },

  updateStats() {
    const p = Game.player;
    if (!p) return;
    const set = (k, v) => {
      const el = this.statEls[k];
      const s = String(v);
      if (el.textContent !== s) el.textContent = s;
    };
    const [min, max] = p.damageRange;
    const need = expToLevel(p.level);
    set('name', p.name);
    set('job', p.job);
    set('level', p.level);
    set('hp', `${Math.ceil(p.hp)} / ${p.maxHP}`);
    set('mp', `${Math.floor(p.mp)} / ${p.maxMP}`);
    set('exp', p.level >= MAX_LEVEL ? 'MAX' : `${fmt(p.exp)} / ${fmt(need)}`);
    set('dmg', `${min} ~ ${max}`);
    set('weapon', `${ITEMS[p.weapon].name} (+${p.watk})`);
    set('crit', `${Math.round(p.critRate * 100)}% / ${Math.round(p.avoidRate * 100)}%`);
    set('ap', p.ap);
    for (const k of ['str', 'dex', 'int', 'luk']) set(k, p.stats[k]);
    for (const b of this.plusBtns) b.disabled = p.ap <= 0;
  },

  /* ---------- inventory ---------- */

  renderInv() {
    const p = Game.player;
    if (!p) return;
    this.hideTip();
    const body = this.win('inv').querySelector('.win-body');
    const tabs = [['equip', 'Equip'], ['use', 'Use'], ['etc', 'Etc']];
    const ids = Object.keys(p.inv).filter(id => ITEMS[id].type === this.invTab);
    const slotCount = Math.max(16, Math.ceil(ids.length / 4) * 4);
    const slots = Array.from({ length: slotCount }, (_, i) => {
      const id = ids[i];
      if (!id) return '<div class="slot"></div>';
      const n = p.inv[id];
      return `<div class="slot" data-id="${id}"><span class="count">${n > 1 ? n : ''}</span></div>`;
    }).join('');
    const w = ITEMS[p.weapon];
    body.innerHTML = `
      <div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${k === this.invTab ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      ${this.invTab === 'equip' ? `<div class="equipped"><div class="slot sm" data-id="${p.weapon}" data-equipped="1"></div><div><b>${w.name}</b><br><small>Equipped · ATK +${w.atk}</small></div></div>` : ''}
      <div class="grid">${slots}</div>
      <div class="inv-foot"><span class="gold-label">${fmt(p.gold)} G</span><small>Double-click to use / equip</small></div>`;

    body.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
      this.invTab = b.dataset.tab;
      Sfx.play('click');
      this.renderInv();
    }));
    body.querySelectorAll('.slot[data-id]').forEach(el => {
      const id = el.dataset.id;
      this.addIcon(el, ITEMS[id].icon, el.classList.contains('sm') ? 28 : 34);
      this.bindTip(el, () => this.itemTip(id));
      if (!el.dataset.equipped) el.addEventListener('dblclick', () => Game.player.useItem(id, Game));
    });
  },

  addIcon(el, icon, size) {
    const c = document.createElement('canvas');
    const dpr = 2;
    c.width = c.height = size * dpr;
    c.style.width = c.style.height = size + 'px';
    const x = c.getContext('2d');
    x.scale(dpr, dpr);
    x.translate(size / 2, size / 2);
    drawIcon(x, icon, size * 0.9);
    el.prepend(c);
  },

  itemTip(id) {
    const it = ITEMS[id];
    const p = Game.player;
    let html = `<b>${it.name}</b>`;
    if (it.type === 'equip') {
      html += `<div>ATK +${it.atk}</div><div class="${p && p.level < it.reqLv ? 'bad' : ''}">Req. Lv ${it.reqLv}</div>`;
    }
    if (it.desc) html += `<div class="desc">${it.desc}</div>`;
    html += `<div class="sell">Sells for ${fmt(it.sell)} G</div>`;
    return html;
  },

  bindTip(el, fn) {
    el.addEventListener('mouseenter', e => this.showTip(fn(), e));
    el.addEventListener('mousemove', e => this.moveTip(e));
    el.addEventListener('mouseleave', () => this.hideTip());
  },

  showTip(html, e) {
    this.tip.innerHTML = html;
    this.tip.hidden = false;
    this.moveTip(e);
  },

  moveTip(e) {
    const r = this.root.getBoundingClientRect();
    const s = Game.scale;
    let x = (e.clientX - r.left) / s + 14;
    let y = (e.clientY - r.top) / s + 14;
    if (x + this.tip.offsetWidth > VIEW_W) x -= this.tip.offsetWidth + 28;
    if (y + this.tip.offsetHeight > VIEW_H) y -= this.tip.offsetHeight + 28;
    this.tip.style.left = x + 'px';
    this.tip.style.top = y + 'px';
  },

  hideTip() {
    this.tip.hidden = true;
  },

  /* ---------- shop ---------- */

  openShop(npc) {
    this.shopNpc = npc;
    this.win('shop').querySelector('.win-head span').textContent = npc.name + "'s Shop";
    this.open('shop');
  },

  renderShop() {
    const p = Game.player;
    const npc = this.shopNpc;
    if (!p || !npc) return;
    this.hideTip();
    const body = this.win('shop').querySelector('.win-body');
    const buyRows = npc.shop.map(id => {
      const it = ITEMS[id];
      const lv = it.reqLv > 1 ? ` · Lv ${it.reqLv}` : '';
      const ten = it.type === 'use' ? `<button class="btn small" data-buy="${id}" data-qty="10">×10</button>` : '';
      return `<div class="shop-row"><div class="slot sm" data-id="${id}"></div>
        <div class="shop-info"><b>${it.name}</b><small>${fmt(it.price)} G${lv}</small></div>
        <div class="shop-btns"><button class="btn small" data-buy="${id}" data-qty="1">Buy</button>${ten}</div></div>`;
    }).join('');
    const sellIds = Object.keys(p.inv).filter(id => ITEMS[id].sell > 0);
    const sellRows = sellIds.length ? sellIds.map(id => {
      const it = ITEMS[id];
      const n = p.inv[id];
      const all = n > 1 ? `<button class="btn small alt" data-sell="${id}" data-qty="all">All</button>` : '';
      return `<div class="shop-row"><div class="slot sm" data-id="${id}"><span class="count">${n > 1 ? n : ''}</span></div>
        <div class="shop-info"><b>${it.name}</b><small>${fmt(it.sell)} G each</small></div>
        <div class="shop-btns"><button class="btn small alt" data-sell="${id}" data-qty="1">Sell</button>${all}</div></div>`;
    }).join('') : '<p class="empty-note">Nothing to sell.</p>';

    body.innerHTML = `
      <div class="shop-head"><p>"${npc.greeting}"</p><span class="gold-label">${fmt(p.gold)} G</span></div>
      <div class="shop-cols">
        <div class="shop-col"><h4>Buy</h4><div class="shop-list">${buyRows}</div></div>
        <div class="shop-col"><h4>Sell</h4><div class="shop-list">${sellRows}</div></div>
      </div>`;
    body.querySelectorAll('.slot[data-id]').forEach(el => {
      const id = el.dataset.id;
      this.addIcon(el, ITEMS[id].icon, 28);
      this.bindTip(el, () => this.itemTip(id));
    });
    body.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
      Game.buy(b.dataset.buy, +b.dataset.qty);
      this.renderShop();
    }));
    body.querySelectorAll('[data-sell]').forEach(b => b.addEventListener('click', () => {
      Game.sell(b.dataset.sell, b.dataset.qty === 'all' ? 'all' : +b.dataset.qty);
      this.renderShop();
    }));
  },

  /* ---------- dialog ---------- */

  showDialog({ name, text, buttons, onClose }) {
    const w = this.win('dialog');
    w.querySelector('.win-head span').textContent = name;
    const body = w.querySelector('.win-body');
    body.innerHTML = '<p class="dialog-text"></p><div class="dialog-btns"></div>';
    body.querySelector('.dialog-text').textContent = text;
    const row = body.querySelector('.dialog-btns');
    for (const b of buttons) {
      const el = document.createElement('button');
      el.className = 'btn' + (b.alt ? ' alt' : '');
      el.textContent = b.label;
      el.addEventListener('click', () => {
        Sfx.play('click');
        b.fn();
      });
      row.appendChild(el);
    }
    this.dialogOnClose = onClose || null;
    w.hidden = false;
    this.front(w);
  },

  /* ---------- title screen ---------- */

  initTitle() {
    const save = Game.readSave();
    const btnNew = document.getElementById('btn-new');
    const btnCont = document.getElementById('btn-continue');
    const input = document.getElementById('name-input');
    if (save) {
      btnCont.hidden = false;
      btnCont.textContent = `Continue (${save.name}, Lv. ${save.level})`;
      input.value = save.name;
    }
    // Two-step confirm in the page itself (browser confirm() dialogs are blocked in some hosts).
    let armed = false;
    btnNew.addEventListener('click', () => {
      Sfx.init();
      if (save && !armed) {
        armed = true;
        btnNew.textContent = 'Click again to overwrite your save';
        return;
      }
      Game.newGame(input.value.trim().slice(0, 12) || 'Sprout');
    });
    btnCont.addEventListener('click', () => {
      Sfx.init();
      Game.continueGame();
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') (save ? btnCont : btnNew).click();
    });
    setTimeout(() => input.focus(), 100);
  },

  hideTitle() {
    document.getElementById('name-input').blur();
    document.getElementById('title').hidden = true;
    document.getElementById('topbar').hidden = false;
  },
};
