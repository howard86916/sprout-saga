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
    color: '#5fd7c4', gold: [6, 14], drops: [['gel', 0.45], ['redPotion', 0.1], ['bluePotion', 0.08]],
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
    name: 'Hearthvale', area: 'Peaceful Town', theme: 'town',
    width: 1700, height: 720, groundY: 640, respawn: { x: 220 },
    platforms: [
      { x: 400, y: 548, w: 220 },
      { x: 960, y: 548, w: 280 },
      { x: 1040, y: 430, w: 220 },
    ],
    ropes: [{ x: 1150, top: 430, bottom: 530 }],
    houses: [
      { x: 470, w: 200, h: 130, wall: '#f3d7a6', roof: '#c4553f' },
      { x: 1180, w: 230, h: 150, wall: '#e9c7a0', roof: '#4f78b8' },
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
          'Head east through the portal to Sunny Meadow. They say a giant King Bloblet lurks beyond Mushroom Hills... good luck!',
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

  meadow: {
    name: 'Sunny Meadow', area: 'Hearthvale Outskirts', theme: 'meadow',
    width: 2600, height: 900, groundY: 820, respawn: { x: 140 },
    platforms: [
      { x: 240, y: 728, w: 320 },
      { x: 700, y: 620, w: 300 },
      { x: 1180, y: 728, w: 440 },
      { x: 1330, y: 560, w: 300 },
      { x: 1820, y: 690, w: 380 },
      { x: 2060, y: 540, w: 320 },
    ],
    ropes: [
      { x: 850, top: 620, bottom: 800 },
      { x: 1480, top: 560, bottom: 710 },
      { x: 1900, top: 690, bottom: 800 },
      { x: 2140, top: 540, bottom: 672 },
    ],
    portals: [
      { id: 'west', x: 60, to: 'town', toPortal: 'east' },
      { id: 'east', x: 2540, to: 'hills', toPortal: 'west' },
    ],
    spawns: [
      { type: 'snail', x: 320 }, { type: 'snail', x: 640 }, { type: 'snail', x: 1050 },
      { type: 'blueSnail', x: 1500 }, { type: 'blueSnail', x: 2000 }, { type: 'snail', x: 2350 },
      { type: 'snail', x: 330, p: 0 }, { type: 'blueSnail', x: 480, p: 0 },
      { type: 'blueSnail', x: 780, p: 1 }, { type: 'blueSnail', x: 940, p: 1 },
      { type: 'snail', x: 1260, p: 2 }, { type: 'blueSnail', x: 1420, p: 2 }, { type: 'snail', x: 1560, p: 2 },
      { type: 'slime', x: 1420, p: 3 }, { type: 'slime', x: 1560, p: 3 },
      { type: 'blueSnail', x: 1900, p: 4 }, { type: 'slime', x: 2100, p: 4 },
      { type: 'slime', x: 2140, p: 5 }, { type: 'slime', x: 2300, p: 5 },
    ],
  },

  hills: {
    name: 'Mushroom Hills', area: 'Sunset Highlands', theme: 'hills',
    width: 3000, height: 1100, groundY: 1020, respawn: { x: 140 },
    platforms: [
      { x: 180, y: 928, w: 300 },
      { x: 600, y: 830, w: 420 },
      { x: 1160, y: 720, w: 360 },
      { x: 380, y: 640, w: 380 },
      { x: 1700, y: 880, w: 520 },
      { x: 1660, y: 690, w: 420 },
      { x: 2300, y: 800, w: 460 },
      { x: 2420, y: 620, w: 340 },
    ],
    ropes: [
      { x: 800, top: 830, bottom: 1000 },
      { x: 1300, top: 720, bottom: 1000 },
      { x: 690, top: 640, bottom: 812 },
      { x: 1780, top: 880, bottom: 1000 },
      { x: 1960, top: 690, bottom: 862 },
      { x: 2380, top: 800, bottom: 1000 },
      { x: 2620, top: 620, bottom: 782 },
    ],
    portals: [
      { id: 'west', x: 60, to: 'meadow', toPortal: 'east' },
      { id: 'den', x: 2720, y: 620, to: 'den', toPortal: 'west' },
    ],
    spawns: [
      { type: 'slime', x: 300 }, { type: 'mushroom', x: 900 }, { type: 'mushroom', x: 1450 },
      { type: 'slime', x: 2050 }, { type: 'mushroom', x: 2650 },
      { type: 'slime', x: 330, p: 0 },
      { type: 'mushroom', x: 700, p: 1 }, { type: 'mushroom', x: 920, p: 1 },
      { type: 'stump', x: 1250, p: 2 }, { type: 'stump', x: 1430, p: 2 },
      { type: 'stump', x: 480, p: 3 }, { type: 'mushroom', x: 650, p: 3 },
      { type: 'mushroom', x: 1800, p: 4 }, { type: 'mushroom', x: 2080, p: 4 },
      { type: 'stump', x: 1760, p: 5 }, { type: 'stump', x: 1980, p: 5 },
      { type: 'mushroom', x: 2400, p: 6 }, { type: 'stump', x: 2640, p: 6 },
      { type: 'stump', x: 2520, p: 7 },
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
