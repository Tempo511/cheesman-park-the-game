// ============================================================================
// replay.js — run recording & deterministic replay.
//
// A recording is: the world seed + the exact (dt, inputs) stream the sim
// consumed + the action log (shop buys, tribe picks, respawns) stamped with
// the frame they happened at. Because the simulation is deterministic and
// DOM-free, feeding the recording back through step() reproduces the run —
// including its final Park Score — exactly.
//
// This powers leaderboard anti-cheat: v1 stores recordings alongside scores;
// v2 replays them server-side (this module runs unchanged in Deno/Supabase
// Edge Functions) and derives the score itself, ignoring the client's claim.
//
// Frames are run-length encoded as [count, dtMs, moveX, moveY, buttonFlags]
// — inputs change rarely, so a full run compresses to tens of KB.
// ============================================================================
import { createState } from './state.js';
import { step, buyWeapon, buyChile, chooseArchetype, setStyle, respawn } from './simulate.js';
import { GAME_VERSION } from './constants.js';

// Quantize analog inputs so what we record is bit-identical to what the sim
// consumed (the caller must feed the sim these quantized values).
export function quantizeInputs(raw) {
  const q = (v) => Math.round(Math.max(-1, Math.min(1, v)) * 64) / 64;
  return {
    move: { x: q(raw.move.x), y: q(raw.move.y) },
    attack: !!raw.attack, ability1: !!raw.ability1, ability2: !!raw.ability2,
  };
}
export const quantizeDtMs = (dt) => Math.max(1, Math.min(50, Math.round(dt * 1000)));

export function createRecorder(seed) {
  return { seed: seed >>> 0, frames: [], last: null };
}

export function recordFrame(rec, dtMs, inp) {
  const flags = (inp.attack ? 1 : 0) | (inp.ability1 ? 2 : 0) | (inp.ability2 ? 4 : 0);
  const l = rec.last;
  if (l && l[1] === dtMs && l[2] === inp.move.x && l[3] === inp.move.y && l[4] === flags) l[0]++;
  else { const e = [1, dtMs, inp.move.x, inp.move.y, flags]; rec.frames.push(e); rec.last = e; }
}

export function finishRecording(rec, state) {
  return { v: GAME_VERSION, seed: rec.seed, frames: rec.frames, actions: state.actionLog };
}

// Re-run a recording through the actual simulation and return what really
// happened. The claimed score never enters into it.
const ACTIONS = { buyWeapon, buyChile, chooseArchetype, setStyle };
export function replay(recording) {
  const st = createState(recording.seed);
  st.started = true;
  const actions = recording.actions || [];
  let ai = 0;
  outer:
  for (const [n, dtMs, mx, my, flags] of recording.frames) {
    for (let i = 0; i < n; i++) {
      // apply the actions that happened at this point in the run (they were
      // performed while the live game was paused between steps)
      while (ai < actions.length && actions[ai].f <= st.frame) {
        const act = actions[ai++];
        if (act.a === 'respawn') respawn(st);
        else if (ACTIONS[act.a]) ACTIONS[act.a](st, act.v);
      }
      // pauses never advance the sim, so recordings contain no paused frames;
      // clear pause flags the sim itself raised (tribe pick, death card)
      st.paused = false; st.choosing = false;
      step(st, { move: { x: mx, y: my }, attack: !!(flags & 1), ability1: !!(flags & 2), ability2: !!(flags & 4) }, dtMs / 1000);
      if (st.gameOver) break outer;
    }
  }
  return { score: st.parkScore, night: st.night, kills: st.player.kills,
    level: st.player.level, gameOver: st.gameOver, frames: st.frame };
}
