// ============================================================================
// simulate.js — the authoritative game simulation. Pure logic: no DOM, no
// canvas, no wall-clock. Everything is a function of (state, inputs, dt).
//
// Co-op design note: `step` is exactly what a host runs. `inputs` is a plain
// object describing ONE player's intent this frame ({move:{x,y}, attack}). To
// go multiplayer, run step on the host with each connected player's inputs and
// broadcast the resulting state — no gameplay code changes. Randomness flows
// through state.simSeed so outcomes are reproducible.
// ============================================================================
import { WEAPONS, ZONES, ENEMY_TYPES, ENEMY_ORDER, ARCHETYPES, ARCHETYPE_LEVEL, archName, xpNeed, T, MW, MH, G, SOLID_GROUND, SHOP_POS } from './constants.js';
import { gi, inMap, getG } from './tiles.js';
import { makeRng } from './rng.js';

// --- small helpers ---------------------------------------------------------
const emit = (state, ev) => state.events.push(ev);
const toast = (state, t, p, ms) => emit(state, { type:'toast', t, p, ms });
export function addFloat(state, x, y, txt, col) { state.floats.push({ x, y, txt, col, ttl:0.9 }); }

// current archetype perk bundle (empty object when none chosen)
const perk = (state) => ARCHETYPES[state.player.archetype] || {};
// add coins with the Tech Bro multiplier applied; returns the actual amount added
function addCoins(state, n) {
  const amt = Math.round(n * (perk(state).coinMult || 1));
  state.player.coins += amt;
  return amt;
}
// shop price after any archetype discount
export function effectivePrice(state, base) { return Math.round(base * (perk(state).priceMult || 1)); }
export function weaponPrice(state, id) { return effectivePrice(state, WEAPONS[id].price); }

// Park Score — the unified score (squirrels fed, landmarks, kills, nights)
function addScore(state, n) { state.parkScore += n; if (state.parkScore > state.bestScore) state.bestScore = state.parkScore; }

export const nearShop = (state) =>
  Math.hypot(state.player.x - SHOP_POS.x, state.player.y - SHOP_POS.y) < 46;

export const ambientActive = (state, a) => state.phase === 'day' || a.kind === 'stoner';

// player collision uses a small footprint box
function passable(state, px, py) {
  for (const [ox, oy] of [[-4, -2], [4, -2], [-4, 2], [4, 2]]) {
    const tx = Math.floor((px + ox) / T), ty = Math.floor((py + oy) / T);
    if (!inMap(tx, ty)) return false;
    if (SOLID_GROUND.has(state.ground[gi(tx, ty)])) return false;
    if (state.solid[gi(tx, ty)]) return false;
  }
  return true;
}
function zPassable(state, px, py) {
  const tx = Math.floor(px / T), ty = Math.floor(py / T);
  if (!inMap(tx, ty)) return false;
  if (state.ground[gi(tx, ty)] === G.WATER) return false;
  if (state.solid[gi(tx, ty)]) return false;
  return true;
}

// --- player ----------------------------------------------------------------
function movePlayer(state, inputs, dt, rng) {
  const p = state.player;
  if (p.dashT > 0) {                       // Spike Dash: locked trajectory, i-frames, damages on contact
    const nx = p.x + p.dashVX * dt, ny = p.y + p.dashVY * dt;
    if (passable(state, nx, p.y)) p.x = nx;
    if (passable(state, p.x, ny)) p.y = ny;
    p.moving = true; p.phase += dt * 16;
    for (const e of state.enemies) {
      if (e.rise < 1 || e.dashHit) continue;
      const ex = e.x - p.x, ey = (e.y - 8) - (p.y - 8), d = Math.hypot(ex, ey);
      if (d < p.dashRange) { e.dashHit = true; damageEnemy(state, e, p.dashDmg * p.dmgMult, ex / Math.max(1, d) * p.dashKnock, ey / Math.max(1, d) * p.dashKnock, rng); }
    }
    if (inputs.attack) tryAttack(state, rng);
    return;
  }
  let dx = inputs.move.x, dy = inputs.move.y;
  const m = Math.hypot(dx, dy);
  p.moving = m > 0.01;
  if (p.moving) {
    dx /= Math.max(1, m); dy /= Math.max(1, m);
    p.fx = dx; p.fy = dy;
    if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 'right' : 'left';
    else p.dir = dy > 0 ? 'down' : 'up';
    const spd = p.speed * (perk(state).moveMult || 1) * (p.hasteT > 0 ? p.hasteMoveMult : 1);
    const nx = p.x + dx * spd * dt, ny = p.y + dy * spd * dt;
    if (passable(state, nx, p.y)) p.x = nx;
    if (passable(state, p.x, ny)) p.y = ny;
    p.phase += dt * 10;
  }
  if (p.boulderT > 0) {                    // Bolder Boulder: ram everything you touch
    if (p.moving && rng() < 0.55) {        // kicked-up dust in your wake
      state.particles.push({ x: p.x - p.fx * 6 + rng() * 8 - 4, y: p.y + rng() * 3,
        vx: -p.fx * 24 + rng() * 24 - 12, vy: -10 - rng() * 14, ttl: 0.45, col: rng() < 0.5 ? '#b8a888' : '#9a8a6f' });
    }
    for (const e of state.enemies) {
      if (e.rise < 1 || (e.ramCd || 0) > 0) continue;
      const ex = e.x - p.x, ey = (e.y - 8) - (p.y - 8), d2 = Math.hypot(ex, ey);
      if (d2 < 16) {
        e.ramCd = 0.5;
        damageEnemy(state, e, p.ramDmg * p.dmgMult, ex / Math.max(1, d2) * p.ramKnock, ey / Math.max(1, d2) * p.ramKnock, rng);
        state.shocks.push({ x: e.x, y: e.y - 8, r: 0, max: 26, t: 0.2, t0: 0.2 });   // impact pop
        for (let k = 0; k < 6; k++) state.particles.push({ x: e.x, y: e.y - 8, vx: rng() * 90 - 45, vy: rng() * -70, ttl: 0.35, col: k % 2 ? '#e07a3f' : '#f2ead6' });
      }
    }
  }
  if (inputs.attack) tryAttack(state, rng);
}

// --- NPCs (daytime flavor) -------------------------------------------------
function moveNPC(n, dt) {
  const w = n.wp[n.i], gx = w[0] * T, gy = w[1] * T, dx = gx - n.x, dy = gy - n.y, m = Math.hypot(dx, dy);
  if (m < 4) { n.i = (n.i + 1) % n.wp.length; return; }
  n.x += dx / m * n.sp * dt; n.y += dy / m * n.sp * dt; n.phase += dt * (n.sp / 6);
  n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}
function updateNpcs(state, dt, rng) {
  for (const n of state.npcs) {
    if (n.b && (n.b.t -= dt) <= 0) n.b = null;
    if (state.phase === 'day') {
      moveNPC(n, dt);
      n.cd -= dt;
      if (n.cd <= 0 && n.lines && Math.hypot(state.player.x - n.x, state.player.y - n.y) < 34) {
        n.b = { txt: n.lines[(rng() * n.lines.length) | 0], t: 2.4 }; n.cd = 10 + rng() * 8;
      }
    }
  }
}

// --- ambient characters ----------------------------------------------------
function updateAmbients(state, dt, rng) {
  const player = state.player;
  for (const a of state.ambients) {
    if (a.b && (a.b.t -= dt) <= 0) a.b = null;
    if (!ambientActive(state, a)) continue;
    a.cd -= dt;
    const hx = a.kind === 'vb' ? a.nx : a.x, hy = a.kind === 'vb' ? a.ny : a.y;
    if (a.cd <= 0 && Math.hypot(player.x - hx, player.y - hy) < 52) {
      const pool = (a.kind === 'stoner' && state.phase === 'night') ? a.nightLines : a.lines;
      a.b = { txt: pool[(rng() * pool.length) | 0], t: 2.8 }; a.cd = 9 + rng() * 6;
    }
    if (a.kind === 'slack') {
      if (a.fall > 0) { a.fall -= dt; if (a.fall <= 0) { a.wob = 0; } continue; }
      a.u += a.du * dt; if (a.u > 0.85 || a.u < 0.15) { a.du *= -1; a.u = Math.max(0.15, Math.min(0.85, a.u)); }
      a.wob += dt * (0.35 + rng() * 0.3);
      a.x = 11 * T + (17 * T - 11 * T) * a.u;
      if (a.wob > 4 && rng() < 0.006) { a.fall = 2.4; a.b = { txt: a.fallLines[(rng() * a.fallLines.length) | 0], t: 2.4 }; }
    }
    if (a.kind === 'vb') {
      if (a.pause > 0) { a.pause -= dt; continue; }
      a.u += dt / 1.4;
      if (a.u >= 1) {
        a.u = 0; a.rally++;
        a.src = a.hitter;
        a.hitter = a.src < 2 ? 2 + (rng() < .5 ? 0 : 1) : (rng() < .5 ? 0 : 1);
        if (a.rally > 4 + rng() * 6) { a.rally = 0; a.pause = 1.6; if (!a.b) a.b = { txt: 'Little help?!', t: 2.2 }; }
      }
    }
    if (a.kind === 'stoner') {
      a.puff -= dt;
      if (a.puff <= 0) {
        a.puff = 2.2 + rng() * 2.5;
        for (let k = 0; k < 3; k++) state.particles.push({ x: a.x + 2, y: a.y - 14 - k * 2, vx: 3 + rng() * 4, vy: -8 - rng() * 6,
          ttl: 1.6, col: '#c9c9c9', ng: 1 });
      }
    }
    if (a.kind === 'ham') a.sway += dt * 1.5;
    if (a.kind === 'dance') a.beat += dt;
    if (a.kind === 'dogpark') {
      for (const d of a.dogs) {
        if (d.pause > 0) { d.pause -= dt; continue; }             // stopped to sniff
        const dx = d.tx - d.x, dy = d.ty - d.y, m = Math.hypot(dx, dy);
        if (m < 6) {                                              // reached target — pick a new one
          if (rng() < 0.5 && a.dogs.length > 1) {                 // chase another dog (playing)
            const o = a.dogs[(rng() * a.dogs.length) | 0];
            d.tx = o.x + (rng() * 28 - 14); d.ty = o.y + (rng() * 28 - 14);
          } else {                                                // romp to a random spot in the pack's area
            const ang = rng() * 6.283, rr = rng() * a.r;
            d.tx = a.x + Math.cos(ang) * rr; d.ty = a.y + Math.sin(ang) * rr;
          }
          if (rng() < 0.3) d.pause = 0.3 + rng() * 0.7;
          continue;
        }
        d.x += dx / m * d.sp * dt; d.y += dy / m * d.sp * dt; d.phase += dt * 10;
        d.dir = dx < 0 ? 'left' : 'right';
      }
    }
  }
}

// --- enemies ---------------------------------------------------------------
function updateEnemies(state, dt, rng) {
  const player = state.player;
  for (const e of state.enemies) {
    const ty = ENEMY_TYPES[e.kind];
    if (e.hitT > 0) e.hitT -= dt;
    if (e.ramCd > 0) e.ramCd -= dt;
    if (e.rise < 1) { e.rise += dt * ty.riseSpd; continue; }
    e.phase += dt * (ty.fly ? 4 : 6);
    e.x += e.kx * dt * 6; e.y += e.ky * dt * 6; e.kx *= Math.pow(.001, dt); e.ky *= Math.pow(.001, dt);
    if (e.stunT > 0) { e.stunT -= dt; continue; }          // Ace-stunned: knockback drift only
    const dx = player.x - e.x, dy = (player.y - 4) - e.y, d = Math.hypot(dx, dy);
    e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');

    let inCloud = null;
    for (const c of state.clouds) if (Math.hypot(e.x - c.x, e.y - c.y) < c.r) { inCloud = c; break; }
    let spd = e.spd;
    if (inCloud) spd *= inCloud.slow;                      // mellowed, moving through syrup
    if (state.zenT > 0) spd *= ARCHETYPES.yogi.ability2.slow; // zen: the world moves like honey
    if (ty.lunge) {                                    // werewolf: periodic speed bursts
      e.lungeT -= dt;
      if (e.lungeT <= 0) { e.lungeT = 1.4 + rng() * 1.2; e.lunging = 0.35; }
      if (e.lunging > 0) { e.lunging -= dt; spd = e.spd * 2.6; }
    }
    let vx = dx / Math.max(1, d) * spd, vy = dy / Math.max(1, d) * spd;
    if (ty.weave) vx += Math.sin(e.phase) * 10;        // ghost/alien: weaving drift
    if (ty.blink && (e.blinkT -= dt) <= 0 && d > 64) { // alien: short teleport toward the player
      e.blinkT = 2.5 + rng() * 2;
      const jump = Math.min(d * 0.5, 80);
      for (let k = 0; k < 6; k++) state.particles.push({ x: e.x, y: e.y - 8, vx: rng() * 40 - 20, vy: rng() * 40 - 20, ttl: .35, col: ty.deathCol });
      e.x += dx / d * jump; e.y += dy / d * jump;
    }

    if (ty.fly) { e.x += vx * dt; e.y += vy * dt; } // fliers phase through everything
    else {
      const nx = e.x + vx * dt, ny = e.y + vy * dt;
      if (zPassable(state, nx, e.y)) e.x = nx; else e.y += (dy > 0 ? 1 : -1) * spd * dt * 0.7;
      if (zPassable(state, e.x, ny)) e.y = ny; else e.x += (dx > 0 ? 1 : -1) * spd * dt * 0.7;
    }

    // dashT = i-frames; ghostT = sprint phasing; boulderT = you're the hazard;
    // clouded enemies are too chill to bite
    if (d < 12 && player.hurtCd <= 0 && player.dashT <= 0 && player.ghostT <= 0 && player.boulderT <= 0 && !inCloud) {
      const pk = perk(state);
      if (pk.dodge && rng() < pk.dodge) {                  // yogi: the attack just... misses
        player.hurtCd = 0.8;
        addFloat(state, player.x, player.y - 24, 'miss', '#b9c79a');
        continue;
      }
      player.hurtCd = 0.8; player.flashT = 0.25;
      let dmg = e.dmg;
      if (pk.superRes && ty.super) dmg = Math.round(dmg * (1 - pk.superRes)); // hippie shrugs off the supernatural
      if (pk.moveRes && player.moving) dmg = Math.round(dmg * (1 - pk.moveRes)); // jogger: momentum armor
      if (player.shieldT > 0) dmg = Math.round(dmg * (1 - player.shieldAmt)); // second wind
      player.hp -= dmg;
      addFloat(state, player.x, player.y - 24, '-' + dmg, '#c94f43');
      const kd = Math.max(1, d);
      player.x -= dx / kd * 10; player.y -= dy / kd * 10;
      if (ty.lifesteal) e.hp = Math.min(e.maxHp, e.hp + Math.round(e.dmg * 0.5)); // vampire drain
      if (player.hp <= 0) die(state);
    }
  }
}

// --- projectiles -----------------------------------------------------------
function updateProjectiles(state, dt, rng) {
  const { projectiles, enemies } = state;
  for (const p of [...projectiles]) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.ttl -= dt; p.spin += dt * 20;
    let hit = null;
    for (const e of enemies) { if (e.rise < 1) continue; if (Math.hypot(e.x - p.x, e.y - 8 - p.y) < 9 + p.size) { hit = e; break; } }
    if (hit || p.ttl <= 0) {
      if (p.splash && (hit || p.ttl <= 0)) {
        for (const e of [...enemies]) {
          if (e.rise < 1) continue;
          const d = Math.hypot(e.x - p.x, e.y - 8 - p.y);
          if (d < p.splash) damageEnemy(state, e, p.dmg, (e.x - p.x) / Math.max(1, d) * 50, (e.y - 8 - p.y) / Math.max(1, d) * 50, rng);
        }
        for (let k = 0; k < 10; k++) state.particles.push({ x: p.x, y: p.y, vx: rng() * 80 - 40, vy: rng() * -60, ttl: .4, col: '#4c9a3f' });
        for (let k = 0; k < 6; k++) state.particles.push({ x: p.x, y: p.y, vx: rng() * 110 - 55, vy: rng() * -75, ttl: .45, col: k % 2 ? '#e07a3f' : '#e5c04b' }); // roasted burst
      } else if (hit) {
        damageEnemy(state, hit, p.dmg, p.vx * 0.15, p.vy * 0.15, rng);
      }
      if (hit || p.splash) projectiles.splice(projectiles.indexOf(p), 1);
      else if (p.ttl <= 0) projectiles.splice(projectiles.indexOf(p), 1);
    }
  }
}

// --- pickups ---------------------------------------------------------------
function updatePickups(state, dt) {
  const player = state.player;
  for (const p of [...state.pickups]) {
    p.ttl -= dt; p.bob += dt * 4;
    const d = Math.hypot(p.x - player.x, p.y - player.y);
    if (d < 40) { p.x += (player.x - p.x) * dt * 6; p.y += (player.y - p.y) * dt * 6; }
    if (d < 12) {
      if (p.t === 'coin') { const got = addCoins(state, p.v); addFloat(state, p.x, p.y - 14, '+$' + got, '#e5c04b'); }
      else { player.hp = Math.min(player.maxHp, player.hp + 20); addFloat(state, p.x, p.y - 14, '+20 HP', '#7cc95a'); }
      state.pickups.splice(state.pickups.indexOf(p), 1);
    } else if (p.ttl <= 0) state.pickups.splice(state.pickups.indexOf(p), 1);
  }
}

// --- landmark discovery ----------------------------------------------------
function checkZones(state) {
  const now = state.time;
  if (now - state.lastZoneT < 4) return;
  const tx = state.player.x / T, ty = state.player.y / T;
  for (const z of ZONES) {
    if (state.found.has(z.id)) continue;
    let hit = false;
    if (z.grounds !== undefined) hit = z.grounds.includes(getG(state, Math.floor(tx), Math.floor(ty)));
    else { const [a, b, c, d] = z.r; hit = tx >= a && tx <= c && ty >= b && ty <= d; }
    if (hit) {
      state.found.add(z.id); state.lastZoneT = now;
      const got = addCoins(state, 25); addFloat(state, state.player.x, state.player.y - 22, '+$' + got, '#e5c04b');
      addScore(state, 25);
      toast(state, z.t, z.p, 6500);
      if (state.found.size === 8) {
        const pay = addCoins(state, 100);
        toast(state, 'Park Ranger Badge', 'All 8 landmarks found. +$' + pay + ' hazard pay.', 6000);
      }
      break;
    }
  }
}

// --- combat ----------------------------------------------------------------
function tryAttack(state, rng) {
  const player = state.player;
  if (player.atkCd > 0 || state.paused) return;
  const w = WEAPONS[player.weapon];
  player.atkCd = w.rate / (player.hasteT > 0 ? player.hasteRateMult : 1);
  // aim assist: snap to nearest enemy within 180px
  let ax = player.fx, ay = player.fy, best = null, bd = 180;
  for (const e of state.enemies) { if (e.rise < 1) continue; const d = Math.hypot(e.x - player.x, e.y - player.y); if (d < bd) { bd = d; best = e; } }
  if (best) { const d = Math.max(1, bd); ax = (best.x - player.x) / d; ay = (best.y - player.y - 8) / d; }
  if (w.kind === 'melee') {
    const ang = Math.atan2(ay, ax);
    state.swings.push({ x: player.x, y: player.y - 8, ang, t: 0.12, range: w.range, style: w.style });
    for (const e of [...state.enemies]) {
      if (e.rise < 1) continue;
      const dx = e.x - player.x, dy = e.y - 8 - (player.y - 8), d = Math.hypot(dx, dy);
      if (d > w.range + 8) continue;
      const dot = (dx * ax + dy * ay) / Math.max(1, d);
      if (dot > 0.15) damageEnemy(state, e, w.dmg * player.dmgMult * (perk(state).meleeMult || 1), (dx / d) * (w.knock || 40), (dy / d) * (w.knock || 40), rng);
    }
  } else {
    state.projectiles.push({ x: player.x + ax * 8, y: player.y - 9 + ay * 8, vx: ax * w.spd, vy: ay * w.spd,
      dmg: w.dmg * player.dmgMult * (perk(state).rangedMult || 1), ttl: w.ttl, size: w.size, col: w.col, splash: w.splash || 0, spin: 0, style: w.style });
  }
}

function damageEnemy(state, e, dmg, kx, ky, rng) {
  const km = perk(state).knockMult || 1;
  e.hp -= dmg; e.hitT = 0.1; e.kx += (kx || 0) * km; e.ky += (ky || 0) * km;
  addFloat(state, e.x + (rng() * 8 - 4), e.y - 18, Math.round(dmg), '#fff');
  if (e.hp <= 0) killEnemy(state, e, true, rng);
}

function killEnemy(state, e, drops, rng) {
  const i = state.enemies.indexOf(e); if (i < 0) return;
  state.enemies.splice(i, 1);
  for (let k = 0; k < 8; k++) state.particles.push({ x: e.x, y: e.y - 8, vx: rng() * 60 - 30, vy: rng() * -50 - 10, ttl: .5,
    col: ENEMY_TYPES[e.kind].deathCol });
  if (!drops) return;
  state.player.kills++;
  addScore(state, 2);
  gainXp(state, e.xp);
  let c = e.coin;
  while (c > 0) { const v = Math.min(c, 2 + (rng() * 3 | 0)); c -= v;
    state.pickups.push({ t: 'coin', v, x: e.x + rng() * 16 - 8, y: e.y + rng() * 12 - 6, ttl: 20, bob: rng() * 6 }); }
  if (rng() < 0.10) state.pickups.push({ t: 'chile', x: e.x, y: e.y, ttl: 20, bob: rng() * 6 });
}

function gainXp(state, n) {
  const player = state.player;
  player.xp += n;
  while (player.xp >= xpNeed(player.level)) {
    player.xp -= xpNeed(player.level);
    player.level++; player.maxHp += 10; player.dmgMult += 0.07;
    player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.4));
    addFloat(state, player.x, player.y - 24, 'LEVEL ' + player.level + '!', '#e5c04b');
    toast(state, 'Level ' + player.level, 'Max HP +10, damage +7%. The park recognizes your service.', 3500);
    // announce newly unlocked tribe abilities (UI adds the device-specific key/button hint)
    const arch = ARCHETYPES[player.archetype];
    if (arch) {
      if (arch.ability1 && player.level === arch.ability1.level) emit(state, { type: 'abilityUnlock', slot: 1, name: arch.ability1.name, icon: arch.ability1.icon });
      if (arch.ability2 && player.level === arch.ability2.level) emit(state, { type: 'abilityUnlock', slot: 2, name: arch.ability2.name, icon: arch.ability2.icon });
    }
    if (player.level >= ARCHETYPE_LEVEL && !player.archetype && !state.choosing) {
      state.choosing = true; state.paused = true;                 // freeze for the tribe pick
      emit(state, { type: 'archetypeChoice' });
    }
  }
}

// cosmetic look choice ('m' | 'f') — no gameplay effect
export function setStyle(state, s) {
  if (s === 'm' || s === 'f') state.player.style = s;
}

export function chooseArchetype(state, id) {
  if (!ARCHETYPES[id]) return;
  state.player.archetype = id;
  state.choosing = false; state.paused = false;
  toast(state, archName(ARCHETYPES[id], state.player.style), ARCHETYPES[id].flavor, 4500);
}

// --- abilities -------------------------------------------------------------
// UI-facing status for ability 1 (button/cooldown display).
export function ability1State(state) {
  const ab = (ARCHETYPES[state.player.archetype] || {}).ability1;
  if (!ab) return null;
  const unlocked = state.player.level >= ab.level;
  return { name: ab.name, icon: ab.icon, unlocked, cd: state.player.ab1Cd, cdMax: ab.cd,
    ready: unlocked && state.player.ab1Cd <= 0 && state.player.dashT <= 0 };
}

function useAbility1(state, rng) {
  const p = state.player, ab = (ARCHETYPES[p.archetype] || {}).ability1;
  if (!ab) return;
  p.ab1Cd = ab.cd;
  if (p.archetype === 'volleyball') {            // Spike Dash
    let dx = p.fx, dy = p.fy; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
    p.dashT = ab.dashTime; p.dashVX = dx * ab.dashSpd; p.dashVY = dy * ab.dashSpd;
    p.dashDmg = ab.dmg; p.dashRange = ab.range; p.dashKnock = ab.knock;
    for (const e of state.enemies) e.dashHit = false;
  } else if (p.archetype === 'tech') {           // Overclock
    p.hasteT = ab.dur; p.hasteMoveMult = ab.speed; p.hasteRateMult = ab.haste;
    addFloat(state, p.x, p.y - 26, 'OVERCLOCK', '#7fd0ff');
  } else if (p.archetype === 'hippie') {         // Second Wind
    const heal = Math.round(p.maxHp * ab.healFrac);
    p.hp = Math.min(p.maxHp, p.hp + heal);
    p.shieldT = ab.dur; p.shieldAmt = ab.resist;
    addFloat(state, p.x, p.y - 26, '+' + heal + ' HP', '#7cc95a');
  } else if (p.archetype === 'jogger') {         // Sprint: burst + phase through enemies
    p.hasteT = ab.dur; p.hasteMoveMult = ab.speed; p.hasteRateMult = 1;
    p.ghostT = ab.dur;
    addFloat(state, p.x, p.y - 26, 'ON YOUR LEFT!', '#e07a3f');
  } else if (p.archetype === 'yogi') {           // Flow Roll: i-frame reposition, no damage
    let dx = p.fx, dy = p.fy; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
    p.dashT = ab.rollTime; p.dashVX = dx * ab.rollSpd; p.dashVY = dy * ab.rollSpd;
    p.dashDmg = 0; p.dashRange = 0; p.dashKnock = 0;
  }
}

// UI-facing status for ability 2 (the ultimate).
export function ability2State(state) {
  const ab = (ARCHETYPES[state.player.archetype] || {}).ability2;
  if (!ab) return null;
  const unlocked = state.player.level >= ab.level;
  return { name: ab.name, icon: ab.icon, unlocked, cd: state.player.ab2Cd, cdMax: ab.cd,
    ready: unlocked && state.player.ab2Cd <= 0 };
}

function useAbility2(state, rng) {
  const p = state.player, ab = (ARCHETYPES[p.archetype] || {}).ability2;
  if (!ab) return;
  p.ab2Cd = ab.cd;
  if (p.archetype === 'volleyball') {            // Ace: radial shockwave
    state.shocks.push({ x: p.x, y: p.y - 8, r: 0, max: ab.radius, t: 0.35, t0: 0.35 });
    for (const e of state.enemies) {
      if (e.rise < 1) continue;
      const dx = e.x - p.x, dy = (e.y - 8) - (p.y - 8), d = Math.hypot(dx, dy);
      if (d > ab.radius) continue;
      e.stunT = ab.stun;
      damageEnemy(state, e, ab.dmg * p.dmgMult, dx / Math.max(1, d) * ab.knock, dy / Math.max(1, d) * ab.knock, rng);
    }
    addFloat(state, p.x, p.y - 28, 'ACE!', '#f2ead6');
  } else if (p.archetype === 'tech') {           // Deploy Drone
    state.drone = { ttl: ab.dur, fireCd: 0.4, x: p.x + 16, y: p.y - 30 };
    addFloat(state, p.x, p.y - 26, 'DRONE ONLINE', '#7fd0ff');
  } else if (p.archetype === 'hippie') {         // Smoke Cloud
    state.clouds.push({ x: p.x, y: p.y - 6, r: ab.radius, ttl: ab.dur, slow: ab.slow });
    addFloat(state, p.x, p.y - 26, 'chill…', '#b9c79a');
  } else if (p.archetype === 'jogger') {         // Bolder Boulder: weaponized momentum
    p.boulderT = ab.dur; p.hasteT = ab.dur; p.hasteMoveMult = ab.speed; p.hasteRateMult = 1;
    p.ramDmg = ab.dmg; p.ramKnock = ab.knock;
    for (const e of state.enemies) e.ramCd = 0;
    addFloat(state, p.x, p.y - 28, 'BOLDER BOULDER!', '#e07a3f');
  } else if (p.archetype === 'yogi') {           // Zen Mode: the world slows down
    state.zenT = ab.dur;
    addFloat(state, p.x, p.y - 28, '☯ zen', '#b9a8d8');
  }
}

// the Tech drone: hovers by the player, auto-fires at the nearest enemy
function updateDrone(state, dt) {
  const d = state.drone; if (!d) return;
  d.ttl -= dt; if (d.ttl <= 0) { state.drone = null; return; }
  const p = state.player;
  const tx = p.x + 16, ty = p.y - 30 + Math.sin(state.time * 4) * 3;
  d.x += (tx - d.x) * Math.min(1, dt * 6); d.y += (ty - d.y) * Math.min(1, dt * 6);
  d.fireCd -= dt;
  if (d.fireCd <= 0) {
    let best = null, bd = 170;
    for (const e of state.enemies) { if (e.rise < 1) continue; const dist = Math.hypot(e.x - d.x, (e.y - 8) - d.y); if (dist < bd) { bd = dist; best = e; } }
    if (best) {
      const ab = ARCHETYPES.tech.ability2;
      d.fireCd = ab.rate;
      const ang = Math.atan2((best.y - 8) - d.y, best.x - d.x);
      state.projectiles.push({ x: d.x, y: d.y, vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 260,
        dmg: ab.dmg * p.dmgMult * (ARCHETYPES.tech.rangedMult || 1), ttl: 0.8, size: 3, col: '#7fd0ff', splash: 0, spin: 0, style: 'bolt' });
    }
  }
}

// edge-triggered: fires on the frame the input goes from up -> down
function handleAbilities(state, inputs, rng) {
  const p = state.player;
  const st1 = ability1State(state);
  if (inputs.ability1 && !p.ab1Held && st1 && st1.ready) useAbility1(state, rng);
  p.ab1Held = !!inputs.ability1;
  const st2 = ability2State(state);
  if (inputs.ability2 && !p.ab2Held && st2 && st2.ready) useAbility2(state, rng);
  p.ab2Held = !!inputs.ability2;
}

// --- day / night -----------------------------------------------------------
// Late-game difficulty: nights 1–7 ramp gently, then the park stops holding
// back — every night past 7 compounds (more HP, more damage, bigger waves).
// Player power keeps growing too, so runs should end around nights 8–12.
const lateNights = (night) => Math.max(0, night - 7);

function startNight(state) {
  state.night++; state.phase = 'night'; state.phaseT = 55;
  state.spawnLeft = Math.min(60, 5 + 4 * state.night + lateNights(state.night) * 3);
  state.spawnTimer = 0.8;
  toast(state, '🌙 Night ' + state.night, state.night === 1
    ? 'The lawn is moving over by the old cemetery. That’s not the sprinklers.'
    : 'They’re back, and there are more of them.', 5000);
  // announce any monster kind that first unlocks tonight
  for (const k of ENEMY_ORDER) {
    const ty = ENEMY_TYPES[k];
    if (ty.minNight === state.night && ty.intro) toast(state, ty.intro[0], ty.intro[1], 6000);
  }
}
function startDay(state, rng) {
  state.phase = 'day'; state.phaseT = 25;
  state.bestNight = Math.max(state.bestNight, state.night);
  addScore(state, 100 * state.night);           // big Park Score bonus for surviving the night
  const bonus = addCoins(state, 10 + 6 * state.night);
  addFloat(state, state.player.x, state.player.y - 20, '+$' + bonus, '#e5c04b');
  for (const e of [...state.enemies]) killEnemy(state, e, false, rng);
  toast(state, '☀ Dawn', 'Night ' + state.night + ' survived. Ranger bonus: $' + bonus + '. Restock while you can.', 5000);
}
function spawnEnemy(state, rng) {
  const player = state.player, night = state.night;
  // weighted pick among the kinds unlocked by this night
  const elig = ENEMY_ORDER.filter((k) => night >= ENEMY_TYPES[k].minNight);
  let total = 0; for (const k of elig) total += ENEMY_TYPES[k].weight;
  let r = rng() * total, kind = elig[elig.length - 1];
  for (const k of elig) { r -= ENEMY_TYPES[k].weight; if (r <= 0) { kind = k; break; } }
  const ty = ENEMY_TYPES[kind];
  let x, y, tries = 0;
  do {
    if (rng() < 0.6) { x = (18 + rng() * 10) * T; y = (28 + rng() * 10) * T; }  // cemetery lawn
    else { x = (6 + rng() * (MW - 14)) * T; y = (6 + rng() * (MH - 14)) * T; }
    tries++;
  } while ((Math.hypot(x - player.x, y - player.y) < 130 || SOLID_GROUND.has(getG(state, x / T | 0, y / T | 0))) && tries < 24);
  const hp = ty.hp0 + ty.hpN * (night + lateNights(night));   // HP growth doubles past night 7
  const spd = Math.min(ty.spdMax, ty.spd0 + ty.spdN * night);
  const dmg = ty.dmg + lateNights(night);                     // +1 damage per late night
  state.enemies.push({ kind, x, y, hp, maxHp: hp, spd, dmg, xp: ty.xp,
    coin: ty.coin0 + night + (rng() * 3 | 0), rise: ty.rise, phase: rng() * 6, hitT: 0, kx: 0, ky: 0, dir: 'down',
    lungeT: rng() * 1.5, lunging: 0, blinkT: rng() * 3, ramCd: 0 });
  for (let i = 0; i < 6; i++) state.particles.push({ x: x + (rng() * 10 - 5), y, vx: rng() * 20 - 10, vy: -20 - rng() * 30, ttl: .5, col: ty.spawnCol });
}

// --- death / respawn -------------------------------------------------------
function die(state) {
  state.paused = true; state.dead = true;
  state.lives -= 1;
  state.gameOver = state.lives <= 0;
  emit(state, { type: 'death', night: state.night, kills: state.player.kills,
    score: state.parkScore, bestScore: state.bestScore, lives: state.lives });
}
export function respawn(state) {
  if (state.lives <= 0) return;   // out of rescues — the run is over
  const p = state.player;
  p.coins = Math.floor(p.coins * 0.75);
  p.hp = p.maxHp;
  p.x = 53 * T; p.y = 46 * T;
  // clear transient combat state so you don't wake up mid-dash or pre-buffed
  p.atkCd = 0; p.hurtCd = 0; p.flashT = 0; p.ab1Cd = 0; p.ab2Cd = 0;
  p.dashT = 0; p.hasteT = 0; p.shieldT = 0; p.ghostT = 0; p.boulderT = 0;
  state.enemies.length = 0; state.projectiles.length = 0;
  state.swings.length = 0; state.particles.length = 0; state.floats.length = 0; state.pickups.length = 0;
  state.drone = null; state.clouds.length = 0; state.shocks.length = 0; state.zenT = 0;
  state.phase = 'day'; state.phaseT = 25;
  state.dead = false; state.paused = false;
  toast(state, '☀ Dawn', 'You wake up on the pavilion steps. A ranger took a 25% "rescue fee."', 5000);
}

// --- shop actions (invoked by UI now; routed through inputs for co-op later) -
export function buyWeapon(state, id) {
  const w = WEAPONS[id]; if (!w) return;
  const price = weaponPrice(state, id);
  if (state.player.owned.has(id)) { state.player.weapon = id; }
  else if (state.player.coins >= price) { state.player.coins -= price; state.player.owned.add(id); state.player.weapon = id; }
}
export function buyChile(state) {
  const price = effectivePrice(state, 25);
  if (state.player.coins >= price && state.player.hp < state.player.maxHp) {
    state.player.coins -= price; state.player.hp = Math.min(state.player.maxHp, state.player.hp + 35);
  }
}

// --- daytime: squirrels & acorns -------------------------------------------
function spawnSquirrels(state, rng, n) {
  for (let i = 0; i < n; i++) {
    let x, y, tries = 0;
    do { x = (10 + rng() * (MW - 20)) * T; y = (10 + rng() * (MH - 20)) * T; tries++; }
    while (Math.hypot(x - state.player.x, y - state.player.y) < 120 && tries < 12);
    state.squirrels.push({ x, y, tx: x, ty: y, dir: 'right', phase: rng() * 6, fed: 0, moving: 0 });
  }
}
function spawnAcorns(state, rng, n) {
  const trees = state.objects.filter((o) => o.type === 'tree' || o.type === 'tree2' || o.type === 'pine');
  if (!trees.length) return;
  for (let i = 0; i < n; i++) {
    const tr = trees[(rng() * trees.length) | 0];
    state.acorns.push({ x: tr.x * T + (rng() * 20 - 10), y: tr.y * T + 8 + rng() * 8, bob: rng() * 6 });
  }
}
function feedSquirrel(state, s, rng) {
  state.player.acorns -= 1;
  addScore(state, 10);
  addCoins(state, 3);
  addFloat(state, s.x, s.y - 14, '+10', '#e5c04b');
  s.fed = 2.5;  // satiated: scampers off, won't feed again for a bit
  for (let k = 0; k < 5; k++) state.particles.push({ x: s.x, y: s.y - 6, vx: rng() * 30 - 15, vy: -10 - rng() * 20, ttl: .5, col: '#e5c04b' });
}
function updateSquirrels(state, dt, rng) {
  const p = state.player;
  for (const s of state.squirrels) {
    s.phase += dt * 12;
    const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy);
    let vx = 0, vy = 0, spd = 34;
    if (s.fed > 0) {                              // satiated: scamper away happily
      s.fed -= dt; spd = 80; vx = -dx / Math.max(1, d); vy = -dy / Math.max(1, d);
    } else if (p.acorns > 0 && d < 150) {         // you have food: they come to you
      spd = 70; vx = dx / Math.max(1, d); vy = dy / Math.max(1, d);
      if (d < 14) { feedSquirrel(state, s, rng); continue; }
    } else if (p.acorns <= 0 && d < 55) {         // no food + too close: skittish, flee
      spd = 95; vx = -dx / Math.max(1, d); vy = -dy / Math.max(1, d);
    } else {                                      // roam toward a wander target
      const tdx = s.tx - s.x, tdy = s.ty - s.y, td = Math.hypot(tdx, tdy);
      if (td < 6) { s.tx = s.x + (rng() * 120 - 60); s.ty = s.y + (rng() * 120 - 60); }
      else { vx = tdx / td; vy = tdy / td; }
    }
    s.x = Math.max(4 * T, Math.min((MW - 4) * T, s.x + vx * spd * dt));
    s.y = Math.max(4 * T, Math.min((MH - 4) * T, s.y + vy * spd * dt));
    if (Math.abs(vx) > 0.01) s.dir = vx > 0 ? 'right' : 'left';
    s.moving = (vx || vy) ? 1 : 0;
  }
}
// spawn critters at daybreak, clear them at nightfall, trickle acorns, collect them
function updateDaytime(state, dt, rng) {
  if (state.phase === 'day') {
    if (!state.crittersActive) {
      state.crittersActive = true;
      state.squirrels.length = 0; state.acorns.length = 0;
      spawnSquirrels(state, rng, 5); spawnAcorns(state, rng, 8); state.acornT = 0;
    }
    state.acornT -= dt;
    if (state.acornT <= 0) { state.acornT = 2.5; if (state.acorns.length < 8) spawnAcorns(state, rng, 1); }
    // collect acorns you walk over
    for (let i = state.acorns.length - 1; i >= 0; i--) {
      const a = state.acorns[i]; a.bob += dt * 4;
      if (Math.hypot(a.x - state.player.x, a.y - state.player.y) < 14) {
        state.player.acorns++; addFloat(state, a.x, a.y - 12, '🌰', '#b8864a'); state.acorns.splice(i, 1);
      }
    }
    updateSquirrels(state, dt, rng);
  } else if (state.crittersActive) {              // nightfall: everyone hides
    state.crittersActive = false;
    state.squirrels.length = 0; state.acorns.length = 0;
  }
}

// ============================================================================
// step — advance the whole world by dt seconds for the given player inputs.
// ============================================================================
export function step(state, inputs, dt) {
  if (!state.started || state.paused) return;
  const rng = makeRng(state.simSeed);
  state.time += dt;
  const p = state.player;

  handleAbilities(state, inputs, rng);
  movePlayer(state, inputs, dt, rng);
  updateNpcs(state, dt, rng);
  updateAmbients(state, dt, rng);
  updateEnemies(state, dt, rng);
  updateDrone(state, dt);
  updateProjectiles(state, dt, rng);
  updatePickups(state, dt);
  updateDaytime(state, dt, rng);
  checkZones(state);

  p.atkCd -= dt; p.hurtCd -= dt; p.flashT -= dt;
  p.ab1Cd = Math.max(0, p.ab1Cd - dt);
  p.ab2Cd = Math.max(0, p.ab2Cd - dt);
  for (let i = state.clouds.length - 1; i >= 0; i--) { const c = state.clouds[i]; c.ttl -= dt; if (c.ttl <= 0) state.clouds.splice(i, 1); }
  for (let i = state.shocks.length - 1; i >= 0; i--) { const s = state.shocks[i]; s.t -= dt; s.r = s.max * (1 - Math.max(0, s.t) / (s.t0 || 0.35)); if (s.t <= 0) state.shocks.splice(i, 1); }
  p.dashT = Math.max(0, p.dashT - dt);
  p.hasteT = Math.max(0, p.hasteT - dt);
  p.shieldT = Math.max(0, p.shieldT - dt);
  p.ghostT = Math.max(0, p.ghostT - dt);
  p.boulderT = Math.max(0, p.boulderT - dt);
  if (state.zenT > 0) {                                   // zen: heal while the world crawls
    state.zenT = Math.max(0, state.zenT - dt);
    p.hp = Math.min(p.maxHp, p.hp + ARCHETYPES.yogi.ability2.regen * dt);
  }
  if (perk(state).regen) p.hp = Math.min(p.maxHp, p.hp + perk(state).regen * dt); // hippie regen
  if (perk(state).stillRegen && !p.moving) p.hp = Math.min(p.maxHp, p.hp + perk(state).stillRegen * dt); // yogi stillness

  for (const s of [...state.swings]) { s.t -= dt; if (s.t <= 0) state.swings.splice(state.swings.indexOf(s), 1); }
  for (const pt of [...state.particles]) {
    pt.ttl -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    if (!pt.ng) pt.vy += 140 * dt;
    if (pt.ttl <= 0) state.particles.splice(state.particles.indexOf(pt), 1);
  }
  for (const f of [...state.floats]) { f.ttl -= dt; f.y -= 18 * dt; if (f.ttl <= 0) state.floats.splice(state.floats.indexOf(f), 1); }

  // day/night clock
  state.phaseT -= dt;
  if (state.phase === 'night') {
    if (state.spawnLeft > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) { spawnEnemy(state, rng); state.spawnLeft--; state.spawnTimer = Math.max(0.5, 2.0 - state.night * 0.08 - lateNights(state.night) * 0.06); }
    }
    if (state.phaseT <= 0 || (state.spawnLeft === 0 && state.enemies.length === 0)) startDay(state, rng);
  } else if (state.phaseT <= 0) startNight(state);

  state.simSeed = rng.getSeed();
}
