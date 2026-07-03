# Architecture

The game was refactored from a single 1,400-line HTML file into small ES
modules with one deliberate seam:

```
   input  ──▶  simulate(state, inputs, dt)  ──▶  render(state)
 (devices)      (authoritative, DOM-free)        (read-only)
                          │
                        state  (plain, serializable data)
```

Everything is built around that split because it is exactly what makes
**friends-party co-op** possible later without a rewrite. See "The co-op path"
below.

## Modules

| File | Role | DOM? |
|------|------|------|
| `src/constants.js` | Tile ids, palette, weapons, landmarks, park geometry. Pure data. | no |
| `src/rng.js` | Seedable deterministic PRNG (`makeRng(seed)`). | no |
| `src/tiles.js` | Tile-grid read helpers (`gi`, `inMap`, `getG`). | no |
| `src/map.js` | Procedural park generation from the world seed. | no |
| `src/state.js` | `createState(seed)` — the serializable world; save/load helpers. | no |
| `src/simulate.js` | **`step(state, inputs, dt)`** — the authoritative game logic. | no |
| `src/sprites.js` | Procedural pixel-art (all art is code; no image files). | canvas |
| `src/render.js` | Draws state to the canvases. Read-only w.r.t. state. | canvas |
| `src/ui.js` | HUD, shop, toasts, overlays; drains sim events. | yes |
| `src/input.js` | Devices → neutral `inputs` object `{move:{x,y}, attack}`. | yes |
| `src/main.js` | Bootstrap + game loop. The only file that wires all layers. | yes |

The top five rows (`constants` → `simulate`) are **DOM-free**, which is why the
whole simulation can be unit-tested in Node — see `test/headless-sim.mjs`.

## Key invariants

1. **State is plain data.** No canvases, DOM nodes, or functions live in
   `state`. Sets (`player.owned`, `found`) are the only non-JSON bits and are
   converted in the save/load helpers. The ground/solid grids are *derived from
   `worldSeed`*, so a joining client can regenerate them instead of receiving
   them.
2. **The simulation is deterministic.** All randomness flows through
   `state.simSeed` via `makeRng`. Same seed + same input sequence ⇒ identical
   state on every machine. (Proven by the determinism tests.)
3. **The simulation never reads devices or the DOM.** It consumes a neutral
   `inputs` object. A local player and a networked player produce the same
   shape, so the sim can't tell them apart.
4. **Render only reads state.** Nothing in `render.js` mutates the world, so
   multiple clients can draw the same shared state independently.
5. **Sim → UI is one-way via events.** `simulate` pushes `{type:'toast'|...}`
   onto `state.events`; the UI drains them. The sim has no reference to the DOM.

## The co-op path (why the refactor is shaped this way)

Target: one friend hosts, others join with a room code, everyone plays the same
park. No dedicated server, no monthly bill.

1. **Transport** — add `src/net/` (WebRTC data channel, or a thin WebSocket
   room relay). Host is authoritative.
2. **Host loop** — the host already has the authoritative `step`. Extend it to
   accept a *map* of inputs (`{playerId: inputs}`) and advance every player.
   The single-player array of one player generalizes cleanly.
3. **Clients send inputs** — each client ships its `getInputs()` output to the
   host every frame (already a tiny serializable object).
4. **Host broadcasts state** — send periodic snapshots (or deltas) of the
   dynamic lists; clients regenerate terrain from `worldSeed` and render the
   received state with `render(state)` — which already only reads state.
5. **Actions** (shop buys, respawn) become entries in a player's input rather
   than direct calls, routed through the host. The pure functions
   (`buyWeapon`, `buyChile`, `respawn`) already exist and just move behind that.

Nothing above requires touching gameplay logic — it lives entirely in the
loop/transport layer, which is the whole point of the seam.

## Location / in-person layer (later, optional)

The original vision — being physically at Cheesman Park with others — is kept as
an *optional bonus layer*, not a requirement, because a single-park presence
game dies without local density. Candidate hooks: a QR flyer as an onboarding
link, a "you're actually in the park" buff, and scheduled community defense
nights. All of these sit on top of the co-op core above.

## Tests

```
npm test          # both suites
npm run test:sim  # headless simulation (no browser) — logic + determinism
npm run test:dom  # render/UI/input under a stubbed canvas — wiring
```

`headless-sim.mjs` runs the real `step()` for thousands of frames and asserts
world-gen, determinism, movement/collision, night waves, combat, leveling,
landmark discovery, the shop, death/respawn, save-load round-trips, and a soak
test. It needs no browser because the simulation is DOM-free — the payoff of the
architecture.
