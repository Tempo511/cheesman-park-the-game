// ============================================================================
// smoke-main.mjs — loads main.js (the real bootstrap + game loop) under a
// stubbed DOM and actually drives the loop, including the "started" path.
//
// The other smoke test wires the modules by hand; this one runs the ACTUAL
// wiring in main.js — the one place a freeze-causing bug would otherwise slip
// past every test.
//
//   node test/smoke-main.mjs
// ============================================================================

function makeCtx() {
  const noop = () => {};
  return {
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
  return {
    tagName: tag, width: 300, height: 150, style: {}, className: '',
    textContent: '', innerHTML: '', disabled: false, dataset: {}, children: [],
    _ctx: null, _h: {},
    getContext() { return this._ctx || (this._ctx = makeCtx()); },
    appendChild(c) { this.children.push(c); return c; },
    querySelector() { return makeEl('i'); },
    addEventListener(type, fn) { (this._h[type] || (this._h[type] = [])).push(fn); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 118, height: 118 }; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  };
}
const els = {};
globalThis.document = {
  hidden: false,
  getElementById(id) { return els[id] || (els[id] = makeEl(id === 'game' || id === 'fx' || id === 'mini' ? 'canvas' : 'div')); },
  querySelector() { return makeEl('i'); },
  createElement(tag) { return makeEl(tag); },
  body: { classList: { add() {}, remove() {} } },
  addEventListener() {},
};
globalThis.window = globalThis;
globalThis.innerWidth = 900;
globalThis.innerHeight = 600;
globalThis.devicePixelRatio = 2;
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
const globalHandlers = {};
globalThis.addEventListener = (type, fn) => { (globalHandlers[type] || (globalHandlers[type] = [])).push(fn); };
let rafCb = null;
globalThis.requestAnimationFrame = (cb) => { rafCb = cb; return 1; };

let passed = 0, failed = 0;
const ok = (name, cond) => { if (cond) passed++; else { failed++; console.error('  ✗ FAIL:', name); } };

let err = null;
try {
  await import('../src/main.js');           // runs the full bootstrap
  ok('main.js bootstrapped without throwing', true);
  ok('scheduled a frame', typeof rafCb === 'function');

  // drive the loop on the intro screen (not started yet)
  let ts = 16;
  for (let i = 0; i < 20; i++) { ts += 16; rafCb(ts); }
  ok('runs the loop on the intro screen', true);

  // click "Clock in" to start the game
  const start = els['start'];
  ok('start button has a click handler', start && start._h.click && start._h.click.length > 0);
  start._h.click[0]();

  // drive many frames of actual gameplay (day: player, npcs, dog park, render)
  for (let i = 0; i < 1200; i++) { ts += 16; rafCb(ts); }
  ok('ran 1200 gameplay frames via main.js loop without throwing', true);

  // simulate the tab being backgrounded and restored
  document.hidden = true; for (let i = 0; i < 10; i++) { ts += 16; rafCb(ts); }
  document.hidden = false; for (let i = 0; i < 60; i++) { ts += 16; rafCb(ts); }
  ok('survives background/resume', true);
} catch (e) { err = e; failed++; console.error('  ✗ THREW:', e && e.stack || e); }

console.log(`\n${failed === 0 ? '✓ ALL PASSED' : '✗ FAILURES'} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
