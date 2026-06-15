CREATE OR REPLACE FUNCTION public.get_user_palpites_history(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_confidence text DEFAULT 'all'
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  partida_id uuid,
  palpite_sistema_id uuid,
  aceitou_sugestao boolean,
  placar_casa integer,
  placar_fora integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  partida jsonb,
  palpite_sistema jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      pu.*,
      pa.id AS match_id,
      pa.data,
      pa.hora,
      pa.status,
      pa.gols_casa,
      pa.gols_fora,
      tc.nome AS time_casa_nome,
      tc.escudo_url AS time_casa_escudo_url,
      tc.cores AS time_casa_cores,
      tf.nome AS time_fora_nome,
      tf.escudo_url AS time_fora_escudo_url,
      tf.cores AS time_fora_cores,
      l.nome AS liga_nome,
      l.logo_url AS liga_logo_url,
      ps.id AS sistema_id,
      ps.placar_casa_estimado,
      ps.placar_fora_estimado,
      ps.prob_casa,
      ps.prob_empate,
      ps.prob_fora,
      CASE
        WHEN ps.prob_casa IS NULL OR ps.prob_empate IS NULL OR ps.prob_fora IS NULL THEN NULL
        WHEN greatest(ps.prob_casa, ps.prob_empate, ps.prob_fora) >= 55
          AND greatest(ps.prob_casa, ps.prob_empate, ps.prob_fora) - least(ps.prob_casa, ps.prob_empate, ps.prob_fora) >= 30 THEN 'high'
        WHEN greatest(ps.prob_casa, ps.prob_empate, ps.prob_fora) >= 40
          AND greatest(ps.prob_casa, ps.prob_empate, ps.prob_fora) - least(ps.prob_casa, ps.prob_empate, ps.prob_fora) >= 15 THEN 'medium'
        ELSE 'low'
      END AS confidence_level
    FROM public.palpites_usuarios pu
    JOIN public.partidas pa ON pa.id = pu.partida_id
    LEFT JOIN public.times tc ON tc.id = pa.time_casa_id
    LEFT JOIN public.times tf ON tf.id = pa.time_fora_id
    LEFT JOIN public.ligas l ON l.id = pa.liga_id
    LEFT JOIN public.palpites ps ON ps.id = pu.palpite_sistema_id
    WHERE pu.user_id = auth.uid()
      AND pu.partida_id IS NOT NULL
      AND (p_start_date IS NULL OR pa.data >= p_start_date)
      AND (p_end_date IS NULL OR pa.data <= p_end_date)
  )
  SELECT
    base.id,
    base.user_id,
    base.partida_id,
    base.palpite_sistema_id,
    base.aceitou_sugestao,
    base.placar_casa,
    base.placar_fora,
    base.created_at,
    base.updated_at,
    jsonb_build_object(
      'id', base.match_id,
      'data', base.data,
      'hora', base.hora,
      'status', base.status,
      'gols_casa', base.gols_casa,
      'gols_fora', base.gols_fora,
      'time_casa', jsonb_build_object('nome', base.time_casa_nome, 'escudo_url', base.time_casa_escudo_url, 'cores', base.time_casa_cores),
      'time_fora', jsonb_build_object('nome', base.time_fora_nome, 'escudo_url', base.time_fora_escudo_url, 'cores', base.time_fora_cores),
      'liga', jsonb_build_object('nome', base.liga_nome, 'logo_url', base.liga_logo_url)
    ) AS partida,
    CASE WHEN base.sistema_id IS NULL THEN NULL ELSE jsonb_build_object(
      'placar_casa_estimado', base.placar_casa_estimado,
      'placar_fora_estimado', base.placar_fora_estimado,
      'prob_casa', base.prob_casa,
      'prob_empate', base.prob_empate,
      'prob_fora', base.prob_fora
    ) END AS palpite_sistema
  FROM base
  WHERE coalesce(p_confidence, 'all') = 'all'
    OR base.confidence_level = p_confidence
  ORDER BY base.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_user_palpites_history(integer, integer, date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_palpites_history(integer, integer, date, date, text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_user_palpites_history_count(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_confidence text DEFAULT 'all'
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      CASE
        WHEN ps.prob_casa IS NULL OR ps.prob_empate IS NULL OR ps.prob_fora IS NULL THEN NULL
        WHEN greatest(ps.prob_casa, ps.prob_empate, ps.prob_fora) >= 55
          AND greatest(ps.prob_casa, ps.prob_empate, ps.prob_fora) - least(ps.prob_casa, ps.prob_empate, ps.prob_fora) >= 30 THEN 'high'
        WHEN greatest(ps.prob_casa, ps.prob_empate, ps.prob_fora) >= 40
          AND greatest(ps.prob_casa, ps.prob_empate, ps.prob_fora) - least(ps.prob_casa, ps.prob_empate, ps.prob_fora) >= 15 THEN 'medium'
        ELSE 'low'
      END AS confidence_level
    FROM public.palpites_usuarios pu
    JOIN public.partidas pa ON pa.id = pu.partida_id
    LEFT JOIN public.palpites ps ON ps.id = pu.palpite_sistema_id
    WHERE pu.user_id = auth.uid()
      AND pu.partida_id IS NOT NULL
      AND (p_start_date IS NULL OR pa.data >= p_start_date)
      AND (p_end_date IS NULL OR pa.data <= p_end_date)
  )
  SELECT count(*)::integer
  FROM base
  WHERE coalesce(p_confidence, 'all') = 'all'
    OR confidence_level = p_confidence;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_palpites_history_count(date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_palpites_history_count(date, date, text) TO service_role;