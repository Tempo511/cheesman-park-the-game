// ============================================================================
// map.js — procedural generation of the park (a recreation of the real
// Cheesman Park layout). Deterministic given the world rng, so every client
// builds an identical map from the same seed.
//
// buildMap(state, rng) mutates state.ground / state.solid / state.objects /
// state.cars in place.
// ============================================================================
import { T, MW, MH, G, GRASSY, NLOBE, SLOBE } from './constants.js';
import { gi, inMap } from './tiles.js';

export function buildMap(state, rnd) {
  const { ground, solid, objects, cars } = state;

  const setG = (x, y, v) => { if (inMap(x, y)) ground[gi(x, y)] = v; };
  const fillG = (x0, y0, x1, y1, v) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setG(x, y, v);
  };
  const getG = (x, y) => (inMap(x, y) ? ground[gi(x, y)] : G.ROAD);

  // --- streets, sidewalks, botanic gardens ---------------------------------
  fillG(0, 0, MW - 1, 2, G.GRASS);         // north border: the park-side buildings' grounds (13th Ave is behind them, in the render band)
  fillG(0, MH - 3, MW - 1, MH - 1, G.ROAD); // E 8th Ave
  fillG(0, 0, 2, MH - 4, G.GRASS);         // west border: mansion grounds (Humboldt St is behind, in the render band)
  fillG(MW - 3, 34, MW - 1, MH - 4, G.GRASS); // east border below the gardens: mansion grounds (street behind)
  fillG(3, 3, MW - 4, 3, G.WALK);
  fillG(3, MH - 4, MW - 4, MH - 4, G.WALK);
  fillG(3, 3, 3, MH - 4, G.WALK);
  fillG(MW - 4, 34, MW - 4, MH - 4, G.WALK);
  fillG(64, 3, MW - 1, 33, G.GARDEN);      // Denver Botanic Gardens

  fillG(7, 7, 61, 8, G.PATH);  fillG(7, 84, 61, 85, G.PATH);
  fillG(7, 7, 8, 85, G.PATH);  fillG(60, 7, 61, 85, G.PATH);

  // --- organic path stamping — only paves over grass, never structures -----
  const stampTile = (x, y, type) => { if (inMap(x, y) && GRASSY.has(ground[gi(x, y)])) ground[gi(x, y)] = type; };
  const stampAt = (x, y, type, thick) => {
    const x0 = Math.round(x - thick / 2), y0 = Math.round(y - thick / 2);
    for (let dy = 0; dy < thick; dy++) for (let dx = 0; dx < thick; dx++) stampTile(x0 + dx, y0 + dy, type);
  };
  const stampEllipse = (cx, cy, rx, ry, type, thick = 2) => {
    const steps = Math.ceil((rx + ry) * 3.5);
    for (let i = 0; i <= steps; i++) {
      const a = i / steps * Math.PI * 2;
      stampAt(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, type, thick);
    }
  };
  const stampSeg = (x0, y0, x1, y1, type, thick = 2) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      stampAt(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, type, thick);
    }
  };

  // chamfered perimeter corners (the real trail rounds off at the streets)
  stampSeg(7, 13, 13, 7, G.PATH); stampSeg(55, 7, 61, 13, G.PATH);
  stampSeg(61, 79, 55, 85, G.PATH); stampSeg(13, 85, 7, 79, G.PATH);
  // THE figure-8: north lawn loop + south lawn loop (paved carriage drive)
  stampEllipse(NLOBE.cx, NLOBE.cy, NLOBE.rx, NLOBE.ry, G.PAVE);
  stampEllipse(SLOBE.cx, SLOBE.cy, SLOBE.rx, SLOBE.ry, G.PAVE);
  // the pinch at the pavilion: lobes tie into the pool plaza + colonnade
  stampSeg(30, 38, 29.5, 42, G.PAVE);
  stampSeg(30, 50, 30, 49.5, G.PAVE);
  stampSeg(46, 33, 46, 39, G.PAVE);
  stampSeg(46, 56, 46, 53, G.PAVE);
  // gravel spurs tying the lobes to the perimeter trail
  stampSeg(9, 45, 28, 45, G.PATH);
  stampSeg(9, 25, 13, 25, G.PATH); stampSeg(50, 25, 60, 25, G.PATH);
  stampSeg(9, 64, 12, 64, G.PATH); stampSeg(48, 64, 60, 64, G.PATH);
  stampSeg(47.5, 68, 47.5, 83, G.PATH);

  // --- built features ------------------------------------------------------
  fillG(47, 40, 59, 52, G.MARBLE); fillG(45, 44, 46, 48, G.MARBLE); // pavilion
  fillG(29, 42, 45, 50, G.EDGE);   fillG(30, 43, 44, 49, G.WATER);  // pool
  fillG(31, 40, 43, 41, G.BED); fillG(31, 51, 43, 52, G.BED);
  fillG(11, 47, 16, 52, G.SAND);                                    // playground (west side, just south of the slackliners)

  // grass variation + dry patches
  for (let y = 4; y < MH - 4; y++) for (let x = 4; x < MW - 4; x++) {
    if (ground[gi(x, y)] !== G.GRASS) continue;
    if (((x >> 3) + (y >> 3)) % 2 === 0) ground[gi(x, y)] = G.GRASS2;
    if (rnd() < 0.04) ground[gi(x, y)] = G.DRY;
  }

  // --- objects -------------------------------------------------------------
  const addObj = (type, x, y, isSolid = true) => {
    objects.push({ type, x, y });
    // floor, not round: the sprite's base stands in tile floor(x,y) — rounding
    // placed invisible collision one tile south/east of anything with a .5+
    // fractional coordinate (cart, benches, half the trees...)
    if (isSolid) { const tx = Math.floor(x), ty = Math.floor(y); if (inMap(tx, ty)) solid[gi(tx, ty)] = 1; }
  };

  // the north-border landmarks stand IN the park block, backs to 13th Ave
  addObj('b_parktowers', 27, 2.9);
  addObj('b_ocp', 36.5, 2.95);
  addObj('b_tears', 45.5, 2.85);
  for (let y = 0; y <= 2; y++) for (let x = 0; x < MW; x++) solid[gi(x, y)] = 1;  // their grounds: look, don't trespass
  for (let x = 5; x <= 61; x += 2.4) {                     // hedge line in the gaps
    if ((x > 24.5 && x < 29.5) || (x > 33 && x < 40) || (x > 43 && x < 48)) continue;
    addObj('bush', x, 2.75, false);
  }
  addObj('tree', 31.5, 2.8, false); addObj('tree', 41.5, 2.7, false); addObj('tree2', 51.5, 2.85, false);
  // west border: Humboldt Island mansions, right up on the park
  const westRow = ['m_queen', 'm_square', 'm_gable', 'm_tudor', 'm_square', 'm_queen', 'm_gable', 'm_square', 'm_tudor', 'm_queen', 'm_square', 'm_gable', 'm_tudor'];
  westRow.forEach((mk, i) => addObj(mk, 1.45, 7 + i * 6.5, false));
  // east border, south of the gardens: more mansions along Race St
  const eastRow = ['m_gable', 'm_tudor', 'm_queen', 'm_square', 'm_gable', 'm_queen', 'm_tudor', 'm_square'];
  eastRow.forEach((mk, i) => addObj(mk, 70.5, 38 + i * 6.4, false));
  for (let y = 0; y <= MH - 4; y++) { solid[gi(0, y)] = 1; solid[gi(1, y)] = 1; solid[gi(2, y)] = 1; }
  for (let y = 34; y <= MH - 4; y++) { solid[gi(MW - 3, y)] = 1; solid[gi(MW - 2, y)] = 1; solid[gi(MW - 1, y)] = 1; }
  for (let y = 3; y <= 33; y += 1) { if (y < 17 || y > 20) addObj('fence', 63, y); }
  addObj('gardengate', 63.5, 21.15);         // the Cheesman Gate into the Botanic Gardens
  for (let y = 17; y <= 20; y++) if (inMap(63, y)) solid[gi(63, y)] = 1;   // gateway itself stays solid (entry is by proximity)
  for (let x = 64; x < MW; x += 1) addObj('fence', x, 33.4, false);
  addObj('conservatory', 67.5, 14);
  for (let i = 0; i < 46; i++) {
    const x = 64 + rnd() * 7, y = 4 + rnd() * 28;
    if (Math.abs(x - 67.5) < 3.4 && y > 7 && y < 15.5) continue;
    addObj(rnd() < 0.5 ? 'bush' : 'gplant', x, y, false);
  }
  for (let y = 40; y <= 52; y += 2) addObj('column', 59, y);
  for (let x = 49; x <= 57; x += 2) { addObj('column', x, 40); addObj('column', x, 52); }
  addObj('column', 47, 40); addObj('column', 47, 41.6);
  addObj('column', 47, 50.4); addObj('column', 47, 52);
  addObj('jet', 33, 46, false); addObj('jet', 37, 46, false); addObj('jet', 41, 46, false);
  addObj('plaque', 22, 30);
  addObj('stone', 19, 32.5); addObj('stone', 25.5, 33); addObj('stone', 21, 35.5);
  addObj('swing', 12.5, 49); addObj('slide', 15, 49.5); addObj('climber', 13.5, 51);
  addObj('net', 34, 18);
  [[9.6, 18], [9.6, 50], [9.6, 76], [59, 18], [59, 56], [27, 42.7], [27, 50.7],
   [31, 10.6], [50.8, 25], [11.2, 25], [30, 80.8], [49.6, 64], [10.6, 64]].forEach(([x, y]) => addObj('bench', x, y));
  addObj('picnic', 10.8, 29); addObj('picnic', 11.6, 33); addObj('picnic', 10.4, 37);
  addObj('blanket', 20, 57, false); addObj('blanket', 38, 58, false); addObj('blanket', 26, 20, false);
  addObj('tree', 11, 40.4); addObj('tree', 17, 40.4); addObj('tree2', 14, 38.6);
  addObj('tree2', 55, 21.5); addObj('tree', 59, 21.5);
  addObj('blanket', 33, 71, false); addObj('blanket', 38, 29.7, false); addObj('blanket', 44.5, 69.7, false);
  addObj('cart', 44, 54.6);                     // THE RANGER CART (shop)

  for (let y = 6; y < MH - 6; y += 5) addObj('tree', 5.2, y + rnd() * .6);
  // north allée thins where the landmark labels sit on the sidewalk
  const overLabel = (x) => (x > 23.7 && x < 30.3) || (x > 32.5 && x < 40.7) || (x > 41 && x < 50.3);
  for (let x = 6; x < 60; x += 5) {
    const nx = x + rnd() * .6;
    if (!overLabel(nx)) addObj('tree', nx, 5.4);
    addObj('tree', x + rnd() * .6, MH - 5.6);
  }
  for (let y = 36; y < MH - 6; y += 5) addObj('tree', 65.6, y + rnd() * .6);

  const clearOfPaths = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const g = getG(Math.round(x) + dx, Math.round(y) + dy);
      if (g !== G.GRASS && g !== G.GRASS2 && g !== G.DRY) return false;
    }
    return true;
  };
  // tree rings hugging the OUTSIDE of each lawn loop
  const ringTrees = (lobe, count) => {
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2, rr = 2.4 + rnd() * 3.2;
      const x = lobe.cx + Math.cos(a) * (lobe.rx + rr), y = lobe.cy + Math.sin(a) * (lobe.ry + rr);
      if (!clearOfPaths(x, y)) continue;
      const r = rnd();
      addObj(r < 0.42 ? 'tree' : (r < 0.72 ? 'tree2' : 'pine'), x, y);
    }
  };
  ringTrees(NLOBE, 52); ringTrees(SLOBE, 52);
  // lone spruces standing on the open lawns
  [[24, 21.5], [36, 28], [28, 31.5], [39, 20]].forEach(([x, y]) => { if (clearOfPaths(x, y)) addObj('pine', x, y); });
  [[25, 60], [35, 68.5], [22, 70], [33, 58.5]].forEach(([x, y]) => { if (clearOfPaths(x, y)) addObj('pine', x, y); });
  // evergreen groves in the corners
  const grove = (cx, cy, r, n, pinep) => {
    for (let i = 0; i < n; i++) {
      const x = cx + (rnd() * 2 - 1) * r, y = cy + (rnd() * 2 - 1) * r * 0.8;
      if (!clearOfPaths(x, y)) continue;
      addObj(rnd() < pinep ? 'pine' : 'tree2', x, y);
    }
  };
  grove(15, 78, 4.5, 10, 0.85); grove(52, 76, 4, 8, 0.7);
  grove(54, 12, 4.5, 9, 0.6); grove(14, 12, 4, 8, 0.75);
  grove(55, 33, 3.5, 7, 0.5);
  // scattered fill trees in the leftover margins
  for (let i = 0; i < 40; i++) {
    const x = 5 + rnd() * (MW - 12), y = 5 + rnd() * (MH - 12);
    const inN = ((x - NLOBE.cx) / NLOBE.rx) ** 2 + ((y - NLOBE.cy) / NLOBE.ry) ** 2 < 0.8;
    const inS = ((x - SLOBE.cx) / SLOBE.rx) ** 2 + ((y - SLOBE.cy) / SLOBE.ry) ** 2 < 0.8;
    if (inN || inS) continue;
    if (!clearOfPaths(x, y)) continue;
    const r = rnd();
    addObj(r < 0.5 ? 'tree' : (r < 0.8 ? 'tree2' : 'pine'), x, y);
  }

  // --- traffic on the surrounding streets ----------------------------------
}
