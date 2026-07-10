-- ============================================================================
-- Migration: lift the night ceiling.
--
-- The original table capped night at 60 (`check (night between 0 and 60)`) on
-- the assumption that runs end around night 8-12. They don't — skilled players
-- blow past 60, and every one of those runs was silently rejected on insert and
-- shown to the player as a network / "no signal" failure. Those are exactly the
-- top-of-leaderboard scores we most want to keep.
--
-- The fix: there is no legitimate reason for a hard night (or score) cap.
-- Plausibility is already enforced by scores_guard -> max_plausible_score(night,
-- kills) plus the kills bound (90*night + 10), both of which scale correctly
-- with night. So we drop the fixed ceiling and let the calculation do its job.
--
-- Paste into the Supabase SQL Editor and Run. Idempotent — safe to re-run.
-- ============================================================================

alter table public.scores drop constraint if exists scores_night_check;
alter table public.scores add  constraint scores_night_check check (night >= 0);
