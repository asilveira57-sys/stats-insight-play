-- Table for user predictions (palpites dos usuários)
CREATE TABLE public.palpites_usuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partida_id UUID NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE,
  palpite_sistema_id UUID REFERENCES public.palpites(id) ON DELETE SET NULL,
  aceitou_sugestao BOOLEAN DEFAULT false,
  placar_casa INTEGER NOT NULL,
  placar_fora INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, partida_id)
);

-- Table for accuracy tracking after match completion
CREATE TABLE public.comparativo_resultados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partida_id UUID NOT NULL REFERENCES public.partidas(id) ON DELETE CASCADE UNIQUE,
  palpite_sistema_id UUID REFERENCES public.palpites(id) ON DELETE SET NULL,
  
  -- Official result
  placar_oficial_casa INTEGER,
  placar_oficial_fora INTEGER,
  resultado_oficial TEXT, -- 'casa', 'empate', 'fora'
  
  -- System prediction accuracy
  sistema_placar_casa INTEGER,
  sistema_placar_fora INTEGER,
  sistema_resultado_previsto TEXT, -- 'casa', 'empate', 'fora'
  sistema_acertou_resultado BOOLEAN,
  sistema_acertou_placar BOOLEAN,
  sistema_prob_resultado NUMERIC, -- probability given for the actual result
  
  -- Stats
  total_usuarios_palpitaram INTEGER DEFAULT 0,
  usuarios_acertaram_resultado INTEGER DEFAULT 0,
  usuarios_acertaram_placar INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.palpites_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparativo_resultados ENABLE ROW LEVEL SECURITY;

-- Policies for palpites_usuarios
CREATE POLICY "Users can view their own predictions" 
ON public.palpites_usuarios FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own predictions" 
ON public.palpites_usuarios FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own predictions" 
ON public.palpites_usuarios FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own predictions" 
ON public.palpites_usuarios FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for comparativo_resultados (public read, admin write)
CREATE POLICY "Comparativo results are viewable by everyone" 
ON public.comparativo_resultados FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage comparativo results" 
ON public.comparativo_resultados FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_palpites_usuarios_updated_at
BEFORE UPDATE ON public.palpites_usuarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comparativo_resultados_updated_at
BEFORE UPDATE ON public.comparativo_resultados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate and store system prediction
CREATE OR REPLACE FUNCTION public.gerar_palpite_sistema(p_partida_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_palpite_id UUID;
  v_partida RECORD;
  v_stats_casa RECORD;
  v_stats_fora RECORD;
  v_avg_gols_casa NUMERIC;
  v_avg_gols_fora NUMERIC;
  v_avg_sofr_casa NUMERIC;
  v_avg_sofr_fora NUMERIC;
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
  
  -- Calculate home team stats (last 10 matches)
  SELECT 
    COALESCE(AVG(CASE WHEN p.time_casa_id = v_partida.time_casa_id THEN p.gols_casa ELSE p.gols_fora END), 1.3) as avg_gols,
    COALESCE(AVG(CASE WHEN p.time_casa_id = v_partida.time_casa_id THEN p.gols_fora ELSE p.gols_casa END), 1.0) as avg_sofr,
    COUNT(*) FILTER (WHERE 
      (p.time_casa_id = v_partida.time_casa_id AND p.gols_casa > p.gols_fora) OR
      (p.time_fora_id = v_partida.time_casa_id AND p.gols_fora > p.gols_casa)
    ) as vitorias,
    COUNT(*) FILTER (WHERE p.gols_casa = p.gols_fora) as empates,
    COUNT(*) as total
  INTO v_stats_casa
  FROM partidas p
  WHERE (p.time_casa_id = v_partida.time_casa_id OR p.time_fora_id = v_partida.time_casa_id)
    AND p.status = 'finished'
    AND p.data < v_partida.data
  ORDER BY p.data DESC
  LIMIT 10;
  
  -- Calculate away team stats (last 10 matches)
  SELECT 
    COALESCE(AVG(CASE WHEN p.time_casa_id = v_partida.time_fora_id THEN p.gols_casa ELSE p.gols_fora END), 1.3) as avg_gols,
    COALESCE(AVG(CASE WHEN p.time_casa_id = v_partida.time_fora_id THEN p.gols_fora ELSE p.gols_casa END), 1.0) as avg_sofr,
    COUNT(*) FILTER (WHERE 
      (p.time_casa_id = v_partida.time_fora_id AND p.gols_casa > p.gols_fora) OR
      (p.time_fora_id = v_partida.time_fora_id AND p.gols_fora > p.gols_casa)
    ) as vitorias,
    COUNT(*) FILTER (WHERE p.gols_casa = p.gols_fora) as empates,
    COUNT(*) as total
  INTO v_stats_fora
  FROM partidas p
  WHERE (p.time_casa_id = v_partida.time_fora_id OR p.time_fora_id = v_partida.time_fora_id)
    AND p.status = 'finished'
    AND p.data < v_partida.data
  ORDER BY p.data DESC
  LIMIT 10;
  
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
$$;

-- Function to process match result and calculate accuracy
CREATE OR REPLACE FUNCTION public.processar_resultado_partida(p_partida_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_partida RECORD;
  v_palpite RECORD;
  v_resultado_oficial TEXT;
  v_sistema_resultado TEXT;
  v_total_usuarios INTEGER;
  v_usuarios_acertaram_resultado INTEGER;
  v_usuarios_acertaram_placar INTEGER;
BEGIN
  -- Get finished match
  SELECT * INTO v_partida FROM partidas WHERE id = p_partida_id AND status = 'finished';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partida não encontrada ou não finalizada';
  END IF;
  
  -- Get system prediction
  SELECT * INTO v_palpite FROM palpites WHERE partida_id = p_partida_id;
  
  -- Determine official result
  IF v_partida.gols_casa > v_partida.gols_fora THEN
    v_resultado_oficial := 'casa';
  ELSIF v_partida.gols_casa < v_partida.gols_fora THEN
    v_resultado_oficial := 'fora';
  ELSE
    v_resultado_oficial := 'empate';
  END IF;
  
  -- Determine system predicted result
  IF v_palpite.placar_casa_estimado > v_palpite.placar_fora_estimado THEN
    v_sistema_resultado := 'casa';
  ELSIF v_palpite.placar_casa_estimado < v_palpite.placar_fora_estimado THEN
    v_sistema_resultado := 'fora';
  ELSE
    v_sistema_resultado := 'empate';
  END IF;
  
  -- Count user predictions
  SELECT COUNT(*) INTO v_total_usuarios FROM palpites_usuarios WHERE partida_id = p_partida_id;
  
  -- Count users who got result right
  SELECT COUNT(*) INTO v_usuarios_acertaram_resultado
  FROM palpites_usuarios pu
  WHERE pu.partida_id = p_partida_id
    AND (
      (pu.placar_casa > pu.placar_fora AND v_resultado_oficial = 'casa') OR
      (pu.placar_casa < pu.placar_fora AND v_resultado_oficial = 'fora') OR
      (pu.placar_casa = pu.placar_fora AND v_resultado_oficial = 'empate')
    );
  
  -- Count users who got exact score
  SELECT COUNT(*) INTO v_usuarios_acertaram_placar
  FROM palpites_usuarios pu
  WHERE pu.partida_id = p_partida_id
    AND pu.placar_casa = v_partida.gols_casa
    AND pu.placar_fora = v_partida.gols_fora;
  
  -- Insert comparison record
  INSERT INTO comparativo_resultados (
    partida_id, palpite_sistema_id,
    placar_oficial_casa, placar_oficial_fora, resultado_oficial,
    sistema_placar_casa, sistema_placar_fora, sistema_resultado_previsto,
    sistema_acertou_resultado, sistema_acertou_placar,
    sistema_prob_resultado,
    total_usuarios_palpitaram, usuarios_acertaram_resultado, usuarios_acertaram_placar
  ) VALUES (
    p_partida_id, v_palpite.id,
    v_partida.gols_casa, v_partida.gols_fora, v_resultado_oficial,
    v_palpite.placar_casa_estimado, v_palpite.placar_fora_estimado, v_sistema_resultado,
    v_sistema_resultado = v_resultado_oficial,
    v_palpite.placar_casa_estimado = v_partida.gols_casa AND v_palpite.placar_fora_estimado = v_partida.gols_fora,
    CASE v_resultado_oficial
      WHEN 'casa' THEN v_palpite.prob_casa
      WHEN 'empate' THEN v_palpite.prob_empate
      WHEN 'fora' THEN v_palpite.prob_fora
    END,
    v_total_usuarios, v_usuarios_acertaram_resultado, v_usuarios_acertaram_placar
  )
  ON CONFLICT (partida_id) DO UPDATE SET
    placar_oficial_casa = EXCLUDED.placar_oficial_casa,
    placar_oficial_fora = EXCLUDED.placar_oficial_fora,
    resultado_oficial = EXCLUDED.resultado_oficial,
    sistema_acertou_resultado = EXCLUDED.sistema_acertou_resultado,
    sistema_acertou_placar = EXCLUDED.sistema_acertou_placar,
    sistema_prob_resultado = EXCLUDED.sistema_prob_resultado,
    total_usuarios_palpitaram = EXCLUDED.total_usuarios_palpitaram,
    usuarios_acertaram_resultado = EXCLUDED.usuarios_acertaram_resultado,
    usuarios_acertaram_placar = EXCLUDED.usuarios_acertaram_placar,
    updated_at = now();
END;
$$;