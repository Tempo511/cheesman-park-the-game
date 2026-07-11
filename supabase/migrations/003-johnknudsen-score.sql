-- ============================================================================
-- Manual score entry: JohnKnudsen (night 75, 2026-07-10).
--
-- His run predates the replay-compression fix (src/replay.js packReplay):
-- marathon recordings serialized to 5-15 MB of JSON, the API killed the
-- connection past ~5 MB, and the client surfaced that as a failed post. His
-- own earlier row proves the diagnosis: JohnnyKnudsen night 39 stored a
-- 4.7 MB replay — the biggest on the board — so night 75 from the same
-- device was roughly double, well past the limit. The run lived only in his
-- open tab, so the fixed client can't repost it — hence a hand-verified
-- insert, same procedure as 002-aleksei-score.sql.
--
-- Verified against the plausibility rules (game-over screenshot, 2026-07-11):
--   * kills 948    <=  90*75 + 10 = 6760                        (kills bound)
--   * score 363776 <=  max_plausible_score(75, 948) = 407746    (score bound)
--   * coherent: dawns 277500 + all bosses 90000 + kills 1896 = 369396, and
--     his 363776 sits just under — the shape of a real night-75 run.
-- The scores_guard trigger re-validates on insert, so this only succeeds if
-- the math still holds. Name is as he typed it in the post box (his earlier
-- run posted as "JohnnyKnudsen" — edit below if he'd rather they match).
-- Archetype from the HUD in his screenshot; style/seed/replay unknown -> null.
-- ============================================================================

insert into public.scores (name, score, night, kills, archetype, version)
values ('JohnKnudsen', 363776, 75, 948, 'jogger', 'manual-verified');
