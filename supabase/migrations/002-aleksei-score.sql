-- ============================================================================
-- Manual score entry: Aleksei.
--
-- Reached night 80 in a ~3-hour run, could not post because the old night-60
-- ceiling (see 001-lift-night-cap.sql) silently rejected the insert. Score
-- verified by hand against the game's plausibility rules:
--   * kills 2418  <=  90*80 + 10  = 7210                          (kills bound)
--   * score 406611 <= max_plausible_score(80, 2418) = 463486      (score bound)
-- Both pass, and the numbers are internally consistent for a night-80 run.
--
-- Run AFTER 001-lift-night-cap.sql. The scores_guard trigger re-validates this
-- row on insert, so it will only succeed if the plausibility math still holds.
-- archetype/style/seed/replay are unknown (not captured in his email) -> null.
-- ============================================================================

insert into public.scores (name, score, night, kills, version)
values ('Aleksei', 406611, 80, 2418, 'manual-verified');
