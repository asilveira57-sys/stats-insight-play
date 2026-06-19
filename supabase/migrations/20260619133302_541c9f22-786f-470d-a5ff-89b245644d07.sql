
-- =====================================================================
-- SPRINT 1 — Fundação de Auditoria da IA Statball
-- Genérico (qualquer torneio), com versionamento de modelo e imutabilidade
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) prediction_performance — previsão x real (multi-nível)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prediction_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polimórfico: aponta para qualquer tabela de partidas
  match_source TEXT NOT NULL CHECK (match_source IN ('partidas','wc2026')),
  match_id UUID NOT NULL,
  competition_id UUID,              -- liga_id / torneio
  competition_code TEXT,            -- 'BSA','WC2026',...
  stage TEXT,                       -- 'group','round_of_16','final',...
  model_version TEXT NOT NULL DEFAULT 'statball-ai-v1',

  -- Previsão
  predicted_home_goals INTEGER NOT NULL,
  predicted_away_goals INTEGER NOT NULL,
  predicted_result TEXT NOT NULL CHECK (predicted_result IN ('home','draw','away')),
  predicted_diff INTEGER GENERATED ALWAYS AS (predicted_home_goals - predicted_away_goals) STORED,
  confidence_band TEXT CHECK (confidence_band IN ('alta','media','baixa')),
  confidence_value NUMERIC(5,2),

  -- Real
  real_home_goals INTEGER NOT NULL,
  real_away_goals INTEGER NOT NULL,
  real_result TEXT NOT NULL CHECK (real_result IN ('home','draw','away')),
  real_diff INTEGER GENERATED ALWAYS AS (real_home_goals - real_away_goals) STORED,

  -- Níveis de acerto
  level1_winner_correct BOOLEAN NOT NULL,         -- vencedor/empate
  level2_trend_correct BOOLEAN NOT NULL,          -- mesma tendência (mesmo lado vencendo)
  level3_diff_correct BOOLEAN NOT NULL,           -- mesma diferença de gols
  level4_exact_correct BOOLEAN NOT NULL,          -- placar exato
  goal_difference_error INTEGER NOT NULL,         -- |pred_diff - real_diff|
  total_goals_error INTEGER NOT NULL,             -- |pred_total - real_total|

  -- Score 0..100
  prediction_score INTEGER NOT NULL,

  -- Imutabilidade
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  frozen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_source, match_id, model_version)
);

CREATE INDEX IF NOT EXISTS idx_pp_model_version ON public.prediction_performance(model_version);
CREATE INDEX IF NOT EXISTS idx_pp_competition ON public.prediction_performance(competition_code);
CREATE INDEX IF NOT EXISTS idx_pp_confidence ON public.prediction_performance(confidence_band);
CREATE INDEX IF NOT EXISTS idx_pp_created ON public.prediction_performance(created_at DESC);

GRANT SELECT ON public.prediction_performance TO anon, authenticated;
GRANT ALL ON public.prediction_performance TO service_role;
ALTER TABLE public.prediction_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_select_all" ON public.prediction_performance FOR SELECT USING (true);
-- Sem INSERT/UPDATE/DELETE p/ usuário: somente service_role grava
-- (imutável após gravar)

-- ---------------------------------------------------------------------
-- 2) confidence_accuracy — precisão rolante por faixa de confiança
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.confidence_accuracy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version TEXT NOT NULL DEFAULT 'statball-ai-v1',
  confidence_band TEXT NOT NULL CHECK (confidence_band IN ('alta','media','baixa')),
  competition_code TEXT NOT NULL DEFAULT 'ALL',

  total_matches INTEGER NOT NULL DEFAULT 0,
  level1_hits INTEGER NOT NULL DEFAULT 0,
  level2_hits INTEGER NOT NULL DEFAULT 0,
  level3_hits INTEGER NOT NULL DEFAULT 0,
  level4_hits INTEGER NOT NULL DEFAULT 0,
  score_sum BIGINT NOT NULL DEFAULT 0,

  accuracy_winner NUMERIC(5,2) NOT NULL DEFAULT 0,    -- %
  accuracy_trend NUMERIC(5,2) NOT NULL DEFAULT 0,
  accuracy_diff NUMERIC(5,2) NOT NULL DEFAULT 0,
  accuracy_exact NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_score NUMERIC(5,2) NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (model_version, confidence_band, competition_code)
);

GRANT SELECT ON public.confidence_accuracy TO anon, authenticated;
GRANT ALL ON public.confidence_accuracy TO service_role;
ALTER TABLE public.confidence_accuracy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ca_select_all" ON public.confidence_accuracy FOR SELECT USING (true);

-- ---------------------------------------------------------------------
-- 3) analysis_audit — auditoria anti-alucinação
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analysis_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_source TEXT NOT NULL CHECK (analysis_source IN ('wc2026','partidas')),
  analysis_id UUID NOT NULL,
  match_id UUID,
  model_version TEXT NOT NULL DEFAULT 'statball-ai-v1',

  data_source_count INTEGER NOT NULL DEFAULT 0,
  verified_claims INTEGER NOT NULL DEFAULT 0,
  unverified_claims INTEGER NOT NULL DEFAULT 0,
  inconsistent_claims INTEGER NOT NULL DEFAULT 0,
  claims_detail JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- ex: [{"claim":"Brasil 1º no ranking FIFA","status":"verified","source":"fifa_ranking"}]

  audit_score NUMERIC(5,2) NOT NULL DEFAULT 0,   -- 0..100
  audit_grade CHAR(1) NOT NULL DEFAULT 'C' CHECK (audit_grade IN ('A','B','C','D','E')),
  badge TEXT NOT NULL DEFAULT 'partial' CHECK (badge IN ('verified','partial','low')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (analysis_source, analysis_id)
);

GRANT SELECT ON public.analysis_audit TO anon, authenticated;
GRANT ALL ON public.analysis_audit TO service_role;
ALTER TABLE public.analysis_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aa_select_all" ON public.analysis_audit FOR SELECT USING (true);

-- ---------------------------------------------------------------------
-- 4) prediction_explanations — pesos auditáveis por previsão
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prediction_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_source TEXT NOT NULL CHECK (prediction_source IN ('wc2026','partidas')),
  prediction_id UUID NOT NULL,
  match_id UUID,
  model_version TEXT NOT NULL DEFAULT 'statball-ai-v1',

  weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- {"elo":0.22,"fifa":0.15,"recent_form":0.18,"goals_for":0.10,
  --  "goals_against":0.10,"home_advantage":0.08,"absences":0.07,"h2h":0.10}
  rationale TEXT,
  top_factors JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (prediction_source, prediction_id)
);

GRANT SELECT ON public.prediction_explanations TO anon, authenticated;
GRANT ALL ON public.prediction_explanations TO service_role;
ALTER TABLE public.prediction_explanations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pe_select_all" ON public.prediction_explanations FOR SELECT USING (true);

-- ---------------------------------------------------------------------
-- 5) model_versions — registro das versões da IA
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,        -- 'statball-ai-v1'
  display_name TEXT NOT NULL,          -- 'Statball AI v1'
  description TEXT,
  released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.model_versions TO anon, authenticated;
GRANT ALL ON public.model_versions TO service_role;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mv_select_all" ON public.model_versions FOR SELECT USING (true);

INSERT INTO public.model_versions (version, display_name, description, is_active)
VALUES ('statball-ai-v1','Statball AI v1','Versão inicial do motor de previsões auditável', true)
ON CONFLICT (version) DO NOTHING;

-- ---------------------------------------------------------------------
-- 6) Funções utilitárias — scoring multi-nível
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_prediction_levels(
  p_home INT, p_away INT, r_home INT, r_away INT
) RETURNS TABLE(
  l1 BOOLEAN, l2 BOOLEAN, l3 BOOLEAN, l4 BOOLEAN, score INT
)
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_pred_res TEXT;
  v_real_res TEXT;
  v_l1 BOOLEAN; v_l2 BOOLEAN; v_l3 BOOLEAN; v_l4 BOOLEAN;
  v_score INT;
BEGIN
  v_pred_res := CASE WHEN p_home > p_away THEN 'home' WHEN p_home < p_away THEN 'away' ELSE 'draw' END;
  v_real_res := CASE WHEN r_home > r_away THEN 'home' WHEN r_home < r_away THEN 'away' ELSE 'draw' END;
  v_l1 := v_pred_res = v_real_res;
  v_l2 := v_l1;                                  -- tendência = mesmo lado vencendo
  v_l3 := (p_home - p_away) = (r_home - r_away); -- mesma diferença
  v_l4 := p_home = r_home AND p_away = r_away;

  v_score := CASE
    WHEN v_l4 THEN 100
    WHEN v_l3 THEN 80
    WHEN v_l1 THEN 60
    ELSE 0
  END;

  RETURN QUERY SELECT v_l1, v_l2, v_l3, v_l4, v_score;
END;
$$;

-- ---------------------------------------------------------------------
-- 7) Recalcula confidence_accuracy de forma incremental
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_confidence_accuracy(
  p_model_version TEXT,
  p_competition_code TEXT,
  p_band TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.confidence_accuracy AS ca (
    model_version, confidence_band, competition_code,
    total_matches, level1_hits, level2_hits, level3_hits, level4_hits, score_sum,
    accuracy_winner, accuracy_trend, accuracy_diff, accuracy_exact, avg_score, updated_at
  )
  SELECT
    p_model_version, p_band, p_competition_code,
    COUNT(*),
    COUNT(*) FILTER (WHERE level1_winner_correct),
    COUNT(*) FILTER (WHERE level2_trend_correct),
    COUNT(*) FILTER (WHERE level3_diff_correct),
    COUNT(*) FILTER (WHERE level4_exact_correct),
    COALESCE(SUM(prediction_score),0),
    ROUND(100.0 * COUNT(*) FILTER (WHERE level1_winner_correct) / NULLIF(COUNT(*),0), 2),
    ROUND(100.0 * COUNT(*) FILTER (WHERE level2_trend_correct)  / NULLIF(COUNT(*),0), 2),
    ROUND(100.0 * COUNT(*) FILTER (WHERE level3_diff_correct)   / NULLIF(COUNT(*),0), 2),
    ROUND(100.0 * COUNT(*) FILTER (WHERE level4_exact_correct)  / NULLIF(COUNT(*),0), 2),
    ROUND(AVG(prediction_score)::numeric, 2),
    now()
  FROM public.prediction_performance
  WHERE model_version = p_model_version
    AND confidence_band = p_band
    AND (p_competition_code = 'ALL' OR competition_code = p_competition_code)
  ON CONFLICT (model_version, confidence_band, competition_code) DO UPDATE SET
    total_matches = EXCLUDED.total_matches,
    level1_hits = EXCLUDED.level1_hits,
    level2_hits = EXCLUDED.level2_hits,
    level3_hits = EXCLUDED.level3_hits,
    level4_hits = EXCLUDED.level4_hits,
    score_sum   = EXCLUDED.score_sum,
    accuracy_winner = EXCLUDED.accuracy_winner,
    accuracy_trend  = EXCLUDED.accuracy_trend,
    accuracy_diff   = EXCLUDED.accuracy_diff,
    accuracy_exact  = EXCLUDED.accuracy_exact,
    avg_score = EXCLUDED.avg_score,
    updated_at = now();
END;
$$;

-- ---------------------------------------------------------------------
-- 8) Registra performance ao finalizar partida (idempotente / imutável)
--    Trigger em world_cup_2026_matches
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_wc2026_performance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ai RECORD;
  v_band TEXT;
  v_levels RECORD;
  v_pred_res TEXT;
  v_real_res TEXT;
  v_model TEXT := 'statball-ai-v1';
BEGIN
  IF NEW.status <> 'finished' THEN RETURN NEW; END IF;
  IF NEW.home_score IS NULL OR NEW.away_score IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_ai
  FROM public.world_cup_2026_ai_analyses
  WHERE match_id = NEW.id
    AND predicted_home_score IS NOT NULL
    AND predicted_away_score IS NOT NULL
  ORDER BY generated_at DESC NULLS LAST
  LIMIT 1;

  IF v_ai.id IS NULL THEN RETURN NEW; END IF;

  -- já registrado? imutável: não tocar
  IF EXISTS (
    SELECT 1 FROM public.prediction_performance
    WHERE match_source='wc2026' AND match_id = NEW.id AND model_version = v_model
  ) THEN
    RETURN NEW;
  END IF;

  v_band := CASE
    WHEN COALESCE(v_ai.confidence_score,0) >= 70 THEN 'alta'
    WHEN COALESCE(v_ai.confidence_score,0) >= 40 THEN 'media'
    ELSE 'baixa'
  END;

  SELECT * INTO v_levels FROM public.compute_prediction_levels(
    v_ai.predicted_home_score, v_ai.predicted_away_score,
    NEW.home_score, NEW.away_score
  );

  v_pred_res := CASE WHEN v_ai.predicted_home_score > v_ai.predicted_away_score THEN 'home'
                     WHEN v_ai.predicted_home_score < v_ai.predicted_away_score THEN 'away'
                     ELSE 'draw' END;
  v_real_res := CASE WHEN NEW.home_score > NEW.away_score THEN 'home'
                     WHEN NEW.home_score < NEW.away_score THEN 'away'
                     ELSE 'draw' END;

  INSERT INTO public.prediction_performance(
    match_source, match_id, competition_code, stage, model_version,
    predicted_home_goals, predicted_away_goals, predicted_result,
    confidence_band, confidence_value,
    real_home_goals, real_away_goals, real_result,
    level1_winner_correct, level2_trend_correct, level3_diff_correct, level4_exact_correct,
    goal_difference_error, total_goals_error, prediction_score
  ) VALUES (
    'wc2026', NEW.id, 'WC2026', NEW.stage, v_model,
    v_ai.predicted_home_score, v_ai.predicted_away_score, v_pred_res,
    v_band, v_ai.confidence_score,
    NEW.home_score, NEW.away_score, v_real_res,
    v_levels.l1, v_levels.l2, v_levels.l3, v_levels.l4,
    ABS((v_ai.predicted_home_score - v_ai.predicted_away_score) - (NEW.home_score - NEW.away_score)),
    ABS((v_ai.predicted_home_score + v_ai.predicted_away_score) - (NEW.home_score + NEW.away_score)),
    v_levels.score
  );

  PERFORM public.refresh_confidence_accuracy(v_model, 'WC2026', v_band);
  PERFORM public.refresh_confidence_accuracy(v_model, 'ALL', v_band);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_register_wc2026_perf ON public.world_cup_2026_matches;
CREATE TRIGGER trg_register_wc2026_perf
AFTER INSERT OR UPDATE OF status, home_score, away_score ON public.world_cup_2026_matches
FOR EACH ROW EXECUTE FUNCTION public.register_wc2026_performance();

-- ---------------------------------------------------------------------
-- 9) Trigger equivalente para partidas (Brasileirão & cia)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_partida_performance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pal RECORD;
  v_band TEXT;
  v_levels RECORD;
  v_pred_res TEXT;
  v_real_res TEXT;
  v_conf NUMERIC;
  v_code TEXT;
  v_model TEXT := 'statball-ai-v1';
BEGIN
  IF NEW.status::text <> 'finished' THEN RETURN NEW; END IF;
  IF NEW.gols_casa IS NULL OR NEW.gols_fora IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_pal FROM public.palpites WHERE partida_id = NEW.id LIMIT 1;
  IF v_pal.id IS NULL THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.prediction_performance
    WHERE match_source='partidas' AND match_id = NEW.id AND model_version = v_model
  ) THEN
    RETURN NEW;
  END IF;

  v_conf := COALESCE(v_pal.confianca, GREATEST(v_pal.prob_casa, v_pal.prob_empate, v_pal.prob_fora));
  v_band := CASE
    WHEN v_conf >= 70 THEN 'alta'
    WHEN v_conf >= 40 THEN 'media'
    ELSE 'baixa'
  END;

  SELECT codigo_api INTO v_code FROM public.ligas WHERE id = NEW.liga_id;

  SELECT * INTO v_levels FROM public.compute_prediction_levels(
    v_pal.placar_casa_estimado, v_pal.placar_fora_estimado,
    NEW.gols_casa, NEW.gols_fora
  );

  v_pred_res := CASE WHEN v_pal.placar_casa_estimado > v_pal.placar_fora_estimado THEN 'home'
                     WHEN v_pal.placar_casa_estimado < v_pal.placar_fora_estimado THEN 'away'
                     ELSE 'draw' END;
  v_real_res := CASE WHEN NEW.gols_casa > NEW.gols_fora THEN 'home'
                     WHEN NEW.gols_casa < NEW.gols_fora THEN 'away'
                     ELSE 'draw' END;

  INSERT INTO public.prediction_performance(
    match_source, match_id, competition_id, competition_code, model_version,
    predicted_home_goals, predicted_away_goals, predicted_result,
    confidence_band, confidence_value,
    real_home_goals, real_away_goals, real_result,
    level1_winner_correct, level2_trend_correct, level3_diff_correct, level4_exact_correct,
    goal_difference_error, total_goals_error, prediction_score
  ) VALUES (
    'partidas', NEW.id, NEW.liga_id, COALESCE(v_code,'OTHER'), v_model,
    v_pal.placar_casa_estimado, v_pal.placar_fora_estimado, v_pred_res,
    v_band, v_conf,
    NEW.gols_casa, NEW.gols_fora, v_real_res,
    v_levels.l1, v_levels.l2, v_levels.l3, v_levels.l4,
    ABS((v_pal.placar_casa_estimado - v_pal.placar_fora_estimado) - (NEW.gols_casa - NEW.gols_fora)),
    ABS((v_pal.placar_casa_estimado + v_pal.placar_fora_estimado) - (NEW.gols_casa + NEW.gols_fora)),
    v_levels.score
  );

  PERFORM public.refresh_confidence_accuracy(v_model, COALESCE(v_code,'OTHER'), v_band);
  PERFORM public.refresh_confidence_accuracy(v_model, 'ALL', v_band);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_register_partida_perf ON public.partidas;
CREATE TRIGGER trg_register_partida_perf
AFTER INSERT OR UPDATE OF status, gols_casa, gols_fora ON public.partidas
FOR EACH ROW EXECUTE FUNCTION public.register_partida_performance();

-- ---------------------------------------------------------------------
-- 10) Bloquear UPDATE/DELETE em prediction_performance (imutabilidade)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_pp_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'prediction_performance é imutável após gravação';
END;
$$;
DROP TRIGGER IF EXISTS trg_pp_no_update ON public.prediction_performance;
CREATE TRIGGER trg_pp_no_update BEFORE UPDATE OR DELETE ON public.prediction_performance
FOR EACH ROW EXECUTE FUNCTION public.block_pp_mutation();

-- ---------------------------------------------------------------------
-- 11) Backfill: gerar histórico de previsões já finalizadas
-- ---------------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  -- WC2026 finalizadas com análise IA
  FOR r IN
    SELECT m.id FROM public.world_cup_2026_matches m
    WHERE m.status = 'finished'
      AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.world_cup_2026_ai_analyses a
                  WHERE a.match_id = m.id
                    AND a.predicted_home_score IS NOT NULL)
  LOOP
    UPDATE public.world_cup_2026_matches SET updated_at = now() WHERE id = r.id;
  END LOOP;

  -- Partidas finalizadas com palpite
  FOR r IN
    SELECT p.id FROM public.partidas p
    WHERE p.status::text = 'finished'
      AND p.gols_casa IS NOT NULL AND p.gols_fora IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.palpites pp WHERE pp.partida_id = p.id)
    LIMIT 5000
  LOOP
    UPDATE public.partidas SET updated_at = now() WHERE id = r.id;
  END LOOP;
END $$;
