// ============================================================================
// ui.js — DOM chrome: HUD, shop, toasts, and overlays.
//
// The UI reads state to display it and drains state.events (emitted by the
// simulation) to show toasts / the death card. Shop purchases call the
// authoritative sim functions so the same rules apply everywhere.
// ============================================================================
import { WEAPONS, WEAPON_ORDER, xpNeed, ARCHETYPES, ARCHETYPE_ORDER, MAX_LIVES, archName, ENEMY_TYPES } from './constants.js';
import { nearShop, buyWeapon, buyChile, chooseArchetype, setStyle, weaponPrice, effectivePrice, ability1State, ability2State } from './simulate.js';
import { mkCanvas, px, drawPlayerChar } from './sprites.js';

let S = null;
const $ = (id) => document.getElementById(id);
let hpTxt, hpBar, xpBar, lvTxt, coinTxt, wepEl, phaseTxt, phaseTimer, btnShop, foundEl, tribeEl;
let scoreEl, acornEl, abilityEl, abBtn, ab1Lbl, ab1Fill, livesEl;
let ability2El, ab2Btn, ab2Lbl, ab2Fill, bossbarEl, bossFillEl;
let shopEl, shopItemsEl;
let toastEl, toastH, toastP, toastTO = null;

export function initUI(state, { onStart, onRespawn, onNewRun } = {}) {
  S = state;
  hpTxt = $('hpTxt'); hpBar = document.querySelector('#hpbar>i');
  xpBar = document.querySelector('#xpbar>i'); lvTxt = $('lvTxt');
  coinTxt = $('coinTxt'); wepEl = $('wep');
  phaseTxt = $('phaseTxt'); phaseTimer = $('phaseTimer'); btnShop = $('btnShop');
  foundEl = $('found'); tribeEl = $('tribe');
  scoreEl = $('scoreTxt'); acornEl = $('acornTxt'); abilityEl = $('ability');
  abBtn = $('btnAbility1'); ab1Lbl = $('ab1lbl'); ab1Fill = $('ab1fill');
  ability2El = $('ability2'); ab2Btn = $('btnAbility2'); ab2Lbl = $('ab2lbl'); ab2Fill = $('ab2fill');
  livesEl = $('livesRow');
  bossbarEl = $('bossbar'); bossFillEl = $('bossfill');
  shopEl = $('shop'); shopItemsEl = $('shopItems');
  toastEl = $('toast'); toastH = $('toast-h'); toastP = $('toast-p');

  buildShop();

  $('closeShop').addEventListener('click', closeShop);
  btnShop.addEventListener('click', () => { if (nearShop(S)) openShop(); });
  $('buyChile').addEventListener('click', () => { buyChile(S); refreshShop(); });
  $('respawn').addEventListener('click', () => { onRespawn && onRespawn(); });
  $('newRun').addEventListener('click', () => { onNewRun && onNewRun(); });
  $('start').addEventListener('click', () => { $('intro').style.display = 'none'; onStart && onStart(); });
  // park-goer picker (cosmetic): two unlabeled portraits — just pick a look
  for (const [id, style] of [['portraitM', 'm'], ['portraitF', 'f']]) {
    const x = $(id).getContext('2d');
    x.imageSmoothingEnabled = false;
    x.fillStyle = '#84ae59'; x.fillRect(0, 0, 26, 28);
    x.fillStyle = '#79a251'; x.fillRect(0, 22, 26, 6);
    drawPlayerChar(x, 13, 24, 'down', 0, null, style, false);
  }
  const styleM = $('styleM'), styleF = $('styleF');
  styleM.addEventListener('click', () => { setStyle(S, 'm'); styleM.classList.add('sel'); styleF.classList.remove('sel'); });
  styleF.addEventListener('click', () => { setStyle(S, 'f'); styleF.classList.add('sel'); styleM.classList.remove('sel'); });
}

export function toast(t, p, ms) {
  toastH.textContent = t; toastP.textContent = p; toastEl.classList.add('show');
  clearTimeout(toastTO); toastTO = setTimeout(() => toastEl.classList.remove('show'), ms || 6000);
}

// Drain simulation events into UI (toasts, death card).
export function drainEvents(state) {
  if (!state.events.length) return;
  for (const ev of state.events) {
    if (ev.type === 'toast') toast(ev.t, ev.p, ev.ms);
    else if (ev.type === 'death') showDeath(ev);
    else if (ev.type === 'archetypeChoice') showArchetypeChoice();
    else if (ev.type === 'abilityUnlock') {
      const touch = document.body.classList.contains('touch');
      const how = touch
        ? 'Tap the new ' + (ev.slot === 1 ? 'blue' : 'orange') + ' button by Fire to use it.'
        : 'Press ' + (ev.slot === 1 ? 'Q' : 'R') + ' to use it.';
      toast(ev.icon + ' ' + ev.name + ' unlocked!', how, 6000);
    }
  }
  state.events.length = 0;
}

// pixel portrait of the tribe's character, in the player's chosen style
function archPortrait(id, style) {
  const c = mkCanvas(26, 28), x = c.getContext('2d');
  x.fillStyle = '#84ae59'; x.fillRect(0, 0, 26, 28);           // lawn backdrop
  x.fillStyle = '#79a251'; x.fillRect(0, 22, 26, 6);
  drawPlayerChar(x, 13, 24, 'down', 0, id, style, false);
  c.className = 'portrait';
  return c;
}

function showArchetypeChoice() {
  const box = $('archetypeItems'); box.innerHTML = '';
  for (const id of ARCHETYPE_ORDER) {
    const a = ARCHETYPES[id];
    const div = document.createElement('div'); div.className = 'item';
    div.appendChild(archPortrait(id, S.player.style));
    const mid = document.createElement('div');
    mid.innerHTML = `<div class="nm">${archName(a, S.player.style)}</div><div class="ds">${a.flavor}</div><div class="st">${a.perkText}</div>`;
    div.appendChild(mid);
    const b = document.createElement('button'); b.className = 'buy'; b.textContent = 'Choose';
    b.addEventListener('click', () => { chooseArchetype(S, id); $('archetype').style.display = 'none'; });
    div.appendChild(b);
    box.appendChild(div);
  }
  $('archetype').style.display = 'flex';
}

function showDeath(ev) {
  const stats = (ev.night > 0)
    ? 'Night ' + ev.night + ' · ' + ev.kills + ' kills · Score ' + ev.score
    : 'Score ' + ev.score;
  if (ev.lives > 0) {                              // a ranger rescue remains
    $('deathTitle').textContent = 'You Got Got';
    $('deathSub').textContent = stats;
    $('deathTxt').textContent = 'A ranger drags you back to the pavilion at dawn. You dropped some Bucks on the way. '
      + ev.lives + (ev.lives === 1 ? ' rescue' : ' rescues') + ' left.';
    $('respawn').style.display = '';
    $('newRun').style.display = 'none';
  } else {                                         // out of rescues: run over
    $('deathTitle').textContent = 'Game Over';
    $('deathSub').textContent = stats;
    $('deathTxt').textContent = (ev.score >= ev.bestScore && ev.score > 0)
      ? 'A new best score! The rangers are out of patience — and you are out of rescues.'
      : 'The rangers are out of patience — and you are out of rescues. Best score: ' + ev.bestScore + '.';
    $('respawn').style.display = 'none';
    $('newRun').style.display = '';
  }
  $('death').style.display = 'flex';
}
export function hideDeath() { $('death').style.display = 'none'; }

export function updateHud(state) {
  const p = state.player;
  hpTxt.textContent = Math.max(0, Math.ceil(p.hp)) + '/' + p.maxHp;
  hpBar.style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
  xpBar.style.width = Math.min(100, p.xp / xpNeed(p.level) * 100) + '%';
  lvTxt.textContent = p.level;
  coinTxt.textContent = p.coins;
  wepEl.textContent = WEAPONS[p.weapon].name;
  tribeEl.textContent = ARCHETYPES[p.archetype] ? archName(ARCHETYPES[p.archetype], p.style) : '';
  foundEl.textContent = state.found.size;
  scoreEl.textContent = state.parkScore;
  acornEl.textContent = p.acorns;
  livesEl.textContent = '♥'.repeat(Math.max(0, state.lives)) + '♡'.repeat(Math.max(0, MAX_LIVES - state.lives));
  if (state.phase === 'day') { phaseTxt.innerHTML = '☀ Day'; }
  else { phaseTxt.innerHTML = '<span class="night">🌙 Night ' + state.night + '</span>'; }
  phaseTimer.textContent = Math.ceil(state.phaseT) + 's';
  btnShop.style.display = (state.started && !state.paused && nearShop(state)) ? 'block' : 'none';

  // abilities: desktop chips + mobile buttons (with cooldown drain)
  updateAbilityUI(ability1State(state), abilityEl, abBtn, ab1Lbl, ab1Fill, 'Q');
  updateAbilityUI(ability2State(state), ability2El, ab2Btn, ab2Lbl, ab2Fill, 'R');

  // boss health bar
  const boss = state.enemies.find((e) => ENEMY_TYPES[e.kind] && ENEMY_TYPES[e.kind].boss);
  if (boss) {
    bossbarEl.style.display = 'block';
    bossFillEl.style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%';
  } else bossbarEl.style.display = 'none';
}

function updateAbilityUI(ab, chipEl, btn, lblEl, fillEl, key) {
  if (!ab || !ab.unlocked) {
    chipEl.innerHTML = '';
    if (btn) btn.classList.remove('unlocked');    // CSS shows .unlocked buttons on touch only
    return;
  }
  if (btn) {
    btn.classList.add('unlocked');
    btn.classList.toggle('cooling', !ab.ready);
    lblEl.textContent = ab.icon;
    fillEl.style.height = (ab.ready ? 0 : ab.cd / ab.cdMax * 100) + '%';
  }
  const pct = ab.ready ? 100 : Math.round((1 - ab.cd / ab.cdMax) * 100);
  chipEl.innerHTML = ab.ready
    ? `<span class="rdy">${key} · ${ab.name} · READY</span>`
    : `${key} · ${ab.name}<div class="abar"><i style="width:${pct}%"></i></div>`;
}

// --- shop ------------------------------------------------------------------
function wepIcon(id) {
  const c = mkCanvas(17, 17), x = c.getContext('2d');
  if (id === 'frisbee') { x.fillStyle = '#e5c04b'; x.beginPath(); x.ellipse(8, 9, 7, 4, 0, 0, 7); x.fill(); x.fillStyle = '#c9a52f'; x.fillRect(3, 8, 11, 1); }
  if (id === 'leash') { x.strokeStyle = '#8a3b32'; x.lineWidth = 2; x.beginPath(); x.arc(8, 8, 5, 0, 5.2); x.stroke(); px(x, 12, 10, 3, 4, '#3a3a40'); }
  if (id === 'launcher') { px(x, 2, 7, 10, 3, '#4a90c2'); px(x, 11, 5, 4, 7, '#2f5a7a'); px(x, 3, 4, 4, 4, '#b7e34b'); }
  if (id === 'paddle') { px(x, 5, 2, 8, 9, '#c94f43'); px(x, 6, 3, 6, 7, '#e07a6a'); px(x, 8, 11, 2, 5, '#8a6d3b'); }
  if (id === 'chile') { x.fillStyle = '#4c9a3f'; x.beginPath(); x.ellipse(8, 10, 4, 6, 0.5, 0, 7); x.fill(); px(x, 9, 2, 2, 4, '#2c5a28'); }
  c.className = 'ic'; return c;
}

function buildShop() {
  shopItemsEl.innerHTML = '';
  for (const id of WEAPON_ORDER) {
    const w = WEAPONS[id];
    const div = document.createElement('div'); div.className = 'item';
    div.appendChild(wepIcon(id));
    const mid = document.createElement('div');
    const stat = w.kind === 'melee' ? `DMG ${w.dmg} · MELEE` : `DMG ${w.dmg} · RANGED${w.splash ? ' · SPLASH' : ''}`;
    mid.innerHTML = `<div class="nm">${w.name}</div><div class="st">${stat}</div><div class="ds">${w.desc}</div>`;
    div.appendChild(mid);
    const b = document.createElement('button'); b.className = 'buy';
    div.appendChild(b);
    b.addEventListener('click', () => { buyWeapon(S, id); refreshShop(); });
    div.dataset.wid = id;
    shopItemsEl.appendChild(div);
  }
}

function refreshShop() {
  $('shopCoins').textContent = '$' + S.player.coins;
  for (const div of shopItemsEl.children) {
    const id = div.dataset.wid, w = WEAPONS[id], b = div.querySelector('.buy');
    if (S.player.weapon === id) { b.textContent = 'Equipped'; b.className = 'buy equipped'; b.disabled = true; }
    else if (S.player.owned.has(id)) { b.textContent = 'Equip'; b.className = 'buy'; b.disabled = false; }
    else { const price = weaponPrice(S, id); b.textContent = '$' + price; b.className = 'buy'; b.disabled = S.player.coins < price; }
  }
  const cp = effectivePrice(S, 25);
  const bc = $('buyChile');
  if (S.phase !== 'day') {                        // kitchen keeps day hours
    bc.textContent = 'Green Chile Snack — kitchen closed till dawn 🌙';
    bc.disabled = true;
  } else {
    bc.textContent = 'Green Chile Snack — $' + cp + ' (heal 35)';
    bc.disabled = S.player.coins < cp || S.player.hp >= S.player.maxHp;
  }
}

export function openShop() { S.shopOpen = true; S.paused = true; refreshShop(); shopEl.style.display = 'flex'; }
export function closeShop() { S.shopOpen = false; S.paused = false; shopEl.style.display = 'none'; }
export function isShopOpen() { return S && S.shopOpen; }
