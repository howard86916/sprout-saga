'use strict';

const KEYMAP = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  jump: ['Space', 'AltLeft', 'AltRight'],
  attack: ['KeyX'],
  pickup: ['KeyZ'],
  skill1: ['KeyA'],
  skill2: ['KeyS'],
  skill3: ['KeyD'],
  hp: ['Digit1', 'Numpad1'],
  mp: ['Digit2', 'Numpad2'],
  elixir: ['Digit3', 'Numpad3'],
  inv: ['KeyI'],
  stats: ['KeyC'],
  help: ['KeyH', 'F1'],
  mute: ['KeyM'],
  close: ['Escape'],
};
const BOUND_CODES = new Set(Object.values(KEYMAP).flat());

const Input = {
  down: new Set(),
  pressed: new Set(),

  init() {
    window.addEventListener('keydown', e => {
      if (e.target instanceof HTMLInputElement) return;
      if (BOUND_CODES.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
      Sfx.init();
    });
    window.addEventListener('keyup', e => {
      if (BOUND_CODES.has(e.code)) e.preventDefault();
      this.down.delete(e.code);
    });
    window.addEventListener('blur', () => this.down.clear());
  },

  isDown(action) {
    return KEYMAP[action].some(c => this.down.has(c));
  },

  wasPressed(action) {
    return KEYMAP[action].some(c => this.pressed.has(c));
  },

  // Presses are consumed once per simulation step.
  endStep() {
    this.pressed.clear();
  },
};
