'use strict';

/* Character and monster drawing. Everything is drawn relative to the feet (0, 0), facing right. */

const WEAPON_COLORS = {
  woodSword: { blade: '#d9a96a', edge: '#9c6a35' },
  ironSword: { blade: '#e6ebf2', edge: '#8c97a6' },
  steelSword: { blade: '#e3f6ff', edge: '#5f9fd6' },
};

/* ---------- humanoids (player & NPCs) ---------- */

function drawHumanoid(ctx, o) {
  if (o.climb) {
    drawClimber(ctx, o);
    return;
  }
  const L = o.look;
  const ph = o.walk * Math.PI * 2;
  const walking = o.moving && !o.air;
  const stride = walking ? Math.sin(ph) * 5 : o.air ? 3 : 0;
  const bob = walking ? -Math.abs(Math.cos(ph)) * 1.5 : 0;

  drawLeg(ctx, -3 - stride, L, true);
  drawLeg(ctx, 3 + stride, L, false);

  ctx.save();
  ctx.translate(0, bob);
  ctx.lineCap = 'round';
  ctx.strokeStyle = shade(L.skin, -35);
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-5, -27);
  ctx.lineTo(-7 - stride * 0.5, -17);
  ctx.stroke();

  ctx.fillStyle = L.shirt;
  roundRect(ctx, -9, -31, 18, L.robe ? 24 : 18, 5);
  ctx.fill();
  ctx.fillStyle = shade(L.shirt, -35);
  ctx.fillRect(-9, L.robe ? -20 : -16, 18, 3);

  drawHead(ctx, 1, -45, L, o);
  drawFrontArm(ctx, o);
  ctx.restore();
}

function drawLeg(ctx, x, L, back) {
  ctx.fillStyle = back ? shade(L.pants, -30) : L.pants;
  ctx.fillRect(x - 3.5, -15, 7, 11);
  ctx.fillStyle = back ? shade(L.shoes, -25) : L.shoes;
  ellipse(ctx, x + 1.5, -3.5, 5, 3);
  ctx.fill();
}

function drawHead(ctx, cx, cy, L, o) {
  // hair behind the head
  ctx.fillStyle = L.hair;
  if (L.hairStyle === 'long') {
    roundRect(ctx, cx - 17, cy - 8, 17, 28, 8);
    ctx.fill();
  } else if (L.hairStyle === 'spiky') {
    ellipse(ctx, cx - 5, cy + 1, 12, 13);
    ctx.fill();
  }

  ctx.fillStyle = L.skin;
  ellipse(ctx, cx, cy, 15, 14);
  ctx.fill();
  ctx.fillStyle = shade(L.skin, -20);
  ellipse(ctx, cx - 6, cy + 2, 3, 4);
  ctx.fill();

  ctx.fillStyle = L.hair;
  if (L.hairStyle === 'spiky') {
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy + 4);
    ctx.quadraticCurveTo(cx - 18, cy - 16, cx, cy - 16);
    ctx.quadraticCurveTo(cx + 15, cy - 16, cx + 16, cy - 3);
    for (const [bx, by] of [[12, -6], [9, -1], [6, -7], [2, -2], [-1, -8], [-5, -3], [-8, -6], [-11, 2]]) {
      ctx.lineTo(cx + bx, cy + by);
    }
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 12);
    ctx.lineTo(cx - 19, cy - 19);
    ctx.lineTo(cx - 6, cy - 15);
    ctx.lineTo(cx - 4, cy - 23);
    ctx.lineTo(cx + 4, cy - 15);
    ctx.lineTo(cx + 10, cy - 20);
    ctx.lineTo(cx + 11, cy - 11);
    ctx.closePath();
    ctx.fill();
  } else if (L.hairStyle === 'long') {
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy + 6);
    ctx.quadraticCurveTo(cx - 18, cy - 17, cx, cy - 16);
    ctx.quadraticCurveTo(cx + 16, cy - 15, cx + 15, cy - 1);
    ctx.quadraticCurveTo(cx + 6, cy - 9, cx - 4, cy - 5);
    ctx.quadraticCurveTo(cx - 9, cy - 2, cx - 10, cy + 8);
    ctx.closePath();
    ctx.fill();
  } else {
    ellipse(ctx, cx - 13, cy + 1, 4, 6);
    ctx.fill();
  }

  // eyes
  ctx.fillStyle = '#2b1d16';
  ctx.strokeStyle = '#2b1d16';
  ctx.lineWidth = 1.6;
  const blink = !o.hurt && (o.t % 3.7) < 0.12;
  if (o.hurt) {
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 2); ctx.lineTo(cx + 6, cy + 1); ctx.lineTo(cx + 2, cy + 4);
    ctx.moveTo(cx + 13, cy - 2); ctx.lineTo(cx + 9, cy + 1); ctx.lineTo(cx + 13, cy + 4);
    ctx.stroke();
  } else if (blink) {
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy + 1); ctx.lineTo(cx + 6, cy + 1);
    ctx.moveTo(cx + 9, cy + 1); ctx.lineTo(cx + 13, cy + 1);
    ctx.stroke();
  } else {
    ellipse(ctx, cx + 4, cy + 1, 2.2, 3.6); ctx.fill();
    ellipse(ctx, cx + 10.5, cy + 1, 2.1, 3.5); ctx.fill();
    ctx.fillStyle = '#fff';
    circle(ctx, cx + 4.8, cy - 0.6, 0.9); ctx.fill();
    circle(ctx, cx + 11.2, cy - 0.6, 0.9); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,120,120,0.35)';
  ellipse(ctx, cx + 12, cy + 6, 2.6, 1.6);
  ctx.fill();
  ctx.strokeStyle = '#8a4030';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx + 8, cy + 6, 2, 0.2, Math.PI - 0.2);
  ctx.stroke();

  if (L.beard) {
    ctx.fillStyle = L.beard;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + 3);
    ctx.quadraticCurveTo(cx + 2, cy + 22, cx + 9, cy + 20);
    ctx.quadraticCurveTo(cx + 16, cy + 14, cx + 15, cy + 3);
    ctx.quadraticCurveTo(cx + 8, cy + 7, cx - 3, cy + 3);
    ctx.fill();
    ellipse(ctx, cx + 9, cy + 5, 5, 2);
    ctx.fill();
  }
  if (L.hat === 'cap') {
    ctx.fillStyle = L.hatColor;
    roundRect(ctx, cx - 13, cy - 24, 26, 14, 6);
    ctx.fill();
    ellipse(ctx, cx + 6, cy - 10, 13, 3.5);
    ctx.fill();
  }
  if (L.bow) {
    ctx.fillStyle = L.bow;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 11); ctx.lineTo(cx - 20, cy - 17); ctx.lineTo(cx - 19, cy - 5); ctx.closePath();
    ctx.moveTo(cx - 12, cy - 11); ctx.lineTo(cx - 5, cy - 19); ctx.lineTo(cx - 3, cy - 8); ctx.closePath();
    ctx.fill();
    circle(ctx, cx - 12, cy - 11, 3);
    ctx.fill();
  }
}

function drawFrontArm(ctx, o) {
  const L = o.look;
  const sx = 3;
  const sy = -27;
  let armA;
  let swordA;
  if (o.swing != null) {
    const e = easeOutCubic(clamp(o.swing, 0, 1));
    armA = lerp(-2.3, 0.95, e);
    swordA = armA;
    if (o.swing > 0.04 && o.swing < 0.9) {
      ctx.save();
      ctx.globalAlpha = 0.6 * (1 - o.swing);
      ctx.strokeStyle = o.swingColor || '#fff';
      ctx.lineWidth = o.swingWidth || 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(sx, sy, o.swingRadius || 36, -2.3, armA);
      ctx.stroke();
      ctx.restore();
    }
  } else if (o.dash) {
    armA = 0.2;
    swordA = -0.15;
  } else if (o.air) {
    armA = -0.5;
    swordA = -1.1;
  } else if (o.weapon) {
    armA = 1.2 + (o.moving ? Math.sin(o.walk * Math.PI * 2) * 0.3 : Math.sin(o.t * 2) * 0.05);
    swordA = 0.35;
  } else {
    armA = 1.5 + (o.moving ? Math.sin(o.walk * Math.PI * 2) * 0.4 : 0);
    swordA = 0;
  }
  const hx = sx + Math.cos(armA) * 11;
  const hy = sy + Math.sin(armA) * 11;
  if (o.weapon) drawSword(ctx, hx, hy, swordA, o.weapon);
  ctx.lineCap = 'round';
  ctx.strokeStyle = L.skin;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.strokeStyle = L.shirt;
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + Math.cos(armA) * 4, sy + Math.sin(armA) * 4);
  ctx.stroke();
  ctx.fillStyle = L.skin;
  circle(ctx, hx, hy, 3);
  ctx.fill();
}

function drawSword(ctx, x, y, angle, weapon, len = 30) {
  const c = WEAPON_COLORS[weapon] || WEAPON_COLORS.woodSword;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(-6, -1.6, 8, 3.2);
  ctx.fillStyle = '#e0b84a';
  roundRect(ctx, 1.5, -5, 3, 10, 1.2);
  ctx.fill();
  ctx.fillStyle = c.blade;
  ctx.beginPath();
  ctx.moveTo(4.5, -2.4);
  ctx.lineTo(len - 5, -2.4);
  ctx.lineTo(len, 0);
  ctx.lineTo(len - 5, 2.4);
  ctx.lineTo(4.5, 2.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(5, 0.6);
  ctx.lineTo(len - 4, 0.6);
  ctx.stroke();
  ctx.restore();
}

// Back view used while on a rope: elbows out to the sides, hands gripping the rope
// above the head (hand over hand), legs stepping up and hugging the rope.
function drawClimber(ctx, o) {
  const L = o.look;
  const p = Math.sin(o.climbPhase); // -1..1; left side reaches up when p > 0
  const side = [
    { s: -1, reach: p },
    { s: 1, reach: -p },
  ];

  // legs: the leg on the reaching side bends its knee up to take the next step
  for (const { s, reach } of side) {
    const lift = Math.max(0, -reach) * 7;
    const hipX = s * 4;
    const kneeX = s * 7;
    const kneeY = -9 - lift;
    const footX = s * 2.5;
    const footY = -2 - lift * 0.6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = shade(L.pants, s < 0 ? -15 : 0);
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(hipX, -15);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    ctx.fillStyle = L.shoes;
    ellipse(ctx, footX, footY + 1, 4, 3);
    ctx.fill();
  }

  // forearms run behind the head up to the rope; the head hides most of them
  const hands = side.map(({ s, reach }) => ({
    s,
    elbowX: s * 16,
    elbowY: -42 - reach * 3,
    handX: s * 2.5,
    handY: -66 - reach * 6,
  }));
  ctx.lineCap = 'round';
  ctx.strokeStyle = shade(L.skin, -20);
  ctx.lineWidth = 4.5;
  for (const h of hands) {
    ctx.beginPath();
    ctx.moveTo(h.elbowX, h.elbowY);
    ctx.lineTo(h.handX, h.handY);
    ctx.stroke();
  }

  // torso (back)
  ctx.fillStyle = L.shirt;
  roundRect(ctx, -9, -31, 18, 18, 5);
  ctx.fill();
  ctx.fillStyle = shade(L.shirt, -35);
  ctx.fillRect(-9, -16, 18, 3);
  ctx.strokeStyle = shade(L.shirt, -25);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -29);
  ctx.lineTo(0, -17);
  ctx.stroke();

  // upper arms (sleeves) angle out from the shoulders to the elbows
  for (const h of hands) {
    ctx.strokeStyle = L.shirt;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(h.s * 7, -28);
    ctx.lineTo(h.elbowX, h.elbowY);
    ctx.stroke();
    ctx.fillStyle = L.skin;
    circle(ctx, h.elbowX, h.elbowY, 2.6);
    ctx.fill();
  }

  // sword slung across the back, hilt over the left shoulder
  if (o.weapon) drawSword(ctx, -11, -33, 1.2, o.weapon, 26);

  // back of the head: ears peeking out, then hair
  ctx.fillStyle = shade(L.skin, -15);
  ellipse(ctx, -14.5, -44, 3, 4); ctx.fill();
  ellipse(ctx, 14.5, -44, 3, 4); ctx.fill();
  ctx.fillStyle = L.skin;
  ellipse(ctx, 0, -38, 7, 4); ctx.fill(); // nape of the neck
  ctx.fillStyle = L.hair;
  ellipse(ctx, 0, -47, 15, 14);
  ctx.fill();
  if (L.hairStyle === 'spiky') {
    ctx.beginPath();
    ctx.moveTo(-14, -48);
    for (const [x, y] of [[-17, -40], [-10, -42], [-8, -35], [-3, -40], [0, -34], [3, -40], [8, -35], [10, -42], [17, -40], [14, -48]]) {
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-11, -57); ctx.lineTo(-16, -64); ctx.lineTo(-4, -60);
    ctx.lineTo(-1, -67); ctx.lineTo(5, -60); ctx.lineTo(12, -63); ctx.lineTo(11, -55);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ellipse(ctx, -5, -53, 6, 3);
  ctx.fill();

  // hands wrapped around the rope
  for (const h of hands) {
    ctx.fillStyle = L.skin;
    ellipse(ctx, h.handX, h.handY, 3.6, 3);
    ctx.fill();
    ctx.strokeStyle = shade(L.skin, -45);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(h.handX - 2.5, h.handY - 0.5);
    ctx.lineTo(h.handX + 2.5, h.handY - 0.5);
    ctx.stroke();
  }
}

/* ---------- monsters ---------- */

function drawMonsterSprite(ctx, m) {
  switch (m.def.kind) {
    case 'snail': drawSnail(ctx, m); break;
    case 'slime': drawSlime(ctx, m); break;
    case 'mushroom': drawMushroom(ctx, m); break;
    case 'stump': drawStump(ctx, m); break;
  }
}

function drawEyes(ctx, x, y, gap, angry) {
  ctx.fillStyle = '#1f1410';
  ellipse(ctx, x, y, 2.2, 3.4); ctx.fill();
  ellipse(ctx, x + gap, y, 2.2, 3.4); ctx.fill();
  ctx.fillStyle = '#fff';
  circle(ctx, x + 0.7, y - 1.3, 0.9); ctx.fill();
  circle(ctx, x + gap + 0.7, y - 1.3, 0.9); ctx.fill();
  if (angry) {
    ctx.strokeStyle = '#1f1410';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 6); ctx.lineTo(x + 2, y - 4);
    ctx.moveTo(x + gap + 3, y - 6); ctx.lineTo(x + gap - 2, y - 4);
    ctx.stroke();
  }
}

function drawSnail(ctx, m) {
  const d = m.def;
  const s = d.w / 40;
  const crawl = m.state === 'walk' || m.aggro > 0 ? Math.sin(m.anim * 8) * 1.5 : 0;
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = d.color;
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(16 + crawl, 0);
  ctx.quadraticCurveTo(24 + crawl, 0, 22 + crawl, -10);
  ctx.quadraticCurveTo(20 + crawl, -20, 12, -18);
  ctx.lineTo(-14, -8);
  ctx.quadraticCurveTo(-22, -6, -20, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = d.color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(15, -16); ctx.lineTo(13, -27);
  ctx.moveTo(18, -15); ctx.lineTo(21, -26);
  ctx.stroke();
  ctx.fillStyle = '#1f1410';
  circle(ctx, 13, -28, 2.6); ctx.fill();
  circle(ctx, 21, -27, 2.6); ctx.fill();
  ctx.fillStyle = '#fff';
  circle(ctx, 13.8, -28.8, 0.9); ctx.fill();
  circle(ctx, 21.8, -27.8, 0.9); ctx.fill();

  const g = ctx.createRadialGradient(-6, -24, 2, -3, -18, 15);
  g.addColorStop(0, shade(d.shell, 40));
  g.addColorStop(1, d.shell);
  ctx.fillStyle = g;
  circle(ctx, -3, -17, 14);
  ctx.fill();
  ctx.strokeStyle = shade(d.shell, -50);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 4.2; a += 0.25) {
    const r = 1.5 + a * 0.85;
    ctx.lineTo(-3 + Math.cos(a) * r, -17 + Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.restore();
}

function drawSlime(ctx, m) {
  const d = m.def;
  const s = d.w / 46;
  const sq = m.hopY < 0 ? clamp(-m.hopVy / 2200, -0.18, 0.22) : Math.sin(m.anim * 5) * 0.04;
  ctx.save();
  ctx.scale(s * (1 - sq), s * (1 + sq));
  const g = ctx.createLinearGradient(0, -42, 0, 0);
  g.addColorStop(0, shade(d.color, 60));
  g.addColorStop(1, shade(d.color, -20));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-23, 0);
  ctx.bezierCurveTo(-27, -22, -13, -40, 0, -40);
  ctx.bezierCurveTo(13, -40, 27, -22, 23, 0);
  ctx.quadraticCurveTo(0, 4, -23, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = shade(d.color, -60);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ellipse(ctx, -9, -29, 5, 3.5);
  ctx.fill();
  drawEyes(ctx, 3, -18, 9, m.aggro > 0);
  ctx.strokeStyle = '#1f1410';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(8, -11, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();
  if (d.boss) {
    drawCrown(ctx, 0, -40);
  } else {
    // little antenna that wobbles as it hops
    const tip = Math.sin(m.anim * 6) * 2;
    ctx.strokeStyle = shade(d.color, -50);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(4, -39);
    ctx.quadraticCurveTo(6, -47, 9 + tip, -52);
    ctx.stroke();
    ctx.fillStyle = shade(d.color, 50);
    circle(ctx, 9 + tip, -53, 3);
    ctx.fill();
    ctx.strokeStyle = shade(d.color, -50);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawCrown(ctx, x, y) {
  ctx.fillStyle = '#ffd23f';
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 2);
  ctx.lineTo(x - 13, y - 10);
  ctx.lineTo(x - 6, y - 4);
  ctx.lineTo(x, y - 13);
  ctx.lineTo(x + 6, y - 4);
  ctx.lineTo(x + 13, y - 10);
  ctx.lineTo(x + 12, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff4a6a';
  circle(ctx, x, y - 3, 2.2);
  ctx.fill();
}

function drawMushroom(ctx, m) {
  const d = m.def;
  const s = d.w / 46;
  const sq = m.hopY < 0 ? clamp(-m.hopVy / 2600, -0.12, 0.15) : 0;
  ctx.save();
  ctx.scale(s * (1 - sq), s * (1 + sq));
  ctx.fillStyle = '#8a5a33';
  ellipse(ctx, -7, -3, 6, 3.5); ctx.fill();
  ellipse(ctx, 8, -3, 6, 3.5); ctx.fill();
  ctx.fillStyle = '#fbe6c4';
  roundRect(ctx, -13, -27, 26, 25, 9);
  ctx.fill();
  drawEyes(ctx, 1, -15, 8, m.aggro > 0);

  const g = ctx.createLinearGradient(0, -54, 0, -22);
  g.addColorStop(0, shade(d.color, 40));
  g.addColorStop(1, shade(d.color, -30));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-25, -22);
  ctx.bezierCurveTo(-26, -46, -12, -54, 0, -54);
  ctx.bezierCurveTo(12, -54, 26, -46, 25, -22);
  ctx.quadraticCurveTo(0, -18, -25, -22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  circle(ctx, -12, -36, 4.5); ctx.fill();
  circle(ctx, 4, -44, 5); ctx.fill();
  circle(ctx, 14, -31, 3.5); ctx.fill();
  circle(ctx, -2, -29, 2.5); ctx.fill();
  ctx.restore();
}

function drawStump(ctx, m) {
  const d = m.def;
  const s = d.w / 50;
  const waddle = m.state === 'walk' || m.aggro > 0 ? Math.sin(m.anim * 9) : 0;
  ctx.save();
  ctx.scale(s, s);
  ctx.rotate(waddle * 0.04);
  ctx.fillStyle = '#5e3b20';
  ellipse(ctx, -10, -3 - Math.max(0, waddle) * 3, 7, 4); ctx.fill();
  ellipse(ctx, 10, -3 - Math.max(0, -waddle) * 3, 7, 4); ctx.fill();

  ctx.fillStyle = d.color;
  roundRect(ctx, -21, -48, 42, 45, 9);
  ctx.fill();
  ctx.strokeStyle = shade(d.color, -40);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-13, -40); ctx.lineTo(-14, -12);
  ctx.moveTo(14, -38); ctx.lineTo(15, -14);
  ctx.stroke();

  ctx.fillStyle = '#d6aa72';
  ellipse(ctx, 0, -48, 21, 6);
  ctx.fill();
  ctx.strokeStyle = '#a77a45';
  ctx.lineWidth = 1.2;
  ellipse(ctx, 0, -48, 13, 3.5); ctx.stroke();
  ellipse(ctx, 0, -48, 6, 1.6); ctx.stroke();

  // an axe left stuck in the top
  ctx.save();
  ctx.translate(-3, -49);
  ctx.rotate(-0.45);
  ctx.fillStyle = '#7a5530';
  roundRect(ctx, -2.2, -34, 4.4, 34, 2);
  ctx.fill();
  ctx.fillStyle = '#a07040';
  ctx.fillRect(-2.2, -34, 1.6, 34);
  ctx.fillStyle = '#c9d0d8';
  ctx.beginPath();
  ctx.moveTo(-1, -1);
  ctx.lineTo(-13, -8);
  ctx.quadraticCurveTo(-16, -1, -13, 5);
  ctx.lineTo(-1, 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(-12, -5, 2, 7);
  ctx.restore();
  ctx.strokeStyle = '#3b2412';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-8, -47);
  ctx.lineTo(2, -49);
  ctx.stroke();

  drawEyes(ctx, 2, -28, 9, m.aggro > 0);
  ctx.fillStyle = '#3b2412';
  ellipse(ctx, 7, -18, 3, 2);
  ctx.fill();
  ctx.restore();
}
