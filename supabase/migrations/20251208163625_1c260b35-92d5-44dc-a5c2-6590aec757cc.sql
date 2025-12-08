CREATE OR REPLACE FUNCTION public.gerar_palpite_sistema(p_partida_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_palpite_id UUID;
  v_partida RECORD;
  v_stats_casa RECORD;
  v_stats_fora RECORD;
  v_xg_casa NUMERIC;
  v_xg_fora NUMERIC;
  v_prob_casa NUMERIC;
  v_prob_empate NUMERIC;
  v_prob_fora NUMERIC;
  v_placar_casa INTEGER;
  v_placar_fora INTEGER;
  v_forca_casa NUMERIC;
  v_forca_fora NUMERIC;
  v_confianca NUMERIC;
BEGIN
  -- Get match info
  SELECT * INTO v_partida FROM partidas WHERE id = p_partida_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partida não encontrada';
  END IF;
  
  -- Calculate home team stats (last 10 matches) using subquery
  SELECT 
    COALESCE(AVG(sub.gols_marcados), 1.3) as avg_gols,
    COALESCE(AVG(sub.gols_sofridos), 1.0) as avg_sofr,
    COUNT(*) FILTER (WHERE sub.gols_marcados > sub.gols_sofridos) as vitorias,
    COUNT(*) FILTER (WHERE sub.gols_marcados = sub.gols_sofridos) as empates,
    COUNT(*) as total
  INTO v_stats_casa
  FROM (
    SELECT 
      CASE WHEN p.time_casa_id = v_partida.time_casa_id THEN p.gols_casa ELSE p.gols_fora END as gols_marcados,
      CASE WHEN p.time_casa_id = v_partida.time_casa_id THEN p.gols_fora ELSE p.gols_casa END as gols_sofridos
    FROM partidas p
    WHERE (p.time_casa_id = v_partida.time_casa_id OR p.time_fora_id = v_partida.time_casa_id)
      AND p.status = 'finished'
      AND p.gols_casa IS NOT NULL
      AND p.gols_fora IS NOT NULL
      AND p.data < v_partida.data
    ORDER BY p.data DESC
    LIMIT 10
  ) sub;
  
  -- Calculate away team stats (last 10 matches) using subquery
  SELECT 
    COALESCE(AVG(sub.gols_marcados), 1.3) as avg_gols,
    COALESCE(AVG(sub.gols_sofridos), 1.0) as avg_sofr,
    COUNT(*) FILTER (WHERE sub.gols_marcados > sub.gols_sofridos) as vitorias,
    COUNT(*) FILTER (WHERE sub.gols_marcados = sub.gols_sofridos) as empates,
    COUNT(*) as total
  INTO v_stats_fora
  FROM (
    SELECT 
      CASE WHEN p.time_casa_id = v_partida.time_fora_id THEN p.gols_casa ELSE p.gols_fora END as gols_marcados,
      CASE WHEN p.time_casa_id = v_partida.time_fora_id THEN p.gols_fora ELSE p.gols_casa END as gols_sofridos
    FROM partidas p
    WHERE (p.time_casa_id = v_partida.time_fora_id OR p.time_fora_id = v_partida.time_fora_id)
      AND p.status = 'finished'
      AND p.gols_casa IS NOT NULL
      AND p.gols_fora IS NOT NULL
      AND p.data < v_partida.data
    ORDER BY p.data DESC
    LIMIT 10
  ) sub;
  
  -- Calculate expected goals (simplified Poisson)
  v_xg_casa := (v_stats_casa.avg_gols * v_stats_fora.avg_sofr / 1.3) * 1.1; -- Home advantage
  v_xg_fora := (v_stats_fora.avg_gols * v_stats_casa.avg_sofr / 1.3) * 0.9;
  
  -- Predicted score (rounded expected goals)
  v_placar_casa := ROUND(v_xg_casa);
  v_placar_fora := ROUND(v_xg_fora);
  
  -- Calculate probabilities (simplified)
  v_prob_casa := GREATEST(0.1, LEAST(0.8, 0.35 + (v_xg_casa - v_xg_fora) * 0.15));
  v_prob_fora := GREATEST(0.1, LEAST(0.8, 0.35 - (v_xg_casa - v_xg_fora) * 0.15));
  v_prob_empate := 1 - v_prob_casa - v_prob_fora;
  
  -- Normalize
  v_prob_casa := v_prob_casa * 100;
  v_prob_empate := v_prob_empate * 100;
  v_prob_fora := v_prob_fora * 100;
  
  -- Team strength (0-100)
  v_forca_casa := LEAST(100, GREATEST(0, 
    50 + (v_stats_casa.vitorias::NUMERIC / GREATEST(1, v_stats_casa.total) - 0.33) * 100 +
    (v_stats_casa.avg_gols - v_stats_casa.avg_sofr) * 10
  ));
  v_forca_fora := LEAST(100, GREATEST(0, 
    50 + (v_stats_fora.vitorias::NUMERIC / GREATEST(1, v_stats_fora.total) - 0.33) * 100 +
    (v_stats_fora.avg_gols - v_stats_fora.avg_sofr) * 10
  ));
  
  -- Confidence based on probability spread
  v_confianca := GREATEST(v_prob_casa, v_prob_empate, v_prob_fora);
  
  -- Insert or update palpite
  INSERT INTO palpites (
    partida_id, prob_casa, prob_empate, prob_fora,
    placar_casa_estimado, placar_fora_estimado,
    forca_time_casa, forca_time_fora, confianca
  ) VALUES (
    p_partida_id, v_prob_casa, v_prob_empate, v_prob_fora,
    v_placar_casa, v_placar_fora,
    v_forca_casa, v_forca_fora, v_confianca
  )
  ON CONFLICT (partida_id) DO UPDATE SET
    prob_casa = EXCLUDED.prob_casa,
    prob_empate = EXCLUDED.prob_empate,
    prob_fora = EXCLUDED.prob_fora,
    placar_casa_estimado = EXCLUDED.placar_casa_estimado,
    placar_fora_estimado = EXCLUDED.placar_fora_estimado,
    forca_time_casa = EXCLUDED.forca_time_casa,
    forca_time_fora = EXCLUDED.forca_time_fora,
    confianca = EXCLUDED.confianca,
    updated_at = now()
  RETURNING id INTO v_palpite_id;
  
  RETURN v_palpite_id;
END;
$function$;