// ============================================================================
// leaderboard.js — Supabase-backed global scores via its REST API (PostgREST).
// Plain fetch, no SDK. All trust lives server-side: row-level security makes
// the table append-only, and an insert trigger rejects implausible scores
// (see supabase/schema.sql). Everything here fails soft — no leaderboard,
// no problem, the game never notices.
// ============================================================================
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const leaderboardEnabled = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

const HEADERS = () => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
});

// mild client-side name hygiene (the flyer will be read by kids)
const BAD = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'nigg', 'fagg', 'rape'];
export function cleanName(raw) {
  let n = String(raw || '').trim().slice(0, 16);
  if (!n) return 'Ranger';
  const low = n.toLowerCase();
  if (BAD.some((w) => low.includes(w))) return 'Ranger';
  return n;
}

// Submit a finished run. Returns { ok, error? }.
export async function submitScore(entry) {
  if (!leaderboardEnabled()) return { ok: false, error: 'leaderboard not configured' };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
      method: 'POST',
      headers: { ...HEADERS(), Prefer: 'return=minimal' },
      body: JSON.stringify({
        name: cleanName(entry.name),
        score: entry.score, night: entry.night, kills: entry.kills,
        archetype: entry.archetype, style: entry.style,
        seed: entry.seed, version: entry.version, replay: entry.replay,
      }),
    });
    if (!res.ok) return { ok: false, error: 'rejected (' + res.status + ')' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'offline' };
  }
}

// Top N scores, best first.
export async function fetchTop(limit = 10) {
  if (!leaderboardEnabled()) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/scores?select=name,score,night,kills,archetype&order=score.desc,created_at.asc&limit=${limit}`,
      { headers: HEADERS() });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

// Your rank: 1 + how many scores beat yours.
export async function fetchRank(score) {
  if (!leaderboardEnabled()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scores?select=id&score=gt.${score}`, {
      method: 'HEAD',
      headers: { ...HEADERS(), Prefer: 'count=exact' },
    });
    const range = res.headers.get('content-range') || '';
    const total = parseInt(range.split('/')[1], 10);
    return Number.isFinite(total) ? total + 1 : null;
  } catch (e) { return null; }
}
