// ============================================================================
// config.js — deploy-time configuration.
//
// The Supabase anon key is PUBLIC by design (it ships to every browser);
// security comes from Postgres row-level security + insert triggers, never
// from hiding the key. Leave both empty to run with the leaderboard disabled.
// ============================================================================
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
