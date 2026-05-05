-- Função RPC para rankings de times por temporada (eficiente, server-side)
CREATE OR REPLACE FUNCTION public.get_team_season_rankings(
  p_season integer,
  p_league_id uuid DEFAULT NULL,
  p_metric text DEFAULT 'pontos',
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  team_id uuid,
  team_nome text,
  team_slug text,
  team_cores jsonb,
  league_id uuid,
  league_nome text,
  league_slug text,
  jogos integer,
  vitorias integer,
  empates integer,
  derrotas integer,
  gols_marcados integer,
  gols_sofridos integer,
  saldo integer,
  pontos integer,
  media_gols_marcados numeric,
  media_gols_sofridos numeric,
  aproveitamento numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH team_matches AS (
    SELECT
      t.id as t_id,
      t.nome as t_nome,
      t.slug as t_slug,
      t.cores as t_cores,
      l.id as l_id,
      l.nome as l_nome,
      l.slug as l_slug,
      CASE WHEN p.time_casa_id = t.id THEN p.gols_casa ELSE p.gols_fora END as gm,
      CASE WHEN p.time_casa_id = t.id THEN p.gols_fora ELSE p.gols_casa END as gs
    FROM partidas p
    JOIN times t ON t.id IN (p.time_casa_id, p.time_fora_id)
    LEFT JOIN ligas l ON l.id = p.liga_id
    WHERE p.status = 'finished'
      AND p.gols_casa IS NOT NULL
      AND p.gols_fora IS NOT NULL
      AND EXTRACT(YEAR FROM p.data) = p_season
      AND (p_league_id IS NULL OR p.liga_id = p_league_id)
      AND t.status = 'active'
  ),
  agg AS (
    SELECT
      t_id, t_nome, t_slug, t_cores, l_id, l_nome, l_slug,
      COUNT(*)::int as jogos,
      COUNT(*) FILTER (WHERE gm > gs)::int as vitorias,
      COUNT(*) FILTER (WHERE gm = gs)::int as empates,
      COUNT(*) FILTER (WHERE gm < gs)::int as derrotas,
      COALESCE(SUM(gm), 0)::int as gols_marcados,
      COALESCE(SUM(gs), 0)::int as gols_sofridos
    FROM team_matches
    GROUP BY t_id, t_nome, t_slug, t_cores, l_id, l_nome, l_slug
    HAVING COUNT(*) >= 3
  )
  SELECT
    a.t_id, a.t_nome, a.t_slug, a.t_cores,
    a.l_id, a.l_nome, a.l_slug,
    a.jogos, a.vitorias, a.empates, a.derrotas,
    a.gols_marcados, a.gols_sofridos,
    (a.gols_marcados - a.gols_sofridos) as saldo,
    (a.vitorias * 3 + a.empates) as pontos,
    ROUND(a.gols_marcados::numeric / a.jogos, 2) as media_gols_marcados,
    ROUND(a.gols_sofridos::numeric / a.jogos, 2) as media_gols_sofridos,
    ROUND(((a.vitorias * 3 + a.empates)::numeric / (a.jogos * 3)) * 100, 1) as aproveitamento
  FROM agg a
  ORDER BY
    CASE p_metric
      WHEN 'melhores-ataques' THEN -a.gols_marcados::numeric / a.jogos
      WHEN 'melhores-defesas' THEN a.gols_sofridos::numeric / a.jogos
      WHEN 'mais-gols' THEN -a.gols_marcados
      WHEN 'mais-vitorias' THEN -a.vitorias
      WHEN 'aproveitamento' THEN -((a.vitorias * 3 + a.empates)::numeric / (a.jogos * 3))
      ELSE -(a.vitorias * 3 + a.empates)
    END
  LIMIT p_limit;
END;
$$;