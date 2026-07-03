// ============================================================================
// tiles.js — tiny helpers for reading the tile grid out of game state.
// Shared by map generation, simulation, and rendering.
// ============================================================================
import { MW, MH, G } from './constants.js';

export const gi = (x, y) => y * MW + x;
export const inMap = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;

// Ground tile at (x,y); off-map reads as ROAD (impassable border).
export const getG = (state, x, y) => (inMap(x, y) ? state.ground[gi(x, y)] : G.ROAD);
