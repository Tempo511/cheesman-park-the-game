// ============================================================================
// render.js — draws game state to the canvases. Read-only w.r.t. state.
//
// Co-op design note: because render() only READS state, every client can draw
// the same authoritative world independently (each with its own camera on its
// own player). Nothing here feeds back into the simulation.
// ============================================================================
import { T, MW, MH, GH, G, PAL, ZONES, GARDEN, SHOP_POS, ENEMY_TYPES } from './constants.js';
import { gi, getG } from './tiles.js';
import { ambientActive } from './simulate.js';
import {
  mkCanvas, px, drawPerson, drawPlayerChar, drawDog, drawSprout, drawSquirrel, drawZombie, drawGhostE, drawVampire, drawWerewolf, drawAlien, drawMcGovern, drawDancer, drawYogi,
} from './sprites.js';

let cv, ctx, fxCv, fctx, miniCv, mctx, SPR;
let groundCv, gardenCv, miniBase;
let SCALE = 3, VW = 0, VH = 0, CAMX = 0, CAMY = 0;
let fxW = 0, fxH = 0;

export function initRender(refs, spr) {
  ({ cv, ctx, fxCv, fctx, miniCv, mctx } = refs);
  SPR = spr;
  groundCv = mkCanvas(MW * T, MH * T);
  gardenCv = mkCanvas(MW * T, GH * T);
  miniBase = mkCanvas(72, 92);
}

export function resize() {
  const w = innerWidth, h = innerHeight;
  SCALE = Math.max(2, Math.round(Math.min(w, h) / 190));
  VW = Math.ceil(w / SCALE); VH = Math.ceil(h / SCALE);
  cv.width = VW; cv.height = VH;
  // display size is driven by CSS (100% of the fixed, edge-to-edge viewport) so
  // it always fills the screen — even if innerHeight is momentarily stale under
  // viewport-fit=cover (which otherwise leaves a dark bar at the bottom).
  cv.style.width = '100%'; cv.style.height = '100%';
  ctx.imageSmoothingEnabled = false;
}

export function resizeFx() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  fxW = innerWidth; fxH = innerHeight;
  fxCv.width = fxW * dpr; fxCv.height = fxH * dpr;
  fxCv.style.width = '100%'; fxCv.style.height = '100%';
  fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// pre-render the static ground once to an offscreen canvas
// shared tile painter — used by both the park and the garden pre-renders
function paintTiles(g, groundArr, rows) {
  const state = { ground: groundArr };   // getG only reads .ground
  const isG = (x, y, t) => getG(state, x, y) === t;
  const ground = groundArr;
  for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < MW; tx++) {
    const v = ground[gi(tx, ty)], X = tx * T, Y = ty * T;
    switch (v) {
      case G.GRASS: px(g, X, Y, T, T, PAL.grass);
        if ((tx * 7 + ty * 13) % 5 === 0) px(g, X + ((tx * 5) % 12), Y + ((ty * 7) % 12), 2, 2, PAL.grass2); break;
      case G.GRASS2: px(g, X, Y, T, T, PAL.grass2);
        if ((tx * 3 + ty * 11) % 6 === 0) px(g, X + ((tx * 9) % 12), Y + ((ty * 3) % 12), 2, 2, PAL.grass); break;
      case G.DRY: px(g, X, Y, T, T, PAL.dry); px(g, X + 3, Y + 5, 2, 2, PAL.dryDot); px(g, X + 9, Y + 10, 2, 2, PAL.dryDot); break;
      case G.PATH: px(g, X, Y, T, T, PAL.path);
        if ((tx + ty) % 2) px(g, X + ((tx * 11) % 12), Y + ((ty * 5) % 12), 2, 2, PAL.pathDot);
        if (getG(state, tx, ty - 1) !== G.PATH && !isG(tx, ty - 1, G.MARBLE)) px(g, X, Y, T, 2, PAL.pathEdge);
        if (getG(state, tx, ty + 1) !== G.PATH) px(g, X, Y + T - 2, T, 2, PAL.pathEdge);
        if (getG(state, tx - 1, ty) !== G.PATH) px(g, X, Y, 2, T, PAL.pathEdge);
        if (getG(state, tx + 1, ty) !== G.PATH) px(g, X + T - 2, Y, 2, T, PAL.pathEdge); break;
      case G.PAVE: { px(g, X, Y, T, T, PAL.pave);
        if ((tx * 3 + ty * 7) % 4 === 0) px(g, X + ((tx * 9) % 12), Y + ((ty * 5) % 12), 2, 1, PAL.paveDot);
        const hard = (v2) => v2 !== G.PAVE && v2 !== G.PATH && v2 !== G.EDGE && v2 !== G.MARBLE && v2 !== G.WALK;
        if (hard(getG(state, tx, ty - 1))) px(g, X, Y, T, 1, PAL.paveEdge);
        if (hard(getG(state, tx, ty + 1))) px(g, X, Y + T - 1, T, 1, PAL.paveEdge);
        if (hard(getG(state, tx - 1, ty))) px(g, X, Y, 1, T, PAL.paveEdge);
        if (hard(getG(state, tx + 1, ty))) px(g, X + T - 1, Y, 1, T, PAL.paveEdge); } break;
      case G.ROAD: px(g, X, Y, T, T, PAL.road);
        if ((tx * 13 + ty * 7) % 9 === 0) px(g, X + 4, Y + 8, 3, 2, PAL.roadDark); break;
      case G.WALK: px(g, X, Y, T, T, PAL.walk);
        px(g, X, Y, T, 1, PAL.walkLine); px(g, X, Y, 1, T, PAL.walkLine); break;
      case G.WATER: px(g, X, Y, T, T, PAL.water); break;
      case G.MARBLE: px(g, X, Y, T, T, PAL.marble);
        px(g, X, Y + T - 1, T, 1, PAL.marbleLine); px(g, X + T - 1, Y, 1, T, PAL.marbleLine);
        if ((tx + ty) % 2) px(g, X + 5, Y + 5, 2, 2, PAL.marbleShade); break;
      case G.SAND: px(g, X, Y, T, T, PAL.sand); px(g, X + ((tx * 7) % 12), Y + ((ty * 9) % 12), 2, 2, PAL.sandDot); break;
      case G.BED: px(g, X, Y, T, T, PAL.bed); px(g, X + 3, Y + 4, 2, 2, PAL.bedDot); px(g, X + 10, Y + 9, 2, 2, PAL.bedDot);
        { const cols = ['#c94f43', '#e5c04b', '#d98aa6', '#8e6fb8'];
          for (let i = 0; i < 5; i++) { const cx = X + 2 + ((tx * 31 + i * 53) % (T - 5)), cy = Y + 2 + ((ty * 17 + i * 29) % (T - 5));
            px(g, cx, cy, 2, 2, cols[(tx + ty + i) % 4]); px(g, cx, cy + 2, 1, 2, PAL.gardenDark); } } break;
      case G.GARDEN: px(g, X, Y, T, T, PAL.garden);
        if ((tx * 5 + ty * 3) % 3 === 0) px(g, X + ((tx * 7) % 12), Y + ((ty * 11) % 12), 3, 2, PAL.gardenDark); break;
      case G.EDGE: px(g, X, Y, T, T, '#b8b2a0'); px(g, X, Y, T, 2, '#cdc7b5'); px(g, X, Y + T - 2, T, 2, '#9a947f'); break;
    }
  }
}

export function renderGround(state) {
  const { cars } = state;
  const g = groundCv.getContext('2d');
  paintTiles(g, state.ground, MH);
  for (let x = 4; x < MW * T - 4; x += 24) { px(g, x, 1 * T + 7, 12, 2, PAL.dash); px(g, x, (MH - 2) * T + 7, 12, 2, PAL.dash); }
  for (let y = 4; y < MH * T - 4; y += 24) { px(g, 1 * T + 7, y, 2, 12, PAL.dash); }
  for (let y = 34 * T + 4; y < MH * T - 4; y += 24) { px(g, (MW - 2) * T + 7, y, 2, 12, PAL.dash); }
  for (let i = 0; i < 4; i++) px(g, 2 + i * 11, 45 * T + 2, 8, 28, PAL.dash);
  const carCols = ['#7a8ba0', '#a05a4c', '#c9c3b2', '#4c6b57', '#5a5a80'];
  cars.forEach((c, i) => {
    const col = carCols[i % carCols.length], X = c.x * T, Y = c.y * T;
    if (c.v) { px(g, X + 2, Y - 6, 12, 26, col); px(g, X + 3, Y - 2, 10, 6, '#cfe3ea'); px(g, X + 3, Y + 12, 10, 5, '#cfe3ea');
      px(g, X + 1, Y - 3, 2, 5, '#222'); px(g, X + 13, Y - 3, 2, 5, '#222'); px(g, X + 1, Y + 11, 2, 5, '#222'); px(g, X + 13, Y + 11, 2, 5, '#222'); }
    else { px(g, X - 6, Y + 2, 26, 12, col); px(g, X - 2, Y + 3, 6, 10, '#cfe3ea'); px(g, X + 10, Y + 3, 5, 10, '#cfe3ea');
      px(g, X - 3, Y + 1, 5, 2, '#222'); px(g, X + 11, Y + 1, 5, 2, '#222'); px(g, X - 3, Y + 13, 5, 2, '#222'); px(g, X + 11, Y + 13, 5, 2, '#222'); }
  });
  g.fillStyle = '#cfc9b6'; g.font = 'bold 9px ui-monospace,monospace'; g.textBaseline = 'middle';
  g.fillText('E  1 3 T H   A V E', 26 * T, 1.5 * T);
  g.fillText('E  8 T H   A V E', 26 * T, (MH - 1.5) * T);
  g.save(); g.translate(1.5 * T, 60 * T); g.rotate(-Math.PI / 2);
  g.fillText('H U M B O L D T   S T', 0, 0); g.restore();
  g.save(); g.translate((MW - 1.5) * T, 72 * T); g.rotate(-Math.PI / 2);
  g.fillText('F R A N K L I N   S T', 0, 0); g.restore();
  g.fillStyle = 'rgba(20,40,20,.55)'; g.font = 'bold 8px ui-monospace,monospace';
  g.fillText('DENVER BOTANIC GARDENS', 64.3 * T, 25 * T);
}

export function renderGardenGround(state) {
  const g = gardenCv.getContext('2d');
  paintTiles(g, state.gardenGround, GH);
  for (let y = 4; y < GH * T - 4; y += 24) px(g, 69 * T + 7, y, 2, 12, PAL.dash);   // York St dashes
  g.fillStyle = '#cfc9b6'; g.font = 'bold 9px ui-monospace,monospace'; g.textBaseline = 'middle';
  g.fillText('1 1 T H   A V E', 26 * T, 1 * T);
  g.save(); g.translate(69.5 * T, 34 * T); g.rotate(-Math.PI / 2); g.fillText('Y O R K   S T', 0, 0); g.restore();
  // waterlilies on the Monet Pool (that's why it's named that) — deterministic
  // pad placement from tile coords, pink blooms on some
  for (let ty = 6; ty < 22; ty++) for (let tx = 5; tx < 28; tx++) {
    if (state.gardenGround[gi(tx, ty)] !== G.WATER) continue;
    const h = (tx * 37 + ty * 61) % 17;
    if (h < 5) {
      const X = tx * T + (h * 3) % 9, Y = ty * T + (h * 5) % 9;
      px(g, X, Y + 1, 5, 3, '#5f9a4e'); px(g, X + 1, Y, 3, 5, '#5f9a4e');   // pad
      px(g, X + 3, Y + 3, 2, 2, PAL.water);                                  // the notch
      if (h === 2 || h === 4) { px(g, X + 1, Y + 1, 2, 2, '#d98aa6'); px(g, X + 1, Y + 1, 1, 1, '#f2d7e0'); } // bloom
    }
  }
  g.fillStyle = 'rgba(20,40,20,.6)'; g.font = 'bold 8px ui-monospace,monospace';
  g.fillText('MONET POOL', 11 * T, 22.6 * T);
  g.fillText('SHOFU-EN', 20 * T, 2.6 * T);
  g.fillText('EL POMAR WATERWAY', 42 * T, 43.8 * T);
  g.fillText('SCIENCE PYRAMID', 28 * T, 46 * T);
  g.fillText('AMPHITHEATER', 45.5 * T, 19 * T);
  g.fillText('WARING HOUSE', 57.5 * T, 58.6 * T);
  g.fillText('CHIHULY', 61.8 * T, 47.4 * T);
  g.fillText('CHEESMAN GATE', 1.4 * T, 25.4 * T);
  g.fillStyle = 'rgba(20,40,20,.5)';
  g.fillText('DENVER BOTANIC GARDENS · EST. 1951', 20 * T, 4.4 * T);
}

export function buildMini() {
  const m = miniBase.getContext('2d');
  m.imageSmoothingEnabled = true;
  m.drawImage(groundCv, 0, 0, MW * T, MH * T, 0, 0, 72, 92);
}

// Target darkness for the current phase. At night it's full-strength from the
// first frame (the pre-dusk ramp below already darkened us to match — the old
// fade-in term here caused a one-second daylight flash at nightfall), easing
// out over the final second before dawn.
function nightTarget(state) {
  if (state.phase === 'night') return Math.min(0.5, state.phaseT * 0.5);
  return Math.min(0.5, Math.max(0, (3 - state.phaseT) * 0.2)); // pre-dusk ramp
}
// Render-side smoothing so abrupt phase changes (early dawn when the last
// enemy dies, console jumps) ease instead of snapping. Cosmetic only.
let NA = 0, naLastT = 0;
function nightAlpha(state, t) {
  const dt = Math.min(0.1, Math.max(0, t - naLastT)); naLastT = t;
  const target = nightTarget(state);
  NA += (target - NA) * Math.min(1, dt * 4);
  if (Math.abs(target - NA) < 0.004) NA = target;
  return NA;
}

export function render(state, t) {
  const player = state.player;
  const inGarden = state.scene === 'garden';
  const worldH = (inGarden ? GH : MH) * T;
  let camX = Math.max(0, Math.min(MW * T - VW, player.x - VW / 2)) | 0;
  let camY = Math.max(0, Math.min(Math.max(0, worldH - VH), player.y - VH / 2)) | 0;
  if (player.boulderT > 0) {               // Bolder Boulder: the ground rumbles
    camX += Math.round(Math.sin(t * 43) * 1.5);
    camY += Math.round(Math.cos(t * 37) * 1.5);
  }
  CAMX = camX; CAMY = camY;
  ctx.fillStyle = '#151a12'; ctx.fillRect(0, 0, VW, VH);   // letterbox if world shorter than view
  ctx.drawImage(inGarden ? gardenCv : groundCv, camX, camY, VW, VH, 0, 0, VW, VH);
  // water shimmer + jets (park scene only — these are park coordinates)
  if (!inGarden) {
  ctx.fillStyle = PAL.waterHi;
  for (let i = 0; i < 26; i++) {
    const wx = (30 * T + ((i * 97 + ((t * 20) | 0)) % (15 * T))) | 0, wy = (43 * T + ((i * 61) % (7 * T))) | 0;
    if (wx > camX - 2 && wx < camX + VW && wy > camY - 2 && wy < camY + VH) ctx.fillRect(wx - camX, wy - camY, 3, 1);
  }
  for (const j of [[33, 46], [37, 46], [41, 46]]) {
    const jx = j[0] * T + 8 - camX, jy = j[1] * T + 8 - camY;
    for (let k = 0; k < 5; k++) {
      const h = 6 + Math.sin(t * 6 + k) * 3;
      ctx.fillStyle = k % 2 ? '#dff0f8' : PAL.waterHi;
      ctx.fillRect(jx - 2 + k, (jy - h) | 0, 1, h | 0);
    }
  }
  }
  // pickups (ground layer)
  for (const p of state.pickups) {
    const ax = (p.x | 0) - camX, ay = ((p.y + Math.sin(p.bob) * 2) | 0) - camY;
    if (p.t === 'coin') { px(ctx, ax - 2, ay - 4, 5, 5, '#e5c04b'); px(ctx, ax - 1, ay - 3, 1, 3, '#fff3c4'); px(ctx, ax - 2, ay, 5, 1, '#b8952f'); }
    else { ctx.fillStyle = '#4c9a3f'; ctx.beginPath(); ctx.ellipse(ax, ay - 2, 3, 5, 0.5, 0, 7); ctx.fill();
      px(ctx, ax, ay - 8, 2, 3, '#2c5a28'); }
  }
  // garden flowers (bobbing, colored) — the whole point of the trip
  for (const f of state.flowers) {
    if (f.got) continue;
    const ax = (f.x | 0) - camX, ay = ((f.y + Math.sin(f.bob) * 1.5) | 0) - camY;
    px(ctx, ax, ay - 2, 1, 4, '#2c5a28');                          // stem
    px(ctx, ax - 1, ay - 5, 3, 3, f.c);                            // bloom
    px(ctx, ax, ay - 4, 1, 1, '#fff7e4');                          // center
  }
  // acorns on the ground (daytime)
  for (const a of state.acorns) {
    const ax = (a.x | 0) - camX, ay = ((a.y + Math.sin(a.bob)) | 0) - camY;
    px(ctx, ax - 2, ay - 2, 4, 3, '#9c6b3f'); px(ctx, ax - 2, ay - 3, 4, 1, '#5f4327'); px(ctx, ax, ay - 4, 1, 1, '#5f4327');
  }
  // depth-sorted entities
  const ents = [];
  for (const o of state.objects) ents.push({ y: o.y * T, draw: () => {
    const spr = SPR[o.type]; if (!spr) return;
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    if (o.type === 'tree' || o.type === 'pine') ctx.fillRect(o.x * T - 9 - camX, o.y * T - 2 - camY, 18, 4);
    ctx.drawImage(spr.c, ((o.x * T - spr.ax) - camX) | 0, ((o.y * T - spr.ay) - camY) | 0);
    if (o.type === 'cart' && state.phase === 'day' && Math.hypot(player.x - SHOP_POS.x, player.y - SHOP_POS.y) < 70) {
      ctx.fillStyle = '#e5c04b'; ctx.font = '7px ui-monospace,monospace';
      ctx.fillText('SHOP', o.x * T - 9 - camX, o.y * T - 34 - camY);
    }
  } });
  ents.push({ y: player.y, draw: () => {
    const flash = player.flashT > 0 && ((t * 20) | 0) % 2 === 0;
    const ax = (player.x | 0) - camX, ay = (player.y | 0) - camY;
    // speed afterimages: dash/roll uses the dash vector; sprint/boulder trail the facing
    let tvx = 0, tvy = 0;
    if (player.dashT > 0) { tvx = player.dashVX; tvy = player.dashVY; }
    else if ((player.boulderT > 0 || player.ghostT > 0) && player.moving) { tvx = player.fx * 200; tvy = player.fy * 200; }
    if (tvx || tvy) {
      const dl = Math.hypot(tvx, tvy) || 1;
      const kMax = player.boulderT > 0 ? 5 : 3;       // boulder leaves a longer wake
      for (let k = kMax; k >= 1; k--) {
        ctx.globalAlpha = 0.35 / kMax * (kMax + 1 - k);
        drawPlayerChar(ctx, ax - (tvx / dl) * k * 5, ay - (tvy / dl) * k * 5, player.dir, player.phase, player.archetype, player.style, false);
      }
      ctx.globalAlpha = 1;
    }
    // Overclock aura (cyan) + Second Wind shield (green)
    if (player.boulderT > 0) {
      // rumbling orange double-aura, nothing like Sprint's cool blue
      ctx.strokeStyle = 'rgba(224,122,63,' + (0.5 + Math.sin(t * 16) * 0.25) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ax, ay - 8, 13 + Math.sin(t * 10) * 2, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(229,192,75,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ax, ay - 8, 17 + Math.sin(t * 7) * 2, 0, 7); ctx.stroke();
    } else if (player.hasteT > 0) {
      ctx.strokeStyle = 'rgba(127,208,255,' + (0.4 + Math.sin(t * 14) * 0.2) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ax, ay - 8, 12, 0, 7); ctx.stroke();
    }
    if (player.shieldT > 0) {
      ctx.strokeStyle = 'rgba(124,201,90,' + (0.45 + Math.sin(t * 10) * 0.2) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ax, ay - 8, 14, 0, 7); ctx.stroke();
    }
    if (player.ghostT > 0) ctx.globalAlpha = 0.65;   // sprint: phasing, semi-transparent
    drawPlayerChar(ctx, ax, ay, player.dir, player.moving ? player.phase : 0, player.archetype, player.style, flash);
    ctx.globalAlpha = 1;
  } });
  if (!inGarden && state.phase === 'day') for (const n of state.npcs) ents.push({ y: n.y, draw: () => {
    drawPerson(ctx, (n.x | 0) - camX, (n.y | 0) - camY, n.dir, n.phase, n.pal, false);
    if (n.dog) drawDog(ctx, (n.x | 0) - camX + (n.dir === 'left' ? 12 : -12), (n.y | 0) - camY, n.dir === 'left' ? 'left' : 'right', n.phase);
  } });
  if (!inGarden && state.phase === 'day') for (const s of state.squirrels) ents.push({ y: s.y, draw: () => {
    drawSquirrel(ctx, (s.x | 0) - camX, (s.y | 0) - camY, s.dir, s.moving ? s.phase : 0);
  } });
  if (!inGarden) for (const a of state.ambients) {
    if (!ambientActive(state, a)) continue;
    if (a.kind === 'slack') ents.push({ y: 40.2 * T + 2, draw: () => {
      const ly = (40.2 * T - 12) | 0, fx = (a.x | 0) - camX;
      ctx.strokeStyle = '#e8e4d4'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(11 * T - camX, ly - camY);
      if (a.fall <= 0) { ctx.lineTo(fx, ly + 2 - camY); }
      ctx.lineTo(17 * T - camX, ly - camY); ctx.stroke();
      if (a.fall > 0) { drawPerson(ctx, fx, (40.2 * T + 8 | 0) - camY, 'down', 0, a.pal, true); }
      else { const jx = fx + ((Math.sin(a.wob * 3) * 1.4) | 0); drawPerson(ctx, jx, (ly + 4) - camY, 'down', 0, a.pal, false); }
    } });
    if (a.kind === 'vb') ents.push({ y: a.ny + 8, draw: () => {
      for (let i = 0; i < 4; i++) {
        const shuffle = (i === a.hitter) ? (Math.sin(t * 10) * 1.5) | 0 : 0;
        drawPerson(ctx, (a.px[i] | 0) - camX, (a.py[i] | 0) - camY + shuffle, i < 2 ? 'down' : 'up', a.pause > 0 ? 0 : t * 6 + i, a.pals[i], false);
      }
      if (a.pause <= 0) {
        const bx = a.px[a.src] + (a.px[a.hitter] - a.px[a.src]) * a.u;
        const by = a.py[a.src] - 10 + (a.py[a.hitter] - a.py[a.src]) * a.u - Math.sin(a.u * Math.PI) * 13;
        ctx.fillStyle = '#f5f2ea'; ctx.beginPath(); ctx.arc(bx - camX, by - camY, 2.2, 0, 7); ctx.fill();
        ctx.fillStyle = '#c9c3b2'; ctx.fillRect((bx | 0) - camX, (by | 0) - camY, 1, 1);
      }
    } });
    if (a.kind === 'yoga') ents.push({ y: a.y, draw: () => {
      a.yogis.forEach((yg, i) => { const pose = Math.floor(t / 3 + yg.off) % 3; drawYogi(ctx, (yg.x | 0) - camX, (yg.y | 0) - camY, pose, a.pals[i], a.mats[i]); });
    } });
    if (a.kind === 'ham') ents.push({ y: a.y + 4, draw: () => {
      const x0 = 55 * T - camX, x1 = 59 * T - camX, ry = (21.5 * T - 18) - camY;
      const sag = 8 + Math.sin(a.sway) * 1.5;
      ctx.strokeStyle = '#4a90c2'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0, ry); ctx.quadraticCurveTo((x0 + x1) / 2, ry + sag + 4, x1, ry); ctx.stroke();
      const mx = (x0 + x1) / 2, my = ry + sag / 2 + 2;
      px(ctx, mx - 6, my - 2, 12, 4, '#3a78a8');
      px(ctx, mx - 8, my - 3, 3, 3, '#d9a06f');
      px(ctx, mx + 6, my + 1 + ((Math.sin(a.sway * 2) * 1.5) | 0), 2, 3, '#d9a06f');
    } });
    if (a.kind === 'spotter') ents.push({ y: a.y, draw: () => { drawPerson(ctx, (a.x | 0) - camX, (a.y | 0) - camY, 'up', 0, a.pal, false); } });
    if (a.kind === 'dance') ents.push({ y: a.y, draw: () => {
      const f = Math.floor(a.beat * 2.2) % 4;
      a.crew.forEach((cc, i) => { const fi = (f + (i === 6 ? 2 : 0)) % 4; drawDancer(ctx, (cc[0] * T | 0) - camX, (cc[1] * T | 0) - camY, fi, a.pals[i]); });
      px(ctx, (57.6 * T | 0) - camX, (45.4 * T | 0) - camY, 6, 5, '#3a3a40');
      px(ctx, (57.6 * T + 1 | 0) - camX, (45.4 * T + 1 | 0) - camY, 1, 1, '#e5c04b');
      const nn = Math.floor(a.beat * 2.2) % 2;
      px(ctx, (58 * T | 0) - camX, (44.2 * T - nn * 2 | 0) - camY, 2, 2, '#f2ead6');
    } });
    if (a.kind === 'stoner') ents.push({ y: a.y, draw: () => {
      const ax = (a.x | 0) - camX, ay = (a.y | 0) - camY;
      drawPerson(ctx, ax, ay, 'down', 0, a.pal, true);
      px(ctx, ax - 3, ay - 14, 6, 2, '#1c1c1c');
      px(ctx, ax + 7, ay - 6, 5, 4, '#3a3a40'); px(ctx, ax + 8, ay - 5, 1, 1, '#e5c04b');
    } });
    if (a.kind === 'dogpark') {
      for (const o of a.owners) ents.push({ y: o.y, draw: () => { drawPerson(ctx, (o.x | 0) - camX, (o.y | 0) - camY, o.dir, 0, o.pal, false); } });
      for (const d of a.dogs) ents.push({ y: d.y, draw: () => {
        if (d.sprout) drawSprout(ctx, (d.x | 0) - camX, (d.y | 0) - camY, d.dir, d.phase);
        else drawDog(ctx, (d.x | 0) - camX, (d.y | 0) - camY, d.dir, d.phase, d.col, d.dark);
      } });
    }
  }
  for (const e of state.enemies) ents.push({ y: e.y, draw: () => {
    const ax = (e.x | 0) - camX, ay = (e.y | 0) - camY, hit = e.hitT > 0;
    if (e.kind === 'mcgovern') {
      if (e.winding > 0) {                            // slam telegraph: don't stand here
        const r = ENEMY_TYPES.mcgovern.slamR;
        ctx.strokeStyle = 'rgba(201,79,67,' + (0.35 + Math.sin(t * 20) * 0.2) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ax, ay - 8, r, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(201,79,67,.07)';
        ctx.beginPath(); ctx.arc(ax, ay - 8, r, 0, 7); ctx.fill();
      }
      drawMcGovern(ctx, ax, ay, e.dir, e.phase, e.rise, hit, e.winding);
    }
    else if (e.kind === 'zombie') drawZombie(ctx, ax, ay, e.dir, e.phase, e.rise, hit);
    else if (e.kind === 'ghost') drawGhostE(ctx, ax, ay, t, Math.min(0.85, e.rise * 2), hit);
    else if (e.kind === 'vampire') drawVampire(ctx, ax, ay, e.dir, e.phase, e.rise, hit);
    else if (e.kind === 'werewolf') drawWerewolf(ctx, ax, ay, e.dir, e.phase, e.rise, hit);
    else if (e.kind === 'alien') drawAlien(ctx, ax, ay, e.dir, e.phase, e.rise, hit);
    if (e.hp < e.maxHp && e.rise >= 1) {
      px(ctx, ax - 6, ay - 22, 12, 2, '#141a10');
      px(ctx, ax - 6, ay - 22, Math.max(1, 12 * e.hp / e.maxHp) | 0, 2, '#c94f43');
    }
  } });
  ents.sort((p, q) => p.y - q.y);
  for (const e of ents) e.draw();
  // projectiles — each weapon has its own look
  for (const p of state.projectiles) {
    const ax = (p.x | 0) - camX, ay = (p.y | 0) - camY;
    const spd = Math.hypot(p.vx, p.vy) || 1;
    if (p.style === 'disc') {
      // spinning frisbee with a faint trailing ghost + rim highlight
      ctx.globalAlpha = 0.3;
      ctx.save(); ctx.translate(ax - p.vx / spd * 6, ay - p.vy / spd * 6); ctx.rotate(p.spin - 0.6);
      ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, 7); ctx.fill(); ctx.restore();
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(p.spin);
      ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff3c4'; ctx.fillRect(-p.size + 1, -1, p.size * 2 - 2, 1); ctx.restore();
    } else if (p.style === 'ball') {
      // bright tennis ball with a speed streak + curved seam
      ctx.strokeStyle = 'rgba(183,227,75,.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax - p.vx / spd * 7, ay - p.vy / spd * 7); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.fillStyle = '#c8f04b'; ctx.beginPath(); ctx.arc(ax, ay, p.size * 0.9, 0, 7); ctx.fill();
      ctx.strokeStyle = '#eef8c8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ax - 1, ay - 1, p.size * 1.1, 0.5, 2.3); ctx.stroke();
    } else if (p.style === 'pepper') {
      // tumbling roasted-green chile
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(p.spin * 0.6);
      ctx.fillStyle = '#4c9a3f'; ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.5, 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#63b34a'; ctx.beginPath(); ctx.ellipse(-1, -1, p.size * 0.7, p.size * 0.3, 0.5, 0, 7); ctx.fill();
      px(ctx, -1, -p.size, 2, 3, '#2c5a28'); ctx.restore();
    } else {
      ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(ax, ay, p.size * 0.7, 0, 7); ctx.fill();
    }
  }
  // melee swings — each weapon animates differently
  for (const sw of state.swings) {
    const sx = sw.x - camX, sy = sw.y - camY, prog = 1 - sw.t / 0.12;
    if (sw.style === 'whip') {
      // dog-leash whip crack: a curving lash that snaps outward, clip on the end
      const len = sw.range * (0.55 + 0.5 * prog);
      const ex = sx + Math.cos(sw.ang) * len, ey = sy + Math.sin(sw.ang) * len;
      const perp = sw.ang + Math.PI / 2, bend = Math.sin(prog * Math.PI) * 12;
      const mx = (sx + ex) / 2 + Math.cos(perp) * bend, my = (sy + ey) / 2 + Math.sin(perp) * bend;
      ctx.strokeStyle = '#8a3b32'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sx, sy - 6); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
      ctx.strokeStyle = '#c46a4c'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy - 6); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
      px(ctx, (ex | 0) - 2, (ey | 0) - 2, 4, 4, '#3a3a40');
      if (prog > 0.7) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, (1 - prog) * 3) + ')'; ctx.fillRect((ex | 0) - 3, (ey | 0) - 1, 7, 2); }
    } else if (sw.style === 'paddle') {
      // pickleball paddle sweeping through the arc
      const a = sw.ang - 0.9 + 1.8 * prog;
      ctx.strokeStyle = 'rgba(230,235,240,' + (sw.t / 0.12 * 0.7) + ')'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(sx, sy, sw.range, sw.ang - 0.9, a); ctx.stroke();
      const hx = sx + Math.cos(a) * sw.range, hy = sy + Math.sin(a) * sw.range;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(a + Math.PI / 2);
      px(ctx, -5, -7, 10, 12, '#c94f43'); px(ctx, -4, -6, 8, 10, '#e07a6a'); px(ctx, -1, 5, 2, 5, '#8a6d3b'); ctx.restore();
    } else {
      ctx.strokeStyle = 'rgba(242,234,214,' + (sw.t / 0.12 * 0.9) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, sw.range, sw.ang - 0.9, sw.ang + 0.9); ctx.stroke();
    }
  }
  // the Cheesman Gate, open: warm garden light spills through the gateway
  if (!inGarden && state.gardenGateT > 0) {
    const gx = (GARDEN.GATE.x + 0.5) * T - camX, gy = (GARDEN.GATE.y + 0.3) * T - camY;
    const glow = ctx.createRadialGradient(gx, gy, 2, gx, gy, 26);
    glow.addColorStop(0, 'rgba(255,236,170,' + (0.32 + Math.sin(t * 5) * 0.08) + ')');
    glow.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = glow; ctx.fillRect(gx - 26, gy - 26, 52, 52);
    for (let k = 0; k < 4; k++) {                     // drifting petals in the light
      const pt = (t * 0.7 + k * 0.25) % 1;
      ctx.globalAlpha = 1 - pt;
      px(ctx, (gx - 8 + k * 5 + Math.sin(t * 3 + k) * 3) | 0, (gy - pt * 22) | 0, 2, 2, k % 2 ? '#d98aa6' : '#e5c04b');
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f6e39a'; ctx.font = 'bold 8px ui-monospace,monospace';
    ctx.fillText('🌷 ' + Math.ceil(state.gardenGateT) + 's', gx - 12, gy - 34);
  }
  // ultimate effects: smoke clouds, Ace shockwaves, the tech drone
  for (const c of state.clouds) {
    const ax = c.x - camX, ay = c.y - camY, fade = Math.min(1, c.ttl);
    ctx.globalAlpha = 0.28 * fade;
    ctx.fillStyle = '#b9c7a8';
    ctx.beginPath(); ctx.arc(ax, ay, c.r, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.22 * fade;
    ctx.fillStyle = '#cfd8c0';
    for (let k = 0; k < 3; k++) {
      const px2 = ax + Math.sin(t * 0.8 + k * 2.1) * c.r * 0.4, py2 = ay + Math.cos(t * 0.6 + k * 1.7) * c.r * 0.3;
      ctx.beginPath(); ctx.arc(px2, py2, c.r * 0.45, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  for (const s of state.shocks) {
    const a = Math.max(0, s.t / (s.t0 || 0.35));
    ctx.strokeStyle = 'rgba(242,234,214,' + (a * 0.9) + ')'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x - camX, s.y - camY, s.r, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(229,192,75,' + (a * 0.5) + ')'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(s.x - camX, s.y - camY, Math.max(0, s.r - 4), 0, 7); ctx.stroke();
  }
  if (state.drone) {
    const d = state.drone, ax = (d.x | 0) - camX, ay = (d.y | 0) - camY;
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(ax - 3, ay + 22, 7, 2);   // shadow far below
    const rot = ((t * 30) | 0) % 2;                                            // rotor flicker
    px(ctx, ax - 6, ay - 2, 4, 1, rot ? '#9fb4c4' : '#dfe8ee'); px(ctx, ax + 3, ay - 2, 4, 1, rot ? '#dfe8ee' : '#9fb4c4');
    px(ctx, ax - 3, ay - 1, 7, 4, '#3a3a40'); px(ctx, ax - 3, ay - 1, 7, 1, '#55555f');
    px(ctx, ax - 1, ay + 1, 3, 2, '#7fd0ff');                                  // camera eye
    if (d.ttl < 2 && ((t * 6) | 0) % 2) px(ctx, ax + 3, ay - 4, 2, 2, '#c94f43'); // low-battery blink
  }
  // particles & floats
  for (const p of state.particles) { ctx.globalAlpha = Math.min(1, p.ttl * 3); px(ctx, (p.x | 0) - camX, (p.y | 0) - camY, 2, 2, p.col); }
  ctx.globalAlpha = 1;
  ctx.font = 'bold 8px ui-monospace,monospace';
  for (const f of state.floats) {
    ctx.globalAlpha = Math.min(1, f.ttl * 2);
    ctx.fillStyle = '#141a10'; ctx.fillText(f.txt, (f.x | 0) - camX + 1, (f.y | 0) - camY + 1);
    ctx.fillStyle = f.col; ctx.fillText(f.txt, (f.x | 0) - camX, (f.y | 0) - camY);
  }
  ctx.globalAlpha = 1;
  // night tint + warm glows
  const na = nightAlpha(state, t);
  if (na > 0.01) {
    ctx.fillStyle = 'rgba(18,24,58,' + na + ')'; ctx.fillRect(0, 0, VW, VH);
    for (const [gx, gy, r] of [[53 * T, 46 * T, 70], [SHOP_POS.x, SHOP_POS.y, 44]]) {
      const ax = gx - camX, ay = gy - camY;
      if (ax < -r || ay < -r || ax > VW + r || ay > VH + r) continue;
      const grd = ctx.createRadialGradient(ax, ay, 4, ax, ay, r);
      grd.addColorStop(0, 'rgba(255,214,140,' + (na * 0.5) + ')'); grd.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = grd; ctx.fillRect(ax - r, ay - r, r * 2, r * 2);
    }
  }
  // zen mode: the world takes on a lavender calm
  if (state.zenT > 0) {
    ctx.fillStyle = 'rgba(142,111,184,' + (0.1 + Math.sin(t * 3) * 0.03) + ')';
    ctx.fillRect(0, 0, VW, VH);
  }
  ctx.fillStyle = 'rgba(255,225,150,.04)'; ctx.fillRect(0, 0, VW, VH);
}

// crisp speech bubbles on the full-res overlay canvas
export function renderFx(state) {
  fctx.clearRect(0, 0, fxW, fxH);
  const items = [];
  if (state.phase === 'day') for (const n of state.npcs) if (n.b) items.push([n.x, n.y, n.b.txt]);
  for (const a of state.ambients) {
    if (!ambientActive(state, a) || !a.b) continue;
    const hx = a.kind === 'vb' ? a.nx : a.x, hy = a.kind === 'vb' ? a.ny - 10 : a.y;
    items.push([hx, hy, a.b.txt]);
  }
  fctx.font = '600 11px ui-monospace,Menlo,Consolas,monospace';
  fctx.textBaseline = 'middle';
  for (const [wx, wy, txt] of items) {
    const sx = (wx - CAMX) * SCALE, hy = (wy - 20 - CAMY) * SCALE;
    if (sx < -160 || sx > fxW + 160 || hy < -60 || hy > fxH + 60) continue;
    const m = fctx.measureText(txt), tw = (m && m.width) || txt.length * 6.6, w = tw + 16, bh = 22;
    const bx = Math.max(4, Math.min(fxW - w - 4, sx - w / 2)), by = hy - bh - 7;
    fctx.fillStyle = '#f2ead6'; fctx.strokeStyle = '#1c2418'; fctx.lineWidth = 2;
    fctx.fillRect(bx, by, w, bh); fctx.strokeRect(bx, by, w, bh);
    fctx.beginPath(); fctx.moveTo(sx - 5, by + bh); fctx.lineTo(sx + 5, by + bh); fctx.lineTo(sx, by + bh + 6);
    fctx.closePath(); fctx.fill();
    fctx.beginPath(); fctx.moveTo(sx - 5, by + bh + 1); fctx.lineTo(sx, by + bh + 6); fctx.lineTo(sx + 5, by + bh + 1); fctx.stroke();
    fctx.fillStyle = '#1c2418'; fctx.fillText(txt, bx + 8, by + bh / 2 + 1);
  }
}

export function renderMini(state, t) {
  mctx.imageSmoothingEnabled = false;
  if (state.scene === 'garden') {                     // garden minimap: layout + flowers + you
    mctx.fillStyle = '#151a12'; mctx.fillRect(0, 0, 72, 92);
    mctx.drawImage(gardenCv, 0, 0, MW * T, GH * T, 0, 0, 72, GH);
    for (const f of state.flowers) { if (!f.got) { mctx.fillStyle = f.c; mctx.fillRect((f.x / T | 0), (f.y / T | 0), 1, 1); } }
    mctx.fillStyle = '#fff'; mctx.fillRect((state.player.x / T | 0) - 1, (state.player.y / T | 0) - 1, 3, 3);
    mctx.fillStyle = '#c94f43'; mctx.fillRect(state.player.x / T | 0, state.player.y / T | 0, 1, 1);
    return;
  }
  mctx.drawImage(miniBase, 0, 0);
  if (NA > 0.1) { mctx.fillStyle = 'rgba(18,24,58,.45)'; mctx.fillRect(0, 0, 72, 92); } // NA: smoothed in render()
  const camX = Math.max(0, Math.min(MW * T - VW, state.player.x - VW / 2));
  const camY = Math.max(0, Math.min(MH * T - VH, state.player.y - VH / 2));
  mctx.strokeStyle = 'rgba(242,234,214,.85)'; mctx.lineWidth = 1;
  mctx.strokeRect((camX / T) + .5, (camY / T) + .5, VW / T, VH / T);
  for (const z of ZONES) {
    if (state.found.has(z.id)) { mctx.fillStyle = 'rgba(150,220,140,.7)'; mctx.fillRect(z.m[0], z.m[1], 1, 1); }
    else { mctx.fillStyle = (t * 2 | 0) % 2 ? '#e5c04b' : '#f6e39a';
      mctx.fillRect(z.m[0] - 1, z.m[1] - 1, 3, 3); mctx.fillStyle = '#8a6d3b'; mctx.fillRect(z.m[0], z.m[1], 1, 1); }
  }
  mctx.fillStyle = '#7fb4b4'; mctx.fillRect(44, 54, 2, 2); // ranger cart
  const MINI_COL = { zombie: '#c94f43', ghost: '#9db4e0', vampire: '#b83a6a', werewolf: '#c79a4a', alien: '#7ef05a' };
  for (const e of state.enemies) {
    if (ENEMY_TYPES[e.kind].boss) { mctx.fillStyle = ((t * 3 | 0) % 2) ? '#e5c04b' : '#c94f43'; mctx.fillRect((e.x / T | 0) - 1, (e.y / T | 0) - 1, 3, 3); }
    else { mctx.fillStyle = MINI_COL[e.kind] || '#c94f43'; mctx.fillRect(e.x / T | 0, e.y / T | 0, 1, 1); }
  }
  mctx.fillStyle = '#fff'; mctx.fillRect((state.player.x / T | 0) - 1, (state.player.y / T | 0) - 1, 3, 3);
  mctx.fillStyle = '#c94f43'; mctx.fillRect(state.player.x / T | 0, state.player.y / T | 0, 1, 1);
}
