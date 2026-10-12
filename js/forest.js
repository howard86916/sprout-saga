'use strict';

/*
  Painted-forest art: giant twisted trunks, leafy platforms, rope bridges, misty parallax
  layers and light shafts. The heavy layers are painted once per map into offscreen
  canvases (cached), so each frame only blits a handful of images.
*/

const ART_RES = 1.25; // offscreen resolution multiplier for crisper world sprites
const FOREST_FAR = 0.3; // parallax factors
const FOREST_MID = 0.6;
const forestCache = new Map();

function makeLayer(w, h, res = ART_RES) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w * res));
  canvas.height = Math.max(1, Math.ceil(h * res));
  const ctx = canvas.getContext('2d');
  ctx.scale(res, res);
  return { canvas, ctx, w, h, res, x: 0, y: 0 };
}

function blit(ctx, L) {
  ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
}

/* ---------- primitives ---------- */

// A pointed leaf from (x, y) toward `ang`.
function leafPath(ctx, x, y, len, wid, ang) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const tx = x + c * len;
  const ty = y + s * len;
  const mx = x + c * len * 0.45;
  const my = y + s * len * 0.45;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx - s * wid, my + c * wid, tx, ty);
  ctx.quadraticCurveTo(mx + s * wid, my - c * wid, x, y);
  ctx.closePath();
}

function quadPoint(x0, y0, cx, cy, x1, y1, t) {
  const u = 1 - t;
  return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1];
}

// Drooping fern frond.
function paintFern(ctx, x, y, dir, len, col) {
  const cx = x + dir * len * 0.75;
  const cy = y + len * 0.15;
  const ex = x + dir * len * 0.7;
  const ey = y + len;
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  ctx.stroke();
  for (let k = 1; k < 10; k++) {
    const t = k / 10;
    const [px, py] = quadPoint(x, y, cx, cy, ex, ey, t);
    const [qx, qy] = quadPoint(x, y, cx, cy, ex, ey, t + 0.02);
    const ang = Math.atan2(qy - py, qx - px);
    const size = (1 - t) * 9 + 3;
    leafPath(ctx, px, py, size, 1.8, ang + 1.15);
    ctx.fill();
    leafPath(ctx, px, py, size, 1.8, ang - 1.15);
    ctx.fill();
  }
}

// Golden fiddlehead curl.
function paintCurl(ctx, x, y, col) {
  ctx.strokeStyle = col;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 2, y - 10, x + 2, y - 16);
  const cx = x + 6;
  const cy = y - 17;
  for (let a = Math.PI; a < Math.PI * 4.2; a += 0.3) {
    const r = Math.max(0.5, 5 - (a - Math.PI) * 0.45);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.stroke();
}

/* ---------- trunks ---------- */

// s: {cx, top, bottom, w, roots}; pal: {dark, mid, light, hi, vine?, vineLeaf?}
function paintTrunk(ctx, s, pal, rng, o = {}) {
  const a1 = rng() * 6.28;
  const a2 = rng() * 6.28;
  const a3 = rng() * 6.28;
  const H = s.bottom - s.top;
  const wob = y => Math.sin(y * 0.01 + a1) * s.w * 0.07 + Math.sin(y * 0.023 + a2) * s.w * 0.035;
  const halfW = y => {
    const k = clamp((y - s.top) / H, 0, 1);
    const flare = s.roots ? Math.pow(Math.max(0, (k - 0.8) / 0.2), 2) * 0.6 : 0;
    return (s.w / 2) * (1 + flare + Math.sin(y * 0.017 + a3) * 0.05);
  };

  const path = new Path2D();
  path.moveTo(s.cx + wob(s.top) - halfW(s.top), s.top);
  for (let y = s.top; y <= s.bottom; y += 8) path.lineTo(s.cx + wob(y) - halfW(y), y);
  path.lineTo(s.cx + wob(s.bottom) - halfW(s.bottom), s.bottom);
  path.lineTo(s.cx + wob(s.bottom) + halfW(s.bottom), s.bottom);
  for (let y = s.bottom; y >= s.top; y -= 8) path.lineTo(s.cx + wob(y) + halfW(y), y);
  path.closePath();

  ctx.save();
  // round cylinder base
  const g = ctx.createLinearGradient(s.cx - s.w * 0.75, 0, s.cx + s.w * 0.75, 0);
  g.addColorStop(0, pal.dark);
  g.addColorStop(0.22, pal.mid);
  g.addColorStop(0.42, pal.light);
  g.addColorStop(0.62, pal.mid);
  g.addColorStop(1, pal.dark);
  ctx.fillStyle = g;
  ctx.fill(path);
  ctx.clip(path);

  // twisting rope-like bark strands, each with a dark under-stroke and a lit top-stroke
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const n = Math.round((s.w / 8) * (o.strands ?? 1));
  for (let i = 0; i < n; i++) {
    const ph = rng() * 6.28;
    const amp = s.w * (0.12 + rng() * 0.35);
    const fr = 0.004 + rng() * 0.006;
    const u = (rng() - 0.5) * s.w * 0.9;
    const lw = 4 + rng() * 12;
    const strand = new Path2D();
    let first = true;
    for (let y = s.top - 20; y <= s.bottom + 20; y += 6) {
      const x = s.cx + wob(y) + u + Math.sin(y * fr + ph) * amp;
      if (first) {
        strand.moveTo(x, y);
        first = false;
      } else {
        strand.lineTo(x, y);
      }
    }
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = lw + 3;
    ctx.stroke(strand);
    ctx.globalAlpha = 0.5 + rng() * 0.4;
    ctx.strokeStyle = rng() < 0.5 ? pal.light : pal.mid;
    ctx.lineWidth = lw;
    ctx.save();
    ctx.translate(-1.5, -1);
    ctx.stroke(strand);
    ctx.restore();
    if (rng() < 0.5) {
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = pal.hi;
      ctx.lineWidth = Math.max(1.5, lw * 0.25);
      ctx.save();
      ctx.translate(-lw * 0.25, 0);
      ctx.stroke(strand);
      ctx.restore();
    }
  }

  // cylinder shading
  const k = o.shade ?? 1;
  ctx.globalAlpha = 1;
  const sh = ctx.createLinearGradient(s.cx - s.w * 0.8, 0, s.cx + s.w * 0.8, 0);
  sh.addColorStop(0, `rgba(10,25,0,${0.55 * k})`);
  sh.addColorStop(0.18, `rgba(10,25,0,${0.1 * k})`);
  sh.addColorStop(0.4, `rgba(255,255,200,${0.12 * k})`);
  sh.addColorStop(0.7, `rgba(10,25,0,${0.08 * k})`);
  sh.addColorStop(1, `rgba(10,25,0,${0.6 * k})`);
  ctx.fillStyle = sh;
  ctx.fillRect(s.cx - s.w * 1.5, s.top - 20, s.w * 3, H + 40);

  // knot holes
  if (o.knots && H > 220) {
    const count = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < count; i++) {
      const y = s.top + H * (0.25 + rng() * 0.5);
      const x = s.cx + wob(y) + (rng() - 0.5) * s.w * 0.4;
      const rx = s.w * (0.08 + rng() * 0.06);
      const ry = rx * (1.6 + rng() * 0.6);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = pal.dark;
      ellipse(ctx, x, y, rx * 1.4, ry * 1.25);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(14,24,4,1)';
      ellipse(ctx, x, y, rx, ry);
      ctx.fill();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = pal.light;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, rx * 1.15, ry * 1.1, 0, Math.PI * 0.6, Math.PI * 1.4);
      ctx.stroke();
    }
  }

  // winding vines
  if (o.vines && pal.vine) {
    const nv = 1 + Math.floor(rng() * 2);
    for (let v = 0; v < nv; v++) {
      const ph = rng() * 6.28;
      const fr = 0.012 + rng() * 0.01;
      const y0 = s.top + 20;
      const y1 = s.bottom - 60;
      const at = y => s.cx + wob(y) + Math.sin(y * fr + ph) * halfW(y) * 0.9;
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = pal.vine;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(at(y0), y0);
      for (let y = y0; y <= y1; y += 6) ctx.lineTo(at(y), y);
      ctx.stroke();
      ctx.fillStyle = pal.vineLeaf;
      for (let y = y0 + 10; y < y1; y += 22 + rng() * 14) {
        leafPath(ctx, at(y), y, 9 + rng() * 6, 3.5, rng() < 0.5 ? 0.4 : Math.PI - 0.4);
        ctx.fill();
      }
    }
  }
  ctx.restore();

  // painted outline
  ctx.save();
  ctx.globalAlpha = 0.55 * k;
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = 3;
  ctx.stroke(path);
  ctx.restore();
}

function paintBranch(ctx, from, to, thick, pal) {
  const mx = (from.x + to.x) / 2;
  const my = Math.max(from.y, to.y) + 16;
  const path = new Path2D();
  path.moveTo(from.x, from.y);
  path.quadraticCurveTo(mx, my, to.x, to.y);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = thick + 6;
  ctx.stroke(path);
  ctx.strokeStyle = pal.mid;
  ctx.lineWidth = thick;
  ctx.stroke(path);
  ctx.translate(0, -thick * 0.25);
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = pal.light;
  ctx.lineWidth = thick * 0.35;
  ctx.stroke(path);
  ctx.restore();
}

/* ---------- foliage ---------- */

// Leafy clump whose walkable top edge is at y. lp: {c: [5 greens dark→bright], accent, curl}
function paintFoliage(ctx, x0, y, w, lp, rng, o = {}) {
  const c = lp.c;
  const x1 = x0 + w;
  const cx = x0 + w / 2;
  const dens = o.density ?? 1;
  ctx.lineCap = 'round';

  if (o.hang !== false) {
    // hanging vines
    const hl = o.hangLen ?? 70;
    const nv = Math.max(1, Math.round((w / 55) * dens));
    for (let i = 0; i < nv; i++) {
      const vx = x0 + 10 + rng() * Math.max(1, w - 20);
      const len = hl * (0.35 + rng() * 0.65);
      const sway = (rng() - 0.5) * 24;
      const y0 = y + 12;
      ctx.strokeStyle = c[1];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(vx, y0);
      ctx.quadraticCurveTo(vx + sway, y0 + len * 0.6, vx + sway * 0.4, y0 + len);
      ctx.stroke();
      let side = 0;
      for (let k = 10; k < len; k += 9) {
        const [lx, ly] = quadPoint(vx, y0, vx + sway, y0 + len * 0.6, vx + sway * 0.4, y0 + len, k / len);
        ctx.fillStyle = side % 2 ? c[2] : c[3];
        leafPath(ctx, lx, ly, 7 + rng() * 5, 2.5, side % 2 ? 0.5 : Math.PI - 0.5);
        ctx.fill();
        side++;
      }
    }
    // drooping ferns
    const nf = Math.max(1, Math.round((w / 80) * dens));
    for (let i = 0; i < nf; i++) {
      const fx = x0 + rng() * w;
      paintFern(ctx, fx, y + 8, fx < cx ? -1 : 1, 30 + rng() * 34, rng() < 0.3 ? lp.accent : c[2]);
    }
  }

  // dark mass underneath
  if (o.under !== false) {
    const ph = rng() * 6;
    ctx.fillStyle = c[0];
    ctx.beginPath();
    ctx.moveTo(x0 - 16, y);
    for (let x = x0 - 16; x <= x1 + 16; x += 10) ctx.lineTo(x, y + 16 + Math.sin(x * 0.08 + ph) * 5 + rng() * 6);
    ctx.lineTo(x1 + 16, y);
    ctx.closePath();
    ctx.fill();
  }

  // leaves, painted back to front: dark drooping ones first, bright upturned ones last
  const n = Math.round((w / 3) * dens);
  const passes = [
    { col: c[0], dy: 16, len: 26, down: true },
    { col: c[1], dy: 10, len: 24 },
    { col: c[2], dy: 5, len: 22 },
    { col: lp.accent, dy: 4, len: 16, frac: 0.25 },
    { col: c[3], dy: 0, len: 18 },
    { col: c[4], dy: -3, len: 12, frac: 0.5 },
  ];
  for (const ps of passes) {
    ctx.fillStyle = ps.col;
    const count = Math.round(n * (ps.frac ?? 1));
    for (let i = 0; i < count; i++) {
      const lx = x0 - 12 + rng() * (w + 24);
      const edge = clamp((lx - cx) / (w / 2), -1.2, 1.2);
      const ang = ps.down
        ? Math.PI / 2 + edge * 0.8 + (rng() - 0.5) * 1.2
        : -Math.PI / 2 + edge * 1.05 + (rng() - 0.5) * 1.1;
      const ly = y + ps.dy * (0.3 + rng() * 0.9) + Math.abs(edge) * 6;
      leafPath(ctx, lx, ly, ps.len * (0.7 + rng() * 0.75), 3.5 + rng() * 5, ang);
      ctx.fill();
    }
  }

  if (o.curls !== false && rng() < 0.7) {
    const nc = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < nc; i++) paintCurl(ctx, x0 + 10 + rng() * Math.max(1, w - 20), y - 2, lp.curl);
  }
}

/* ---------- rope bridges (drawn live; they're cheap) ---------- */

function drawBridge(ctx, p) {
  const b = p.bridge;
  const rail = (x, h) => surfY(p, x) - h;

  // planks follow the sag
  for (let x = b.x1; x < b.x2 - 2; x += 9) {
    const y0 = surfY(p, x);
    const y1 = surfY(p, x + 9);
    ctx.save();
    ctx.translate(x + 4.5, (y0 + y1) / 2);
    ctx.rotate(Math.atan2(y1 - y0, 9));
    ctx.fillStyle = (Math.round(x / 9) % 2) ? '#c99c5c' : '#b98a4c';
    ctx.fillRect(-4, -1, 8, 7);
    ctx.strokeStyle = '#6e4b24';
    ctx.lineWidth = 1;
    ctx.strokeRect(-4, -1, 8, 7);
    ctx.restore();
  }

  // rope netting
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(232,218,172,0.95)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let x = b.x1 + 6; x <= b.x2 - 6; x += 16) {
    ctx.moveTo(x, surfY(p, x));
    ctx.lineTo(x, rail(x, 30));
    const xm = Math.min(x + 8, b.x2 - 6);
    const xn = Math.min(x + 16, b.x2 - 6);
    ctx.moveTo(x, rail(x, 15));
    ctx.lineTo(xm, surfY(p, xm) - 1);
    ctx.lineTo(xn, rail(xn, 15));
  }
  ctx.stroke();

  // hand rails
  for (const [h, wdt] of [[30, 3], [15, 2]]) {
    ctx.beginPath();
    for (let x = b.x1 + 4; x <= b.x2 - 4; x += 8) {
      if (x === b.x1 + 4) ctx.moveTo(x, rail(x, h));
      else ctx.lineTo(x, rail(x, h));
    }
    ctx.strokeStyle = '#8a7650';
    ctx.lineWidth = wdt + 1.5;
    ctx.stroke();
    ctx.strokeStyle = '#ecdfb4';
    ctx.lineWidth = wdt;
    ctx.stroke();
  }

  // end posts
  for (const px of [b.x1 + 4, b.x2 - 4]) {
    const py = surfY(p, px);
    ctx.fillStyle = '#5e4020';
    roundRect(ctx, px - 4, py - 40, 8, 44, 2);
    ctx.fill();
    ctx.fillStyle = '#8f6838';
    ctx.fillRect(px - 4, py - 40, 3, 44);
  }
}

/* ---------- building a map's art ---------- */

function getForestArt(map) {
  let art = forestCache.get(map.id);
  if (!art) {
    art = buildForestArt(map);
    forestCache.set(map.id, art);
  }
  return art;
}

function buildForestArt(map) {
  const th = map.theme;
  const rng = mulberry32(hashString(map.id + '/forest'));
  return {
    far: paintBackLayer(map, FOREST_FAR, rng, {
      pal: th.farTrunk, leaf: th.farLeaf, sky: th.sky, spacing: 150, w: 120, fog: th.fogFar, glow: true, tuftChance: 0.7,
    }),
    mid: paintBackLayer(map, FOREST_MID, rng, {
      pal: th.midTrunk, leaf: th.midLeaf, spacing: 320, w: 180, fog: th.fogMid, tuftChance: 0.35,
    }),
    branches: map.platforms.filter(p => p.branch != null && map.trunks[p.branch]).map(p => paintBranchSprite(map, p)),
    trunks: map.trunks.map(t => paintTrunkSprite(map, t, rng)),
    plats: map.platforms.filter(p => !p.ground && !p.bridge).map(p => paintPlatformSprite(map, p, rng)),
    ground: paintGroundSprite(map, rng),
    motes: Array.from({ length: 46 }, () => ({
      x: rng() * VIEW_W, y: rng() * VIEW_H, r: 1 + rng() * 2.2,
      vx: 4 + rng() * 10, vy: -3 - rng() * 8, p: rng() * 6.28, leaf: rng() < 0.18,
    })),
    shafts: Array.from({ length: 4 }, () => ({ x: rng(), w: 50 + rng() * 90, p: rng() * 6.28 })),
  };
}

// A parallax layer sized so it exactly covers the view at every camera position.
function paintBackLayer(map, f, rng, o) {
  const lw = Math.ceil(VIEW_W + Math.max(0, map.width - VIEW_W) * f);
  const lh = Math.ceil(VIEW_H + Math.max(0, map.height - VIEW_H) * f);
  const L = makeLayer(lw, lh, 1);
  const ctx = L.ctx;
  if (o.sky) {
    const g = ctx.createLinearGradient(0, 0, 0, lh);
    g.addColorStop(0, o.sky[0]);
    g.addColorStop(0.55, o.sky[1]);
    g.addColorStop(1, o.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, lw, lh);
  }
  if (o.glow) {
    // bright misty gaps between the distant trees
    for (let i = 0; i < lw / 380; i++) {
      const x = rng() * lw;
      const w = 60 + rng() * 120;
      const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
      g.addColorStop(0, 'rgba(255,255,240,0)');
      g.addColorStop(0.5, 'rgba(255,255,230,0.4)');
      g.addColorStop(1, 'rgba(255,255,240,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - w, 0, w * 2, lh);
    }
  }
  for (let x = -40 + rng() * o.spacing * 0.5; x < lw + 60; x += o.spacing * (0.55 + rng() * 0.8)) {
    const w = o.w * (0.6 + rng() * 0.8);
    paintTrunk(ctx, { cx: x, top: -60, bottom: lh + 60, w }, o.pal, rng, { shade: 0.5, knots: rng() < 0.5, strands: 0.7 });
    // soft, hazy tufts so they read as scenery, not as platforms you can stand on
    const tufts = rng() < o.tuftChance ? 1 : 0;
    for (let k = 0; k < tufts; k++) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      paintFoliage(ctx, x - w * 0.5 + rng() * w * 0.2, lh * (0.15 + rng() * 0.6), w * (0.5 + rng() * 0.4), o.leaf, rng,
        { hangLen: 50, density: 0.55, curls: false });
      ctx.restore();
    }
  }
  if (o.fog) {
    ctx.fillStyle = o.fog;
    ctx.fillRect(0, 0, lw, lh);
  }
  return L;
}

function paintTrunkSprite(map, t, rng) {
  const bottom = map.groundY + 30;
  const pad = t.w * 0.9 + 20;
  const L = makeLayer(t.w + pad * 2, bottom - t.top + 40);
  L.x = t.x - t.w / 2 - pad;
  L.y = t.top - 20;
  L.ctx.translate(-L.x, -L.y);
  paintTrunk(L.ctx, { cx: t.x, top: t.top, bottom, w: t.w, roots: true }, map.theme.trunk, rng, { knots: true, vines: true });
  return L;
}

function paintBranchSprite(map, p) {
  const t = map.trunks[p.branch];
  const side = p.x + p.w / 2 > t.x ? 1 : -1;
  const reach = Math.min(70, p.w * 0.4);
  const from = { x: t.x + side * t.w * 0.38, y: p.y + 48 };
  const to = { x: side > 0 ? p.x + reach : p.x + p.w - reach, y: p.y + 14 };
  const minX = Math.min(from.x, to.x) - 30;
  const minY = Math.min(from.y, to.y) - 30;
  const L = makeLayer(Math.abs(to.x - from.x) + 60, Math.abs(to.y - from.y) + 90);
  L.x = minX;
  L.y = minY;
  L.ctx.translate(-minX, -minY);
  paintBranch(L.ctx, from, to, 24, map.theme.trunk);
  return L;
}

function paintPlatformSprite(map, p, rng) {
  const L = makeLayer(p.w + 100, 170);
  L.x = p.x - 50;
  L.y = p.y - 50;
  L.ctx.translate(-L.x, -L.y);
  paintFoliage(L.ctx, p.x, p.y, p.w, map.theme.leaf, rng, { hangLen: 80 });
  return L;
}

function paintGroundSprite(map, rng) {
  const th = map.theme;
  const top = map.groundY - 40;
  const L = makeLayer(map.width, map.height - top + 40);
  L.y = top;
  const ctx = L.ctx;
  ctx.translate(0, -top);
  const g = ctx.createLinearGradient(0, map.groundY, 0, map.height);
  g.addColorStop(0, th.soil[0]);
  g.addColorStop(1, th.soil[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, map.groundY + 6, map.width, map.height - map.groundY + 40);

  // gnarled roots
  ctx.lineCap = 'round';
  for (let i = 0; i < map.width / 70; i++) {
    const x = rng() * map.width;
    const y = map.groundY + 20 + rng() * 40;
    const len = 80 + rng() * 160;
    const root = new Path2D();
    root.moveTo(x, y);
    root.bezierCurveTo(x + len * 0.3, y - 14 + rng() * 28, x + len * 0.7, y - 14 + rng() * 28, x + len, y + rng() * 20);
    const lw = 10 + rng() * 10;
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = th.trunk.dark;
    ctx.lineWidth = lw;
    ctx.stroke(root);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = th.trunk.mid;
    ctx.lineWidth = lw * 0.5;
    ctx.stroke(root);
  }
  ctx.globalAlpha = 1;
  for (let x = -40; x < map.width + 40; x += 220) {
    paintFoliage(ctx, x, map.groundY, 260, th.leaf, rng, { hang: false });
  }
  return L;
}

/* ---------- per-frame drawing ---------- */

function drawForestBackground(ctx, map, cam, t) {
  const art = map.art;
  ctx.drawImage(art.far.canvas, -cam.x * FOREST_FAR, -cam.y * FOREST_FAR, art.far.w, art.far.h);
  drawLightShafts(ctx, art, cam, t, 0.8);
  ctx.drawImage(art.mid.canvas, -cam.x * FOREST_MID, -cam.y * FOREST_MID, art.mid.w, art.mid.h);
}

function drawForestWorld(ctx, map, cam, t) {
  const art = map.art;
  const x0 = cam.x - 60;
  const x1 = cam.x + VIEW_W + 60;
  const y0 = cam.y - 60;
  const y1 = cam.y + VIEW_H + 60;
  const visible = L => L.x < x1 && L.x + L.w > x0 && L.y < y1 && L.y + L.h > y0;

  for (const d of map.back) if (d.type === 'house' && d.x + d.w > x0 && d.x < x1) drawHouse(ctx, d);
  for (const L of art.branches) if (visible(L)) blit(ctx, L);
  for (const L of art.trunks) if (visible(L)) blit(ctx, L);

  // ground: copy only the visible slice of the long strip
  const G = art.ground;
  if (G.y < y1) {
    const sx = clamp(cam.x - 10, 0, G.w);
    const sw = Math.min(VIEW_W + 20, G.w - sx);
    if (sw > 0) ctx.drawImage(G.canvas, sx * G.res, 0, sw * G.res, G.canvas.height, sx, G.y, sw, G.h);
  }

  for (const r of map.ropes) if (r.x > x0 && r.x < x1) map.drawRope(ctx, r);
  for (const p of map.bridges) if (p.x < x1 && p.x + p.w > x0) drawBridge(ctx, p);
  for (const L of art.plats) if (visible(L)) blit(ctx, L);
  for (const p of map.portals) if (p.x > x0 && p.x < x1) map.drawPortal(ctx, p, t);
}

function drawLightShafts(ctx, art, cam, t, alpha) {
  const span = VIEW_W + 400;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of art.shafts) {
    const x = (((s.x * span - cam.x * 0.4) % span) + span) % span - 200;
    const a = alpha * (0.5 + 0.25 * Math.sin(t * 0.6 + s.p));
    const g = ctx.createLinearGradient(x, 0, x + 220, VIEW_H);
    g.addColorStop(0, `rgba(255,255,215,${0.32 * a})`);
    g.addColorStop(1, 'rgba(255,255,215,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, -10);
    ctx.lineTo(x + s.w, -10);
    ctx.lineTo(x + s.w + 300, VIEW_H);
    ctx.lineTo(x + 240, VIEW_H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Screen-space atmosphere drawn over the world: sunlight glow, floating motes, falling leaves.
function drawForestOverlay(ctx, map, cam, t) {
  const art = map.art;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(VIEW_W * 0.15, -40, 10, VIEW_W * 0.15, -40, 440);
  glow.addColorStop(0, 'rgba(255,255,220,0.22)');
  glow.addColorStop(1, 'rgba(255,255,220,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawLightShafts(ctx, art, cam, t, 0.25);

  const W = VIEW_W + 40;
  const H = VIEW_H + 40;
  for (const m of art.motes) {
    if (m.leaf) continue;
    const x = (((m.x + t * m.vx - cam.x * 0.9) % W) + W) % W - 20;
    const y = (((m.y + t * m.vy - cam.y * 0.9) % H) + H) % H - 20 + Math.sin(t + m.p) * 6;
    ctx.fillStyle = `rgba(255,255,200,${0.4 + 0.35 * Math.sin(t * 2 + m.p)})`;
    circle(ctx, x, y, m.r);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = map.theme.leaf.c[3];
  for (const m of art.motes) {
    if (!m.leaf) continue;
    const x = (((m.x + t * m.vx * 1.5 + Math.sin(t * 0.8 + m.p) * 30 - cam.x * 1.1) % W) + W) % W - 20;
    const y = (((m.y + t * (18 + m.r * 6) - cam.y * 1.1) % H) + H) % H - 20;
    leafPath(ctx, x, y, 8, 3, t * 1.5 + m.p);
    ctx.fill();
  }
}
