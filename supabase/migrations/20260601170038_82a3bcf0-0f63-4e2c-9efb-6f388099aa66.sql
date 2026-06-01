
CREATE OR REPLACE FUNCTION public.get_brasileirao_retrospectiva(
  p_season text DEFAULT 'all',
  p_rodada integer DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_liga_id uuid;
  v_offset integer;
  v_total integer;
  v_result jsonb;
BEGIN
  SELECT id INTO v_liga_id FROM ligas WHERE codigo_api = 'BSA' LIMIT 1;
  IF v_liga_id IS NULL THEN
    RETURN jsonb_build_object('error', 'BSA league not found');
  END IF;

  v_offset := GREATEST(0, (COALESCE(p_page, 1) - 1)) * COALESCE(p_page_size, 50);

  -- Base CTE: all comparativo rows for BSA, joined with partidas + teams (lightweight)
  WITH base AS (
    SELECT
      cr.id,
      cr.partida_id,
      cr.placar_oficial_casa,
      cr.placar_oficial_fora,
      cr.resultado_oficial,
      cr.sistema_placar_casa,
      cr.sistema_placar_fora,
      cr.sistema_resultado_previsto,
      cr.sistema_acertou_resultado,
      cr.sistema_acertou_placar,
      cr.sistema_prob_resultado,
      p.data,
      p.rodada,
      EXTRACT(YEAR FROM p.data)::text AS season,
      tc.nome AS time_casa_nome,
      tc.cores AS time_casa_cores,
      tf.nome AS time_fora_nome,
      tf.cores AS time_fora_cores
    FROM comparativo_resultados cr
    JOIN partidas p ON p.id = cr.partida_id
    LEFT JOIN times tc ON tc.id = p.time_casa_id
    LEFT JOIN times tf ON tf.id = p.time_fora_id
    WHERE p.liga_id = v_liga_id
  ),
  filtered AS (
    SELECT * FROM base
    WHERE (p_season = 'all' OR season = p_season)
      AND (p_rodada IS NULL OR rodada = p_rodada)
  ),
  summary AS (
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE sistema_acertou_resultado)::int AS acertos_resultado,
      COUNT(*) FILTER (WHERE sistema_acertou_placar)::int AS acertos_placar,
      COALESCE(AVG(sistema_prob_resultado), 0)::numeric AS prob_media
    FROM filtered
  ),
  season_comparison AS (
    SELECT
      season AS temporada,
      COUNT(*)::int AS partidas,
      COUNT(*) FILTER (WHERE sistema_acertou_resultado)::int AS acertos,
      COUNT(*) FILTER (WHERE sistema_acertou_placar)::int AS placares
    FROM base
    GROUP BY season
    ORDER BY season
  ),
  round_stats AS (
    SELECT
      rodada,
      COUNT(*)::int AS partidas,
      COUNT(*) FILTER (WHERE sistema_acertou_resultado)::int AS acertos,
      COUNT(*) FILTER (WHERE sistema_acertou_placar)::int AS placares
    FROM (
      SELECT * FROM base WHERE (p_season = 'all' OR season = p_season)
    ) s
    WHERE rodada IS NOT NULL
    GROUP BY rodada
    ORDER BY rodada
  ),
  team_long AS (
    SELECT time_casa_nome AS nome, time_casa_cores AS cores,
           sistema_acertou_resultado, sistema_acertou_placar
    FROM filtered WHERE time_casa_nome IS NOT NULL
    UNION ALL
    SELECT time_fora_nome AS nome, time_fora_cores AS cores,
           sistema_acertou_resultado, sistema_acertou_placar
    FROM filtered WHERE time_fora_nome IS NOT NULL
  ),
  team_agg AS (
    SELECT
      nome,
      (array_agg(cores))[1] AS cores,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE sistema_acertou_resultado)::int AS acertos,
      COUNT(*) FILTER (WHERE sistema_acertou_placar)::int AS placares
    FROM team_long
    GROUP BY nome
    HAVING COUNT(*) >= 3
  ),
  team_ranked AS (
    SELECT nome, cores, total, acertos, placares,
           ROUND((acertos::numeric / total) * 100)::int AS taxa_resultado,
           ROUND((placares::numeric / total) * 100)::int AS taxa_placar
    FROM team_agg
  ),
  seasons_list AS (
    SELECT DISTINCT season FROM base ORDER BY season DESC
  ),
  rodadas_list AS (
    SELECT DISTINCT rodada FROM base
    WHERE rodada IS NOT NULL
      AND (p_season = 'all' OR season = p_season)
    ORDER BY rodada
  ),
  page_matches AS (
    SELECT * FROM filtered
    ORDER BY data DESC, partida_id
    LIMIT p_page_size OFFSET v_offset
  )
  SELECT jsonb_build_object(
    'summary', (SELECT to_jsonb(s) FROM summary s),
    'season_comparison', COALESCE((SELECT jsonb_agg(to_jsonb(sc)) FROM season_comparison sc), '[]'::jsonb),
    'round_stats', COALESCE((SELECT jsonb_agg(to_jsonb(rs)) FROM round_stats rs), '[]'::jsonb),
    'team_top', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM team_ranked ORDER BY taxa_resultado DESC, total DESC LIMIT 5) t), '[]'::jsonb),
    'team_bottom', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM team_ranked ORDER BY taxa_resultado ASC, total DESC LIMIT 5) t), '[]'::jsonb),
    'seasons', COALESCE((SELECT jsonb_agg(season) FROM seasons_list), '[]'::jsonb),
    'rodadas', COALESCE((SELECT jsonb_agg(rodada) FROM rodadas_list), '[]'::jsonb),
    'matches_total', (SELECT COUNT(*)::int FROM filtered),
    'matches', COALESCE((SELECT jsonb_agg(to_jsonb(pm)) FROM page_matches pm), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_brasileirao_retrospectiva(text, integer, integer, integer) TO anon, authenticated, service_role;
