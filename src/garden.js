// ============================================================================
// garden.js — the Denver Botanic Gardens bonus map (the Garden Run scene).
//
// Built from the York Street tear-off map + aerial photography. Design truths
// this map honors: naturalistic WEST (Monet Pool + Shofu-En + steppe/mesa,
// no straight lines), formal EAST (El Pomar canal axis from the Four Towers
// Pool headwaters, parterres, amphitheater, Waring House + Chihuly), working
// glass NORTH (sawtooth ranges beside the one Boettcher dome).
//
// Structure: PHASE A lays ALL terrain (fills, blobs, curves), PHASE B places
// exact structures, PHASE C plants flora through addNat() — which nudges off
// hardscape/water to the nearest natural ground, so nothing ever squats in
// the middle of a walkway.
// ============================================================================
import { T, MW, MH, GH, G, GARDEN } from './constants.js';
import { gi, inMap } from './tiles.js';

export function buildGarden(state, rnd) {
  const ground = state.gardenGround, solid = state.gardenSolid, objects = state.gardenObjects;

  const setG = (x, y, v) => { if (inMap(x, y) && y < GH) ground[gi(x, y)] = v; };
  const at = (x, y) => (inMap(x, y) && y < GH ? ground[gi(x, y)] : G.ROAD);
  const fillG = (x0, y0, x1, y1, v) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setG(x, y, v); };
  const addObj = (type, x, y, isSolid = true) => {
    objects.push({ type, x, y });
    if (isSolid) { const tx = Math.round(x), ty = Math.round(y); if (inMap(tx, ty)) solid[gi(tx, ty)] = 1; }
  };
  // natural things (plants, rocks, benches) never sit on hardscape or water:
  // nudge to the nearest natural tile, or skip entirely
  const NATURAL_OK = new Set([G.GRASS, G.GRASS2, G.DRY, G.SAND]);
  const NUDGE = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [-2, 0], [0, 2], [0, -2]];
  const addNat = (type, x, y, isSolid = true) => {
    for (const [ox, oy] of NUDGE) {
      const tx = Math.round(x) + ox, ty = Math.round(y) + oy;
      if (inMap(tx, ty) && ty < GH && NATURAL_OK.has(ground[gi(tx, ty)])) { addObj(type, x + ox, y + oy, isSolid); return; }
    }
  };
  // organic shapes + curving gravel
  const ellipseFill = (cx, cy, rx, ry, v) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) setG(x, y, v);
  };
  const blob = (cx, cy, rx, ry, v) => {
    ellipseFill(cx, cy, rx, ry, v);
    for (let i = 0; i < 5; i++) {
      const a = rnd() * Math.PI * 2;
      ellipseFill(cx + Math.cos(a) * rx * 0.7, cy + Math.sin(a) * ry * 0.7, rx * 0.35 + rnd(), ry * 0.35 + rnd(), v);
    }
  };
  const GRASSY = new Set([G.GRASS, G.GRASS2, G.DRY, G.SAND]);
  const stampAt = (x, y, v, thick) => {
    const x0 = Math.round(x - thick / 2), y0 = Math.round(y - thick / 2);
    for (let dy = 0; dy < thick; dy++) for (let dx = 0; dx < thick; dx++)
      if (GRASSY.has(at(x0 + dx, y0 + dy))) setG(x0 + dx, y0 + dy, v);
  };
  const curve = (pts, v = G.PATH, thick = 2) => {
    for (let s = 0; s < pts.length - 1; s++) {
      const [x0, y0] = pts[s], [x1, y1] = pts[s + 1];
      const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
      for (let i = 0; i <= steps; i++) stampAt(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps, v, thick);
    }
  };

  // ==========================================================================
  // PHASE A — ALL terrain first (so flora placement can trust the ground)
  // ==========================================================================
  // base lawn; 11th Ave north, York St + parking east
  fillG(0, 0, MW - 1, GH - 1, G.GRASS);
  fillG(0, 0, MW - 1, 1, G.ROAD); fillG(0, 2, MW - 1, 2, G.WALK);
  fillG(68, 0, MW - 1, GH - 1, G.ROAD); fillG(66, 2, 67, GH - 1, G.WALK);
  for (let y = 4; y < GH - 2; y++) for (let x = 4; x < 66; x++) {
    if (((x >> 3) + (y >> 3)) % 2 === 0 && at(x, y) === G.GRASS) setG(x, y, G.GRASS2);
  }

  // WEST water + ground
  blob(15, 13, 8, 5.5, G.WATER);                           // Monet Pool
  blob(10, 17, 4, 3, G.WATER);
  blob(21, 16, 4.5, 3, G.WATER);
  ellipseFill(15, 10, 3.5, 2.6, G.GRASS2);                 // tea-house peninsula
  blob(13, 34, 7, 5, G.DRY);                               // plains meadow
  blob(11, 47, 7, 6, G.SAND);                              // Dryland Mesa

  // NORTH pads
  fillG(30, 5, 46, 11, G.MARBLE);                          // greenhouse yard
  fillG(48, 9, 58, 17, G.PAVE);                            // conservatory plaza

  // the SPINE
  fillG(4, 28, 60, 29, G.PAVE);                            // Cheesman Gate axis
  fillG(60, 6, 61, 54, G.PAVE);                            // Colorado Show Promenade
  fillG(2, 27, 5, 31, G.PAVE);                             // gate plaza

  // cutting-garden wheel
  for (let a = 0; a < 40; a++) {
    const ang = a / 40 * Math.PI * 2;
    setG(Math.round(31 + Math.cos(ang) * 4), Math.round(21 + Math.sin(ang) * 3.2), G.BED);
  }
  fillG(30, 20, 32, 22, G.PAVE);

  // pyramid plaza + Four Towers Pool + El Pomar canal
  fillG(30, 36, 37, 43, G.PAVE);
  fillG(31, 40, 34, 43, G.WATER);
  fillG(30, 40, 30, 43, G.EDGE); fillG(35, 40, 35, 43, G.EDGE); fillG(31, 44, 34, 44, G.EDGE);
  fillG(38, 40, 60, 41, G.WATER);
  fillG(38, 39, 60, 39, G.EDGE); fillG(38, 42, 60, 42, G.EDGE);
  fillG(48, 40, 49, 41, G.PATH);
  for (const bx of [41, 45, 53, 57]) { fillG(bx, 36, bx + 1, 36, G.BED); fillG(bx, 45, bx + 1, 45, G.BED); }

  // amphitheater terraces + lawn + stage
  for (const r of [5, 7]) {
    for (let a = 0; a < 30; a++) {
      const ang = Math.PI + a / 30 * Math.PI;
      setG(Math.round(50 + Math.cos(ang) * r * 1.4), Math.round(26 + Math.sin(ang) * r * 0.7), G.EDGE);
    }
  }
  fillG(46, 26, 54, 27, G.PAVE);
  fillG(44, 20, 56, 25, G.GRASS2);

  // formal parterre quarter, hedged
  for (let by = 48; by <= 54; by += 3) for (let bx = 42; bx <= 54; bx += 4) fillG(bx, by, bx + 2, by, G.BED);
  fillG(47, 50, 49, 52, G.PAVE);
  for (let x = 40; x <= 56; x++) { if (x !== 48) { setG(x, 46, G.GARDEN); setG(x, 56, G.GARDEN); } }
  for (let y = 47; y <= 55; y++) { if (y !== 51) { setG(40, y, G.GARDEN); setG(56, y, G.GARDEN); } }

  // the Ellipse + Chihuly's pond garden + visitor center + Freyer-Newman pads
  for (let a = 0; a < 22; a++) {
    const ang = a / 22 * Math.PI * 2;
    setG(Math.round(63 + Math.cos(ang) * 3), Math.round(44 + Math.sin(ang) * 2), G.BED);
  }
  fillG(62, 50, 64, 52, G.WATER);                          // the sculpture pond
  fillG(61, 49, 61, 52, G.EDGE); fillG(65, 49, 65, 52, G.EDGE); fillG(62, 49, 64, 49, G.EDGE); fillG(62, 53, 64, 53, G.EDGE);
  fillG(62, 48, 64, 48, G.BED);                            // beds hugging the pond
  fillG(62, 54, 63, 54, G.BED);
  fillG(62, 22, 66, 25, G.MARBLE);
  fillG(62, 31, 63, 32, G.BED); fillG(65, 31, 66, 32, G.BED);
  fillG(60, 4, 66, 7, G.MARBLE);

  // ALL gravel curves (terrain-final: nothing stamps after this)
  curve([[15, 12], [15, 14.5], [14, 17], [12, 19]], G.PATH, 2);
  curve([[12, 19], [8, 22], [7, 26], [6, 29]], G.PATH, 2);
  curve([[12, 19], [18, 21], [24, 20], [27, 17], [26, 12], [22, 7], [16, 5], [10, 6], [7, 10], [7, 15]], G.PATH, 2);
  curve([[6, 29], [10, 32], [14, 36], [18, 38], [22, 40]], G.PATH, 2);
  curve([[22, 40], [21, 44], [22, 48], [26, 51], [31, 53], [36, 54]], G.PATH, 2);
  curve([[6, 29], [6, 36], [6.5, 43], [8, 50], [12, 55], [20, 56]], G.PATH, 2);
  curve([[31, 17], [31, 20]], G.PATH, 2); curve([[31, 24], [31, 28]], G.PATH, 2);
  curve([[27, 21], [26, 21]], G.PATH, 2); curve([[35, 21], [37, 21]], G.PATH, 2);
  curve([[48, 44], [48, 46]], G.PATH, 2);
  curve([[36, 54], [40, 52], [44, 51]], G.PATH, 2);

  // ==========================================================================
  // PHASE B — exact structures (buildings, plaza furniture, gate columns)
  // ==========================================================================
  addObj('teahouse', 15, 10);                              // Ella Mullen Weckbaugh Tea House
  addObj('greenhouse', 34, 10); addObj('greenhouse', 42.5, 10);
  addObj('dome', 53, 15);                                  // Boettcher Conservatory, 1966
  addObj('column', 48, 17.6); addObj('column', 58, 17.6);
  addObj('glasshouse', 9, 44);                             // Cactus & Succulent House
  addObj('pyramid', 33.5, 38);                             // Science Pyramid
  addObj('fountain', 48, 51);                              // Schlessman plaza fountain
  addObj('waring', 64, 56.5);                              // Waring House
  addObj('chihuly', 63, 51.8);                             // "Colorado", rising from its pond
  addObj('column', 62, 26); addObj('column', 66, 26);      // visitor center
  addObj('column', 60, 8); addObj('column', 66, 8);        // Freyer-Newman
  addObj('column', 2, 26.5); addObj('column', 2, 31.8);    // Cheesman Gate plaza

  // ==========================================================================
  // PHASE C — flora & furnishings (auto-nudged off paths and water)
  // ==========================================================================
  // Shofu-En: character pines, lanterns, the willow glade on the shore
  for (const [x, y] of [[7, 6.5], [11, 4.6], [19, 4.2], [24, 5.5], [27, 9], [28.5, 14], [27, 20.5],
    [9, 20], [5.5, 13], [5.2, 8], [22, 21.5], [18, 3.4]]) addNat('pine', x, y);
  addNat('lantern', 12.6, 10.5); addNat('lantern', 17.6, 11.2);
  addNat('lantern', 8, 11); addNat('lantern', 25, 7.5); addNat('rock', 26.5, 18); addNat('bench', 24.5, 12);
  addNat('willow', 7.5, 20); addNat('willow', 23.5, 22.5);

  // mesa: cactus country; Rock Alpine boulders
  for (const [x, y] of [[7, 48], [12, 50], [15, 46.5], [9, 52.5], [14.5, 53]]) { addNat('cactus', x, y); addNat('rock', x + 1.3, y + 0.9, false); }
  addNat('cactus', 11, 46); addNat('tallgrass', 16.5, 50.5, false); addNat('tallgrass', 6.5, 45.5, false);
  for (const [x, y] of [[21, 46], [24, 49], [27, 45.5], [22.5, 52], [26, 52.5]]) addNat('rock', x, y);
  addNat('gplant', 23, 47.5, false); addNat('gplant', 25.5, 50.8, false); addNat('tallgrass', 21.5, 50, false);

  // the Lilac Garden (kept clear of the pyramid pool)
  for (const [x, y] of [[24.5, 41.5], [26.5, 43.5], [28.5, 45.5], [25, 44.8], [27.5, 42]]) addNat('lilac', x, y);

  // ornamental grasses along the canal banks
  for (const [x, y] of [[39.5, 36.2], [47, 35.8], [55, 36.3], [43, 45.6], [51.5, 45.9], [59, 45.4]]) addNat('tallgrass', x, y, false);

  // the El Pomar allee — trees lining both banks
  for (let x = 39; x <= 59; x += 4) { addNat('tree', x, 37.6); addNat('tree', x + 2, 44.6); }

  // Chihuly's garden: the sculpture pond ringed with blooms
  addNat('flowerbush', 61, 47.6, false); addNat('flowerbush', 65.4, 47.7, false);
  addNat('lilac', 61, 54.3); addNat('gplant', 65.5, 54.2, false);
  addNat('flowerbush', 66.2, 50.8, false); addNat('tallgrass', 60.8, 53.5, false);

  // flowerbushes at the showpiece corners
  for (const [x, y] of [[5.5, 26.2], [5.8, 32.5], [30, 26.6], [44.5, 18.6], [58, 18.4],
    [61.5, 30.2], [45, 22.5], [55.5, 22.8], [14, 8]]) addNat('flowerbush', x, y, false);

  // benches: alongside (never on) the promenades; two on the plaza edge by the dome
  for (const [x, y] of [[10, 26.8], [22, 31.2], [34, 26.8], [46, 31.2], [56, 26.8], [57, 20]]) addNat('bench', x, y);
  addObj('bench', 49.5, 16.6); addObj('bench', 56.5, 16.6);   // plaza furniture (intentional)

  // woodland mosaic grove + Waring corner planting
  for (const [x, y] of [[33, 50], [36, 48], [38, 52], [34, 55], [38.5, 56.5], [30, 52.5], [36, 45.5]]) addNat('tree2', x, y);
  addNat('bush', 66.5, 56.5, false); addNat('bench', 58.5, 53.5);

  // Ponderosa border down the east side
  for (const [x, y] of [[63, 12], [64.5, 16], [62.5, 19]]) addNat('pine', x, y);

  // flowering plants tucked along the paths, garden-wide
  for (let i = 0; i < 78; i++) {
    const x = 5 + rnd() * 60, y = 4 + rnd() * (GH - 9);
    const g = at(Math.round(x), Math.round(y));
    if (g === G.GRASS || g === G.GRASS2 || g === G.DRY) {
      const r = rnd();
      addObj(r < 0.4 ? 'gplant' : r < 0.62 ? 'flowerbush' : r < 0.78 ? 'bush' : r < 0.92 ? 'tallgrass' : 'lilac', x, y, false);
    }
  }

  // perimeter trees — solid ring, minus the gate mouth and the Waring corner
  // (kept open so the house, sculpture and their labels stay visible)
  for (let y = 4; y < GH - 2; y += 2) { if (y < 26 || y > 32) addNat('tree', 1.2, y + rnd() * .5); }
  for (let x = 2; x < 66; x += 2) {
    addNat('tree', x + rnd() * .5, 3.4);
    if (x < 56) addNat('tree2', x + rnd() * .5, GH - 1.6);
  }

  // --- flower candidate spots: every bed + the showpiece gardens -------------
  const spots = [];
  for (let y = 0; y < GH; y++) for (let x = 0; x < MW; x++) {
    if (ground[gi(x, y)] === G.BED) spots.push([x * T + 8, y * T + 8]);
  }
  for (const [x, y] of [[14, 8.6], [16.5, 11.5],                       // tea-house peninsula
    [9, 12], [24, 9], [26, 16],                                        // Shofu-En shore
    [12, 33], [15, 36],                                                // plains
    [8, 47], [13, 51], [16, 45],                                       // mesa
    [22, 48], [26, 51],                                                // rock alpine
    [34, 51], [37, 54],                                                // woodland
    [47, 22], [53, 23],                                                // amphitheater lawn
    [32, 38.5], [50, 43.5]]) spots.push([x * T + 8, y * T + 8]);       // pyramid + canal bank
  state.gardenSpots = spots;
}
