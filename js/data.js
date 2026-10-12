'use strict';

const PHYS = { gravity: 1900, maxFall: 950, walk: 195, jump: 650, climb: 135, airAccel: 900 };
const MAX_LEVEL = 50;
const expToLevel = lv => Math.round(12 * Math.pow(lv, 1.9) + 3);

const PLAYER_LOOK = {
  skin: '#ffdcbc', hair: '#6b3f22', hairStyle: 'spiky',
  shirt: '#4f86e8', pants: '#3d4a6b', shoes: '#5a3a22',
};

const NPC_LOOKS = {
  shopkeeper: {
    skin: '#f5d0a9', hair: '#e6e6e6', hairStyle: 'bald', beard: '#f2f2f2',
    shirt: '#4f8a4a', pants: '#5a4632', shoes: '#3b2a1e', robe: true, hat: 'cap', hatColor: '#8a5530',
  },
  guide: {
    skin: '#ffe0c4', hair: '#ff8fb8', hairStyle: 'long',
    shirt: '#ffffff', pants: '#5b7fd6', shoes: '#c0587a', bow: '#ff5c8a',
  },
};

const THEMES = {
  town: {
    skyTop: '#7cc8ff', skyBot: '#e2f5ff', far: '#a9dbb6', near: '#7cc48c',
    grass: '#6cc04a', grassDark: '#4e9a35', dirt: '#b9824f', dirtDark: '#8f5f36',
    cloud: true, sun: '#fff6c9', decor: 'town',
  },
  meadow: {
    skyTop: '#5fb6ff', skyBot: '#d3f0ff', far: '#9fd39a', near: '#6bb86a',
    grass: '#79cf4f', grassDark: '#4f9f36', dirt: '#a8713f', dirtDark: '#7c4f2a',
    cloud: true, sun: '#fff3b0', decor: 'meadow',
  },
  hills: {
    skyTop: '#ff9a6b', skyBot: '#ffe2ab', far: '#d9a07a', near: '#b97a5a',
    grass: '#8fbf4a', grassDark: '#6a9334', dirt: '#9a6338', dirtDark: '#6e4424',
    cloud: true, sun: '#fff0c0', decor: 'hills',
  },
  // Painted-forest themes (see forest.js). Each palette runs dark → bright.
  forest: {
    painter: 'forest', decor: 'forest',
    sky: ['#d6f4c4', '#86cf8e', '#3a9454'],
    farTrunk: { dark: '#4a9464', mid: '#76bc84', light: '#b0dea0', hi: '#ddf4c2' },
    farLeaf: { c: ['#4a8a5c', '#5c9e68', '#74b47a', '#90c88c', '#acd89e'], accent: '#6cbaa4', curl: '#c4dc98' },
    fogFar: 'rgba(196,238,196,0.22)',
    midTrunk: { dark: '#24602c', mid: '#468f36', light: '#86c254', hi: '#c6e482' },
    midLeaf: { c: ['#2a6244', '#387654', '#4f8e62', '#6aa470', '#88ba80'], accent: '#4a9e8c', curl: '#a8aa5a' },
    fogMid: 'rgba(160,214,160,0.14)',
    trunk: { dark: '#2a3a08', mid: '#6c871a', light: '#c0cd44', hi: '#f2ee86', vine: '#2c6e22', vineLeaf: '#5cbc34' },
    leaf: { c: ['#13482a', '#1f742c', '#36a428', '#6cd636', '#bef25c'], accent: '#22988a', curl: '#d6aa30' },
    soil: ['#2e4710', '#172606'],
  },
  grove: {
    painter: 'forest', decor: 'forest',
    sky: ['#cdf0e2', '#74c2a8', '#22786a'],
    farTrunk: { dark: '#3a8678', mid: '#62ac98', light: '#9ed6c2', hi: '#d0f2e4' },
    farLeaf: { c: ['#326e5e', '#44866e', '#5c9e84', '#78b698', '#98cca8'], accent: '#62b4b0', curl: '#a8c898' },
    fogFar: 'rgba(186,232,220,0.22)',
    midTrunk: { dark: '#1c5a48', mid: '#3a845e', light: '#78b476', hi: '#b4d896' },
    midLeaf: { c: ['#1c4e3e', '#28644c', '#3a7a58', '#549266', '#72aa78'], accent: '#33948e', curl: '#a09c50' },
    fogMid: 'rgba(150,206,190,0.14)',
    trunk: { dark: '#243408', mid: '#5c7420', light: '#a8b84a', hi: '#e2e284', vine: '#245e2a', vineLeaf: '#4fae3a' },
    leaf: { c: ['#0f3a28', '#1a6436', '#2a8a38', '#5abe46', '#a8e666'], accent: '#1f9a8e', curl: '#cc9e30' },
    soil: ['#22381a', '#101e0a'],
  },
  den: {
    skyTop: '#140b28', skyBot: '#3d2363', far: '#2c1a4a', near: '#3a2460',
    grass: '#8a6bc9', grassDark: '#5e45a0', dirt: '#4a3470', dirtDark: '#34224f',
    cloud: false, sun: null, decor: 'den', vignette: true,
  },
};

const ITEMS = {
  redPotion: { name: 'Red Potion', type: 'use', icon: 'redPotion', hp: 50, price: 25, sell: 6, desc: 'Restores 50 HP.' },
  bluePotion: { name: 'Blue Potion', type: 'use', icon: 'bluePotion', mp: 50, price: 45, sell: 10, desc: 'Restores 50 MP.' },
  elixir: { name: 'Elixir', type: 'use', icon: 'elixir', full: true, price: 400, sell: 100, desc: 'Fully restores HP and MP.' },
  woodSword: { name: 'Wooden Sword', type: 'equip', icon: 'woodSword', atk: 17, reqLv: 1, price: 0, sell: 1, desc: 'A sturdy practice blade.' },
  ironSword: { name: 'Iron Sword', type: 'equip', icon: 'ironSword', atk: 28, reqLv: 5, price: 500, sell: 200, desc: 'A reliable blade for new adventurers.' },
  steelSword: { name: 'Steel Sword', type: 'equip', icon: 'steelSword', atk: 42, reqLv: 10, price: 1800, sell: 700, desc: 'Keen, balanced and gleaming.' },
  snailShell: { name: 'Snail Shell', type: 'etc', icon: 'snailShell', sell: 3, desc: 'A spiral shell. Worth a little gold.' },
  blueShell: { name: 'Blue Shell', type: 'etc', icon: 'blueShell', sell: 6, desc: 'A pretty blue shell.' },
  gel: { name: 'Bloblet Gel', type: 'etc', icon: 'gel', sell: 9, desc: 'Wobbly and slightly warm.' },
  capPiece: { name: 'Mushroom Cap', type: 'etc', icon: 'capPiece', sell: 13, desc: 'A spotted orange cap.' },
  bark: { name: 'Stump Bark', type: 'etc', icon: 'bark', sell: 16, desc: 'Tough bark from a Stumpkin.' },
  royalGel: { name: 'Royal Gel', type: 'etc', icon: 'royalGel', sell: 300, desc: 'Proof that you beat King Bloblet.' },
};

const SHOP_STOCK = ['redPotion', 'bluePotion', 'elixir', 'ironSword', 'steelSword'];

// mult = damage multiplier, lines = hits per target, delay = time between attacks.
const SKILLS = {
  basic: {
    name: 'Attack', key: 'X', icon: 'skillBasic', mult: 1.0, lines: 1, targets: 1, range: 80, mp: 0, reqLv: 1,
    delay: 0.48, color: '#ffffff', trail: 36, trailW: 8,
  },
  power: {
    name: 'Power Strike', key: 'A', icon: 'skillPower', mult: 2.4, lines: 1, targets: 1, range: 92, mp: 5, reqLv: 1,
    delay: 0.55, color: '#ffcc33', trail: 40, trailW: 12, desc: 'A heavy blow against a single enemy.',
  },
  slash: {
    name: 'Slash Blast', key: 'S', icon: 'skillSlash', mult: 1.3, lines: 1, targets: 6, range: 165, mp: 9, reqLv: 5,
    delay: 0.6, color: '#7fe9ff', trail: 44, trailW: 14, wave: true, desc: 'Hits up to 6 enemies in front of you.',
  },
  // Dash is a movement skill: a quick burst forward with brief invulnerability.
  dash: {
    name: 'Dash', key: 'D', icon: 'skillDash', mp: 4, reqLv: 1, delay: 0.7, color: '#9fffb8',
    speed: 720, time: 0.2, desc: 'Burst forward and slip past enemies unharmed.',
  },
};

const QUICKSLOTS = [
  { type: 'skill', id: 'basic', key: 'X' },
  { type: 'skill', id: 'power', key: 'A' },
  { type: 'skill', id: 'slash', key: 'S' },
  { type: 'skill', id: 'dash', key: 'D' },
  { type: 'item', id: 'redPotion', key: '1' },
  { type: 'item', id: 'bluePotion', key: '2' },
  { type: 'item', id: 'elixir', key: '3' },
];

const MONSTERS = {
  snail: {
    name: 'Green Snail', kind: 'snail', level: 1, hp: 15, atk: 7, exp: 3, speed: 28, w: 40, h: 30,
    color: '#7fd65a', shell: '#c98b4a', gold: [1, 5], drops: [['snailShell', 0.5], ['redPotion', 0.08]],
  },
  blueSnail: {
    name: 'Blue Snail', kind: 'snail', level: 3, hp: 40, atk: 12, exp: 6, speed: 34, w: 44, h: 33,
    color: '#7fc4ff', shell: '#4a73c9', gold: [3, 9], drops: [['blueShell', 0.45], ['redPotion', 0.1], ['bluePotion', 0.05]],
  },
  slime: {
    name: 'Bloblet', kind: 'slime', level: 6, hp: 80, atk: 20, exp: 10, speed: 55, w: 46, h: 40, hop: 380,
    color: '#8ee04a', gold: [6, 14], drops: [['gel', 0.45], ['redPotion', 0.1], ['bluePotion', 0.08]],
  },
  mushroom: {
    name: 'Capshroom', kind: 'mushroom', level: 9, hp: 150, atk: 28, exp: 17, speed: 70, w: 46, h: 52, hop: 420,
    color: '#ff8a2a', gold: [10, 22], drops: [['capPiece', 0.4], ['redPotion', 0.1], ['bluePotion', 0.1]],
  },
  stump: {
    name: 'Stumpkin', kind: 'stump', level: 11, hp: 220, atk: 34, exp: 24, speed: 38, w: 50, h: 54,
    color: '#9a6a3f', gold: [14, 30], drops: [['bark', 0.4], ['bluePotion', 0.12], ['elixir', 0.01]],
  },
  kingSlime: {
    name: 'King Bloblet', kind: 'slime', level: 18, hp: 4500, atk: 50, exp: 1500, speed: 60, w: 150, h: 120,
    color: '#4fb9ff', boss: true, respawn: 90, gold: [300, 600],
    drops: [['royalGel', 1], ['elixir', 0.8], ['elixir', 0.5], ['steelSword', 0.35]],
  },
};

/*
  Map format:
  - platforms: one-way floating platforms ({x, y, w}); y is the walkable top surface.
  - The ground is added automatically at groundY and spans the whole map.
  - ropes: {x, top, bottom}; top should sit on a platform.
  - spawns: {type, x, p} where p is a platform index (omit for the ground).
  - portals: {id, x, y?, to, toPortal}; y defaults to the ground.
*/
const MAPS = {
  town: {
    name: 'Hearthvale', area: 'Forest Village', theme: 'forest',
    width: 1700, height: 720, groundY: 640, respawn: { x: 220 },
    trunks: [{ x: 1490, w: 170, top: 440 }],
    platforms: [
      { x: 1390, y: 430, w: 210 },
      { x: 1240, y: 548, w: 190, branch: 0 },
    ],
    ropes: [
      { x: 1420, top: 430, bottom: 530 },
      { x: 1300, top: 548, bottom: 620 },
    ],
    houses: [
      { x: 440, w: 200, h: 130, wall: '#f3d7a6', roof: '#c4553f' },
      { x: 960, w: 230, h: 150, wall: '#e9c7a0', roof: '#4f78b8' },
    ],
    portals: [{ id: 'east', x: 1640, to: 'meadow', toPortal: 'west' }],
    npcs: [
      {
        id: 'lily', name: 'Guide Lily', x: 300, look: 'guide', facing: 1,
        chatter: ['New here? Talk to me!', 'Press ↑ to chat!', 'Lovely day, isn\'t it?'],
        talk: [
          'Welcome to Hearthvale! I\'m Lily. Let me show you the ropes. Literally!',
          'Walk with the arrow keys and jump with Space. Press ↑ on a rope to climb, and ↓ + Space to drop through a platform.',
          'Press X to swing your sword, A for Power Strike and D to Dash. At Lv. 5 you learn Slash Blast (S), which hits a whole crowd!',
          'Every level gives you 5 Ability Points. Press C to spend them. STR makes you hit harder!',
          'Monsters drop gold and loot. Press Z to pick it up, then sell the junk to Grandpa Moss for potions.',
          'Head east through the portal to Whisperwood. They say a giant King Bloblet lurks past the Elderroot Canopy... good luck!',
        ],
      },
      {
        id: 'moss', name: 'Grandpa Moss', x: 820, look: 'shopkeeper', facing: -1, shop: SHOP_STOCK,
        chatter: ['Potions! Get your potions!', 'Fine swords for sale!', 'Heh heh heh...'],
        greeting: 'Heh heh, welcome, young one. Take a look at my wares.',
      },
    ],
    spawns: [],
  },

  // trunks: giant tree trunks {x (center), w, top}; the leafy platform on top hides the top end.
  // branch: index of the trunk a side platform grows from (draws a branch to it).
  // bridges: walkable sagging rope bridges {x1, y1, x2, y2, sag}; spawn on one with {b: index}.
  meadow: {
    name: 'Whisperwood', area: 'Hearthvale Outskirts', theme: 'forest',
    width: 2600, height: 1000, groundY: 920, respawn: { x: 140 },
    trunks: [
      { x: 330, w: 230, top: 650 },
      { x: 1000, w: 260, top: 530 },
      { x: 1710, w: 240, top: 610 },
      { x: 2300, w: 220, top: 480 },
    ],
    platforms: [
      { x: 180, y: 640, w: 300 },
      { x: 840, y: 520, w: 320 },
      { x: 1560, y: 600, w: 300 },
      { x: 2150, y: 470, w: 300 },
      { x: 520, y: 820, w: 220, branch: 0 },
      { x: 1240, y: 760, w: 260, branch: 1 },
      { x: 1950, y: 815, w: 230, branch: 2 },
    ],
    bridges: [
      { x1: 476, y1: 640, x2: 844, y2: 520, sag: 30 },
      { x1: 1156, y1: 520, x2: 1564, y2: 600, sag: 36 },
    ],
    ropes: [
      { x: 250, top: 640, bottom: 900 },
      { x: 900, top: 520, bottom: 900 },
      { x: 1350, top: 760, bottom: 900 },
      { x: 1640, top: 600, bottom: 900 },
      { x: 2200, top: 470, bottom: 900 },
    ],
    portals: [
      { id: 'west', x: 60, to: 'town', toPortal: 'east' },
      { id: 'east', x: 2540, to: 'hills', toPortal: 'west' },
    ],
    spawns: [
      { type: 'snail', x: 350 }, { type: 'snail', x: 700 }, { type: 'snail', x: 1150 },
      { type: 'blueSnail', x: 1500 }, { type: 'snail', x: 1900 }, { type: 'blueSnail', x: 2350 },
      { type: 'blueSnail', x: 260, p: 0 }, { type: 'blueSnail', x: 400, p: 0 },
      { type: 'slime', x: 920, p: 1 }, { type: 'slime', x: 1080, p: 1 },
      { type: 'blueSnail', x: 1650, p: 2 }, { type: 'slime', x: 1780, p: 2 },
      { type: 'slime', x: 2230, p: 3 }, { type: 'slime', x: 2380, p: 3 },
      { type: 'snail', x: 600, p: 4 },
      { type: 'blueSnail', x: 1320, p: 5 }, { type: 'snail', x: 1440, p: 5 },
      { type: 'snail', x: 2050, p: 6 },
      { type: 'slime', x: 1360, b: 1 },
    ],
  },

  hills: {
    name: 'Elderroot Canopy', area: 'Deep Forest', theme: 'grove',
    width: 3000, height: 1200, groundY: 1120, respawn: { x: 140 },
    trunks: [
      { x: 300, w: 240, top: 810 },
      { x: 900, w: 280, top: 650 },
      { x: 1600, w: 260, top: 530 },
      { x: 2350, w: 260, top: 710 },
      { x: 2770, w: 220, top: 470 },
    ],
    platforms: [
      { x: 150, y: 800, w: 320 },
      { x: 740, y: 640, w: 340 },
      { x: 1440, y: 520, w: 340 },
      { x: 2200, y: 700, w: 480 },
      { x: 2600, y: 460, w: 330 },
      { x: 480, y: 1020, w: 240, branch: 0 },
      { x: 1150, y: 900, w: 280, branch: 1 },
      { x: 1900, y: 860, w: 300, branch: 2 },
    ],
    bridges: [
      { x1: 1076, y1: 640, x2: 1444, y2: 520, sag: 30 },
      { x1: 1776, y1: 520, x2: 2204, y2: 700, sag: 44 },
    ],
    ropes: [
      { x: 220, top: 800, bottom: 1100 },
      { x: 820, top: 640, bottom: 1100 },
      { x: 1300, top: 900, bottom: 1100 },
      { x: 1520, top: 520, bottom: 1100 },
      { x: 1980, top: 860, bottom: 1100 },
      { x: 2300, top: 700, bottom: 1100 },
      { x: 2640, top: 460, bottom: 680 },
    ],
    portals: [
      { id: 'west', x: 60, to: 'meadow', toPortal: 'east' },
      { id: 'den', x: 2870, y: 460, to: 'den', toPortal: 'west' },
    ],
    spawns: [
      { type: 'slime', x: 400 }, { type: 'mushroom', x: 850 }, { type: 'mushroom', x: 1400 },
      { type: 'slime', x: 2000 }, { type: 'mushroom', x: 2500 },
      { type: 'slime', x: 260, p: 0 }, { type: 'mushroom', x: 400, p: 0 },
      { type: 'mushroom', x: 820, p: 1 }, { type: 'mushroom', x: 1000, p: 1 },
      { type: 'stump', x: 1520, p: 2 }, { type: 'stump', x: 1700, p: 2 },
      { type: 'mushroom', x: 2300, p: 3 }, { type: 'stump', x: 2550, p: 3 },
      { type: 'stump', x: 2700, p: 4 },
      { type: 'slime', x: 600, p: 5 },
      { type: 'mushroom', x: 1280, p: 6 },
      { type: 'stump', x: 2000, p: 7 }, { type: 'mushroom', x: 2140, p: 7 },
      { type: 'slime', x: 1260, b: 0 },
    ],
  },

  den: {
    name: 'King Bloblet\'s Den', area: 'Crystal Hollow', theme: 'den',
    width: 1500, height: 760, groundY: 680, respawn: { x: 140 },
    platforms: [
      { x: 180, y: 588, w: 280 },
      { x: 1040, y: 588, w: 280 },
      { x: 560, y: 470, w: 380 },
    ],
    ropes: [{ x: 750, top: 470, bottom: 660 }],
    portals: [{ id: 'west', x: 60, to: 'hills', toPortal: 'den' }],
    spawns: [{ type: 'kingSlime', x: 1000, delay: 2.5 }],
  },
};
