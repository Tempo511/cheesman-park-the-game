-- ============================================================================
-- Cheesman Park leaderboard schema. Paste into Supabase SQL Editor and Run.
--
-- Security model: the anon key is public; ALL enforcement happens here.
--  * Row-level security: anyone may INSERT and SELECT — never UPDATE/DELETE
--    (append-only; nobody can edit or erase scores).
--  * The insert trigger rejects implausible rows: the maximum possible Park
--    Score is computable from the game's rules for a given night + kills.
--  * One post per name per 60s (crude but effective rate limit).
--  * `replay` stores the full input recording for v2 server-side replay
--    verification (an Edge Function re-running the deterministic sim).
-- ============================================================================

create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null check (char_length(name) between 1 and 16),
  score      int  not null check (score >= 0),
  night      int  not null check (night between 0 and 60),
  kills      int  not null check (kills >= 0),
  archetype  text check (archetype is null or archetype in ('volleyball','tech','hippie','jogger','yogi')),
  style      text check (style is null or style in ('m','f')),
  seed       bigint,
  version    text,
  replay     jsonb
);

-- Maximum possible Park Score for a run that reached night N with K kills,
-- derived from the game's scoring rules (see simulate.js):
--   landmarks: 8 x 25 = 200, ever
--   kills:     2 per kill
--   dawns:     100 x night at each dawn survived  -> 50*N*(N-1)
--   bosses:    150 x night on nights 5,10,15... <= N
--   daytime:   squirrels/pets are time-capped; 350/day is generous, N+1 days
--   gardens:   one run per boss night; 30 flowers x 15 + 100 perfect = 550 each
--   benefactor: one-time park projects, 300 + 1000 + 2000 = 3300 max, ever
create or replace function public.max_plausible_score(n int, k int)
returns int language sql immutable as $$
  select 200 + 2*k + 50*n*(n-1)
       + coalesce((select sum(150*b)::int from generate_series(5, greatest(n,0), 5) as b), 0)
       + 350*(n+1)
       + 550 * (greatest(n,0) / 5)
       + 3300;
$$;

create or replace function public.scores_guard()
returns trigger language plpgsql as $$
begin
  -- kills are bounded by what the game can actually spawn
  if new.kills > 90 * new.night + 10 then
    raise exception 'implausible kills for night %', new.night;
  end if;
  if new.score > public.max_plausible_score(new.night, new.kills) then
    raise exception 'implausible score for night % / % kills', new.night, new.kills;
  end if;
  -- crude rate limit: one post per name per minute
  if exists (select 1 from public.scores s
             where s.name = new.name
               and s.created_at > now() - interval '60 seconds') then
    raise exception 'rate limited';
  end if;
  return new;
end $$;

create trigger scores_guard
before insert on public.scores
for each row execute function public.scores_guard();

alter table public.scores enable row level security;
create policy "public read"   on public.scores for select using (true);
create policy "public insert" on public.scores for insert with check (true);
-- deliberately NO update/delete policies: the board is append-only

create index scores_by_score on public.scores (score desc, created_at asc);
