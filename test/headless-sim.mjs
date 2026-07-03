// ============================================================================
// headless-sim.mjs — runs the ACTUAL game simulation with no browser.
//
// This is only possible because state.js + simulate.js are DOM-free. It's both
// a regression test for the refactor and a proof of the co-op-ready design:
// the same step() a host will run, exercised in Node.
//
//   node test/headless-sim.mjs
// ============================================================================
import { createState, toSaveData, applySaveData, DEFAULT_SEED } from '../src/state.js';
import { step, respawn, buyWeapon, buyChile, nearShop, chooseArchetype, setStyle, weaponPrice, ability1State, ability2State } from '../src/simulate.js';
import { G, T, WEAPONS, ENEMY_TYPES, xpNeed } from '../src/constants.js';
import { gi } from '../src/tiles.js';

let passed = 0, failed = 0;
const ok = (name, cond) => { if (cond) { passed++; } else { failed++; console.error('  ✗ FAIL:', name); } };
const section = (s) => console.log('\n• ' + s);

const NO_INPUT = { move: { x: 0, y: 0 }, attack: false };
const clone = (i) => ({ move: { ...i.move }, attack: i.attack });

// --- 1. world generation ---------------------------------------------------
section('World generation');
const s = createState();
ok('map grid sized MW*MH', s.ground.length === 72 * 92);
ok('objects were placed', s.objects.length > 100);
ok('cars were placed', s.cars.length > 0);
ok('has a pavilion (MARBLE tiles)', s.ground.some((v) => v === G.MARBLE));
ok('has a pool (WATER tiles)', s.ground.some((v) => v === G.WATER));
ok('has paved figure-8 (PAVE tiles)', s.ground.some((v) => v === G.PAVE));
ok('has a ranger cart object', s.objects.some((o) => o.type === 'cart'));
ok('npcs initialized', s.npcs.length === 3);
ok('ambients initialized', s.ambients.length >= 8);

// --- 2. determinism (the co-op guarantee) ----------------------------------
section('Determinism');
const a = createState(DEFAULT_SEED), b = createState(DEFAULT_SEED);
ok('same seed -> identical terrain', a.ground.every((v, i) => v === b.ground[i]));
ok('same seed -> same object count', a.objects.length === b.objects.length);
const c = createState(999);
ok('different seed -> different terrain', !a.ground.every((v, i) => v === c.ground[i]));

// run both a and b through an identical input sequence; states must match
a.started = b.started = true;
const script = [];
for (let i = 0; i < 600; i++) script.push({ move: { x: Math.sin(i / 20), y: Math.cos(i / 13) }, attack: i % 3 === 0 });
for (const inp of script) { step(a, clone(inp), 1 / 60); step(b, clone(inp), 1 / 60); }
ok('deterministic player X', Math.abs(a.player.x - b.player.x) < 1e-9);
ok('deterministic player Y', Math.abs(a.player.y - b.player.y) < 1e-9);
ok('deterministic sim rng', a.simSeed === b.simSeed);
ok('deterministic coin total', a.player.coins === b.player.coins);
ok('deterministic enemy count', a.enemies.length === b.enemies.length);

// --- 3. gating: no step before start ---------------------------------------
section('Start gating');
const g = createState();
const gx = g.player.x;
step(g, { move: { x: 1, y: 0 }, attack: false }, 1 / 60);
ok('does not simulate before started', g.player.x === gx);
g.started = true;
step(g, { move: { x: 1, y: 0 }, attack: false }, 1 / 60);
ok('moves once started', g.player.x > gx);

// --- 4. movement + collision -----------------------------------------------
section('Movement');
const m = createState(); m.started = true;
const startX = m.player.x;
for (let i = 0; i < 120; i++) step(m, { move: { x: 1, y: 0 }, attack: false }, 1 / 60);
ok('walks right over time', m.player.x > startX);
ok('stays in map bounds', m.player.x > 0 && m.player.x < 72 * T && m.player.y > 0 && m.player.y < 92 * T);

// --- 5. night waves + combat -----------------------------------------------
section('Night waves & combat');
const n = createState(); n.started = true;
n.phaseT = 0.001;                                   // force dusk -> night on next step
step(n, NO_INPUT, 1 / 60);
ok('night begins when day timer expires', n.phase === 'night' && n.night === 1);
// advance until at least one enemy has spawned
let spawned = false;
for (let i = 0; i < 600 && !spawned; i++) { step(n, NO_INPUT, 1 / 60); if (n.enemies.length > 0) spawned = true; }
ok('enemies spawn at night', spawned);

// place an enemy right next to the player and attack it to death
const target = { kind: 'zombie', x: n.player.x + 20, y: n.player.y, hp: 20, maxHp: 20, spd: 0, dmg: 12,
  xp: 8, coin: 3, rise: 1, phase: 0, hitT: 0, kx: 0, ky: 0, dir: 'left' };
n.enemies.push(target);
n.player.weapon = 'paddle'; n.player.owned.add('paddle');
n.player.atkCd = 0;
const before = n.enemies.length;
let killedIt = false;
for (let i = 0; i < 240; i++) {
  n.player.fx = 1; n.player.fy = 0;              // face the target
  step(n, { move: { x: 0, y: 0 }, attack: true }, 1 / 60);
  if (!n.enemies.includes(target)) { killedIt = true; break; }
}
ok('attacking kills an adjacent enemy', killedIt);
ok('kill credited', n.player.kills >= 1);
ok('enemy count dropped', n.enemies.length < before + 1);

// --- 5b. monster roster unlocks by night ------------------------------------
section('Monster roster by night');
function rosterAtNight(nn) {
  const st = createState(); st.started = true; st.phase = 'night'; st.night = nn; st.phaseT = 55;
  const kinds = new Set();
  for (let i = 0; i < 400; i++) {
    st.spawnLeft = 300; st.spawnTimer = 0;          // force a spawn each step
    step(st, NO_INPUT, 1 / 60);
    for (const e of st.enemies) kinds.add(e.kind);
    st.enemies.length = 0;                           // clear so we keep sampling
  }
  return kinds;
}
const r3 = rosterAtNight(3), r4 = rosterAtNight(4), r6 = rosterAtNight(6), r8 = rosterAtNight(8);
ok('nights 1–3 are only zombie/ghost', [...r3].every((k) => k === 'zombie' || k === 'ghost'));
ok('vampires arrive on night 4', r4.has('vampire'));
ok('night 4 has no werewolves/aliens yet', !r4.has('werewolf') && !r4.has('alien'));
ok('werewolves arrive by night 6', r6.has('werewolf'));
ok('night 6 has no aliens yet', !r6.has('alien'));
ok('aliens arrive by night 8', r8.has('alien'));

// --- 5c. late-night difficulty curve ----------------------------------------
section('Difficulty curve');
// force a nightfall at a given prior night and inspect the wave + one spawn
function nightfallAt(prevNight) {
  const st = createState(); st.started = true; st.night = prevNight; st.phaseT = 0.001;
  step(st, NO_INPUT, 1 / 60);                                  // day timer expires -> startNight
  const wave = st.spawnLeft;
  st.spawnTimer = 0; step(st, NO_INPUT, 1 / 60);               // force one spawn
  return { night: st.night, wave, e: st.enemies[0] };
}
const n5 = nightfallAt(4), n12 = nightfallAt(11);
ok('night 5 wave unchanged by late scaling (5+4n)', n5.wave === 25);
ok('night 12 wave exceeds the old cap of 30', n12.wave > 30);
const t5 = ENEMY_TYPES[n5.e.kind], t12 = ENEMY_TYPES[n12.e.kind];
ok('night 5 enemy HP uses the gentle formula', n5.e.hp === t5.hp0 + t5.hpN * 5);
ok('night 12 enemy HP compounds (doubled growth past 7)', n12.e.hp === t12.hp0 + t12.hpN * (12 + 5));
ok('night 5 enemy damage is base', n5.e.dmg === t5.dmg);
ok('night 12 enemy damage is base +5', n12.e.dmg === t12.dmg + 5);

// --- 6. XP / leveling -------------------------------------------------------
section('Leveling');
const lv = createState(); lv.started = true;
const lvl0 = lv.player.level, hp0 = lv.player.maxHp;
// spawn a cluster of weak enemies on the player and pummel them
lv.player.weapon = 'paddle'; lv.player.owned.add('paddle');
for (let k = 0; k < 12; k++) lv.enemies.push({ kind: 'zombie', x: lv.player.x + 10, y: lv.player.y, hp: 1, maxHp: 1, spd: 0, dmg: 0,
  xp: 40, coin: 0, rise: 1, phase: 0, hitT: 0, kx: 0, ky: 0, dir: 'left' });
for (let i = 0; i < 400 && lv.player.level === lvl0; i++) { lv.player.fx = 1; lv.player.fy = 0; lv.player.atkCd = 0; step(lv, { move: { x: 0, y: 0 }, attack: true }, 1 / 60); }
ok('player levels up from XP', lv.player.level > lvl0);
ok('max HP grows on level up', lv.player.maxHp > hp0);

// --- 6b. archetypes ---------------------------------------------------------
section('Archetypes');
// reaching level 3 triggers the tribe pick (pause + event)
const ac = createState(); ac.started = true;
ac.player.weapon = 'paddle'; ac.player.owned.add('paddle');
for (let r = 0; r < 25 && ac.player.level < 3; r++) {
  ac.enemies.push({ kind: 'zombie', x: ac.player.x + 10, y: ac.player.y, hp: 1, maxHp: 1, spd: 0, dmg: 0, xp: 40, coin: 0, rise: 1, phase: 0, hitT: 0, kx: 0, ky: 0, dir: 'left', lungeT: 0, lunging: 0, blinkT: 0 });
  for (let i = 0; i < 60; i++) { ac.player.fx = 1; ac.player.fy = 0; ac.player.atkCd = 0; step(ac, { move: { x: 0, y: 0 }, attack: true }, 1 / 60); }
}
ok('level 3 triggers the tribe pick (pause)', ac.player.level >= 3 && ac.choosing === true && ac.paused === true);
ok('archetypeChoice event emitted', ac.events.some((e) => e.type === 'archetypeChoice'));
chooseArchetype(ac, 'tech');
ok('choosing a tribe unpauses + records it', ac.player.archetype === 'tech' && !ac.paused && !ac.choosing);

// Tech Bro: +50% Bucks and shop discount
const tc = createState(); tc.started = true; tc.player.archetype = 'tech';
const tc0 = tc.player.coins; tc.player.x = 53 * T; tc.player.y = 46 * T; tc.time = 100;
step(tc, NO_INPUT, 1 / 60);
ok('tech bro earns +50% on a landmark', tc.player.coins - tc0 === 38); // round(25*1.5)
ok('tech bro gets a shop discount', weaponPrice(tc, 'leash') === Math.round(60 * 0.85));

// Volleyball Bro: faster movement
const stepDist = (arch) => { const s = createState(); s.started = true; s.player.archetype = arch; const x0 = s.player.x; step(s, { move: { x: 1, y: 0 }, attack: false }, 1 / 60); return s.player.x - x0; };
ok('volleyball bro moves faster', stepDist('volleyball') > stepDist(null) * 1.1);

// Pothead: reduced supernatural damage, but not physical
const hitBy = (kind, arch) => {
  const s = createState(); s.started = true; s.player.archetype = arch; s.player.hp = 500; s.player.maxHp = 500;
  s.enemies.push({ kind, x: s.player.x, y: s.player.y, hp: 999, maxHp: 999, spd: 0, dmg: 20, xp: 0, coin: 0, rise: 1, phase: 0, hitT: 0, kx: 0, ky: 0, dir: 'left', lungeT: 0, lunging: 0, blinkT: 0 });
  const b = s.player.hp; for (let i = 0; i < 10 && s.player.hp === b; i++) step(s, NO_INPUT, 1 / 60); return b - s.player.hp;
};
ok('hippie takes less damage from a ghost (supernatural)', hitBy('ghost', 'hippie') < hitBy('ghost', null));
ok('hippie does NOT reduce zombie (physical) damage', Math.abs(hitBy('zombie', 'hippie') - hitBy('zombie', null)) < 1);

// --- 6c. tribe abilities (phase 2) ------------------------------------------
section('Tribe abilities');
const withTribe = (id, lvl = 6) => { const s = createState(); s.started = true; s.player.archetype = id; s.player.level = lvl; return s; };
const AB_ON = { move: { x: 0, y: 0 }, attack: false, ability1: true };
const AB_OFF = { move: { x: 0, y: 0 }, attack: false, ability1: false };

ok('ability locked before level 5', ability1State(withTribe('volleyball', 4)).unlocked === false);
const abUn = withTribe('volleyball', 5);
ok('ability unlocked + ready at level 5', ability1State(abUn).unlocked && ability1State(abUn).ready);

// Spike Dash
const dash = withTribe('volleyball', 6); dash.player.fx = 1; dash.player.fy = 0;
const dx0 = dash.player.x;
step(dash, AB_ON, 1 / 60);
ok('spike dash launches the player forward', dash.player.x > dx0 + 4);
ok('spike dash goes on cooldown', dash.player.ab1Cd > 0 && !ability1State(dash).ready);
ok('spike dash grants i-frames (dashT > 0)', dash.player.dashT > 0);

// i-frames really prevent damage
const ifr = withTribe('volleyball', 6); ifr.player.fx = 1; ifr.player.fy = 0;
ifr.enemies.push({ kind: 'zombie', x: ifr.player.x, y: ifr.player.y, hp: 999, maxHp: 999, spd: 0, dmg: 50, xp: 0, coin: 0, rise: 1, phase: 0, hitT: 0, kx: 0, ky: 0, dir: 'left', lungeT: 0, lunging: 0, blinkT: 0 });
const ifrHp = ifr.player.hp; step(ifr, AB_ON, 1 / 60);
ok('no damage taken during dash i-frames', ifr.player.hp === ifrHp);

// edge-trigger: holding the button doesn't recast
const edge = withTribe('tech', 6);
step(edge, AB_ON, 1 / 60); const cd1 = edge.player.ab1Cd;
for (let i = 0; i < 10; i++) step(edge, AB_ON, 1 / 60);
ok('holding the ability does not re-trigger it', edge.player.ab1Cd < cd1 && edge.player.ab1Cd > 0);

// Overclock
const oc = withTribe('tech', 6); step(oc, AB_ON, 1 / 60);
ok('overclock applies a haste buff', oc.player.hasteT > 0 && oc.player.hasteMoveMult > 1);

// Second Wind
const sw = withTribe('hippie', 6); sw.player.maxHp = 200; sw.player.hp = 50;
step(sw, AB_ON, 1 / 60);
ok('second wind heals', sw.player.hp > 50);
ok('second wind grants a damage shield', sw.player.shieldT > 0 && sw.player.shieldAmt > 0);
const swHp = sw.player.hp;
step(sw, AB_OFF, 1 / 60); step(sw, AB_ON, 1 / 60);   // release + press while still on cooldown
ok('cannot recast while on cooldown', sw.player.hp <= swHp + 2);

// --- 6c-1b. tribe ultimates (phase 3) ----------------------------------------
section('Tribe ultimates');
const ULT_ON = { move: { x: 0, y: 0 }, attack: false, ability1: false, ability2: true };
const ULT_OFF = { move: { x: 0, y: 0 }, attack: false, ability1: false, ability2: false };
const mkFoe = (s, dx, dy, hp = 60) => { const e = { kind: 'zombie', x: s.player.x + dx, y: s.player.y + dy, hp, maxHp: hp, spd: 30, dmg: 10,
  xp: 0, coin: 0, rise: 1, phase: 0, hitT: 0, kx: 0, ky: 0, dir: 'left', lungeT: 99, lunging: 0, blinkT: 99 }; s.enemies.push(e); return e; };

ok('ultimate locked before level 8', ability2State(withTribe('volleyball', 7)).unlocked === false);
ok('ultimate unlocked + ready at level 8', ability2State(withTribe('volleyball', 8)).ready === true);

// Ace: shockwave damages + stuns everything nearby
const ace = withTribe('volleyball', 10);
const near = mkFoe(ace, 40, 0), far = mkFoe(ace, 300, 0);
step(ace, ULT_ON, 1 / 60);
ok('ace damages a nearby enemy', near.hp < near.maxHp);
ok('ace stuns the nearby enemy', near.stunT > 0);
ok('ace spares distant enemies', far.hp === far.maxHp && !far.stunT);
ok('ace spawns a shockwave + goes on cooldown', ace.shocks.length === 1 && ace.player.ab2Cd > 0);
const nx0 = near.x;
for (let i = 0; i < 30; i++) step(ace, ULT_OFF, 1 / 60);
ok('stunned enemy does not chase (knockback drift only)', near.x >= nx0); // chasing would move it LEFT toward the player

// Drone: deploys, auto-fires, expires
const dr = withTribe('tech', 10);
mkFoe(dr, 60, 0, 500);
step(dr, ULT_ON, 1 / 60);
ok('drone deploys', dr.drone !== null);
let droneFired = false;
for (let i = 0; i < 90; i++) { step(dr, ULT_OFF, 1 / 60); if (dr.projectiles.some((p) => p.style === 'bolt')) { droneFired = true; break; } }
ok('drone auto-fires at a nearby enemy', droneFired);
dr.drone.ttl = 0.01; step(dr, ULT_OFF, 1 / 60);
ok('drone expires after its duration', dr.drone === null);

// Smoke Cloud: slows enemies inside and pacifies them
const sc = withTribe('hippie', 10);
const inFoe = mkFoe(sc, 30, 0, 500);
step(sc, ULT_ON, 1 / 60);
ok('smoke cloud placed', sc.clouds.length === 1);
// pacified: sitting inside the cloud, on top of the player, it can't bite
sc.player.hp = sc.player.maxHp = 300; inFoe.x = sc.player.x; inFoe.y = sc.player.y;
const hpB = sc.player.hp;
for (let i = 0; i < 40; i++) step(sc, ULT_OFF, 1 / 60);
ok('clouded enemies are too mellow to attack', sc.player.hp === hpB);
// slowed: compare approach speed with a cloudless twin
const scRef = withTribe('hippie', 10);
const refFoe = mkFoe(scRef, 30, 0, 500); refFoe.x = scRef.player.x + 200;
const cFoe = mkFoe(sc, 230, 0, 500); sc.clouds[0].x = cFoe.x; sc.clouds[0].ttl = 99;
const cx0 = cFoe.x, rx0 = refFoe.x;
for (let i = 0; i < 30; i++) { step(sc, ULT_OFF, 1 / 60); step(scRef, ULT_OFF, 1 / 60); }
ok('clouded enemies move slower', (cx0 - cFoe.x) < (rx0 - refFoe.x) * 0.7);

// hitting an ability level announces the unlock (so the UI can show the key)
const au = createState(); au.started = true; au.player.archetype = 'tech'; au.player.level = 4;
au.player.xp = xpNeed(4) - 1;                        // one kill from level 5
au.player.weapon = 'paddle'; au.player.owned.add('paddle');
mkFoe(au, 10, 0, 1).xp = 5;
for (let i = 0; i < 120 && au.player.level < 5; i++) { au.player.fx = 1; au.player.fy = 0; au.player.atkCd = 0; step(au, { move: { x: 0, y: 0 }, attack: true }, 1 / 60); }
ok('reaching level 5 emits an abilityUnlock event', au.events.some((e) => e.type === 'abilityUnlock' && e.slot === 1 && e.name === 'Overclock'));

// --- 6c-2. character style (cosmetic) ----------------------------------------
section('Character style');
const sty = createState();
ok('default style is m', sty.player.style === 'm');
setStyle(sty, 'f');
ok('setStyle switches to f', sty.player.style === 'f');
setStyle(sty, 'banana');
ok('setStyle rejects invalid values', sty.player.style === 'f');
// style-aware tribe names
const gal = createState(); gal.started = true; setStyle(gal, 'f');
chooseArchetype(gal, 'volleyball');
ok('gal style gets "Volleyball Gal"', gal.events.some((e) => e.type === 'toast' && e.t.includes('Volleyball Gal')));
const guy = createState(); guy.started = true;
chooseArchetype(guy, 'tech');
ok('guy style keeps "Tech Bro"', guy.events.some((e) => e.type === 'toast' && e.t.includes('Tech Bro')));

// --- 6d. daytime: squirrels, acorns, Park Score -----------------------------
section('Daytime loop');
const day = createState(); day.started = true;                 // starts in 'day'
step(day, NO_INPUT, 1 / 60);
ok('squirrels spawn during the day', day.squirrels.length > 0);
ok('acorns spawn under the trees', day.acorns.length > 0);

day.acorns.push({ x: day.player.x, y: day.player.y, bob: 0 });  // acorn on the player
const carriedBefore = day.player.acorns;
step(day, NO_INPUT, 1 / 60);
ok('walking over an acorn collects it', day.player.acorns > carriedBefore);

day.player.acorns = 3; day.squirrels.length = 0;                // feed a squirrel next to you
day.squirrels.push({ x: day.player.x + 8, y: day.player.y, tx: day.player.x, ty: day.player.y, dir: 'left', phase: 0, fed: 0, moving: 0 });
const score0 = day.parkScore, carry0 = day.player.acorns;
step(day, NO_INPUT, 1 / 60);
ok('feeding a squirrel raises Park Score', day.parkScore > score0);
ok('feeding consumes a carried acorn', day.player.acorns === carry0 - 1);
ok('best score tracks the high', day.bestScore >= day.parkScore && day.bestScore > 0);

const nite = createState(); nite.started = true; step(nite, NO_INPUT, 1 / 60);
nite.phase = 'night'; nite.spawnLeft = 10; nite.spawnTimer = 5; nite.phaseT = 50;
step(nite, NO_INPUT, 1 / 60);
ok('squirrels & acorns clear at night', nite.squirrels.length === 0 && nite.acorns.length === 0);

const ks = createState(); ks.started = true; ks.player.weapon = 'paddle'; ks.player.owned.add('paddle');
ks.enemies.push({ kind: 'zombie', x: ks.player.x + 12, y: ks.player.y, hp: 1, maxHp: 1, spd: 0, dmg: 0, xp: 0, coin: 0, rise: 1, phase: 0, hitT: 0, kx: 0, ky: 0, dir: 'left', lungeT: 0, lunging: 0, blinkT: 0 });
const ksc0 = ks.parkScore;
for (let i = 0; i < 120 && ks.parkScore === ksc0; i++) { ks.player.fx = 1; ks.player.fy = 0; ks.player.atkCd = 0; step(ks, { move: { x: 0, y: 0 }, attack: true }, 1 / 60); }
ok('killing enemies adds Park Score', ks.parkScore > ksc0);

// --- 7. landmark discovery --------------------------------------------------
section('Landmarks');
const z = createState(); z.started = true;
const coinsBefore = z.player.coins;
z.player.x = 53 * T; z.player.y = 46 * T;           // inside the pavilion rect
z.time = 100;                                       // past the zone cooldown
step(z, NO_INPUT, 1 / 60);
ok('landmark discovered on entry', z.found.size >= 1);
ok('landmark awards coins', z.player.coins >= coinsBefore + 25);
ok('landmark emits a toast event', z.events.some((e) => e.type === 'toast'));

// --- 8. shop actions --------------------------------------------------------
section('Shop');
const sh = createState(); sh.started = true;
sh.player.coins = 1000;
buyWeapon(sh, 'leash');
ok('buying a weapon deducts coins', sh.player.coins === 1000 - WEAPONS.leash.price);
ok('bought weapon is owned + equipped', sh.player.owned.has('leash') && sh.player.weapon === 'leash');
buyWeapon(sh, 'leash');                             // re-buy = just equip, no charge
ok('re-buying owned weapon is free', sh.player.coins === 1000 - WEAPONS.leash.price);
sh.player.hp = 10;
const preChile = sh.player.coins;
buyChile(sh);
ok('chile snack heals', sh.player.hp === 45);
ok('chile snack costs $25', sh.player.coins === preChile - 25);
sh.player.x = 44 * T; sh.player.y = 54.6 * T;
ok('nearShop true at the cart', nearShop(sh) === true);
sh.player.x = 0; sh.player.y = 0;
ok('nearShop false far away', nearShop(sh) === false);

// --- 9. death / respawn -----------------------------------------------------
section('Death & respawn');
const d = createState(); d.started = true;
d.player.hp = 5; d.night = 2;
d.enemies.push({ kind: 'zombie', x: d.player.x, y: d.player.y, hp: 999, maxHp: 999, spd: 0, dmg: 100,
  xp: 0, coin: 0, rise: 1, phase: 0, hitT: 0, kx: 0, ky: 0, dir: 'left' });
for (let i = 0; i < 120 && !d.dead; i++) step(d, NO_INPUT, 1 / 60);
ok('player dies at 0 HP', d.dead === true && d.paused === true);
ok('death emits a death event', d.events.some((e) => e.type === 'death'));
ok('first death burns a life (3 -> 2)', d.lives === 2 && d.gameOver === false);
const dEv = d.events.find((e) => e.type === 'death');
ok('death event reports remaining lives', dEv && dEv.lives === 2);
const coinsAtDeath = d.player.coins = 100;
d.player.dashT = 0.5; d.player.hasteT = 3; d.player.shieldT = 2; d.player.ab1Cd = 4; // died mid-buff
respawn(d);
ok('respawn clears dead/paused', !d.dead && !d.paused);
ok('respawn applies rescue fee', d.player.coins === Math.floor(coinsAtDeath * 0.75));
ok('respawn refills HP', d.player.hp === d.player.maxHp);
ok('respawn clears enemies', d.enemies.length === 0);
ok('respawn clears buffs, dash & cooldowns', d.player.dashT === 0 && d.player.hasteT === 0 && d.player.shieldT === 0 && d.player.ab1Cd === 0);

// burn the remaining lives -> game over, and respawn refuses
const g3 = createState(); g3.started = true;
const killPlayer = () => {
  g3.player.hp = 5; g3.dead = false; g3.paused = false;
  g3.enemies.push({ kind: 'zombie', x: g3.player.x, y: g3.player.y, hp: 999, maxHp: 999, spd: 0, dmg: 100,
    xp: 0, coin: 0, rise: 1, phase: 0, hitT: 0, kx: 0, ky: 0, dir: 'left', lungeT: 0, lunging: 0, blinkT: 0 });
  for (let i = 0; i < 120 && !g3.dead; i++) step(g3, NO_INPUT, 1 / 60);
};
killPlayer(); respawn(g3);
killPlayer(); respawn(g3);
killPlayer();
ok('third death is game over', g3.lives === 0 && g3.gameOver === true && g3.dead === true);
const goEv = g3.events.filter((e) => e.type === 'death').pop();
ok('game-over death event has lives 0 + bestScore', goEv && goEv.lives === 0 && typeof goEv.bestScore === 'number');
respawn(g3);
ok('respawn refuses when out of lives', g3.dead === true && g3.paused === true && g3.lives === 0);

// --- 10. serialization (save/load round-trip) -------------------------------
section('Serialization');
const src = createState(); src.started = true;
src.player.coins = 321; src.player.level = 4; src.player.owned.add('paddle'); src.player.weapon = 'paddle';
src.found.add('pav'); src.found.add('pool'); src.night = 3; src.bestNight = 3; src.player.style = 'f';
const save = JSON.parse(JSON.stringify(toSaveData(src)));  // must survive JSON
const dst = createState();
applySaveData(dst, save);
ok('coins persisted', dst.player.coins === 321);
ok('level persisted', dst.player.level === 4);
ok('owned set persisted', dst.player.owned.has('paddle'));
ok('found set persisted', dst.found.has('pav') && dst.found.has('pool'));
ok('bestNight persisted', dst.bestNight === 3);
ok('style persisted', dst.player.style === 'f');

// --- 11. soak: a full night with no crashes --------------------------------
section('Soak test');
let crashed = null;
try {
  const soak = createState(); soak.started = true;
  soak.phaseT = 0.001;
  for (let i = 0; i < 5000; i++) {
    const inp = { move: { x: Math.sin(i / 7), y: Math.cos(i / 9) }, attack: i % 2 === 0 };
    step(soak, inp, 1 / 60);
  }
} catch (e) { crashed = e; }
ok('5000-frame soak runs without throwing', crashed === null);
if (crashed) console.error(crashed);

// --- summary ---------------------------------------------------------------
console.log(`\n${failed === 0 ? '✓ ALL PASSED' : '✗ FAILURES'} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
