// ============================================================================
// input.js — turns local hardware (keyboard, floating touch stick, fire button)
// into a per-frame `inputs` object: { move:{x,y}, attack }.
//
// Touch model (landscape): the LEFT half of the screen is a floating joystick —
// touch anywhere and a stick spawns under your thumb. The bottom-right is a
// hold-to-fire button. Each finger is tracked by its own touch identifier, so
// moving and firing at the same time never interfere (the classic mobile
// multi-touch bug the old code had by reading `touches[0]`).
//
// Co-op design note: this is the ONLY place raw devices are read. The sim never
// sees a keyboard or a touch — it consumes the neutral inputs object, so a
// remote player's inputs slot in identically.
// ============================================================================

const keys = {};
let attackHeld = false;                 // fire button held
let ability1Held = false;               // ability button held
let ability2Held = false;               // ultimate button held
const joy = { x: 0, y: 0 };             // normalized move vector from the stick
let moveId = null, moveOX = 0, moveOY = 0;
const DEAD = 0.2, MAXR = 52;

let stickEl, nubEl, fireBtn, moveZone, ability1Btn, ability2Btn;

// Build this frame's input intent for the local player.
export function getInputs() {
  let dx = 0, dy = 0;
  if (keys['arrowleft'] || keys['a']) dx -= 1;
  if (keys['arrowright'] || keys['d']) dx += 1;
  if (keys['arrowup'] || keys['w']) dy -= 1;
  if (keys['arrowdown'] || keys['s']) dy += 1;
  dx += joy.x; dy += joy.y;
  const attack = !!(keys[' '] || keys['j'] || keys['k'] || attackHeld);
  const ability1 = !!(keys['q'] || ability1Held);
  const ability2 = !!(keys['r'] || ability2Held);
  return { move: { x: dx, y: dy }, attack, ability1, ability2 };
}

function setJoy(px, py) {
  let dx = px - moveOX, dy = py - moveOY;
  const m = Math.hypot(dx, dy);
  if (m > MAXR) { dx = dx / m * MAXR; dy = dy / m * MAXR; }
  joy.x = dx / MAXR; joy.y = dy / MAXR;
  if (Math.hypot(joy.x, joy.y) < DEAD) { joy.x = 0; joy.y = 0; }
  if (nubEl) nubEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}
function showStick(x, y) {
  moveOX = x; moveOY = y;
  if (stickEl) { stickEl.style.left = x + 'px'; stickEl.style.top = y + 'px'; stickEl.style.display = 'block'; }
}
function hideStick() {
  joy.x = 0; joy.y = 0; moveId = null;
  if (stickEl) stickEl.style.display = 'none';
  if (nubEl) nubEl.style.transform = 'translate(-50%,-50%)';
}

export function initInput({ onShop, onEscape } = {}) {
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase(); keys[k] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (k === 'e') onShop && onShop();
    else if (k === 'escape') onEscape && onEscape();
  });
  addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  stickEl = document.getElementById('stick');
  nubEl = document.getElementById('nub');
  fireBtn = document.getElementById('btnA');
  moveZone = document.getElementById('moveZone');
  ability1Btn = document.getElementById('btnAbility1');
  ability2Btn = document.getElementById('btnAbility2');

  // Track touch-ness LIVE via the pointer media query (it flips in real time
  // when DevTools device emulation is toggled — a one-shot check would strand
  // the page in the wrong layout until reload).
  const coarseMQ = matchMedia('(pointer: coarse)');
  const applyTouch = () => document.body.classList.toggle('touch', coarseMQ.matches);
  applyTouch();
  if (coarseMQ.addEventListener) coarseMQ.addEventListener('change', applyTouch);
  else if (coarseMQ.addListener) coarseMQ.addListener(applyTouch);

  // --- MOVE: floating stick within the left-half zone ---------------------
  if (moveZone) {
    moveZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (moveId !== null) return;               // one move finger at a time
      const t = e.changedTouches[0];
      moveId = t.identifier;
      showStick(t.clientX, t.clientY);
      setJoy(t.clientX, t.clientY);
    }, { passive: false });
    moveZone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) if (t.identifier === moveId) { e.preventDefault(); setJoy(t.clientX, t.clientY); }
    }, { passive: false });
    const end = (e) => { for (const t of e.changedTouches) if (t.identifier === moveId) hideStick(); };
    moveZone.addEventListener('touchend', end);
    moveZone.addEventListener('touchcancel', end);
  }

  // --- FIRE: hold the bottom-right button ---------------------------------
  if (fireBtn) {
    const down = (e) => { e.preventDefault(); attackHeld = true; fireBtn.classList.add('pressed'); };
    const up = () => { attackHeld = false; fireBtn.classList.remove('pressed'); };
    fireBtn.addEventListener('touchstart', down, { passive: false });
    fireBtn.addEventListener('touchend', up);
    fireBtn.addEventListener('touchcancel', up);
    fireBtn.addEventListener('mousedown', down);
    addEventListener('mouseup', up);
  }

  // --- ABILITIES: tap the ability buttons ----------------------------------
  const wireAbilityBtn = (btn, set) => {
    if (!btn) return;
    const down = (e) => { e.preventDefault(); set(true); };
    const up = () => set(false);
    btn.addEventListener('touchstart', down, { passive: false });
    btn.addEventListener('touchend', up);
    btn.addEventListener('touchcancel', up);
    btn.addEventListener('mousedown', down);
    addEventListener('mouseup', up);
  };
  wireAbilityBtn(ability1Btn, (v) => { ability1Held = v; });
  wireAbilityBtn(ability2Btn, (v) => { ability2Held = v; });
}
