// ============================================================================
// garden.js — the Denver Botanic Gardens bonus map (the Garden Run scene).
//
// Layout follows the real York Street map (2024 tear-off), entering at the
// Cheesman Gate on the WEST edge and reading east, loosely to scale:
//   NW  — Monet Pool (the big horseshoe) wrapped in the Shofu-En Japanese
//         Garden; tea-house peninsula inside the U; bridge across the south
//   N   — Greenhouse complex + the Boettcher Conservatory dome on a plaza
//   CTR — formal annual/cutting beds in stripes; Steppe waterway
//   S   — Science Pyramid, Four Towers Pool, El Pomar Waterway channel
//   SW  — Laura Porter Plains garden (dry grass), Dryland Mesa (sand +
//         cactus stand-ins), Rock Alpine garden
//   SE  — Romantic/lilac gardens; amphitheater ellipse; Waring House corner
//   E   — visitor center, promenade, York Street + parking strip
//
// Same array dimensions as the park (MW x MH) so every collision/camera
// helper works untouched; only the top GH rows are used.
// ============================================================================
import { T, MW, MH, GH, G, GARDEN } from './constants.js';
import { gi, inMap } from './tiles.js';

export function buildGarden(state, rnd) {
  const ground = state.gardenGround, solid = state.gardenSolid, objects = state.gardenObjects;

  const setG = (x, y, v) => { if (inMap(x, y) && y < GH) ground[gi(x, y)] = v; };
  const fillG = (x0, y0, x1, y1, v) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setG(x, y, v); };
  const addObj = (type, x, y, isSolid = true) => {
    objects.push({ type, x, y });
    if (isSolid) { const tx = Math.round(x), ty = Math.round(y); if (inMap(tx, ty)) solid[gi(tx, ty)] = 1; }
  };

  // --- base: lawn everywhere, roads on the far edges ------------------------
  fillG(0, 0, MW - 1, GH - 1, G.GRASS);
  fillG(0, 0, MW - 1, 1, G.ROAD);            // 11th Ave (north)
  fillG(0, 2, MW - 1, 2, G.WALK);
  fillG(68, 0, MW - 1, GH - 1, G.ROAD);      // York Street (east)
  fillG(66, 2, 67, GH - 1, G.WALK);
  for (let y = 4; y < GH - 4; y++) for (let x = 4; x < 64; x++) {
    if (((x >> 3) + (y >> 3)) % 2 === 0 && ground[gi(x, y)] === G.GRASS) ground[gi(x, y)] = G.GRASS2;
  }

  // --- paths: main promenade east from the Cheesman Gate + loops ------------
  fillG(4, 28, 62, 29, G.PAVE);              // gate promenade (west -> east)
  fillG(56, 6, 57, 52, G.PAVE);              // north-south promenade (east side)
  fillG(30, 6, 31, 28, G.PATH);              // up to the greenhouses
  fillG(20, 44, 56, 45, G.PATH);             // southern loop
  fillG(20, 24, 20, 44, G.PATH);             // west connector
  fillG(38, 29, 39, 44, G.PATH);             // beds -> pyramid
  fillG(6, 28, 6, 44, G.PATH); fillG(6, 44, 20, 45, G.PATH); // mesa loop

  // --- NW: Monet Pool horseshoe + Japanese garden ---------------------------
  fillG(10, 8, 26, 22, G.WATER);
  fillG(14, 8, 22, 16, G.GRASS2);            // tea-house peninsula (the U opens north)
  fillG(10, 6, 26, 7, G.EDGE);               // stone pool rim, north
  fillG(15, 19, 21, 20, G.PATH);             // bridge across the south lobe
  fillG(14, 17, 22, 17, G.EDGE);             // peninsula shoreline
  addObj('pine', 16, 12); addObj('pine', 20, 11);
  addObj('stone', 17.5, 14); addObj('stone', 19, 13.5); addObj('bench', 18, 15.5);
  for (const [x, y] of [[8, 5], [12, 4.6], [24, 4.8], [28, 6], [28.5, 12], [28, 18], [27.5, 23.5], [8.5, 24], [6, 18], [6.2, 10]]) addObj('pine', x, y);
  addObj('stone', 9, 23); addObj('stone', 27, 9);

  // --- N: greenhouse complex + the Conservatory dome ------------------------
  fillG(32, 6, 42, 11, G.MARBLE);
  addObj('conservatory', 37, 10);            // greenhouse complex
  fillG(44, 10, 54, 17, G.PAVE);
  addObj('conservatory', 49, 15);            // Boettcher dome, on its plaza
  addObj('column', 44, 17.5); addObj('column', 54, 17.5);

  // --- CTR: formal annual & cutting beds in stripes -------------------------
  for (const by of [24, 27, 30, 33, 36]) fillG(33, by, 47, by, G.BED);
  fillG(44, 21, 50, 22, G.WATER);            // Steppe garden waterway
  fillG(43, 21, 43, 22, G.EDGE); fillG(51, 21, 51, 22, G.EDGE);

  // --- S: Science Pyramid + Four Towers Pool + El Pomar Waterway ------------
  fillG(31, 46, 35, 49, G.WATER);            // Four Towers Pool
  fillG(30, 46, 30, 49, G.EDGE); fillG(36, 46, 36, 49, G.EDGE);
  addObj('pyramid', 38.5, 45);               // the Science Pyramid
  fillG(40, 47, 58, 48, G.WATER);            // El Pomar Waterway channel, running east
  fillG(40, 46, 58, 46, G.EDGE); fillG(40, 49, 58, 49, G.EDGE);
  fillG(48, 47, 49, 48, G.PATH);             // the crossing

  // --- SW: plains garden, Dryland Mesa, Rock Alpine --------------------------
  fillG(8, 26, 18, 38, G.DRY);               // Laura Porter Plains garden
  fillG(6, 40, 18, 54, G.SAND);              // Dryland Mesa
  for (const [x, y] of [[8, 43], [12, 46], [15, 43.5], [9, 50], [14, 51.5], [17, 47]]) { addObj('gplant', x, y, false); addObj('stone', x + 1.2, y + 1, false); }
  for (const [x, y] of [[21, 47], [24, 50], [27, 46.5], [22.5, 52]]) addObj('stone', x, y);   // Rock Alpine

  // --- SE: romantic gardens, lilacs, the amphitheater ellipse ---------------
  for (let a = 0; a < 26; a++) {             // amphitheater lawn ring
    const ang = a / 26 * Math.PI * 2;
    setG(Math.round(58 + Math.cos(ang) * 7), Math.round(36 + Math.sin(ang) * 4.5), G.EDGE);
  }
  fillG(53, 33, 63, 39, G.GRASS2);
  for (const [x, y] of [[50, 52], [54, 54], [58, 52.5], [62, 54], [64, 50], [52, 56.5], [60, 56.8]]) addObj('bush', x, y, false);
  fillG(48, 52, 49, 56, G.BED); fillG(63, 42, 64, 46, G.BED);
  addObj('picnic', 66, 54); addObj('bench', 64.5, 56);                        // Waring House corner (stand-in)

  // --- E: visitor center + welcome garden -----------------------------------
  fillG(59, 22, 64, 25, G.MARBLE);
  addObj('column', 59, 26); addObj('column', 64, 26);
  fillG(60, 30, 61, 31, G.BED); fillG(63, 30, 64, 31, G.BED);                 // welcome garden

  // --- the Cheesman Gate (west edge) — where you come in --------------------
  fillG(2, 27, 5, 31, G.PAVE);
  addObj('column', 2, 26.5); addObj('column', 2, 31.8);

  // --- flowering plants along everything (it IS a botanic garden) -----------
  for (let i = 0; i < 60; i++) {
    const x = 5 + rnd() * 60, y = 4 + rnd() * (GH - 9);
    const g = inMap(Math.round(x), Math.round(y)) ? ground[gi(Math.round(x), Math.round(y))] : G.ROAD;
    if (g === G.GRASS || g === G.GRASS2 || g === G.DRY) addObj(rnd() < 0.6 ? 'gplant' : 'bush', x, y, false);
  }
  for (const [x, y] of [[10, 28.6], [26, 30.5], [42, 30.6], [50, 28.6], [30, 45.8], [57, 20]]) addObj('bench', x, y);

  // --- perimeter trees (a solid ring, minus the gate mouth) ------------------
  for (let y = 4; y < GH - 2; y += 2) { if (y < 26 || y > 32) addObj('tree', 1.2, y + rnd() * .5); }
  for (let x = 2; x < 66; x += 2) { addObj('tree', x + rnd() * .5, 3.4); addObj('tree2', x + rnd() * .5, GH - 1.6); }

  // --- flower candidate spots: every bed tile + the showpiece clusters ------
  const spots = [];
  for (let y = 0; y < GH; y++) for (let x = 0; x < MW; x++) {
    if (ground[gi(x, y)] === G.BED) spots.push([x * T + 8, y * T + 8]);
  }
  for (const [x, y] of [[17, 10], [19, 14], [12, 24], [24, 24],           // japanese garden
    [10, 44], [14, 48], [8, 52],                                          // mesa
    [52, 53], [58, 54], [62, 52], [55, 34], [60, 37]]) spots.push([x * T + 8, y * T + 8]);
  state.gardenSpots = spots;
}
