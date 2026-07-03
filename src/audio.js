// ============================================================================
// audio.js — procedural sound effects via WebAudio. No asset files: every
// sound is synthesized from oscillators and noise. The module OBSERVES the
// game — updateAudio(state) diffs a few fields each frame and plays matching
// cues. Nothing here mutates state, so the sim stays pure and deterministic.
//
// Browsers block audio until a user gesture: unlock() is wired to the first
// pointerdown/keydown in main.js. Safe to import headlessly (no AudioContext
// in Node -> every call no-ops).
// ============================================================================
import { WEAPONS } from './constants.js';

let ac = null;      // AudioContext, created lazily on first gesture
let master = null;
let muted = false;

export function setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : 1; }
export function isMuted() { return muted; }

export function unlock() {
  const AC = typeof AudioContext !== 'undefined' ? AudioContext
    : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null);
  if (!AC) return;
  try {
    if (!ac) {
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();   // iOS Safari
  } catch (e) { ac = null; }
}

// one enveloped oscillator note
function tone(freq, dur, { type = 'square', vol = 0.1, slide = 0, delay = 0 } = {}) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.03);
}

// a decaying burst of white noise (whooshes, thuds, poofs)
function hiss(dur, { vol = 0.07, delay = 0 } = {}) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const len = Math.max(1, (dur * ac.sampleRate) | 0);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource(); src.buffer = buf;
  const g = ac.createGain(); g.gain.value = vol;
  src.connect(g); g.connect(master);
  src.start(t);
}

// --- the cues ----------------------------------------------------------------
const cues = {
  shoot()    { hiss(0.05, { vol: 0.035 }); tone(720, 0.05, { type: 'triangle', vol: 0.045, slide: -320 }); },
  swing()    { hiss(0.09, { vol: 0.05 }); tone(240, 0.07, { type: 'sine', vol: 0.05, slide: 160 }); },
  kill()     { tone(300, 0.12, { vol: 0.09, slide: -190 }); hiss(0.08, { vol: 0.04 }); },
  hurt()     { tone(130, 0.18, { type: 'triangle', vol: 0.16, slide: -40 }); hiss(0.1, { vol: 0.06 }); },
  coin()     { tone(880, 0.06, { vol: 0.06 }); tone(1319, 0.09, { vol: 0.06, delay: 0.055 }); },
  acorn()    { tone(520, 0.05, { type: 'triangle', vol: 0.07 }); },
  squirrel() { tone(1480, 0.06, { vol: 0.06, slide: 320 }); tone(1720, 0.05, { vol: 0.05, delay: 0.07 }); },
  landmark() { [660, 880, 1109].forEach((f, i) => tone(f, 0.1, { type: 'triangle', vol: 0.07, delay: i * 0.07 })); },
  level()    { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.09, { vol: 0.07, delay: i * 0.07 })); },
  ability()  { tone(220, 0.16, { type: 'sawtooth', vol: 0.08, slide: 520 }); },
  ult()      { tone(150, 0.3, { type: 'sawtooth', vol: 0.1, slide: 420 }); hiss(0.22, { vol: 0.06, delay: 0.04 }); },
  night()    { tone(82, 0.9, { type: 'sine', vol: 0.13 }); tone(87, 0.9, { type: 'sine', vol: 0.1, delay: 0.05 }); },
  dawn()     { [392, 494, 587].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.06, delay: i * 0.1 })); },
  death()    { tone(330, 0.2, { type: 'triangle', vol: 0.12, slide: -140 }); tone(165, 0.35, { type: 'triangle', vol: 0.12, delay: 0.18, slide: -60 }); },
  gameOver() { [262, 196, 131, 98].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.11, delay: i * 0.22 })); },
};

// --- state observer ------------------------------------------------------------
let prev = null;
export function updateAudio(state) {
  if (!ac) return;
  const p = state.player;
  const snap = {
    coins: p.coins, hp: p.hp, kills: p.kills, level: p.level, phase: state.phase,
    atkCd: p.atkCd, ab1Cd: p.ab1Cd, ab2Cd: p.ab2Cd, dead: state.dead,
    found: state.found.size, acorns: p.acorns, score: state.parkScore,
  };
  if (!prev) { prev = snap; return; }
  if (snap.atkCd > prev.atkCd) (WEAPONS[p.weapon].kind === 'melee' ? cues.swing() : cues.shoot());
  if (snap.kills > prev.kills) cues.kill();
  if (snap.hp < prev.hp - 0.5) cues.hurt();
  if (snap.coins > prev.coins) cues.coin();
  if (snap.acorns > prev.acorns) cues.acorn();
  if (snap.found > prev.found) cues.landmark();
  else if (state.phase === 'day' && snap.score >= prev.score + 10) cues.squirrel(); // feeding = +10 by day
  if (snap.level > prev.level) cues.level();
  if (snap.ab1Cd > prev.ab1Cd) cues.ability();
  if (snap.ab2Cd > prev.ab2Cd) cues.ult();
  if (snap.phase !== prev.phase) (snap.phase === 'night' ? cues.night() : cues.dawn());
  if (snap.dead && !prev.dead) (state.gameOver ? cues.gameOver() : cues.death());
  prev = snap;
}
