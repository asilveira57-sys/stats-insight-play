CREATE TABLE IF NOT EXISTS public.team_stats_cache (
  team_id uuid PRIMARY KEY REFERENCES public.times(id) ON DELETE CASCADE,
  total_matches int NOT NULL DEFAULT 0,
  wins int NOT NULL DEFAULT 0,
  draws int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0,
  goals_scored int NOT NULL DEFAULT 0,
  goals_conceded int NOT NULL DEFAULT 0,
  home_wins int NOT NULL DEFAULT 0,
  home_matches int NOT NULL DEFAULT 0,
  away_wins int NOT NULL DEFAULT 0,
  away_matches int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.team_stats_cache TO authenticated, anon;
GRANT ALL ON public.team_stats_cache TO service_role;

ALTER TABLE public.team_stats_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_stats_cache_public_read" ON public.team_stats_cache;
CREATE POLICY "team_stats_cache_public_read" ON public.team_stats_cache
  FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.refresh_team_stats_cache()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_started timestamptz := clock_timestamp();
BEGIN
  WITH home AS (
    SELECT
      p.time_casa_id AS team_id,
      COUNT(*)::int AS matches,
      COUNT(*) FILTER (WHERE p.gols_casa > p.gols_fora)::int AS wins,
      COUNT(*) FILTER (WHERE p.gols_casa = p.gols_fora)::int AS draws,
      COUNT(*) FILTER (WHERE p.gols_casa < p.gols_fora)::int AS losses,
      COALESCE(SUM(p.gols_casa), 0)::int AS scored,
      COALESCE(SUM(p.gols_fora), 0)::int AS conceded
    FROM public.partidas p
    WHERE p.status = 'finished'
      AND p.gols_casa IS NOT NULL
      AND p.gols_fora IS NOT NULL
      AND p.time_casa_id IS NOT NULL
    GROUP BY p.time_casa_id
  ),
  away AS (
    SELECT
      p.time_fora_id AS team_id,
      COUNT(*)::int AS matches,
      COUNT(*) FILTER (WHERE p.gols_fora > p.gols_casa)::int AS wins,
      COUNT(*) FILTER (WHERE p.gols_fora = p.gols_casa)::int AS draws,
      COUNT(*) FILTER (WHERE p.gols_fora < p.gols_casa)::int AS losses,
      COALESCE(SUM(p.gols_fora), 0)::int AS scored,
      COALESCE(SUM(p.gols_casa), 0)::int AS conceded
    FROM public.partidas p
    WHERE p.status = 'finished'
      AND p.gols_casa IS NOT NULL
      AND p.gols_fora IS NOT NULL
      AND p.time_fora_id IS NOT NULL
    GROUP BY p.time_fora_id
  ),
  ids AS (
    SELECT team_id FROM home
    UNION
    SELECT team_id FROM away
  ),
  agg AS (
    SELECT
      i.team_id,
      (COALESCE(h.matches, 0) + COALESCE(a.matches, 0))::int AS total_matches,
      (COALESCE(h.wins, 0)    + COALESCE(a.wins, 0))::int    AS wins,
      (COALESCE(h.draws, 0)   + COALESCE(a.draws, 0))::int   AS draws,
      (COALESCE(h.losses, 0)  + COALESCE(a.losses, 0))::int  AS losses,
      (COALESCE(h.scored, 0)  + COALESCE(a.scored, 0))::int  AS goals_scored,
      (COALESCE(h.conceded,0) + COALESCE(a.conceded,0))::int AS goals_conceded,
      COALESCE(h.wins, 0)::int    AS home_wins,
      COALESCE(h.matches, 0)::int AS home_matches,
      COALESCE(a.wins, 0)::int    AS away_wins,
      COALESCE(a.matches, 0)::int AS away_matches
    FROM ids i
    LEFT JOIN home h USING (team_id)
    LEFT JOIN away a USING (team_id)
  )
  INSERT INTO public.team_stats_cache AS c (
    team_id, total_matches, wins, draws, losses,
    goals_scored, goals_conceded,
    home_wins, home_matches, away_wins, away_matches, updated_at
  )
  SELECT
    a.team_id, a.total_matches, a.wins, a.draws, a.losses,
    a.goals_scored, a.goals_conceded,
    a.home_wins, a.home_matches, a.away_wins, a.away_matches, now()
  FROM agg a
  WHERE EXISTS (SELECT 1 FROM public.times t WHERE t.id = a.team_id)
  ON CONFLICT (team_id) DO UPDATE SET
    total_matches  = EXCLUDED.total_matches,
    wins           = EXCLUDED.wins,
    draws          = EXCLUDED.draws,
    losses         = EXCLUDED.losses,
    goals_scored   = EXCLUDED.goals_scored,
    goals_conceded = EXCLUDED.goals_conceded,
    home_wins      = EXCLUDED.home_wins,
    home_matches   = EXCLUDED.home_matches,
    away_wins      = EXCLUDED.away_wins,
    away_matches   = EXCLUDED.away_matches,
    updated_at     = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'rows_upserted', v_count,
    'duration_ms', extract(milliseconds from (clock_timestamp() - v_started))::int,
    'timestamp', now()
  );
END;
$$;

SELECT public.refresh_team_stats_cache();

CREATE OR REPLACE FUNCTION public.get_team_stats_bulk(p_team_ids uuid[])
RETURNS TABLE(
  team_id uuid,
  total_matches integer, wins integer, draws integer, losses integer,
  goals_scored integer, goals_conceded integer,
  home_wins integer, home_matches integer,
  away_wins integer, away_matches integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.team_id,
    COALESCE(c.total_matches, 0),
    COALESCE(c.wins, 0),
    COALESCE(c.draws, 0),
    COALESCE(c.losses, 0),
    COALESCE(c.goals_scored, 0),
    COALESCE(c.goals_conceded, 0),
    COALESCE(c.home_wins, 0),
    COALESCE(c.home_matches, 0),
    COALESCE(c.away_wins, 0),
    COALESCE(c.away_matches, 0)
  FROM unnest(p_team_ids) AS u(team_id)
  LEFT JOIN public.team_stats_cache c ON c.team_id = u.team_id;
$$;

CREATE OR REPLACE FUNCTION public.estimated_count(table_name text)
RETURNS bigint
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_count bigint;
BEGIN
  SELECT reltuples::bigint INTO v_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = table_name
  LIMIT 1;
  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.estimated_count(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_team_stats_cache() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_team_stats_bulk(uuid[]) TO anon, authenticated, service_role;
