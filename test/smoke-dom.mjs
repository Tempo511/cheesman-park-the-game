// ============================================================================
// smoke-dom.mjs — exercises the DOM/render layer under a stubbed canvas.
//
// We can't run a real browser here, so we stub just enough of the DOM + 2D
// canvas API to import and drive sprites/render/ui/input without throwing.
// This catches wiring mistakes (bad refs, undefined props, typos) in the parts
// the headless-sim test can't reach.
//
//   node test/smoke-dom.mjs
// ============================================================================

// --- minimal DOM + canvas stub ---------------------------------------------
function makeCtx() {
  const noop = () => {};
  return {
    // settable style props are just assigned onto the object
    fillRect: noop, strokeRect: noop, clearRect: noop, drawImage: noop,
    beginPath: noop, moveTo: noop, lineTo: noop, arc: noop, ellipse: noop,
    quadraticCurveTo: noop, closePath: noop, fill: noop, stroke: noop,
    save: noop, restore: noop, translate: noop, rotate: noop, scale: noop,
    clip: noop, rect: noop, setTransform: noop, fillText: noop, arcTo: noop,
    measureText: () => ({ width: 40 }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
  };
}
function makeEl(tag = 'div') {
  const el = {
    tagName: tag, width: 300, height: 150, style: {}, className: '',
    textContent: '', innerHTML: '', disabled: false, dataset: {}, children: [],
    _ctx: null,
    getContext() { return this._ctx || (this._ctx = makeCtx()); },
    appendChild(c) { this.children.push(c); return c; },
    querySelector() { return makeEl('i'); },
    addEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 118, height: 118 }; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  };
  return el;
}
const els = {};
globalThis.document = {
  getElementById(id) { return els[id] || (els[id] = makeEl(id === 'game' || id === 'fx' || id === 'mini' ? 'canvas' : 'div')); },
  querySelector() { return makeEl('i'); },
  createElement(tag) { return makeEl(tag); },
  body: { classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } },
};
globalThis.window = globalThis;
globalThis.innerWidth = 900;
globalThis.innerHeight = 600;
globalThis.devicePixelRatio = 2;
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => 0;
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.setTimeout = globalThis.setTimeout || (() => 0);
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });

// --- now import the render/ui/input layer ----------------------------------
let passed = 0, failed = 0;
const ok = (name, cond) => { if (cond) passed++; else { failed++; console.error('  ✗ FAIL:', name); } };

const { createState } = await import('../src/state.js');
const { step } = await import('../src/simulate.js');
const { getInputs, initInput } = await import('../src/input.js');
const { buildSprites } = await import('../src/sprites.js');
const { makeRng } = await import('../src/rng.js');
const render = await import('../src/render.js');
const ui = await import('../src/ui.js');

let err = null;
try {
  const state = createState();

  const refs = {
    cv: document.getElementById('game'), ctx: document.getElementById('game').getContext('2d'),
    fxCv: document.getElementById('fx'), fctx: document.getElementById('fx').getContext('2d'),
    miniCv: document.getElementById('mini'), mctx: document.getElementById('mini').getContext('2d'),
  };
  const SPR = buildSprites(makeRng(12345));
  ok('buildSprites produced an atlas', SPR && SPR.tree && SPR.cart && SPR.pine);

  render.initRender(refs, SPR);
  render.renderGround(state);
  render.buildMini();
  render.resize();
  render.resizeFx();

  ui.initUI(state, { onStart: () => {}, onRespawn: () => {} });
  initInput({ onShop: () => {}, onEscape: () => {} });

  // drive several live frames: sim + render + fx + minimap + hud
  state.started = true;
  state.phaseT = 0.001; // push into night so enemies/particles render too
  for (let i = 0; i < 400; i++) {
    step(state, getInputs(), 1 / 60);
    render.render(state, i / 60);
    render.renderFx(state);
    render.renderMini(state, i / 60);
    ui.updateHud(state);
    ui.drainEvents(state);
  }
  ok('ran 400 live frames (sim+render+ui) without throwing', true);
  ok('night rendered with enemies present at some point', state.night >= 1);

  // shop open/close path
  ui.openShop();
  ok('shop opens (pauses game)', state.paused === true && ui.isShopOpen() === true);
  ui.closeShop();
  ok('shop closes (unpauses game)', state.paused === false);

  // day scene too — incl. squirrels + acorns
  state.phase = 'day';
  state.squirrels.push({ x: state.player.x + 20, y: state.player.y, tx: 0, ty: 0, dir: 'left', phase: 1, fed: 0, moving: 1 });
  state.acorns.push({ x: state.player.x + 10, y: state.player.y + 10, bob: 1 });
  state.player.acorns = 2; state.parkScore = 120;
  render.render(state, 5);
  render.renderFx(state);
  ui.updateHud(state);
  ok('day scene (npcs, ambients, squirrels, acorns) renders + score HUD updates', true);

  // every weapon's distinct projectile / swing render path
  for (const style of ['disc', 'ball', 'pepper', 'plain']) state.projectiles.push({ x: state.player.x + 20, y: state.player.y, vx: 100, vy: 20, dmg: 5, ttl: 1, size: 5, col: '#e5c04b', splash: 0, spin: 1, style });
  for (const style of ['whip', 'paddle', 'plain']) state.swings.push({ x: state.player.x, y: state.player.y - 8, ang: 0.5, t: 0.08, range: 32, style });
  render.render(state, 7);
  ok('renders all weapon projectile + swing styles without throwing', true);

  // every monster type renders
  for (const kind of ['zombie', 'ghost', 'vampire', 'werewolf', 'alien']) {
    state.enemies.push({ kind, x: state.player.x + 30, y: state.player.y, hp: 10, maxHp: 20, spd: 30, dmg: 5, xp: 5, coin: 2, rise: 1, phase: 1, hitT: 0.05, kx: 0, ky: 0, dir: 'left', lungeT: 0, lunging: 0, blinkT: 1 });
  }
  render.render(state, 8);
  render.renderMini(state, 8);
  ok('renders all monster types without throwing', true);

  // the boss: sprite (idle + winding), slam telegraph, minimap blip, boss bar
  state.enemies.push({ kind: 'mcgovern', x: state.player.x + 60, y: state.player.y, hp: 300, maxHp: 600, spd: 20, dmg: 20, xp: 0, coin: 0, rise: 1, phase: 1, hitT: 0, kx: 0, ky: 0, dir: 'left', lungeT: 0, lunging: 0, blinkT: 0, ramCd: 0, slamT: 1, winding: 0.4 });
  render.render(state, 8.5);
  render.renderMini(state, 8.5);
  ui.updateHud(state);
  state.enemies[state.enemies.length - 1].winding = 0;
  state.enemies[state.enemies.length - 1].rise = 0.5;
  render.render(state, 8.7);
  ok('renders E.P. McGovern (telegraph, rising, boss bar) without throwing', true);

  // archetype pick overlay builds, and the player renders with the makeover
  state.events.push({ type: 'archetypeChoice' });
  ui.drainEvents(state);
  ok('archetype pick overlay builds without throwing', true);
  for (const arch of [null, 'volleyball', 'tech', 'hippie', 'jogger', 'yogi']) for (const st of ['m', 'f']) {
    state.player.archetype = arch; state.player.style = st;
    for (const dir of ['down', 'up', 'left', 'right']) { state.player.dir = dir; render.render(state, 9); }
  }
  ok('renders every archetype × style × facing combination', true);

  // jogger/yogi effect visuals: sprint trail + ghosting, boulder trail, zen tint
  state.player.archetype = 'jogger'; state.player.moving = true; state.player.fx = 1; state.player.fy = 0;
  state.player.ghostT = 1; render.render(state, 9.3);
  state.player.ghostT = 0; state.player.boulderT = 2; render.render(state, 9.6);
  state.player.boulderT = 0; state.zenT = 3; render.render(state, 9.9);
  state.zenT = 0;
  ok('renders sprint/boulder trails and zen tint', true);

  // ability buffs render + ability HUD updates
  state.player.archetype = 'volleyball'; state.player.level = 6;
  state.player.dashT = 0.15; state.player.dashVX = 400; state.player.dashVY = 0;
  state.player.hasteT = 2; state.player.shieldT = 2; state.player.shieldAmt = 0.4;
  render.render(state, 10);
  ui.updateHud(state);
  ok('renders ability buffs + updates the ability HUD', true);

  // ultimate effects render + dual-ability HUD
  state.player.level = 10;
  state.drone = { ttl: 5, fireCd: 0, x: state.player.x + 16, y: state.player.y - 30 };
  state.clouds.push({ x: state.player.x, y: state.player.y, r: 64, ttl: 3, slow: 0.35 });
  state.shocks.push({ x: state.player.x, y: state.player.y - 8, r: 40, max: 90, t: 0.2 });
  render.render(state, 11);
  ui.updateHud(state);
  ok('renders drone + smoke cloud + shockwave and the ultimate HUD', true);
} catch (e) { err = e; failed++; console.error('  ✗ THREW:', e && e.stack || e); }

console.log(`\n${failed === 0 ? '✓ ALL PASSED' : '✗ FAILURES'} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
