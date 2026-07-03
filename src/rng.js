// ============================================================================
// rng.js — seedable deterministic PRNG (LCG).
//
// This is the backbone of co-op readiness: given the same seed, every client
// produces the identical world and identical random outcomes. World generation
// and the authoritative simulation each carry their own seed stream so they can
// be reproduced independently.
// ============================================================================

// Returns a function rnd() -> float in [0,1), plus getSeed/setSeed so the
// current position of the stream can be stored in (serializable) game state.
export function makeRng(seed) {
  let s = seed >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  rnd.getSeed = () => s;
  rnd.setSeed = (v) => { s = v >>> 0; };
  return rnd;
}
