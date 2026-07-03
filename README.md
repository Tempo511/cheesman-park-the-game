# Cheesman Park: The Game

A top-down pixel-art survival game set in Denver's Cheesman Park — built on the
site of the city's first cemetery, whose 1893 grave clearing was… incomplete.

**By day** you stroll the park, find landmarks, and earn Bucks. **By night** the
residents of the old Mount Prospect cemetery claw out of the Great Lawn and the
ghosts get bold. Survive the night, bank your dawn bonus, upgrade at the Ranger
Cart, and do it again — each night brings more of them.

## Run it

The game is built from ES modules, so it must be **served over HTTP** (opening
`index.html` from `file://` won't load the modules). No build step, no deps.

```bash
npm start            # serves on http://localhost:8123
# or: python3 -m http.server 8123
```

Then visit **http://localhost:8123/**.

## Develop / test

The simulation is DOM-free and can be tested without a browser:

```bash
npm test             # headless sim tests + render/UI smoke tests
npm run test:sim     # game logic + determinism (no browser)
npm run test:dom     # render/UI/input under a stubbed canvas
```

## Controls

- **Move:** WASD / arrow keys, or the on-screen joystick on touch devices
- **Attack:** Space / J / K, or the red button on touch
- **Shop:** press **E** at the Ranger Cart by the pavilion (or the on-screen Shop button)

## Gameplay

- **Day/night cycle** — explore by day; survive waves of zombies and ghosts by night.
- **8 landmarks** to discover (the marble pavilion, reflecting pool, Mount Prospect
  Cemetery, Botanic Gardens, and more), each worth Bucks and a bit of real park history.
- **5 weapons** bought at the Ranger Cart: Frisbee, Dog Leash, Ball Launcher,
  Pickleball Paddle, and the Chile Cannon.
- **RPG progression** — HP, XP, levels (more max HP and damage each level), coins,
  and a death/respawn system with a "ranger rescue fee."
- **Ambient Denver** — joggers, dog walkers, slackliners, a volleyball rally, a yoga
  class, hammock nappers, and a dance meetup fill the park by day.

## Project layout

```
index.html              HTML shell + DOM; loads src/main.js as a module.
styles.css              All UI styling.
src/                    The game, as ES modules. See ARCHITECTURE.md.
  constants.js            Pure data (tiles, palette, weapons, landmarks).
  rng.js                  Seedable deterministic PRNG.
  tiles.js                Tile-grid read helpers.
  map.js                  Procedural park generation.
  state.js                Serializable world state + save/load.
  simulate.js             step(state, inputs, dt) — authoritative logic (DOM-free).
  sprites.js              Procedural pixel art (no image assets needed).
  render.js               Draws state to the canvases (read-only).
  ui.js                   HUD, shop, toasts, overlays.
  input.js                Devices → neutral inputs object.
  main.js                 Bootstrap + game loop.
test/                   Node tests (headless sim + DOM-stub smoke).
ARCHITECTURE.md         How the modules fit together + the co-op plan.
assets/art-reference/   Hand-drawn pixel-art PNGs, kept for future art work
                        (the game currently draws all sprites in code).
archive/                Older versions kept for reference:
  monolith-v1.html        The single-file game this module split came from.
  prototype/              The original coin-collecting lawn demo.
```

## Design direction

Built **solo-playable now, co-op-ready by design.** The code is split so that
friends-party co-op (one host, others join by room code) can be added later
without rewriting gameplay — see [ARCHITECTURE.md](ARCHITECTURE.md). The original
"everyone physically at the park" idea is planned as an *optional* layer on top,
not a requirement, so the game stays fun with one player or with friends anywhere.

## History

- **Prototype** (`archive/prototype/`) — a single lawn with coin pickups and a ghost.
- **Monolith** (`archive/monolith-v1.html`) — the full game in one 1,400-line file:
  a 72×92-tile recreation of the park, combat, progression, shop, survival waves.
- **Now** — the monolith refactored into the module architecture above, with a
  deterministic, testable simulation. Same game, co-op-ready foundation.
