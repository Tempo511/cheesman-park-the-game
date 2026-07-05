// ============================================================================
// config.js — deploy-time configuration.
//
// The Supabase publishable key is PUBLIC by design (it ships to every
// browser); security comes from Postgres row-level security + insert
// triggers (see supabase/schema.sql), never from hiding the key.
// ============================================================================
export const SUPABASE_URL = 'https://ufkufnwlpodxgkfbkfnl.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_lobLoVr9Gf2-Ero-eS-MiQ_rDOkKxne';
