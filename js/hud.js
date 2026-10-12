'use strict';

/* Canvas HUD: bottom status bar, quickslots, minimap, messages, banners, boss HP. */

const Hud = {
  hpShown: 0,
  mpShown: 0,

  draw(ctx, g) {
    this.drawMinimap(ctx, g);
    this.drawBossBar(ctx, g);
    this.drawBanner(ctx, g);
    this.drawMessages(ctx, g);
    if (g.player) this.drawBottomBar(ctx, g.player, g);
  },

  drawBar(ctx, x, y, w, h, frac, c1, c2, label, text, flat) {
    frac = clamp(frac || 0, 0, 1);
    const r = flat ? 0 : 4;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
    if (frac > 0) {
      const gr = ctx.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, c1);
      gr.addColorStop(1, c2);
      ctx.fillStyle = gr;
      roundRect(ctx, x + 1, y + 1, Math.max(r * 2, (w - 2) * frac), h - 2, Math.max(0, r - 1));
      ctx.fill();
    }
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = `900 ${flat ? 9 : 10}px ${FONT}`;
    if (label) {
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(label, x + 6, y + h / 2 + 0.5);
    }
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    ctx.strokeText(text, x + w / 2, y + h / 2 + 0.5);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x + w / 2, y + h / 2 + 0.5);
  },

  outlinedText(ctx, text, x, y, color) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  },

  drawBottomBar(ctx, p, g) {
    const y0 = VIEW_H - 56;
    const bg = ctx.createLinearGradient(0, y0, 0, VIEW_H);
    bg.addColorStop(0, 'rgba(38,50,82,0.96)');
    bg.addColorStop(1, 'rgba(14,18,32,0.98)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, y0, VIEW_W, 56);
    ctx.fillStyle = 'rgba(170,195,255,0.45)';
    ctx.fillRect(0, y0, VIEW_W, 1);

    // level, name, job
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffd76a';
    ctx.font = `900 10px ${FONT}`;
    ctx.fillText('LV.', 12, y0 + 16);
    ctx.font = `900 24px ${FONT}`;
    ctx.fillText(String(p.level), 12, y0 + 41);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 13px ${FONT}`;
    ctx.fillText(p.name, 62, y0 + 20);
    ctx.fillStyle = '#9fb0d8';
    ctx.font = `700 11px ${FONT}`;
    ctx.fillText(p.job, 62, y0 + 36);

    // HP / MP (bars ease toward the real value)
    this.hpShown = lerp(this.hpShown, p.hp, 0.25);
    this.mpShown = lerp(this.mpShown, p.mp, 0.25);
    this.drawBar(ctx, 160, y0 + 7, 230, 15, this.hpShown / p.maxHP, '#ff7a7a', '#c4222f', 'HP', `${Math.ceil(p.hp)} / ${p.maxHP}`);
    this.drawBar(ctx, 160, y0 + 26, 230, 15, this.mpShown / p.maxMP, '#7ac2ff', '#1f5fc4', 'MP', `${Math.floor(p.mp)} / ${p.maxMP}`);

    // gold + AP reminder
    ctx.save();
    ctx.translate(414, y0 + 15);
    drawIcon(ctx, 'gold', 18);
    ctx.restore();
    ctx.font = `800 13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe48a';
    ctx.fillText(fmt(p.gold), 428, y0 + 15);
    if (p.ap > 0) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(g.time * 6);
      ctx.fillStyle = '#7dffb0';
      ctx.font = `900 11px ${FONT}`;
      ctx.fillText(`+${p.ap} AP · press C`, 406, y0 + 35);
      ctx.globalAlpha = 1;
    }

    this.drawQuickslots(ctx, p, VIEW_W - 4 - QUICKSLOTS.length * 42, y0 + 4);

    // EXP bar
    const need = expToLevel(p.level);
    const max = p.level >= MAX_LEVEL;
    const frac = max ? 1 : p.exp / need;
    const text = max ? 'MAX LEVEL' : `EXP ${fmt(p.exp)} / ${fmt(need)}  [${(frac * 100).toFixed(2)}%]`;
    this.drawBar(ctx, 0, VIEW_H - 10, VIEW_W, 10, frac, '#f6ff9a', '#c8b81c', '', text, true);
  },

  drawQuickslots(ctx, p, x0, y) {
    QUICKSLOTS.forEach((q, i) => {
      const x = x0 + i * 42;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      roundRect(ctx, x, y, 38, 38, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,185,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      let locked = false;
      let dim = false;
      let count = null;
      let cdFrac = 0;
      ctx.save();
      ctx.translate(x + 19, y + 19);
      if (q.type === 'skill') {
        const s = SKILLS[q.id];
        locked = p.level < s.reqLv;
        dim = locked || p.mp < s.mp;
        drawIcon(ctx, s.icon, 30);
        if (q.id === 'dash') cdFrac = p.dashCd / s.delay;
        else if (p.skill === q.id) cdFrac = p.cooldown / s.delay;
      } else {
        count = p.inv[q.id] || 0;
        dim = count === 0;
        drawIcon(ctx, ITEMS[q.id].icon, 28);
      }
      ctx.restore();

      if (dim) {
        ctx.fillStyle = 'rgba(10,12,20,0.55)';
        roundRect(ctx, x, y, 38, 38, 6);
        ctx.fill();
      }
      if (!locked && cdFrac > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y + 38 * (1 - clamp(cdFrac, 0, 1)), 38, 38 * clamp(cdFrac, 0, 1));
      }
      ctx.font = `900 10px ${FONT}`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      this.outlinedText(ctx, q.key, x + 3, y + 2, '#ffffff');
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'right';
      if (locked) {
        ctx.textAlign = 'center';
        this.outlinedText(ctx, `Lv${SKILLS[q.id].reqLv}`, x + 19, y + 24, '#ffb3b3');
      } else if (count != null) {
        this.outlinedText(ctx, String(count), x + 36, y + 36, '#ffffff');
      } else if (SKILLS[q.id].mp) {
        this.outlinedText(ctx, String(SKILLS[q.id].mp), x + 36, y + 36, '#9fd0ff');
      }
    });
  },

  drawMinimap(ctx, g) {
    const m = g.map;
    const s = Math.min(190 / m.width, 84 / m.height);
    const w = m.width * s;
    const h = m.height * s;
    const x0 = 10;
    const y0 = 10;
    const pad = 6;
    const head = 18;
    ctx.fillStyle = 'rgba(12,16,28,0.72)';
    roundRect(ctx, x0, y0, w + pad * 2, h + pad * 2 + head, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(199,162,78,0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = `800 11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe48a';
    ctx.fillText(m.name, x0 + pad, y0 + 12);

    const mx = x0 + pad;
    const my = y0 + head + pad;
    ctx.fillStyle = 'rgba(120,160,220,0.18)';
    ctx.fillRect(mx, my, w, h);
    ctx.strokeStyle = '#cfe0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const p of m.platforms) {
      ctx.moveTo(mx + p.x * s, my + surfY(p, p.x) * s);
      if (p.bridge) ctx.lineTo(mx + (p.x + p.w / 2) * s, my + surfY(p, p.x + p.w / 2) * s);
      ctx.lineTo(mx + (p.x + p.w) * s, my + surfY(p, p.x + p.w) * s);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(207,224,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const r of m.ropes) {
      ctx.moveTo(mx + r.x * s, my + r.top * s);
      ctx.lineTo(mx + r.x * s, my + r.bottom * s);
    }
    ctx.stroke();
    const dot = (x, y, color, r = 3) => {
      ctx.fillStyle = color;
      circle(ctx, mx + x * s, my + y * s - 3, r);
      ctx.fill();
    };
    for (const p of m.portals) dot(p.x, p.y, '#6fc3ff');
    for (const n of m.npcs) dot(n.x, n.y, '#7dff9a');
    for (const mo of g.monsters) if (mo.def.boss && mo.alive) dot(mo.x, mo.y, '#ff5a5a', 4);
    const pl = g.player;
    if (pl) {
      dot(pl.x, pl.y, '#3a2a00', 4.5);
      dot(pl.x, pl.y, '#ffe066', 3.2);
    }
  },

  drawMessages(ctx, g) {
    const now = g.time;
    const list = g.messages.filter(m => now - m.t < 7).slice(-6);
    ctx.font = `700 12px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    let y = VIEW_H - 66 - (list.length - 1) * 16;
    for (const m of list) {
      ctx.globalAlpha = clamp(7 - (now - m.t), 0, 1);
      this.outlinedText(ctx, m.text, VIEW_W - 12, y, m.color);
      y += 16;
    }
    ctx.globalAlpha = 1;
  },

  drawBanner(ctx, g) {
    const b = g.bannerData;
    if (!b) return;
    const k = b.t / b.life;
    const a = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
    const y = 120;
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    const band = ctx.createLinearGradient(VIEW_W / 2 - 280, 0, VIEW_W / 2 + 280, 0);
    band.addColorStop(0, 'rgba(0,0,0,0)');
    band.addColorStop(0.5, 'rgba(0,0,0,0.5)');
    band.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = band;
    ctx.fillRect(VIEW_W / 2 - 280, y - 36, 560, 66);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `900 28px ${FONT}`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(b.title, VIEW_W / 2, y);
    ctx.fillStyle = b.color;
    ctx.fillText(b.title, VIEW_W / 2, y);
    if (b.sub) {
      ctx.font = `700 13px ${FONT}`;
      ctx.fillStyle = '#e8eeff';
      ctx.fillText(b.sub, VIEW_W / 2, y + 20);
    }
    ctx.restore();
  },

  drawBossBar(ctx, g) {
    const boss = g.monsters.find(m => m.def.boss && m.alive);
    if (!boss) return;
    const w = 340;
    const x = VIEW_W / 2 - w / 2 - 40;
    const y = 16;
    ctx.fillStyle = 'rgba(10,8,20,0.75)';
    roundRect(ctx, x - 8, y - 8, w + 16, 42, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,120,120,0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = `900 12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffb3b3';
    ctx.fillText(`Lv.${boss.def.level} ${boss.def.name}`, x, y + 3);
    this.drawBar(ctx, x, y + 12, w, 14, boss.hp / boss.def.hp, '#ff7a7a', '#b3121f', '', `${fmt(boss.hp)} / ${fmt(boss.def.hp)}`);
  },
};
