
CREATE OR REPLACE FUNCTION public.get_team_stats_bulk(p_team_ids uuid[])
RETURNS TABLE(
  team_id uuid,
  total_matches integer,
  wins integer,
  draws integer,
  losses integer,
  goals_scored integer,
  goals_conceded integer,
  home_wins integer,
  home_matches integer,
  away_wins integer,
  away_matches integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    WHERE p.time_casa_id = ANY(p_team_ids)
      AND p.status = 'finished'
      AND p.gols_casa IS NOT NULL
      AND p.gols_fora IS NOT NULL
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
    WHERE p.time_fora_id = ANY(p_team_ids)
      AND p.status = 'finished'
      AND p.gols_casa IS NOT NULL
      AND p.gols_fora IS NOT NULL
    GROUP BY p.time_fora_id
  ),
  ids AS (
    SELECT unnest(p_team_ids) AS team_id
  )
  SELECT
    i.team_id,
    (COALESCE(h.matches, 0) + COALESCE(a.matches, 0))::int AS total_matches,
    (COALESCE(h.wins, 0) + COALESCE(a.wins, 0))::int AS wins,
    (COALESCE(h.draws, 0) + COALESCE(a.draws, 0))::int AS draws,
    (COALESCE(h.losses, 0) + COALESCE(a.losses, 0))::int AS losses,
    (COALESCE(h.scored, 0) + COALESCE(a.scored, 0))::int AS goals_scored,
    (COALESCE(h.conceded, 0) + COALESCE(a.conceded, 0))::int AS goals_conceded,
    COALESCE(h.wins, 0)::int AS home_wins,
    COALESCE(h.matches, 0)::int AS home_matches,
    COALESCE(a.wins, 0)::int AS away_wins,
    COALESCE(a.matches, 0)::int AS away_matches
  FROM ids i
  LEFT JOIN home h USING (team_id)
  LEFT JOIN away a USING (team_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_team_stats_bulk(uuid[]) TO anon, authenticated;
