// ============================================================================
// sprites.js — procedural pixel art. Every sprite and character is drawn in
// code onto offscreen canvases; no external image assets are required.
//
// buildSprites(rng) returns an SPR atlas ({ tree, pine, bench, ... }). The
// per-character draw functions (drawPerson, drawZombie, ...) take an explicit
// 2D context so they can render live entities each frame.
// ============================================================================
import { PAL } from './constants.js';

export function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function px(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }

export function buildSprites(rnd) {
  const SPR = {};
  let c = mkCanvas(48, 52), x = c.getContext('2d');
  px(x, 21, 38, 6, 13, PAL.trunk); px(x, 21, 38, 2, 13, PAL.trunkHi);
  const blob = (cx, cy, r, col) => { for (let a = 0; a < 160; a++) { const t = rnd() * 6.283, rr = Math.sqrt(rnd()) * r;
    px(x, (cx + Math.cos(t) * rr) | 0, (cy + Math.sin(t) * rr * 0.86) | 0, 2, 2, col); } };
  blob(24, 22, 17, PAL.leafD); blob(22, 19, 14, PAL.leaf); blob(19, 15, 9, PAL.leafHi); blob(31, 25, 8, PAL.leaf);
  SPR.tree = { c, ax: 24, ay: 51 };
  // big mature elm (wider canopy, the park's signature street tree)
  c = mkCanvas(64, 64); x = c.getContext('2d');
  px(x, 28, 48, 8, 15, PAL.trunk); px(x, 28, 48, 3, 15, PAL.trunkHi);
  px(x, 24, 52, 5, 4, PAL.trunk); px(x, 36, 53, 5, 3, PAL.trunk); // root flare
  const blob2 = (cx, cy, r, col) => { for (let a = 0; a < 220; a++) { const t = rnd() * 6.283, rr = Math.sqrt(rnd()) * r;
    px(x, (cx + Math.cos(t) * rr) | 0, (cy + Math.sin(t) * rr * 0.78) | 0, 2, 2, col); } };
  blob2(32, 26, 24, PAL.leafD); blob2(29, 22, 19, PAL.leaf); blob2(24, 17, 11, PAL.leafHi);
  blob2(42, 30, 11, PAL.leaf); blob2(20, 30, 9, PAL.leafD);
  SPR.tree2 = { c, ax: 32, ay: 63 };
  c = mkCanvas(34, 50); x = c.getContext('2d');
  px(x, 15, 42, 4, 8, PAL.trunk);
  const tier = (cy, w, h) => { for (let r = 0; r < h; r++) { const ww = (w * (r + 2) / h) | 0; px(x, 17 - ww / 2 | 0, cy + r, ww, 1, PAL.pine);
    px(x, 17 - ww / 2 | 0, cy + r, Math.max(1, ww / 3 | 0), 1, PAL.pineHi); px(x, (17 + ww / 2 - 2) | 0, cy + r, 2, 1, PAL.pineD); } };
  tier(2, 16, 14); tier(12, 24, 16); tier(24, 30, 19);
  SPR.pine = { c, ax: 17, ay: 49 };
  c = mkCanvas(20, 16); x = c.getContext('2d');
  for (let a = 0; a < 50; a++) px(x, (3 + rnd() * 14) | 0, (3 + rnd() * 10) | 0, 2, 2, rnd() < .5 ? PAL.gardenDark : PAL.leaf);
  SPR.bush = { c, ax: 10, ay: 15 };
  c = mkCanvas(18, 20); x = c.getContext('2d');
  for (let a = 0; a < 40; a++) px(x, (3 + rnd() * 12) | 0, (5 + rnd() * 12) | 0, 2, 2, PAL.leaf);
  ['#c94f43', '#e5c04b', '#d98aa6', '#8e6fb8'].forEach((col) => { for (let a = 0; a < 5; a++) px(x, (2 + rnd() * 14) | 0, (3 + rnd() * 13) | 0, 2, 2, col); });
  SPR.gplant = { c, ax: 9, ay: 19 };
  c = mkCanvas(16, 18); x = c.getContext('2d');
  px(x, 0, 4, 16, 2, '#2c2c30'); px(x, 0, 14, 16, 2, '#2c2c30');
  for (let i = 1; i < 16; i += 4) { px(x, i, 3, 2, 14, '#3a3a40'); px(x, i, 1, 2, 3, '#2c2c30'); }
  SPR.fence = { c, ax: 8, ay: 17 };
  c = mkCanvas(10, 24); x = c.getContext('2d');
  px(x, 0, 0, 10, 3, PAL.marble); px(x, 0, 2, 10, 1, PAL.marbleShade);
  px(x, 2, 3, 6, 17, PAL.marble); px(x, 6, 3, 2, 17, PAL.marbleShade); px(x, 2, 3, 1, 17, '#ffffff');
  px(x, 0, 20, 10, 4, PAL.marble); px(x, 0, 22, 10, 2, PAL.marbleShade);
  SPR.column = { c, ax: 5, ay: 23 };
  c = mkCanvas(96, 74); x = c.getContext('2d');
  px(x, 4, 20, 88, 50, '#7fb4b4');
  for (let i = 0; i < 88; i += 8) px(x, 4 + i, 20, 2, 50, '#e8e4d4');
  for (let j = 20; j < 70; j += 10) px(x, 4, j, 88, 2, '#e8e4d4');
  for (let i = 0; i < 10; i++) { const w = 88 - i * 8; px(x, (48 - w / 2) | 0, 20 - i * 2, w, 2, '#8fc4c0'); px(x, (48 - w / 2) | 0, 20 - i * 2, w, 1, '#eef'); }
  px(x, 2, 66, 92, 8, '#b8b2a0'); px(x, 2, 71, 92, 3, '#9a947f'); px(x, 40, 54, 16, 16, '#4a5a58');
  SPR.conservatory = { c, ax: 48, ay: 72 };
  c = mkCanvas(18, 14); x = c.getContext('2d');
  px(x, 1, 9, 3, 5, '#3a3a40'); px(x, 14, 9, 3, 5, '#3a3a40');
  px(x, 0, 6, 18, 4, '#a7773f'); px(x, 0, 6, 18, 1, '#c2915a');
  px(x, 0, 0, 18, 2, '#a7773f'); px(x, 0, 3, 18, 2, '#a7773f');
  SPR.bench = { c, ax: 9, ay: 13 };
  c = mkCanvas(16, 18); x = c.getContext('2d');
  px(x, 3, 12, 10, 6, '#7d7d80'); px(x, 3, 16, 10, 2, '#5f5f63');
  px(x, 1, 1, 14, 12, '#8a6d3b'); px(x, 2, 2, 12, 10, '#a8874c');
  for (let j = 4; j < 10; j += 2) px(x, 4, j, 8, 1, '#6f5730');
  SPR.plaque = { c, ax: 8, ay: 17 };
  c = mkCanvas(10, 12); x = c.getContext('2d');
  px(x, 1, 3, 8, 9, '#8f8f8a'); px(x, 2, 1, 6, 3, '#8f8f8a'); px(x, 7, 3, 2, 9, '#6f6f6b');
  px(x, 3, 5, 4, 1, '#6f6f6b'); px(x, 3, 7, 3, 1, '#6f6f6b');
  SPR.stone = { c, ax: 5, ay: 11 };
  c = mkCanvas(36, 24); x = c.getContext('2d');
  px(x, 1, 2, 3, 22, '#c94f43'); px(x, 32, 2, 3, 22, '#c94f43'); px(x, 0, 0, 36, 3, '#c94f43');
  px(x, 9, 3, 1, 13, '#555'); px(x, 14, 3, 1, 13, '#555'); px(x, 8, 16, 8, 3, '#3b4a6b');
  px(x, 22, 3, 1, 10, '#555'); px(x, 27, 3, 1, 10, '#555'); px(x, 21, 13, 8, 3, '#3b4a6b');
  SPR.swing = { c, ax: 18, ay: 23 };
  c = mkCanvas(20, 26); x = c.getContext('2d');
  px(x, 14, 4, 5, 22, '#888'); px(x, 14, 4, 5, 2, '#aaa');
  for (let i = 0; i < 14; i++) px(x, 13 - i, 6 + i, 4, 3, '#e5c04b');
  px(x, 0, 20, 5, 3, '#e5c04b'); px(x, 15, 0, 3, 5, '#666');
  SPR.slide = { c, ax: 10, ay: 25 };
  c = mkCanvas(24, 16); x = c.getContext('2d');
  x.strokeStyle = '#4a90c2'; x.lineWidth = 1.6;
  x.beginPath(); x.arc(12, 15, 11, Math.PI, 0); x.stroke();
  x.beginPath(); x.arc(12, 15, 7, Math.PI, 0); x.stroke();
  x.beginPath(); x.moveTo(12, 4); x.lineTo(12, 15); x.moveTo(5, 7); x.lineTo(9, 15);
  x.moveTo(19, 7); x.lineTo(15, 15); x.stroke();
  SPR.climber = { c, ax: 12, ay: 15 };
  c = mkCanvas(52, 18); x = c.getContext('2d');
  px(x, 0, 0, 3, 18, '#7a5230'); px(x, 49, 0, 3, 18, '#7a5230');
  x.strokeStyle = 'rgba(250,250,250,.9)'; x.lineWidth = 1;
  for (let j = 2; j < 11; j += 3) { x.beginPath(); x.moveTo(3, j); x.lineTo(49, j); x.stroke(); }
  for (let i = 6; i < 49; i += 5) { x.beginPath(); x.moveTo(i, 2); x.lineTo(i, 10); x.stroke(); }
  SPR.net = { c, ax: 26, ay: 17 };
  c = mkCanvas(26, 18); x = c.getContext('2d');
  px(x, 0, 0, 26, 18, '#c94f43');
  for (let j = 0; j < 18; j += 6) for (let i = 0; i < 26; i += 6) if (((i + j) / 6) % 2 === 0) px(x, i, j, 6, 6, '#e8e4d4');
  px(x, 19, 3, 5, 5, '#8a6d3b'); px(x, 20, 1, 3, 2, '#6f5730');
  SPR.blanket = { c, ax: 13, ay: 12 };
  // Ranger Cart (28x30): striped awning, counter, wheel
  c = mkCanvas(28, 30); x = c.getContext('2d');
  px(x, 2, 14, 24, 12, '#a7773f'); px(x, 2, 14, 24, 2, '#c2915a');
  px(x, 4, 17, 8, 6, '#6f5730');
  px(x, 0, 2, 28, 8, '#c94f43');
  for (let i = 0; i < 28; i += 8) px(x, i, 2, 4, 8, '#f2ead6');
  px(x, 0, 9, 28, 2, '#8a3b32');
  px(x, 3, 10, 2, 5, '#5a4a3a'); px(x, 23, 10, 2, 5, '#5a4a3a');
  px(x, 18, 24, 7, 6, '#3a3a40'); px(x, 20, 26, 3, 3, '#777');
  px(x, 14, 16, 10, 2, '#e5c04b'); // "$" shelf
  SPR.cart = { c, ax: 14, ay: 29 };
  // picnic table (A-frame, brown)
  c = mkCanvas(24, 16); x = c.getContext('2d');
  px(x, 3, 13, 3, 3, '#5a4a3a'); px(x, 18, 13, 3, 3, '#5a4a3a');
  px(x, 0, 10, 24, 3, '#a7773f'); px(x, 0, 10, 24, 1, '#c2915a');
  px(x, 2, 3, 20, 5, '#b8864a'); px(x, 2, 3, 20, 1, '#d1a266');
  px(x, 0, 0, 24, 2, '#a7773f');
  SPR.picnic = { c, ax: 12, ay: 15 };
  // Chihuly's "Colorado" — the glass spear burst by the Waring House:
  // a frozen firework, yellow-hot heart out to red tips, on a dark base
  c = mkCanvas(30, 34); x = c.getContext('2d');
  px(x, 12, 28, 6, 4, '#2a2a2e'); px(x, 13, 26, 4, 2, '#3a3a40');   // dark base
  for (let a = 0; a < 72; a++) {
    const ang = (a / 72) * Math.PI * 2;
    const len = 7 + ((a * 5) % 7);
    for (let r = 2; r < len; r++) {
      const X = 15 + Math.cos(ang) * r * 0.95, Y = 14 + Math.sin(ang) * r * 0.8;
      px(x, X | 0, Y | 0, 1, 1, r < 4 ? '#ffd75a' : r < len - 2 ? '#e07a3f' : '#c92f2f');
    }
  }
  px(x, 13, 12, 4, 4, '#ffe27a'); px(x, 14, 13, 2, 2, '#fff3b0');   // hot core
  SPR.chihuly = { c, ax: 15, ay: 32 };

  // --- garden flora & rocks kit (NOT gravestones — those stay in the cemetery) ---
  // boulder — rounded granite for Rock Alpine / the mesa
  c = mkCanvas(13, 10); x = c.getContext('2d');
  px(x, 2, 3, 9, 6, '#8a8a84'); px(x, 3, 2, 7, 2, '#8a8a84'); px(x, 1, 5, 11, 3, '#8a8a84');
  px(x, 3, 3, 4, 2, '#a5a59e'); px(x, 2, 7, 9, 2, '#6f6f68');
  SPR.rock = { c, ax: 6, ay: 9 };
  // Japanese stone lantern (Shofu-En)
  c = mkCanvas(10, 15); x = c.getContext('2d');
  px(x, 2, 13, 6, 2, '#8a8a84');                        // base
  px(x, 4, 9, 2, 4, '#9a9a92');                         // post
  px(x, 2, 6, 6, 3, '#9a9a92'); px(x, 3, 7, 4, 1, '#ffe9a8'); // light box, warm glow
  px(x, 1, 4, 8, 2, '#8a8a84'); px(x, 3, 2, 4, 2, '#8a8a84'); px(x, 4, 1, 2, 1, '#6f6f68'); // cap
  SPR.lantern = { c, ax: 5, ay: 14 };
  // saguaro-style cactus (Dryland Mesa)
  c = mkCanvas(13, 17); x = c.getContext('2d');
  px(x, 5, 3, 3, 14, '#4c8a3f'); px(x, 5, 3, 1, 14, '#63a852');   // trunk
  px(x, 1, 6, 2, 5, '#4c8a3f'); px(x, 1, 5, 3, 2, '#4c8a3f');     // left arm
  px(x, 10, 8, 2, 4, '#4c8a3f'); px(x, 9, 7, 3, 2, '#4c8a3f');    // right arm
  for (let i = 4; i < 16; i += 3) { px(x, 4, i, 1, 1, '#d9e8b8'); px(x, 8, i + 1, 1, 1, '#d9e8b8'); } // spines
  px(x, 5, 2, 3, 1, '#d98aa6');                          // crown bloom
  SPR.cactus = { c, ax: 6, ay: 16 };
  // weeping willow (Willow Glade / pool shore) — draped strands
  c = mkCanvas(40, 40); x = c.getContext('2d');
  px(x, 18, 28, 4, 11, PAL.trunk); px(x, 18, 28, 2, 11, PAL.trunkHi);
  for (let a = 0; a < 120; a++) { const t2 = rnd() * 6.283, rr = Math.sqrt(rnd()) * 15;
    px(x, (20 + Math.cos(t2) * rr) | 0, (12 + Math.sin(t2) * rr * 0.5) | 0, 2, 2, '#6fa85a'); }
  for (let i = 0; i < 12; i++) {                          // hanging strands
    const sx = 5 + i * 2.6 | 0, len = 10 + ((i * 7) % 9);
    for (let j = 0; j < len; j += 2) px(x, sx, 14 + j, 1, 2, j % 4 ? '#7db868' : '#5f9a4e');
  }
  SPR.willow = { c, ax: 20, ay: 39 };
  // lilac shrub — heavy purple panicles
  c = mkCanvas(16, 17); x = c.getContext('2d');
  for (let a = 0; a < 34; a++) px(x, (2 + rnd() * 12) | 0, (6 + rnd() * 9) | 0, 2, 2, PAL.leaf);
  for (let a = 0; a < 16; a++) px(x, (2 + rnd() * 12) | 0, (1 + rnd() * 7) | 0, 2, 2, a % 3 ? '#b78fd0' : '#8e6fb8');
  SPR.lilac = { c, ax: 8, ay: 16 };
  // ornamental grasses — fountain of tan blades
  c = mkCanvas(14, 13); x = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const bx = 2 + i * 1.2 | 0, lean = (i - 4) / 2;
    for (let j = 0; j < 9 - Math.abs(i - 4); j++) px(x, (6 + lean * j / 3) | 0, 12 - j, 1, 1, j > 5 ? '#d8c890' : '#b8a86a');
  }
  SPR.tallgrass = { c, ax: 7, ay: 12 };
  // flowerbush — green mound absolutely covered in mixed blooms
  c = mkCanvas(18, 13); x = c.getContext('2d');
  for (let a = 0; a < 40; a++) px(x, (2 + rnd() * 13) | 0, (3 + rnd() * 8) | 0, 2, 2, PAL.leaf);
  ['#c94f43', '#e5c04b', '#d98aa6', '#f2ead6', '#e07a3f'].forEach((col) => {
    for (let a = 0; a < 4; a++) px(x, (2 + rnd() * 13) | 0, (2 + rnd() * 8) | 0, 2, 2, col); });
  SPR.flowerbush = { c, ax: 9, ay: 12 };
  // small stone fountain (Schlessman plaza)
  c = mkCanvas(16, 14); x = c.getContext('2d');
  px(x, 1, 9, 14, 4, '#9a9a92'); px(x, 2, 10, 12, 2, PAL.water);  // basin
  px(x, 7, 4, 2, 6, '#9a9a92');                                    // column
  px(x, 5, 3, 6, 2, '#9a9a92'); px(x, 6, 2, 4, 1, PAL.waterHi);   // bowl + spray
  px(x, 4, 9, 1, 2, PAL.waterHi); px(x, 11, 9, 1, 2, PAL.waterHi);
  SPR.fountain = { c, ax: 8, ay: 13 };

  // the Cheesman Gate — stone pillars + wrought-iron span, sized to seam
  // cleanly into the fence line above and below (no gaps)
  c = mkCanvas(24, 84); x = c.getContext('2d');
  const pillar = (py) => {
    px(x, 8, py, 8, 3, '#b8b2a0');                       // cap
    px(x, 9, py + 3, 6, 12, '#9a947f');                  // shaft
    px(x, 9, py + 3, 2, 12, '#aaa495');                  // highlight
    px(x, 8, py + 15, 8, 2, '#8a8475');                  // base
  };
  pillar(0); pillar(66);                                  // pillars seam to the fence ends
  px(x, 11, 15, 2, 53, '#2c2c30');                       // iron spine spanning the gap
  for (let i = 18; i < 66; i += 4) px(x, 10, i, 4, 1, '#3a3a40');   // scrollwork rungs
  px(x, 6, 34, 12, 10, '#8a6d3b'); px(x, 7, 35, 10, 8, '#a8874c'); // hanging sign
  px(x, 8, 37, 8, 1, '#6f5730'); px(x, 8, 39, 6, 1, '#6f5730'); px(x, 8, 41, 7, 1, '#6f5730');
  SPR.gardengate = { c, ax: 12, ay: 82 };
  // DBG greenhouse complex — long parallel growing ranges (the striped white
  // roofs in the aerial), deliberately utilitarian next to the showpiece dome
  c = mkCanvas(72, 34); x = c.getContext('2d');
  for (let range = 0; range < 3; range++) {
    const ry = range * 10;
    px(x, 2, ry + 4, 68, 7, '#c8ccc9');                 // range body
    px(x, 2, ry + 2, 68, 3, '#e8ecea');                 // ridge highlight
    px(x, 2, ry + 9, 68, 2, '#9aa09d');                 // eave shadow
    for (let i = 6; i < 68; i += 7) px(x, i, ry + 3, 1, 7, '#aab4b0');  // glazing bars
  }
  px(x, 0, 30, 72, 4, '#b8b2a0'); px(x, 0, 32, 72, 2, '#9a947f');       // service apron
  px(x, 33, 26, 6, 6, '#4a5a58');                       // door
  SPR.greenhouse = { c, ax: 36, ay: 32 };
  // Boettcher Conservatory (1966) — faceted glass between interlaced concrete
  // arches; a pointed ribbed dome, Denver Landmark
  c = mkCanvas(44, 40); x = c.getContext('2d');
  for (let r = 0; r < 30; r++) {                        // pointed dome profile
    const w = Math.round(40 * Math.sin((r / 30) * Math.PI / 2));
    px(x, 22 - w / 2 | 0, r + 2, w, 1, '#9fc4c0');      // glass
    px(x, 22 - w / 2 | 0, r + 2, Math.max(1, w / 4 | 0), 1, '#c4e0dc');  // sheen
  }
  for (let k = -2; k <= 2; k++) {                       // concrete ribs, interlaced
    for (let r = 2; r < 32; r++) {
      const w = Math.round(40 * Math.sin(((r - 2) / 30) * Math.PI / 2));
      const rx = 22 + Math.round(k * w / 5);
      if (rx > 22 - w / 2 - 1 && rx < 22 + w / 2 + 1) px(x, rx, r, 1, 1, '#cfc9b6');
    }
  }
  px(x, 21, 0, 2, 3, '#cfc9b6');                        // apex
  px(x, 2, 32, 40, 5, '#b8b2a0'); px(x, 2, 35, 40, 2, '#9a947f');  // base
  px(x, 19, 30, 6, 7, '#4a5a58');                       // entry
  SPR.dome = { c, ax: 22, ay: 38 };
  // Ella Mullen Weckbaugh Tea House — open pavilion on the Monet Pool peninsula
  c = mkCanvas(20, 18); x = c.getContext('2d');
  px(x, 0, 4, 20, 3, '#3a2f26'); px(x, 2, 2, 16, 3, '#4a3b2e');    // wide hip roof
  px(x, 1, 6, 18, 1, '#2a2119');                                    // eave
  px(x, 3, 7, 2, 9, '#6b4a2e'); px(x, 15, 7, 2, 9, '#6b4a2e');     // posts (open sides)
  px(x, 5, 12, 10, 4, '#8a6d4b');                                   // raised floor
  px(x, 0, 16, 20, 2, '#9a947f');                                   // stone base
  SPR.teahouse = { c, ax: 10, ay: 17 };
  // Waring House — the brick MANSION on the SE corner: two stories, twin
  // gables, chimneys, porte-cochere porch (it's a Denver landmark, be big)
  c = mkCanvas(60, 68); x = c.getContext('2d');
  px(x, 2, 24, 56, 40, '#8a4a3a');                                  // brick mass
  px(x, 2, 24, 56, 3, '#9a5a46'); px(x, 2, 43, 56, 2, '#7a3f32');   // string courses
  // twin gables + connecting roof
  for (let r = 0; r < 12; r++) { px(x, 15 - r, 12 + r, r * 2 + 2, 1, '#5a4a3a'); px(x, 45 - r, 12 + r, r * 2 + 2, 1, '#5a4a3a'); }
  px(x, 4, 22, 52, 4, '#5a4a3a'); px(x, 4, 22, 52, 1, '#6b5a48');
  px(x, 13, 14, 4, 6, '#e8dcc8'); px(x, 43, 14, 4, 6, '#e8dcc8');   // gable windows
  px(x, 8, 4, 5, 10, '#6f3a2e'); px(x, 47, 6, 5, 8, '#6f3a2e');     // chimneys
  px(x, 8, 4, 5, 2, '#9a947f'); px(x, 47, 6, 5, 2, '#9a947f');
  // two floors of tall windows with stone lintels
  for (const wy of [28, 46]) for (let wx = 6; wx < 54; wx += 9) {
    if (wy === 46 && wx >= 24 && wx <= 33) continue;                // door bay
    px(x, wx, wy - 1, 6, 1, '#c8bca8'); px(x, wx, wy, 6, 10, '#e8dcc8');
    px(x, wx + 2, wy, 1, 10, '#8a4a3a'); px(x, wx, wy + 5, 6, 1, '#8a4a3a');
  }
  // porch: steps, columns, little roof, front door
  px(x, 22, 40, 16, 3, '#5a4a3a'); px(x, 22, 40, 16, 1, '#6b5a48'); // porch roof
  px(x, 23, 43, 2, 18, '#e8dcc8'); px(x, 35, 43, 2, 18, '#e8dcc8'); // columns
  px(x, 26, 46, 8, 15, '#3a2f26'); px(x, 27, 48, 6, 13, '#e8dcc8'); px(x, 28, 49, 4, 11, '#6f3a2e'); // door
  px(x, 20, 61, 20, 3, '#9a947f');                                  // steps
  px(x, 0, 64, 60, 4, '#9a947f'); px(x, 0, 66, 60, 2, '#8a8475');   // foundation
  SPR.waring = { c, ax: 30, ay: 66 };
  // Cactus & Succulent House — small white glasshouse on the Dryland Mesa
  c = mkCanvas(18, 14); x = c.getContext('2d');
  for (let r = 0; r < 6; r++) px(x, 9 - r - 3 | 0, 1 + r, (r + 3) * 2, 1, '#e8ecea'); // ridge roof
  px(x, 1, 7, 16, 5, '#dfe8ea');
  for (let i = 3; i < 16; i += 4) px(x, i, 7, 1, 5, '#aab4b0');     // glazing
  px(x, 0, 12, 18, 2, '#b8a888');
  SPR.glasshouse = { c, ax: 9, ay: 13 };
  // the Science Pyramid (DBG) — big dark faceted building, honeycomb panels
  c = mkCanvas(52, 42); x = c.getContext('2d');
  for (let r = 0; r < 36; r++) {
    const w = (r * 52 / 36) | 0;
    px(x, 26 - w / 2 | 0, r + 2, w, 1, '#3a3f4a');
    px(x, 26 - w / 2 | 0, r + 2, Math.max(1, w / 3 | 0), 1, '#4c5566');
  }
  px(x, 25, 2, 2, 36, '#2a2e38');                       // center seam
  for (let r = 8; r < 36; r += 6) px(x, 26 - (r * 52 / 36) / 2 | 0, r + 2, (r * 52 / 36) | 0, 1, '#2a2e38'); // panel courses
  for (let r = 10; r < 34; r += 8) { px(x, 20, r, 1, 4, '#2a2e38'); px(x, 32, r + 3, 1, 4, '#2a2e38'); }     // facet joints
  px(x, 10, 32, 9, 6, '#7fd0ff'); px(x, 11, 33, 7, 4, '#a8e0ff');  // glowing entry pane
  px(x, 34, 30, 6, 5, '#5f7d8a');                       // second pane
  px(x, 0, 38, 52, 3, '#9a947f'); px(x, 0, 40, 52, 2, '#8a8475'); // plinth
  SPR.pyramid = { c, ax: 26, ay: 40 };
  return SPR;
}

// --- procedural characters (drawn live each frame) -------------------------
export function drawPerson(x2, ax, ay, dir, phase, pal, seated) {
  const sw = Math.sin(phase);
  x2.fillStyle = 'rgba(0,0,0,.25)'; x2.fillRect(ax - 4, ay - 2, 8, 3);
  if (seated) {
    px(x2, ax - 4, ay - 7, 8, 6, pal.shirt);
    px(x2, ax - 5, ay - 3, 3, 3, pal.pants); px(x2, ax + 2, ay - 3, 3, 3, pal.pants);
    px(x2, ax - 3, ay - 13, 6, 6, pal.skin); px(x2, ax - 3, ay - 13, 6, 2, pal.hair);
    return;
  }
  const l1 = sw > 0 ? 4 : 3, l2 = sw > 0 ? 3 : 4;
  px(x2, ax - 3, ay - 5, 3, l1, pal.pants); px(x2, ax, ay - 5, 3, l2, pal.pants);
  px(x2, ax - 3, ay - 2, 3, 2, '#f5f2ea'); px(x2, ax, ay - 2, 3, 2, '#f5f2ea');
  px(x2, ax - 4, ay - 11, 8, 6, pal.shirt);
  px(x2, ax - 6, ay - 11 + (sw > 0 ? 1 : 0), 2, 5, pal.skin); px(x2, ax + 4, ay - 11 + (sw > 0 ? 0 : 1), 2, 5, pal.skin);
  px(x2, ax - 3, ay - 17, 6, 6, pal.skin);
  if (dir === 'up') { px(x2, ax - 3, ay - 17, 6, 4, pal.hair); }
  else {
    px(x2, ax - 3, ay - 17, 6, 2, pal.hair);
    x2.fillStyle = PAL.ink;
    if (dir === 'down') { x2.fillRect(ax - 2, ay - 14, 1, 1); x2.fillRect(ax + 1, ay - 14, 1, 1); }
    if (dir === 'left') { x2.fillRect(ax - 2, ay - 14, 1, 1); px(x2, ax + 1, ay - 17, 2, 4, pal.hair); }
    if (dir === 'right') { x2.fillRect(ax + 1, ay - 14, 1, 1); px(x2, ax - 3, ay - 17, 2, 4, pal.hair); }
  }
}

// a little scurrying park squirrel
export function drawSquirrel(x2, ax, ay, dir, phase) {
  const b = Math.sin(phase) > 0 ? 1 : 0;
  const fur = '#a8663a', furD = '#7d4a29', belly = '#d9b88a';
  x2.fillStyle = 'rgba(0,0,0,.22)'; x2.fillRect(ax - 3, ay - 1, 7, 2);
  const back = dir === 'left' ? ax + 3 : ax - 6;        // bushy tail curls up behind
  px(x2, back, ay - 10, 3, 9, fur); px(x2, back - (dir === 'left' ? -1 : 1), ay - 12, 4, 4, furD);
  px(x2, ax - 3, ay - 6, 6, 5, fur); px(x2, ax - 3, ay - 3, 6, 1, belly);  // body
  px(x2, ax - 2, ay - 1, 2, 1 + b, furD); px(x2, ax + 1, ay - 1, 2, 2 - b, furD); // legs
  const hx = dir === 'left' ? ax - 4 : ax + 2;          // head
  px(x2, hx, ay - 9, 4, 4, fur); px(x2, hx + (dir === 'left' ? 0 : 2), ay - 10, 2, 2, furD); // ear
  x2.fillStyle = '#101014'; x2.fillRect(hx + (dir === 'left' ? 0 : 2), ay - 8, 1, 1); // eye
}

// long hair, drawn over drawPerson's head for the 'f' style
function drawLongHair(x2, ax, ay, dir, col) {
  if (dir === 'up') {                                              // from behind:
    px(x2, ax - 4, ay - 17, 8, 4, col);                            // full head of hair...
    px(x2, ax - 3, ay - 13, 6, 5, col);                            // ...cascading down the back (no neck gap)
  } else { px(x2, ax - 4, ay - 16, 1, 6, col); px(x2, ax + 3, ay - 16, 1, 6, col); } // side strands
}

// The player character: base person + archetype outfit + style ('m'|'f').
// All the tribe flavor lives here so every draw site (main sprite, dash
// afterimages) stays consistent.
export function drawPlayerChar(x2, ax, ay, dir, phase, archId, style, flash) {
  if (flash) { drawPerson(x2, ax, ay, dir, phase, { skin:'#fff', shirt:'#fff', pants:'#fff', hair:'#fff' }, false); return; }
  const fem = style === 'f';
  const sw = Math.sin(phase);

  if (archId === 'volleyball') {
    const skin = '#e8b58a';
    // shirtless bro / sports-top gal, red headband, shorts, wristband
    drawPerson(x2, ax, ay, dir, phase, { skin, shirt: skin, pants:'#2f3742', hair:'#4a3123' }, false);
    if (fem) { px(x2, ax - 4, ay - 11, 8, 3, '#f2ead6'); drawLongHair(x2, ax, ay, dir, '#4a3123'); }
    else { px(x2, ax, ay - 10, 1, 4, '#c9925e'); px(x2, ax - 2, ay - 9, 1, 1, '#c9925e'); px(x2, ax + 1, ay - 9, 1, 1, '#c9925e'); } // pecs/abs hints
    px(x2, ax - 3, ay - 16, 6, 1, '#c94f43');                                    // headband
    // red sweatband, tracking the arm's walk-cycle bob (drawPerson offsets)
    const armOff = dir === 'left' ? (sw > 0 ? 1 : 0) : (sw > 0 ? 0 : 1);
    px(x2, dir === 'left' ? ax - 6 : ax + 4, ay - 8 + armOff, 2, 2, '#c94f43');
  } else if (archId === 'tech') {
    // puffer vest over grey long sleeves, earbuds, phone perpetually in hand
    drawPerson(x2, ax, ay, dir, phase, { skin:'#e8b58a', shirt:'#4c6b57', pants: fem ? '#5a4a6b' : '#8a8a8a', hair:'#2b2b2b' }, false);
    px(x2, ax, ay - 11, 1, 4, '#7fb4a4');                                        // vest zipper
    px(x2, ax - 4, ay - 11, 1, 6, '#37514a'); px(x2, ax + 3, ay - 11, 1, 6, '#37514a'); // vest quilting edges
    px(x2, ax - 6, ay - 11 + (sw > 0 ? 1 : 0), 2, 3, '#9aa0a8');                 // grey sleeves
    px(x2, ax + 4, ay - 11 + (sw > 0 ? 0 : 1), 2, 3, '#9aa0a8');
    px(x2, ax - 4, ay - 14, 1, 2, '#f4f4f4'); px(x2, ax + 3, ay - 14, 1, 2, '#f4f4f4'); // earbuds
    if (dir !== 'up') {                                                          // the phone. always the phone.
      const hx = dir === 'left' ? ax - 7 : ax + 5;
      px(x2, hx, ay - 8, 3, 4, fem ? '#d98aa6' : '#15151c');                     // (hers has a pink case)
      px(x2, hx + 1, ay - 7, 1, 2, '#7fd0ff');
    }
    if (fem) {
      // shoulder-length hair + high ponytail swinging with her stride, leggings
      px(x2, ax - 4, ay - 16, 1, 4, '#2b2b2b'); px(x2, ax + 3, ay - 16, 1, 4, '#2b2b2b');
      px(x2, ax - 1, ay - 19, 3, 2, '#2b2b2b');
      px(x2, ax + (dir === 'left' ? -3 : 2), ay - 19 + (sw > 0 ? 1 : 0), 2, 4, '#2b2b2b');
    }
  } else if (archId === 'jogger') {
    // race tank with a stripe, visor, always mid-stride
    drawPerson(x2, ax, ay, dir, phase, { skin:'#c98e63', shirt:'#e07a3f', pants:'#2f3742', hair:'#1f1a14' }, false);
    px(x2, ax, ay - 11, 1, 6, '#f2ead6');                                        // racing stripe
    px(x2, ax - 3, ay - 15, 6, 1, '#e5c04b');                                    // visor brim
    if (fem) {
      px(x2, ax + (dir === 'left' ? 3 : -4), ay - 18 + (sw > 0 ? 0 : 1), 2, 5, '#1f1a14'); // bouncing ponytail
    }
  } else if (archId === 'yogi') {
    // calm teal, light pants, rolled mat on the back, bun for everyone
    drawPerson(x2, ax, ay, dir, phase, { skin:'#f0c8a0', shirt:'#7fb4b4', pants:'#e8e4d4', hair:'#4a3123' }, false);
    px(x2, dir === 'left' ? ax + 4 : ax - 6, ay - 13, 2, 8, '#c94f43');          // the mat goes everywhere
    px(x2, ax - 1, ay - 19, 3, 2, '#4a3123');                                    // bun (guy or gal, it's yoga)
    if (fem) { px(x2, ax - 4, ay - 16, 1, 4, '#4a3123'); px(x2, ax + 3, ay - 16, 1, 4, '#4a3123'); }
  } else if (archId === 'hippie') {
    // tie-dye shirt with a daisy on it, shades, beard (bro) / long hair (gal)
    drawPerson(x2, ax, ay, dir, phase, { skin:'#d9a06f', shirt:'#8e6fb8', pants:'#4c6b57', hair:'#6b4a2e' }, false);
    px(x2, ax - 3, ay - 7, 6, 1, '#a98fd0'); px(x2, ax - 4, ay - 9, 1, 2, '#d98aa6'); px(x2, ax + 3, ay - 10, 1, 2, '#e5c04b'); // tie-dye swirls
    px(x2, ax, ay - 11, 1, 1, '#f7f3e8'); px(x2, ax, ay - 9, 1, 1, '#f7f3e8');   // the daisy: petals...
    px(x2, ax - 1, ay - 10, 1, 1, '#f7f3e8'); px(x2, ax + 1, ay - 10, 1, 1, '#f7f3e8');
    px(x2, ax, ay - 10, 1, 1, '#e5c04b');                                        // ...and center
    if (dir !== 'up') px(x2, ax - 3, ay - 14, 6, 2, '#1c1c1c');                  // shades, always
    if (fem) drawLongHair(x2, ax, ay, dir, '#6b4a2e');
    else if (dir !== 'up') px(x2, ax - 3, ay - 13, 6, 2, '#6b4a2e');             // beard
  } else {
    // no tribe yet: the default park-goer
    drawPerson(x2, ax, ay, dir, phase, { skin:'#e8b58a', shirt:'#c94f43', pants:'#3b4a6b', hair:'#4a3123' }, false);
    if (fem) drawLongHair(x2, ax, ay, dir, '#4a3123');
  }
}

// SPROUT — corgi × cattle dog: corgi-low and corgi-long, big ears,
// white coat with brown-orange patches. A very good girl.
export function drawSprout(x2, ax, ay, dir, phase) {
  const b = Math.sin(phase) > 0 ? 1 : 0;
  const white = '#f4efe2', spot = '#c8743f', spotD = '#a85a2f';
  x2.fillStyle = 'rgba(0,0,0,.22)'; x2.fillRect(ax - 5, ay - 1, 11, 2);
  px(x2, ax - 5, ay - 5, 11, 4, white);                                    // long, low body
  px(x2, ax - 3, ay - 5, 3, 2, spot); px(x2, ax + 2, ay - 4, 3, 2, spot);  // saddle patches
  px(x2, ax - 4, ay - 1, 2, 1 + b, white); px(x2, ax + 3, ay - 1, 2, 2 - b, white); // stubby legs
  const hx = dir === 'left' ? ax - 8 : ax + 4;
  px(x2, hx, ay - 9, 5, 5, white);                                         // head
  px(x2, hx + (dir === 'left' ? 0 : 2), ay - 9, 3, 2, spot);               // orange eye-patch
  px(x2, hx, ay - 11, 2, 2, spot); px(x2, hx + 3, ay - 11, 2, 2, spotD);   // the big ears
  x2.fillStyle = '#101014'; x2.fillRect(hx + (dir === 'left' ? 1 : 3), ay - 7, 1, 1); // eye
  px(x2, dir === 'left' ? ax + 5 : ax - 7, ay - 7 + b, 2, 2, white);       // fluffy tail nub
}

export function drawDog(x2, ax, ay, dir, phase, col = '#b98d5e', dark = '#8a6540') {
  const b = Math.sin(phase) > 0 ? 1 : 0;
  x2.fillStyle = 'rgba(0,0,0,.22)'; x2.fillRect(ax - 4, ay - 1, 9, 2);
  px(x2, ax - 4, ay - 6, 9, 4, col);
  px(x2, ax - 4, ay - 2, 2, 2, dark); px(x2, ax + 3, ay - 2, 2, 2, dark);
  const hx = dir === 'left' ? ax - 7 : ax + 5;
  px(x2, hx, ay - 9, 4, 4, col); px(x2, hx + (dir === 'left' ? 0 : 2), ay - 10, 2, 2, dark);
  px(x2, dir === 'left' ? ax + 4 : ax - 6, ay - 8 + b, 2, 3, col);
}

export function drawZombie(x2, ax, ay, dir, phase, rise, hit) {
  const sw = Math.sin(phase);
  if (rise < 1) { // clawing out of the ground
    const h = (rise * 14) | 0;
    x2.fillStyle = 'rgba(60,40,25,.6)'; x2.fillRect(ax - 6, ay - 2, 12, 4);
    x2.save(); x2.beginPath(); x2.rect(ax - 8, ay - h, 16, h); x2.clip();
    x2.translate(0, 14 - h);
    drawZombieBody(x2, ax, ay, dir, 0, hit); x2.restore();
    return;
  }
  x2.fillStyle = 'rgba(0,0,0,.25)'; x2.fillRect(ax - 4, ay - 2, 8, 3);
  drawZombieBody(x2, ax, ay, dir, sw, hit);
}
function drawZombieBody(x2, ax, ay, dir, sw, hit) {
  const skin = hit ? '#ffffff' : '#7da05f', shirt = hit ? '#ffffff' : '#6b6f5e', pants = hit ? '#ffffff' : '#463f38';
  const l1 = sw > 0 ? 4 : 3, l2 = sw > 0 ? 3 : 4;
  px(x2, ax - 3, ay - 5, 3, l1, pants); px(x2, ax, ay - 5, 3, l2, pants);
  px(x2, ax - 4, ay - 11, 8, 6, shirt); px(x2, ax - 2, ay - 9, 2, 2, hit ? '#fff' : '#4a4d40');
  const off = dir === 'left' ? -6 : dir === 'right' ? 6 : 0;
  px(x2, ax - 4 + off, ay - 10, 3, 2, skin); px(x2, ax + 1 + off, ay - 9, 3, 2, skin);
  px(x2, ax - 3, ay - 17, 6, 6, skin);
  px(x2, ax - 3, ay - 17, 6, 2, hit ? '#fff' : '#3d4a33');
  x2.fillStyle = hit ? '#fff' : '#8a1f1f';
  if (dir !== 'up') { x2.fillRect(ax - 2, ay - 14, 2, 2); x2.fillRect(ax + 1, ay - 14, 2, 2); }
}

export function drawVampire(x2, ax, ay, dir, phase, rise, hit) {
  x2.globalAlpha = Math.min(1, rise * 2);
  const bob = Math.sin(phase) * 2;                       // hovers
  const skin = hit ? '#fff' : '#d9cbd0', cloak = hit ? '#fff' : '#2a2230', red = hit ? '#fff' : '#c0303a';
  x2.fillStyle = 'rgba(0,0,0,.2)'; x2.fillRect(ax - 4, ay - 1, 8, 2);
  px(x2, ax - 6, ay - 12 + bob, 2, 9, cloak); px(x2, ax + 4, ay - 12 + bob, 2, 9, cloak); // cape wings
  px(x2, ax - 5, ay - 14 + bob, 10, 14, cloak);          // body
  px(x2, ax - 5, ay - 15 + bob, 3, 3, red); px(x2, ax + 2, ay - 15 + bob, 3, 3, red);    // collar
  px(x2, ax - 3, ay - 20 + bob, 6, 6, skin);             // head
  px(x2, ax - 3, ay - 20 + bob, 6, 2, '#161018'); px(x2, ax - 1, ay - 18 + bob, 2, 1, '#161018'); // widow's peak
  x2.fillStyle = red; x2.fillRect(ax - 2, ay - 17 + bob, 1, 1); x2.fillRect(ax + 1, ay - 17 + bob, 1, 1); // eyes
  x2.fillStyle = '#fff'; x2.fillRect(ax - 1, ay - 14 + bob, 1, 1); x2.fillRect(ax + 1, ay - 14 + bob, 1, 1); // fangs
  x2.globalAlpha = 1;
}

export function drawWerewolf(x2, ax, ay, dir, phase, rise, hit) {
  x2.globalAlpha = Math.min(1, rise * 2);
  const sw = Math.sin(phase);
  const fur = hit ? '#fff' : '#5b4a3a', furD = hit ? '#fff' : '#43362a';
  x2.fillStyle = 'rgba(0,0,0,.28)'; x2.fillRect(ax - 6, ay - 2, 13, 3);
  px(x2, ax - 4, ay - 6, 3, 6, furD); px(x2, ax + 1, ay - 6, 3, 6, furD);   // legs
  px(x2, ax - 6, ay - 15, 12, 10, fur); px(x2, ax - 6, ay - 15, 12, 2, furD); // hunched body
  px(x2, ax - 8, ay - 13 + (sw > 0 ? 1 : 0), 3, 7, fur); px(x2, ax + 5, ay - 13 + (sw < 0 ? 1 : 0), 3, 7, fur); // arms
  px(x2, ax - 8, ay - 7, 3, 2, '#e8e8e8'); px(x2, ax + 5, ay - 7, 3, 2, '#e8e8e8'); // claws
  px(x2, ax - 3, ay - 21, 6, 6, fur);                    // head
  px(x2, ax - 3, ay - 23, 2, 3, fur); px(x2, ax + 1, ay - 23, 2, 3, fur);   // ears
  px(x2, dir === 'left' ? ax - 5 : ax + 3, ay - 19, 3, 3, furD);            // snout
  x2.fillStyle = hit ? '#fff' : '#e5c04b'; x2.fillRect(ax - 2, ay - 19, 1, 1); x2.fillRect(ax + 1, ay - 19, 1, 1); // eyes
  x2.globalAlpha = 1;
}

export function drawAlien(x2, ax, ay, dir, phase, rise, hit) {
  x2.globalAlpha = Math.min(1, rise * 2);
  const bob = Math.sin(phase * 1.3) * 2;
  const body = hit ? '#fff' : '#6fae5a', bodyD = hit ? '#fff' : '#517f42';
  x2.fillStyle = 'rgba(120,230,120,.14)'; x2.beginPath(); x2.arc(ax, ay - 9 + bob, 10, 0, 7); x2.fill(); // glow
  x2.fillStyle = 'rgba(0,0,0,.2)'; x2.fillRect(ax - 3, ay - 1, 6, 2);
  px(x2, ax - 2, ay - 9 + bob, 4, 8, body);              // skinny body
  px(x2, ax - 4, ay - 8 + bob, 2, 5, body); px(x2, ax + 2, ay - 8 + bob, 2, 5, body); // arms
  px(x2, ax - 4, ay - 16 + bob, 8, 7, body); px(x2, ax - 4, ay - 16 + bob, 8, 2, bodyD); // big head
  x2.fillStyle = hit ? '#fff' : '#101018';
  x2.fillRect(ax - 3, ay - 14 + bob, 2, 3); x2.fillRect(ax + 1, ay - 14 + bob, 2, 3); // almond eyes
  x2.globalAlpha = 1;
}

// THE SEXTON — hulking boss gravedigger, ~2x scale, shovel raised on windup
export function drawMcGovern(x2, ax, ay, dir, phase, rise, hit, winding) {
  const sw = Math.sin(phase * 0.6);
  const skin = hit ? '#fff' : '#7da05f', overalls = hit ? '#fff' : '#3b4a6b',
    shirt = hit ? '#fff' : '#5a4a3a', hat = hit ? '#fff' : '#43362a';
  const body = () => {
    px(x2, ax - 6, ay - 8, 5, 8, overalls); px(x2, ax + 2, ay - 8, 5, 8, overalls);          // legs
    px(x2, ax - 8, ay - 20, 16, 12, overalls); px(x2, ax - 8, ay - 20, 16, 3, shirt);        // torso
    px(x2, ax - 6, ay - 20, 2, 6, shirt); px(x2, ax + 4, ay - 20, 2, 6, shirt);              // straps
    px(x2, ax - 11, ay - 19 + (sw > 0 ? 1 : 0), 3, 10, skin);                                // left arm
    px(x2, ax - 5, ay - 28, 10, 8, skin);                                                    // head
    x2.fillStyle = hit ? '#fff' : '#8a1f1f';
    x2.fillRect(ax - 3, ay - 25, 2, 2); x2.fillRect(ax + 1, ay - 25, 2, 2);                  // eyes
    px(x2, ax - 7, ay - 30, 14, 2, hat); px(x2, ax - 4, ay - 33, 8, 4, hat);                 // wide-brim hat
    if (winding > 0) {                                                                        // shovel raised!
      px(x2, ax + 6, ay - 22 + (sw > 0 ? 1 : 0), 3, 4, skin);
      px(x2, ax + 7, ay - 38, 2, 16, '#7a5230'); px(x2, ax + 5, ay - 43, 6, 6, '#8a8f95');
    } else {                                                                                  // at his side
      px(x2, ax + 8, ay - 19 + (sw > 0 ? 0 : 1), 3, 8, skin);
      px(x2, ax + 9, ay - 24, 2, 18, '#7a5230'); px(x2, ax + 7, ay - 8, 6, 6, '#8a8f95');
    }
  };
  if (rise < 1) {                                                                             // clawing out, big
    const h = (rise * 30) | 0;
    x2.fillStyle = 'rgba(60,40,25,.6)'; x2.fillRect(ax - 10, ay - 3, 20, 6);
    x2.save(); x2.beginPath(); x2.rect(ax - 16, ay - h, 32, h); x2.clip();
    x2.translate(0, 30 - h); body(); x2.restore();
    return;
  }
  x2.fillStyle = 'rgba(0,0,0,.3)'; x2.fillRect(ax - 8, ay - 2, 16, 4);
  body();
}

export function drawGhostE(x2, ax, ay, t, alpha, hit) {
  x2.globalAlpha = alpha;
  const bob = Math.sin(t * 3 + ax) * 2;
  const col = hit ? '#ffffff' : '#dfe8ee';
  px(x2, ax - 4, ay - 14 + bob, 8, 10, col);
  px(x2, ax - 5, ay - 11 + bob, 10, 7, col);
  for (let i = 0; i < 3; i++) px(x2, ax - 5 + i * 4, ay - 4 + bob + (i % 2), 2, 2, col);
  x2.fillStyle = hit ? '#fff' : '#c94f43';
  x2.fillRect(ax - 3, ay - 11 + bob, 2, 2); x2.fillRect(ax + 1, ay - 11 + bob, 2, 2);
  x2.globalAlpha = 1;
}

export function drawDancer(x2, ax, ay, f, pal) {
  x2.fillStyle = 'rgba(0,0,0,.25)'; x2.fillRect(ax - 4, ay - 2, 8, 3);
  const hop = f === 3 ? -2 : 0;
  ay += hop;
  if (f === 2) { px(x2, ax - 4, ay - 5, 3, 4, pal.pants); px(x2, ax + 1, ay - 5, 3, 4, pal.pants); }
  else { px(x2, ax - 3, ay - 5, 3, 4, pal.pants); px(x2, ax, ay - 5, 3, 4, pal.pants); }
  px(x2, ax - 4, ay - 11, 8, 6, pal.shirt);
  if (f === 0) { px(x2, ax - 6, ay - 11, 2, 5, pal.skin); px(x2, ax + 4, ay - 11, 2, 5, pal.skin); }
  else if (f === 1 || f === 3) { px(x2, ax - 5, ay - 16, 2, 6, pal.skin); px(x2, ax + 3, ay - 16, 2, 6, pal.skin); }
  else { px(x2, ax - 8, ay - 10, 4, 2, pal.skin); px(x2, ax + 4, ay - 10, 4, 2, pal.skin); }
  px(x2, ax - 3, ay - 17, 6, 6, pal.skin); px(x2, ax - 3, ay - 17, 6, 2, pal.hair);
  x2.fillStyle = PAL.ink; x2.fillRect(ax - 2, ay - 14, 1, 1); x2.fillRect(ax + 1, ay - 14, 1, 1);
}

export function drawYogi(x2, ax, ay, pose, pal, mat) {
  px(x2, ax - 7, ay - 3, 14, 5, mat); px(x2, ax - 7, ay - 3, 14, 1, '#00000022');
  if (pose === 0) { // mountain, arms up
    px(x2, ax - 2, ay - 5, 2, 4, pal.pants); px(x2, ax, ay - 5, 2, 4, pal.pants);
    px(x2, ax - 3, ay - 11, 6, 6, pal.shirt);
    px(x2, ax - 4, ay - 16, 2, 6, pal.skin); px(x2, ax + 2, ay - 16, 2, 6, pal.skin);
    px(x2, ax - 3, ay - 17, 6, 6, pal.skin); px(x2, ax - 3, ay - 17, 6, 2, pal.hair);
  } else if (pose === 1) { // warrior, arms wide
    px(x2, ax - 4, ay - 5, 3, 4, pal.pants); px(x2, ax + 1, ay - 5, 3, 4, pal.pants);
    px(x2, ax - 3, ay - 11, 6, 6, pal.shirt);
    px(x2, ax - 7, ay - 10, 3, 2, pal.skin); px(x2, ax + 4, ay - 10, 3, 2, pal.skin);
    px(x2, ax - 3, ay - 17, 6, 6, pal.skin); px(x2, ax - 3, ay - 17, 6, 2, pal.hair);
  } else { // child's pose
    px(x2, ax - 4, ay - 6, 8, 4, pal.shirt);
    px(x2, ax - 6, ay - 5, 3, 3, pal.skin); px(x2, ax - 6, ay - 5, 3, 1, pal.hair);
    px(x2, ax + 3, ay - 4, 3, 2, pal.pants);
  }
}
