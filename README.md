# Sprout Saga

A small 2D side-scrolling action RPG in the style of classic MapleStory. It runs in the browser with plain HTML5 Canvas and JavaScript: no build step, no dependencies, and no image files (all the art is drawn in code).

## Play locally

Double-click `index.html`. That's it.

(Optional) If you'd rather serve it from a local server:

```bash
npx serve .
# or
python -m http.server 8000
```

## Controls

| Key | Action |
| --- | --- |
| ← → | Move |
| Space / Alt | Jump |
| ↑ / ↓ | Climb ropes |
| ↓ + Space | Drop through a platform |
| ↑ | Enter portal / talk to NPC (or click the NPC) |
| X | Attack (hold to keep swinging) |
| A | **Power Strike**: heavy single-target hit (5 MP) |
| D | **Dash**: burst forward, briefly invulnerable (4 MP) |
| S | **Slash Blast**: hits up to 6 enemies, unlocks at Lv 5 (9 MP) |
| Z | Pick up loot |
| 1 / 2 / 3 | Red Potion / Blue Potion / Elixir |
| I / C / H | Inventory / Character stats / Help |
| M / Esc | Toggle sound / Close window |

## The world

1. **Hearthvale** (forest village): Guide Lily gives tips, and Grandpa Moss sells potions and swords.
2. **Whisperwood**: giant trees, rope bridges and leafy platforms. Green Snails, Blue Snails and Bloblets.
3. **Elderroot Canopy**: a deeper forest with Capshrooms and Stumpkins. Climb to the top-right canopy for the boss portal.
4. **King Bloblet's Den**: the boss. It leaps and slams the ground (jump to dodge the shockwave) and summons minions.

The forest maps use a painted look: twisted trunks, layered misty trees, light shafts and drifting leaves. It's all drawn by `js/forest.js` and painted once per map into offscreen canvases, so it stays smooth.

Each level gives 5 Ability Points (press **C**): STR raises damage, DEX raises minimum damage, INT raises max MP, and LUK raises crit and dodge. Progress saves automatically to your browser's localStorage.

## Deploy to GitHub Pages

```bash
cd Test_Game1
git init
git add .
git commit -m "Sprout Saga"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Then on GitHub, open the repo's **Settings → Pages**, set **Source** to *Deploy from a branch*, choose branch **main** and folder **/ (root)**, and click Save. After a minute the game is live at:

```
https://<your-username>.github.io/<repo-name>/
```

## Project layout

```
index.html        page shell, UI windows, script tags
css/style.css     UI styling
js/util.js        math helpers, canvas helpers, synthesized sound effects
js/input.js       keyboard handling (key bindings live in KEYMAP)
js/data.js        all game content: items, skills, monsters, maps
js/sprites.js     player/NPC/monster drawing
js/scenery.js     icons, trees, houses, labels
js/forest.js      painted-forest art: trunks, foliage, rope bridges, parallax, light
js/effects.js     damage numbers, particles, loot drops
js/world.js       map rendering, platforms, ropes, portals, NPCs
js/monster.js     monster AI and the boss
js/player.js      player movement, combat, skills, leveling, items
js/ui.js          stats / inventory / shop / dialog windows, title screen
js/hud.js         HP/MP/EXP bars, quickslots, minimap, boss bar
js/game.js        main loop, map loading, saving, rendering
```

## Making changes

Most tweaks only touch `js/data.js`:

- **New monster:** add an entry to `MONSTERS` (reuse a `kind`: snail, slime, mushroom or stump), then add it to a map's `spawns`.
- **New map:** add an entry to `MAPS` with platforms, ropes, portals and spawns, and link it with a portal from an existing map. Forest maps can also have `trunks` (giant trees under platforms), `branch` on a side platform, and `bridges` (sagging rope bridges you can walk on).
- **Balance:** skill damage (`mult`), MP cost, monster HP/EXP and item prices are all in that file.
