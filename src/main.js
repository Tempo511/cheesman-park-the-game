// ============================================================================
// main.js — bootstrap + game loop. The only module that wires all layers
// together: input -> simulate -> render/ui.
//
// The loop is deliberately thin. Everything meaningful lives in the modules;
// this file just pumps them. Swapping the local `step(state, ...)` for a
// networked host is a change confined to this loop.
// ============================================================================
import { createState } from './state.js';
import { step, respawn, nearShop } from './simulate.js';
import { makeRng } from './rng.js';
import { buildSprites } from './sprites.js';
import { initRender, renderGround, renderGardenGround, buildMini, render, renderFx, renderMini, resize, resizeFx } from './render.js';
import { initUI, updateHud, drainEvents, hideDeath, openShop, closeShop, isShopOpen, toast as drainToast } from './ui.js';
import { initInput, getInputs } from './input.js';
import { unlock as unlockAudio, updateAudio, setMuted, isMuted } from './audio.js';
import { createRecorder, recordFrame, finishRecording, quantizeInputs, quantizeDtMs } from './replay.js';

const SAVE_KEY = 'cheesman.save.v1';
const MUTE_KEY = 'cheesman.muted';

// --- state -----------------------------------------------------------------
const state = createState();
const recorder = createRecorder(state.worldSeed);   // every run is recorded for leaderboard replay

// Each visit starts a FRESH run (level 1, frisbee). Only a meta high-score —
// the best night you've survived — persists across sessions.
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) { const d = JSON.parse(raw); state.bestNight = d.bestNight || 0; state.bestScore = d.bestScore || 0; }
} catch (e) { /* ignore corrupt/absent saves */ }

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ bestNight: state.bestNight, bestScore: state.bestScore })); } catch (e) { /* storage full/blocked */ }
}

// --- render + ui setup -----------------------------------------------------
const refs = {
  cv: document.getElementById('game'), ctx: document.getElementById('game').getContext('2d'),
  fxCv: document.getElementById('fx'), fctx: document.getElementById('fx').getContext('2d'),
  miniCv: document.getElementById('mini'), mctx: document.getElementById('mini').getContext('2d'),
};
const SPR = buildSprites(makeRng(state.worldSeed ^ 0x5bd1e995)); // cosmetic stream (client-local)
initRender(refs, SPR);
renderGround(state);
renderGardenGround(state);
buildMini();
resize();
resizeFx();

// --- mobile: block play in portrait (a CSS overlay tells them to rotate) ----
// pointer coarseness is read live (it changes when DevTools emulation toggles)
const coarseMQ = matchMedia('(pointer: coarse)');
const portraitMQ = matchMedia('(orientation: portrait)');
let orientationBlocked = coarseMQ.matches && portraitMQ.matches;
function refreshOrientation() { orientationBlocked = coarseMQ.matches && portraitMQ.matches; last = 0; }
for (const mq of [portraitMQ, coarseMQ]) {
  mq.addEventListener ? mq.addEventListener('change', refreshOrientation) : mq.addListener(refreshOrientation);
}
addEventListener('resize', () => { resize(); resizeFx(); refreshOrientation(); });

initUI(state, {
  onStart: () => {
    state.started = true;
    setTimeout(() => drainToast('☀ Day shift',
      'Explore, find landmarks for Bucks, and visit the Ranger Cart by the pavilion. Night falls when the timer hits zero.', 7000), 400);
  },
  onRespawn: () => { respawn(state); drainEvents(state); hideDeath(); },
  onNewRun: () => { save(); location.reload(); },   // fresh-run-per-load model
  getRecording: () => finishRecording(recorder, state),   // for leaderboard submission
});

initInput({
  onShop: () => { if (state.started && !state.paused && nearShop(state)) openShop(); },
  onEscape: () => { if (isShopOpen()) closeShop(); },
});

// --- sound: unlock on first gesture (browser autoplay policy), mute toggle --
try { setMuted(localStorage.getItem(MUTE_KEY) === '1'); } catch (e) { /* fine */ }
addEventListener('pointerdown', unlockAudio);
addEventListener('keydown', unlockAudio);
const muteBtn = document.getElementById('muteBtn');
const paintMute = () => { muteBtn.textContent = isMuted() ? '🔇' : '🔊'; };
paintMute();
muteBtn.addEventListener('click', () => {
  setMuted(!isMuted());
  try { localStorage.setItem(MUTE_KEY, isMuted() ? '1' : '0'); } catch (e) { /* fine */ }
  paintMute();
});

// --- haptics (Android; iOS Safari has no Vibration API and simply ignores) --
const buzz = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* unsupported */ } };

// --- loop ------------------------------------------------------------------
let last = 0, prevNight = 0, prevHp = state.player.hp, prevLevel = state.player.level, wasDead = false;
function frame(ts) {
  const t = ts / 1000;
  // when the tab/app is backgrounded, freeze entirely (saves battery, and the
  // world can't advance while the phone is pocketed) and resync the clock.
  if (document.hidden) { last = t; requestAnimationFrame(frame); return; }
  const dt = last ? Math.min(0.05, t - last) : 0; last = t;

  const active = state.started && !state.paused && !orientationBlocked;
  if (active && dt > 0) {
    // quantize inputs + dt, and feed the sim EXACTLY what we record — that
    // equality is what makes leaderboard replays reproduce the run
    const qi = quantizeInputs(getInputs());
    const dtMs = quantizeDtMs(dt);
    recordFrame(recorder, dtMs, qi);
    step(state, qi, dtMs / 1000);
    drainEvents(state);
    updateHud(state);
    // haptic feedback on meaningful moments
    if (state.player.hp < prevHp) buzz(25);
    if (state.player.level > prevLevel) buzz([0, 35, 30, 35]);
    if (state.dead && !wasDead) buzz(180);
    if (state.night !== prevNight) { prevNight = state.night; save(); } // checkpoint each dawn
  } else {
    drainEvents(state); // still surface death card / toasts while paused
  }
  // keep the feedback trackers in sync even across paused/blocked frames so we
  // don't fire a phantom buzz on resume
  prevHp = state.player.hp; prevLevel = state.player.level; wasDead = state.dead;

  render(state, t);
  renderFx(state);
  renderMini(state, t);
  updateAudio(state);   // observes state diffs; no-op until first gesture
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// --- debug hooks: DEV HOSTS ONLY (localhost / LAN) — with a public
// leaderboard, the console cheats stay out of production ---
const DEV_HOST = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
  || /^(10\.|192\.168\.)/.test(location.hostname);
if (DEV_HOST) {
  window.__state = state;
  window.__diag = () => ({
    started: state.started, paused: state.paused, orientationBlocked,
    dead: state.dead, hidden: document.hidden, lastTs: last,
    coarsePointer: coarseMQ.matches, portrait: portraitMQ.matches,
    night: state.night, phaseT: Math.round(state.phaseT),
    playerXY: [Math.round(state.player.x), Math.round(state.player.y)],
  });
}

// save on the way out
addEventListener('beforeunload', save);
