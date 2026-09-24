CREATE OR REPLACE FUNCTION public.get_weekly_prediction_evolution(p_weeks integer DEFAULT 12)
RETURNS TABLE (
  week_start date,
  total_games bigint,
  ia_correct bigint,
  human_total bigint,
  human_correct bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT date_trunc('week', pa.data)::date AS week_start,
         count(*)::bigint AS total_games,
         count(*) FILTER (WHERE cr.sistema_acertou_resultado IS TRUE)::bigint AS ia_correct,
         COALESCE(sum(cr.total_usuarios_palpitaram), 0)::bigint AS human_total,
         COALESCE(sum(cr.usuarios_acertaram_resultado), 0)::bigint AS human_correct
  FROM public.partidas pa
  JOIN public.comparativo_resultados cr ON cr.partida_id = pa.id
  WHERE pa.data >= date_trunc('week', now()) - ((GREATEST(p_weeks, 1) - 1) * interval '1 week')
    AND pa.data < date_trunc('week', now()) + interval '1 week'
  GROUP BY 1
  ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.get_championship_prediction_stats(p_days integer DEFAULT 14, p_limit integer DEFAULT 5)
RETURNS TABLE (
  liga_nome text,
  liga_slug text,
  ia_total bigint,
  ia_correct bigint,
  human_total bigint,
  human_correct bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT l.nome::text AS liga_nome,
         l.slug::text AS liga_slug,
         count(*)::bigint AS ia_total,
         count(*) FILTER (WHERE cr.sistema_acertou_resultado IS TRUE)::bigint AS ia_correct,
         COALESCE(sum(cr.total_usuarios_palpitaram), 0)::bigint AS human_total,
         COALESCE(sum(cr.usuarios_acertaram_resultado), 0)::bigint AS human_correct
  FROM public.partidas pa
  JOIN public.comparativo_resultados cr ON cr.partida_id = pa.id
  JOIN public.ligas l ON l.id = pa.liga_id
  WHERE pa.data >= now() - (GREATEST(p_days, 1) * interval '1 day')
    AND pa.data <= now()
  GROUP BY l.nome, l.slug
  HAVING count(*) >= 3
  ORDER BY count(*) DESC
  LIMIT GREATEST(p_limit, 1);
$$;