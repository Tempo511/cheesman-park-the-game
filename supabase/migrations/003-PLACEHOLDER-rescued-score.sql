-- ============================================================================
-- Manual score entry: <NAME> (TEMPLATE — fill in and rename before running).
--
-- His run predates the replay-compression fix (src/replay.js packReplay):
-- marathon recordings serialized to 5-15 MB of JSON, the API killed the
-- connection past ~5 MB, and the client showed the failure as "Not accepted".
-- The run lived only in his open tab, so the fixed client can never post it —
-- hence a hand-verified insert, same procedure as 002-aleksei-score.sql.
--
-- Verify against the plausibility rules before running (numbers from his
-- game-over screenshot):
--   * kills <KILLS>  <=  90*<NIGHT> + 10                        (kills bound)
--   * score <SCORE>  <=  max_plausible_score(<NIGHT>, <KILLS>)  (score bound)
-- The scores_guard trigger re-validates on insert, so this only succeeds if
-- the math holds. archetype/style/seed/replay unknown -> null.
-- ============================================================================

insert into public.scores (name, score, night, kills, version)
values ('<NAME>', <SCORE>, <NIGHT>, <KILLS>, 'manual-verified');
