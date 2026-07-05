// ============================================================================
// garden.js — the Denver Botanic Gardens bonus map (the Garden Run scene).
//
// Built from the York Street tear-off map + aerial photography. The design
// truth of the real place, which this map tries to honor:
//   * the WEST half is naturalistic — the Monet Pool's organic waterline
//     (full of lilies), Shofu-En "Garden of Pine and Wind" with its character
//     pines, winding gravel, steppe and mesa plantings, almost no straight
//     lines
//   * the EAST half is formal — the El Pomar Waterway runs as a straight
//     tree-lined canal axis from the Four Towers Pool (the headwaters of all
//     the Gardens' water) below the Science Pyramid, past fountain beds, to
//     parterres, the amphitheater terraces and the Waring House
//   * the NORTH is working glass — the sawtooth greenhouse ranges — beside
//     the one showpiece: the Boettcher Conservatory's ribbed concrete dome
//
// Enter at the Cheesman Gate (west edge) and read east, like the real thing.
// Same array dimensions as the park (MW x MH); only the top GH rows are used.
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
  // organic shapes: filled ellipse + a wobbly-edged blob + curving path stamps
  const ellipseFill = (cx, cy, rx, ry, v) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) setG(x, y, v);
  };
  const blob = (cx, cy, rx, ry, v) => {
    ellipseFill(cx, cy, rx, ry, v);
    for (let i = 0; i < 5; i++) {                          // wobble the shoreline
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
  const curve = (pts, v = G.PATH, thick = 2) => {           // polyline gravel path
    for (let s = 0; s < pts.length - 1; s++) {
      const [x0, y0] = pts[s], [x1, y1] = pts[s + 1];
      const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
      for (let i = 0; i <= steps; i++) stampAt(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps, v, thick);
    }
  };

  // --- base: lawn; 11th Ave north, York St + parking east --------------------
  fillG(0, 0, MW - 1, GH - 1, G.GRASS);
  fillG(0, 0, MW - 1, 1, G.ROAD); fillG(0, 2, MW - 1, 2, G.WALK);
  fillG(68, 0, MW - 1, GH - 1, G.ROAD); fillG(66, 2, 67, GH - 1, G.WALK);
  for (let y = 4; y < GH - 2; y++) for (let x = 4; x < 66; x++) {
    if (((x >> 3) + (y >> 3)) % 2 === 0 && at(x, y) === G.GRASS) setG(x, y, G.GRASS2);
  }

  // ==========================================================================
  // WEST — naturalistic
  // ==========================================================================
  // Monet Pool: organic waterline, lilies painted at render time
  blob(15, 13, 8, 5.5, G.WATER);
  blob(10, 17, 4, 3, G.WATER);
  blob(21, 16, 4.5, 3, G.WATER);
  ellipseFill(15, 10, 3.5, 2.6, G.GRASS2);                 // tea-house peninsula
  addObj('teahouse', 15, 10);                              // Ella Mullen Weckbaugh Tea House
  addObj('lantern', 12.6, 10.5); addObj('lantern', 17.6, 11.2);
  curve([[15, 12], [15, 14.5], [14, 17], [12, 19]], G.PATH, 2);   // stepping path off the peninsula
  curve([[12, 19], [8, 22], [7, 26], [6, 29]], G.PATH, 2);        // west shore stroll
  curve([[12, 19], [18, 21], [24, 20], [27, 17], [26, 12], [22, 7], [16, 5], [10, 6], [7, 10], [7, 15]], G.PATH, 2); // full pond loop

  // Shofu-En, "Garden of Pine and Wind": character pines + stone lanterns
  for (const [x, y] of [[7, 6.5], [11, 4.6], [19, 4.2], [24, 5.5], [27, 9], [28.5, 14], [27, 20.5],
    [9, 20], [5.5, 13], [5.2, 8], [22, 21.5], [18, 3.4]]) addObj('pine', x, y);
  addObj('lantern', 8, 11); addObj('lantern', 25, 7.5); addObj('rock', 26.5, 18); addObj('bench', 24.5, 12);
  addObj('willow', 7.5, 20); addObj('willow', 23.5, 22.5);   // Willow Glade, weeping over the pool

  // Laura Porter Plains garden: dry meadow with a mown line through it
  blob(13, 34, 7, 5, G.DRY);
  curve([[6, 29], [10, 32], [14, 36], [18, 38], [22, 40]], G.PATH, 2);

  // Dryland Mesa + the Cactus & Succulent House; Rock Alpine beyond
  blob(11, 47, 7, 6, G.SAND);
  addObj('glasshouse', 9, 44);
  for (const [x, y] of [[7, 48], [12, 50], [15, 46.5], [9, 52.5], [14.5, 53]]) { addObj('cactus', x, y); addObj('rock', x + 1.3, y + 0.9, false); }
  addObj('cactus', 11, 46); addObj('tallgrass', 16.5, 50.5, false); addObj('tallgrass', 6.5, 45.5, false);
  for (const [x, y] of [[21, 46], [24, 49], [27, 45.5], [22.5, 52], [26, 52.5]]) addObj('rock', x, y);
  addObj('gplant', 23, 47.5, false); addObj('gplant', 25.5, 50.8, false); addObj('tallgrass', 21.5, 50, false);
  curve([[22, 40], [21, 44], [22, 48], [26, 51], [31, 53], [36, 54]], G.PATH, 2);  // Birds & Bees walk
  curve([[6, 29], [6, 36], [6.5, 43], [8, 50], [12, 55], [20, 56]], G.PATH, 2);    // outer west loop

  // ==========================================================================
  // NORTH — working glass + THE dome
  // ==========================================================================
  fillG(30, 5, 46, 11, G.MARBLE);                          // production yard
  addObj('greenhouse', 34, 10); addObj('greenhouse', 42.5, 10);   // sawtooth ranges (they're BIG)
  fillG(48, 9, 58, 17, G.PAVE);                            // conservatory plaza
  addObj('dome', 53, 15);                                  // Boettcher Conservatory, 1966
  addObj('column', 48, 17.6); addObj('column', 58, 17.6);
  addObj('bench', 49.5, 13); addObj('bench', 56.5, 13);

  // the circular cutting-garden wheel (west of the greenhouses in the aerial)
  for (let a = 0; a < 40; a++) {
    const ang = a / 40 * Math.PI * 2;
    setG(Math.round(31 + Math.cos(ang) * 4), Math.round(21 + Math.sin(ang) * 3.2), G.BED);
  }
  fillG(30, 20, 32, 22, G.PAVE);                           // hub
  curve([[31, 17], [31, 20]], G.PATH, 2); curve([[31, 24], [31, 28]], G.PATH, 2);  // spokes
  curve([[27, 21], [26, 21]], G.PATH, 2); curve([[35, 21], [37, 21]], G.PATH, 2);

  // ==========================================================================
  // the SPINE — gate promenade west->east, show promenade north->south
  // ==========================================================================
  fillG(4, 28, 60, 29, G.PAVE);                            // Cheesman Gate axis
  fillG(60, 6, 61, 54, G.PAVE);                            // Colorado Show Promenade
  fillG(2, 27, 5, 31, G.PAVE);                             // gate plaza
  addObj('column', 2, 26.5); addObj('column', 2, 31.8);
  for (const [x, y] of [[10, 27.4], [22, 30.6], [34, 27.4], [46, 30.6], [56, 27.4]]) addObj('bench', x, y);

  // ==========================================================================
  // EAST/SOUTH — formal
  // ==========================================================================
  // Science Pyramid + Four Towers Pool: the headwaters of all the water here
  fillG(30, 36, 37, 43, G.PAVE);
  addObj('pyramid', 33.5, 38);
  fillG(31, 40, 34, 43, G.WATER);
  fillG(30, 40, 30, 43, G.EDGE); fillG(35, 40, 35, 43, G.EDGE); fillG(31, 44, 34, 44, G.EDGE);

  // El Pomar Waterway: straight canal flowing east, tree-lined allee both banks
  fillG(38, 40, 60, 41, G.WATER);
  fillG(38, 39, 60, 39, G.EDGE); fillG(38, 42, 60, 42, G.EDGE);
  fillG(48, 40, 49, 41, G.PATH);                           // the crossing
  for (let x = 39; x <= 59; x += 4) { addObj('tree', x, 38.2); addObj('tree', x + 2, 44.3); }
  for (const bx of [41, 45, 53, 57]) { fillG(bx, 36, bx + 1, 36, G.BED); fillG(bx, 45, bx + 1, 45, G.BED); }  // fountain beds

  // UMB Amphitheater: terraced lawn arcs facing the stage (the big green in the aerial)
  for (const r of [5, 7]) {
    for (let a = 0; a < 30; a++) {
      const ang = Math.PI + a / 30 * Math.PI;              // north-facing half-arcs
      setG(Math.round(50 + Math.cos(ang) * r * 1.4), Math.round(26 + Math.sin(ang) * r * 0.7), G.EDGE);
    }
  }
  fillG(46, 26, 54, 27, G.PAVE);                           // stage apron
  fillG(44, 20, 56, 25, G.GRASS2);                         // the lawn

  // formal parterre quarter (fragrance/herb/romantic), hedged with two entries
  for (let by = 48; by <= 54; by += 3) for (let bx = 42; bx <= 54; bx += 4) fillG(bx, by, bx + 2, by, G.BED);
  fillG(47, 50, 49, 52, G.PAVE); addObj('fountain', 48, 51);  // Schlessman plaza fountain
  for (let x = 40; x <= 56; x++) { if (x !== 48) { setG(x, 46, G.GARDEN); setG(x, 56, G.GARDEN); } }  // hedges
  for (let y = 47; y <= 55; y++) { if (y !== 51) { setG(40, y, G.GARDEN); setG(56, y, G.GARDEN); } }
  curve([[48, 44], [48, 46]], G.PATH, 2);                  // north entry

  // the Ellipse + Waring House + Victorian secret garden, SE corner
  for (let a = 0; a < 22; a++) {
    const ang = a / 22 * Math.PI * 2;
    setG(Math.round(63 + Math.cos(ang) * 3), Math.round(44 + Math.sin(ang) * 2), G.BED);
  }
  addObj('waring', 64, 55);
  addObj('bush', 66.5, 55.8, false); addObj('bench', 58.5, 53.5);
  fillG(62, 50, 64, 52, G.WATER);                          // the sculpture pond
  fillG(61, 49, 61, 52, G.EDGE); fillG(65, 49, 65, 52, G.EDGE); fillG(62, 49, 64, 49, G.EDGE); fillG(62, 53, 64, 53, G.EDGE);
  addObj('chihuly', 63, 51.6);                             // Chihuly's "Colorado", rising from the water

  // Woodland Mosaic: the shady grove, path dappling through
  for (const [x, y] of [[33, 50], [36, 48], [38, 52], [34, 55], [38.5, 56.5], [30, 52.5], [36, 45.5]]) addObj('tree2', x, y);
  curve([[36, 54], [40, 52], [44, 51]], G.PATH, 2);

  // visitor center + welcome garden on the promenade; Freyer-Newman up north
  fillG(62, 22, 66, 25, G.MARBLE);
  addObj('column', 62, 26); addObj('column', 66, 26);
  fillG(62, 31, 63, 32, G.BED); fillG(65, 31, 66, 32, G.BED);
  fillG(60, 4, 66, 7, G.MARBLE); addObj('column', 60, 8); addObj('column', 66, 8);   // Freyer-Newman Center
  for (const [x, y] of [[63, 12], [64.5, 16], [62.5, 19]]) addObj('pine', x, y);      // Ponderosa border

  // the Lilac Garden — a fragrant row where the south loop bends
  for (const [x, y] of [[24.5, 41.5], [27, 42.8], [29.5, 41.8], [26, 44.2], [31, 43.5]]) addObj('lilac', x, y);
  // Ornamental Grasses along the canal banks
  for (const [x, y] of [[39.5, 36.2], [47, 35.8], [55, 36.3], [43, 45.6], [51.5, 45.9], [59, 45.4]]) addObj('tallgrass', x, y, false);
  // flowerbushes at the showpiece corners
  for (const [x, y] of [[5.5, 26.2], [5.8, 32.5], [30, 26.6], [44.5, 18.6], [58, 18.4],
    [61.5, 30.2], [66.5, 30.5], [45, 22.5], [55.5, 22.8], [14, 8]]) addObj('flowerbush', x, y, false);

  // flowering plants tucked along the paths, garden-wide
  for (let i = 0; i < 78; i++) {
    const x = 5 + rnd() * 60, y = 4 + rnd() * (GH - 9);
    const g = at(Math.round(x), Math.round(y));
    if (g === G.GRASS || g === G.GRASS2 || g === G.DRY) {
      const r = rnd();
      addObj(r < 0.4 ? 'gplant' : r < 0.62 ? 'flowerbush' : r < 0.78 ? 'bush' : r < 0.92 ? 'tallgrass' : 'lilac', x, y, false);
    }
  }

  // perimeter trees (solid ring, minus the gate mouth)
  for (let y = 4; y < GH - 2; y += 2) { if (y < 26 || y > 32) addObj('tree', 1.2, y + rnd() * .5); }
  for (let x = 2; x < 66; x += 2) { addObj('tree', x + rnd() * .5, 3.4); addObj('tree2', x + rnd() * .5, GH - 1.6); }

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
