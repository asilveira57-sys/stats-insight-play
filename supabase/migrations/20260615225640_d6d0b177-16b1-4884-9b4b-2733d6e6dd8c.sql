CREATE OR REPLACE FUNCTION public.get_user_palpites_history(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
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
  SELECT
    pu.id,
    pu.user_id,
    pu.partida_id,
    pu.palpite_sistema_id,
    pu.aceitou_sugestao,
    pu.placar_casa,
    pu.placar_fora,
    pu.created_at,
    pu.updated_at,
    jsonb_build_object(
      'id', pa.id,
      'data', pa.data,
      'hora', pa.hora,
      'status', pa.status,
      'gols_casa', pa.gols_casa,
      'gols_fora', pa.gols_fora,
      'time_casa', jsonb_build_object(
        'nome', tc.nome,
        'escudo_url', tc.escudo_url,
        'cores', tc.cores
      ),
      'time_fora', jsonb_build_object(
        'nome', tf.nome,
        'escudo_url', tf.escudo_url,
        'cores', tf.cores
      ),
      'liga', jsonb_build_object(
        'nome', l.nome,
        'logo_url', l.logo_url
      )
    ) AS partida,
    CASE WHEN ps.id IS NULL THEN NULL ELSE jsonb_build_object(
      'placar_casa_estimado', ps.placar_casa_estimado,
      'placar_fora_estimado', ps.placar_fora_estimado,
      'prob_casa', ps.prob_casa,
      'prob_empate', ps.prob_empate,
      'prob_fora', ps.prob_fora
    ) END AS palpite_sistema
  FROM public.palpites_usuarios pu
  JOIN public.partidas pa ON pa.id = pu.partida_id
  LEFT JOIN public.times tc ON tc.id = pa.time_casa_id
  LEFT JOIN public.times tf ON tf.id = pa.time_fora_id
  LEFT JOIN public.ligas l ON l.id = pa.liga_id
  LEFT JOIN public.palpites ps ON ps.id = pu.palpite_sistema_id
  WHERE pu.user_id = auth.uid()
    AND pu.partida_id IS NOT NULL
  ORDER BY pu.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_user_palpites_history(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_palpites_history(integer, integer) TO service_role;

CREATE INDEX IF NOT EXISTS idx_palpites_usuarios_user_created_at
  ON public.palpites_usuarios(user_id, created_at DESC)
  WHERE partida_id IS NOT NULL;