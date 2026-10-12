'use strict';

/* Item/skill icons, background scenery, name tags and speech bubbles. */

// Draws an icon centered at the current origin, fitting a box of `size` px.
function drawIcon(ctx, key, size) {
  ctx.save();
  const s = size / 32;
  ctx.scale(s, s);
  switch (key) {
    case 'redPotion': drawPotionIcon(ctx, '#ff6a6a', '#b0182a'); break;
    case 'bluePotion': drawPotionIcon(ctx, '#6ab8ff', '#1a4fb0'); break;
    case 'elixir': drawPotionIcon(ctx, '#f0b0ff', '#8a2fc0', true); break;
    case 'woodSword':
    case 'ironSword':
    case 'steelSword':
      ctx.rotate(-Math.PI / 4);
      ctx.scale(1.2, 1.2);
      drawSword(ctx, -11, 0, 0, key, 25);
      break;
    case 'snailShell': drawShellIcon(ctx, '#c98b4a'); break;
    case 'blueShell': drawShellIcon(ctx, '#4a73c9'); break;
    case 'gel': drawGelIcon(ctx, '#8ee04a', false); break;
    case 'royalGel': drawGelIcon(ctx, '#4fb9ff', true); break;
    case 'capPiece': drawCapIcon(ctx); break;
    case 'bark': drawBarkIcon(ctx); break;
    case 'gold': drawCoin(ctx, 0, 2, 8); break;
    case 'goldPile': drawCoin(ctx, -6, 6, 7); drawCoin(ctx, 6, 6, 7); drawCoin(ctx, 0, -3, 7); break;
    case 'goldBag': drawBagIcon(ctx); break;
    default:
      if (key.startsWith('skill')) drawSkillIcon(ctx, key);
  }
  ctx.restore();
}

function drawPotionIcon(ctx, c1, c2, sparkle) {
  ctx.fillStyle = 'rgba(235,245,255,0.9)';
  roundRect(ctx, -4, -11, 8, 8, 2);
  ctx.fill();
  ctx.fillStyle = '#9a6a3f';
  roundRect(ctx, -5, -15, 10, 5, 2);
  ctx.fill();
  const g = ctx.createRadialGradient(-3, 2, 1, 0, 5, 11);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  circle(ctx, 0, 5, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ellipse(ctx, -4, 1, 2.2, 3.6);
  ctx.fill();
  if (sparkle) drawStar(ctx, 8, -6, 5, '#fff7b0');
}

function drawStar(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const rr = i % 2 ? r * 0.4 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function drawShellIcon(ctx, color) {
  const g = ctx.createRadialGradient(-4, -4, 1, 0, 0, 12);
  g.addColorStop(0, shade(color, 50));
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  circle(ctx, 0, 0, 12);
  ctx.fill();
  ctx.strokeStyle = shade(color, -60);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 4.2; a += 0.25) {
    const r = 1 + a * 0.75;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
}

function drawGelIcon(ctx, color, crown) {
  const g = ctx.createLinearGradient(0, -12, 0, 12);
  g.addColorStop(0, shade(color, 60));
  g.addColorStop(1, shade(color, -30));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.bezierCurveTo(9, -1, 11, 12, 0, 12);
  ctx.bezierCurveTo(-11, 12, -9, -1, 0, -11);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ellipse(ctx, -3, 2, 2, 3.5);
  ctx.fill();
  if (crown) {
    ctx.save();
    ctx.translate(0, -9);
    ctx.scale(0.6, 0.6);
    drawCrown(ctx, 0, 0);
    ctx.restore();
  }
}

function drawCapIcon(ctx) {
  ctx.fillStyle = '#fbe6c4';
  roundRect(ctx, -5, 0, 10, 11, 3);
  ctx.fill();
  ctx.fillStyle = '#ff8a2a';
  ctx.beginPath();
  ctx.moveTo(-14, 3);
  ctx.bezierCurveTo(-14, -16, 14, -16, 14, 3);
  ctx.quadraticCurveTo(0, 6, -14, 3);
  ctx.fill();
  ctx.fillStyle = '#fff';
  circle(ctx, -6, -5, 3); ctx.fill();
  circle(ctx, 5, -8, 3.5); ctx.fill();
  circle(ctx, 8, 0, 2); ctx.fill();
}

function drawBarkIcon(ctx) {
  ctx.fillStyle = '#9a6a3f';
  roundRect(ctx, -10, -12, 20, 24, 4);
  ctx.fill();
  ctx.strokeStyle = '#5e3b20';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-5, -9); ctx.lineTo(-6, 9);
  ctx.moveTo(1, -10); ctx.lineTo(2, 10);
  ctx.moveTo(6, -8); ctx.lineTo(5, 6);
  ctx.stroke();
  ctx.fillStyle = '#6cc04a';
  ellipse(ctx, 6, -12, 5, 2.5);
  ctx.fill();
}

function drawCoin(ctx, x, y, r) {
  ctx.fillStyle = '#ffcf33';
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.strokeStyle = '#b07800';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(176,120,0,0.6)';
  ctx.lineWidth = 1;
  circle(ctx, x, y, r * 0.62);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ellipse(ctx, x - r * 0.35, y - r * 0.4, r * 0.25, r * 0.15);
  ctx.fill();
}

function drawBagIcon(ctx) {
  ctx.fillStyle = '#c08a4a';
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.lineTo(6, -8);
  ctx.bezierCurveTo(16, 0, 16, 13, 0, 13);
  ctx.bezierCurveTo(-16, 13, -16, 0, -6, -8);
  ctx.fill();
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(-7, -11, 14, 4);
  drawCoin(ctx, 0, 4, 5);
}

const SKILL_ICON_COLORS = {
  skillBasic: ['#6b7fa8', '#38466b'],
  skillPower: ['#ffb84a', '#b8561a'],
  skillSlash: ['#5fd8ff', '#1f6fa8'],
  skillDash: ['#7dffa8', '#1f8a4a'],
};

function drawSkillIcon(ctx, key) {
  const [c1, c2] = SKILL_ICON_COLORS[key] || SKILL_ICON_COLORS.skillBasic;
  const g = ctx.createLinearGradient(0, -15, 0, 15);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  roundRect(ctx, -15, -15, 30, 30, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.lineCap = 'round';

  if (key === 'skillDash') {
    // speed lines + arrow
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-11, -6); ctx.lineTo(-2, -6);
    ctx.moveTo(-13, 0); ctx.lineTo(0, 0);
    ctx.moveTo(-11, 6); ctx.lineTo(-2, 6);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(1, -9); ctx.lineTo(12, 0); ctx.lineTo(1, 9);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (key === 'skillPower') drawStar(ctx, 3, -3, 12, 'rgba(255,250,200,0.85)');
  if (key === 'skillSlash') {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-6, 6, 15, -1.5, 0.1);
    ctx.stroke();
  }
  ctx.save();
  ctx.rotate(-Math.PI / 4);
  drawSword(ctx, -9, 0, 0, 'ironSword', 20);
  ctx.restore();
}

/* ---------- scenery ---------- */

function drawCloud(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  circle(ctx, 0, 0, 22); ctx.fill();
  circle(ctx, 24, -8, 26); ctx.fill();
  circle(ctx, 50, 0, 20); ctx.fill();
  roundRect(ctx, -10, 0, 70, 18, 9);
  ctx.fill();
  ctx.restore();
}

function drawTree(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#7a4f2c';
  ctx.beginPath();
  ctx.moveTo(-8, 0); ctx.lineTo(-5, -70); ctx.lineTo(5, -70); ctx.lineTo(8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3f8a3a';
  circle(ctx, -24, -76, 24); ctx.fill();
  circle(ctx, 24, -78, 24); ctx.fill();
  circle(ctx, 0, -98, 32); ctx.fill();
  ctx.fillStyle = '#5bab48';
  circle(ctx, -8, -104, 20); ctx.fill();
  circle(ctx, 16, -88, 15); ctx.fill();
  circle(ctx, -22, -82, 13); ctx.fill();
  ctx.restore();
}

function drawBigShroom(ctx, x, y, s, hue) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#f1dfc0';
  roundRect(ctx, -11, -120, 22, 120, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(4, -116, 7, 116);
  ctx.fillStyle = hue < 0.5 ? '#e0533d' : '#f08a2a';
  ctx.beginPath();
  ctx.moveTo(-60, -112);
  ctx.bezierCurveTo(-60, -170, 60, -170, 60, -112);
  ctx.quadraticCurveTo(0, -102, -60, -112);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  circle(ctx, -30, -132, 8); ctx.fill();
  circle(ctx, 4, -148, 10); ctx.fill();
  circle(ctx, 32, -128, 7); ctx.fill();
  circle(ctx, -6, -122, 5); ctx.fill();
  ctx.restore();
}

function drawHouse(ctx, h) {
  const { x, y, w } = h;
  const ht = h.h;
  ctx.fillStyle = shade(h.wall, -40);
  ctx.fillRect(x + w * 0.7, y - ht - 70, 18, 70);
  ctx.fillStyle = h.wall;
  ctx.fillRect(x, y - ht, w, ht);
  ctx.fillStyle = shade(h.wall, -25);
  ctx.fillRect(x, y - 10, w, 10);
  ctx.fillStyle = h.roof;
  ctx.beginPath();
  ctx.moveTo(x - 16, y - ht + 4);
  ctx.lineTo(x + w / 2, y - ht - 62);
  ctx.lineTo(x + w + 16, y - ht + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(h.roof, -35);
  ctx.fillRect(x - 16, y - ht, w + 32, 6);
  ctx.fillStyle = '#7a4b2a';
  roundRect(ctx, x + w / 2 - 15, y - 56, 30, 56, 12);
  ctx.fill();
  ctx.fillStyle = '#ffd34d';
  circle(ctx, x + w / 2 + 8, y - 28, 2.5);
  ctx.fill();
  for (const wx of [x + 18, x + w - 52]) {
    const wy = y - ht + 30;
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(wx, wy, 34, 30);
    ctx.strokeStyle = shade(h.wall, -60);
    ctx.lineWidth = 3;
    ctx.strokeRect(wx, wy, 34, 30);
    ctx.beginPath();
    ctx.moveTo(wx + 17, wy); ctx.lineTo(wx + 17, wy + 30);
    ctx.moveTo(wx, wy + 15); ctx.lineTo(wx + 34, wy + 15);
    ctx.stroke();
  }
}

function drawCrystal(ctx, x, y, s, hue) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const glow = ctx.createRadialGradient(0, -30, 2, 0, -30, 60);
  glow.addColorStop(0, `hsla(${hue},90%,70%,0.35)`);
  glow.addColorStop(1, `hsla(${hue},90%,70%,0)`);
  ctx.fillStyle = glow;
  circle(ctx, 0, -30, 60);
  ctx.fill();
  for (const [sx, h, w, rot] of [[-14, 30, 12, -0.25], [0, 55, 14, 0], [14, 36, 11, 0.3]]) {
    ctx.save();
    ctx.translate(sx, 0);
    ctx.rotate(rot);
    ctx.fillStyle = `hsl(${hue},70%,62%)`;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(w / 2, -h * 0.75); ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `hsla(${hue},90%,88%,0.6)`;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, -2); ctx.lineTo(-w / 2 + 2, -h * 0.72); ctx.lineTo(0, -h + 3); ctx.lineTo(0, -2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawRock(ctx, x, y, s) {
  ctx.fillStyle = '#4b3a6b';
  ellipse(ctx, x, y - 8 * s, 22 * s, 12 * s);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ellipse(ctx, x - 6 * s, y - 13 * s, 9 * s, 4 * s);
  ctx.fill();
}

function drawFlower(ctx, x, y, hue) {
  ctx.strokeStyle = '#3f8a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 12);
  ctx.stroke();
  ctx.fillStyle = `hsl(${Math.floor(hue * 360)},85%,72%)`;
  for (let i = 0; i < 5; i++) {
    const a = i * 1.2566;
    circle(ctx, x + Math.cos(a) * 3.6, y - 14 + Math.sin(a) * 3.6, 2.8);
    ctx.fill();
  }
  ctx.fillStyle = '#ffe066';
  circle(ctx, x, y - 14, 2.2);
  ctx.fill();
}

function drawTuft(ctx, x, y, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 5, y); ctx.lineTo(x - 7, y - 9);
  ctx.moveTo(x, y); ctx.lineTo(x, y - 12);
  ctx.moveTo(x + 5, y); ctx.lineTo(x + 7, y - 8);
  ctx.stroke();
}

/* ---------- labels ---------- */

function drawNameTag(ctx, text, x, y, color = '#ffffff') {
  ctx.font = `800 11px ${FONT}`;
  const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = 'rgba(10,12,22,0.7)';
  roundRect(ctx, x - w / 2, y, w, 16, 4);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 8.5);
}

function drawSpeechBubble(ctx, text, x, y) {
  ctx.font = `700 11px ${FONT}`;
  const w = ctx.measureText(text).width + 16;
  const h = 22;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  roundRect(ctx, x - w / 2, y - h, w, h, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 1);
  ctx.lineTo(x, y + 6);
  ctx.lineTo(x + 5, y - 1);
  ctx.fill();
  ctx.fillStyle = '#2a2f45';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - h / 2 + 0.5);
}

function drawTombstone(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ellipse(ctx, x, y, 18, 4);
  ctx.fill();
  ctx.fillStyle = '#8f96a8';
  ctx.beginPath();
  ctx.moveTo(x - 15, y);
  ctx.lineTo(x - 15, y - 26);
  ctx.arc(x, y - 26, 15, Math.PI, 0);
  ctx.lineTo(x + 15, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6c7386';
  ctx.fillRect(x - 2.5, y - 34, 5, 20);
  ctx.fillRect(x - 8, y - 28, 16, 5);
}

function drawUpArrow(ctx, x, y, t) {
  const b = Math.sin(t * 6) * 3;
  ctx.fillStyle = '#ffe066';
  ctx.strokeStyle = '#5a3a00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 10 + b);
  ctx.lineTo(x + 9, y + b);
  ctx.lineTo(x + 4, y + b);
  ctx.lineTo(x + 4, y + 8 + b);
  ctx.lineTo(x - 4, y + 8 + b);
  ctx.lineTo(x - 4, y + b);
  ctx.lineTo(x - 9, y + b);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
}
