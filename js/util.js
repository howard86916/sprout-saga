'use strict';

const VIEW_W = 960;
const VIEW_H = 540;
const FONT = "'Nunito', 'Segoe UI', system-ui, sans-serif";

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const randInt = (lo, hi) => Math.floor(lo + Math.random() * (hi - lo + 1));
const chance = p => Math.random() < p;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const fmt = n => Math.floor(n).toLocaleString('en-US');

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Small deterministic PRNG so map decoration looks the same every visit.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Lighten (amt > 0) or darken (amt < 0) a #rrggbb color.
const shadeCache = new Map();
function shade(hex, amt) {
  const key = hex + amt;
  let out = shadeCache.get(key);
  if (!out) {
    const n = parseInt(hex.slice(1), 16);
    const r = clamp((n >> 16) + amt, 0, 255);
    const g = clamp(((n >> 8) & 255) + amt, 0, 255);
    const b = clamp((n & 255) + amt, 0, 255);
    out = `rgb(${r},${g},${b})`;
    shadeCache.set(key, out);
  }
  return out;
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
}

/* ---------- tiny synthesized sound effects ---------- */
const Sfx = {
  ac: null,
  muted: false,
  noiseBuf: null,

  init() {
    if (this.ac) {
      if (this.ac.state === 'suspended') this.ac.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) this.ac = new AC();
  },

  tone(freq, dur, { type = 'square', vol = 0.06, slide = 0, delay = 0 } = {}) {
    const ac = this.ac;
    if (!ac || this.muted) return;
    const t = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  },

  noise(dur, { vol = 0.08, delay = 0, freq = 1200 } = {}) {
    const ac = this.ac;
    if (!ac || this.muted) return;
    if (!this.noiseBuf) {
      const len = Math.floor(ac.sampleRate * 0.5);
      this.noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const t = ac.currentTime + delay;
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start(t);
    src.stop(t + dur + 0.05);
  },

  play(name) {
    switch (name) {
      case 'jump': this.tone(260, 0.12, { vol: 0.035, slide: 260 }); break;
      case 'swing': this.noise(0.12, { vol: 0.06, freq: 1800 }); break;
      case 'skill':
        this.noise(0.18, { vol: 0.07, freq: 2600 });
        this.tone(520, 0.18, { type: 'triangle', vol: 0.05, slide: 400 });
        break;
      case 'hit':
        this.tone(180, 0.08, { vol: 0.045, slide: -80 });
        this.noise(0.06, { vol: 0.05, freq: 900 });
        break;
      case 'crit':
        this.tone(320, 0.1, { type: 'sawtooth', vol: 0.05, slide: -160 });
        this.noise(0.08, { vol: 0.07, freq: 1400 });
        break;
      case 'kill':
        this.tone(440, 0.08, { type: 'triangle', vol: 0.05 });
        this.tone(330, 0.12, { type: 'triangle', vol: 0.05, delay: 0.06 });
        break;
      case 'hurt': this.tone(140, 0.2, { type: 'sawtooth', vol: 0.06, slide: -70 }); break;
      case 'pickup':
        this.tone(880, 0.06, { type: 'triangle', vol: 0.05 });
        this.tone(1320, 0.08, { type: 'triangle', vol: 0.04, delay: 0.05 });
        break;
      case 'coin':
        this.tone(1200, 0.05, { vol: 0.03 });
        this.tone(1800, 0.09, { vol: 0.03, delay: 0.05 });
        break;
      case 'potion': this.tone(500, 0.15, { type: 'sine', vol: 0.06, slide: 500 }); break;
      case 'portal': this.tone(300, 0.35, { type: 'sine', vol: 0.06, slide: 900 }); break;
      case 'levelup':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.07, delay: i * 0.09 }));
        break;
      case 'die':
        [400, 300, 200].forEach((f, i) => this.tone(f, 0.25, { type: 'sawtooth', vol: 0.05, delay: i * 0.15 }));
        break;
      case 'boss': this.tone(90, 0.7, { type: 'sawtooth', vol: 0.08, slide: -40 }); break;
      case 'thud':
        this.tone(70, 0.3, { type: 'sawtooth', vol: 0.08, slide: -30 });
        this.noise(0.25, { vol: 0.08, freq: 300 });
        break;
      case 'click': this.tone(700, 0.04, { vol: 0.02 }); break;
      case 'error': this.tone(160, 0.15, { vol: 0.04 }); break;
    }
  },
};
