
-- ============================================================
-- Pesquisa Inteligente Statball: tables, RPCs, RLS
-- ============================================================

-- 1. search_queries: log de toda busca
CREATE TABLE public.search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  query_text TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  query_type TEXT NOT NULL DEFAULT 'unknown',
  detected_entities JSONB NOT NULL DEFAULT '[]'::jsonb,
  response_status TEXT NOT NULL DEFAULT 'ok',
  result_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_search_queries_normalized ON public.search_queries(normalized_query);
CREATE INDEX idx_search_queries_user_created ON public.search_queries(user_id, created_at DESC);
CREATE INDEX idx_search_queries_created ON public.search_queries(created_at DESC);

GRANT SELECT, INSERT ON public.search_queries TO anon;
GRANT SELECT, INSERT ON public.search_queries TO authenticated;
GRANT ALL ON public.search_queries TO service_role;

ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert search queries"
  ON public.search_queries FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read all search queries"
  ON public.search_queries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. search_trends: agregado por termo/entidade
CREATE TABLE public.search_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'term',
  entity_id UUID NULL,
  total_searches INTEGER NOT NULL DEFAULT 0,
  daily_searches INTEGER NOT NULL DEFAULT 0,
  weekly_searches INTEGER NOT NULL DEFAULT 0,
  monthly_searches INTEGER NOT NULL DEFAULT 0,
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(term, entity_type)
);
CREATE INDEX idx_search_trends_total ON public.search_trends(total_searches DESC);
CREATE INDEX idx_search_trends_daily ON public.search_trends(daily_searches DESC);
CREATE INDEX idx_search_trends_entity ON public.search_trends(entity_type, entity_id);

GRANT SELECT ON public.search_trends TO anon;
GRANT SELECT ON public.search_trends TO authenticated;
GRANT ALL ON public.search_trends TO service_role;

ALTER TABLE public.search_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Search trends are public"
  ON public.search_trends FOR SELECT TO anon, authenticated
  USING (true);

-- 3. user_search_history: por usuário
CREATE TABLE public.user_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  query_text TEXT NOT NULL,
  query_type TEXT NOT NULL DEFAULT 'unknown',
  clicked_result_type TEXT NULL,
  clicked_result_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_search_history_user ON public.user_search_history(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_search_history TO authenticated;
GRANT ALL ON public.user_search_history TO service_role;

ALTER TABLE public.user_search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search history"
  ON public.user_search_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history"
  ON public.user_search_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search history"
  ON public.user_search_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. ai_answers_log
CREATE TABLE public.ai_answers_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  question TEXT NOT NULL,
  normalized_question TEXT NOT NULL,
  answer TEXT NOT NULL,
  data_sources_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  has_enough_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_answers_log_normalized ON public.ai_answers_log(normalized_question);
CREATE INDEX idx_ai_answers_log_created ON public.ai_answers_log(created_at DESC);

GRANT SELECT, INSERT ON public.ai_answers_log TO anon;
GRANT SELECT, INSERT ON public.ai_answers_log TO authenticated;
GRANT ALL ON public.ai_answers_log TO service_role;

ALTER TABLE public.ai_answers_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert ai answers log"
  ON public.ai_answers_log FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read ai answers log"
  ON public.ai_answers_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. popular_entities (rankings pré-agregados por período)
CREATE TABLE public.popular_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  search_count INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, period)
);
CREATE INDEX idx_popular_entities_rank ON public.popular_entities(period, entity_type, search_count DESC);

GRANT SELECT ON public.popular_entities TO anon;
GRANT SELECT ON public.popular_entities TO authenticated;
GRANT ALL ON public.popular_entities TO service_role;

ALTER TABLE public.popular_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Popular entities are public"
  ON public.popular_entities FOR SELECT TO anon, authenticated
  USING (true);

-- updated_at trigger for search_trends
CREATE TRIGGER trg_search_trends_updated_at
  BEFORE UPDATE ON public.search_trends
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RPCs
-- ============================================================

-- Register search + bump trend (atomic upsert)
CREATE OR REPLACE FUNCTION public.register_search(
  p_query TEXT,
  p_normalized TEXT,
  p_type TEXT,
  p_entities JSONB DEFAULT '[]'::jsonb,
  p_user_id UUID DEFAULT NULL,
  p_result_count INTEGER DEFAULT 0,
  p_status TEXT DEFAULT 'ok'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_entity JSONB;
BEGIN
  INSERT INTO public.search_queries(user_id, query_text, normalized_query, query_type, detected_entities, response_status, result_count)
  VALUES (p_user_id, p_query, p_normalized, p_type, p_entities, p_status, p_result_count)
  RETURNING id INTO v_id;

  -- bump global term trend
  INSERT INTO public.search_trends(term, entity_type, total_searches, daily_searches, weekly_searches, monthly_searches, last_searched_at)
  VALUES (p_normalized, 'term', 1, 1, 1, 1, now())
  ON CONFLICT (term, entity_type) DO UPDATE SET
    total_searches = public.search_trends.total_searches + 1,
    daily_searches = public.search_trends.daily_searches + 1,
    weekly_searches = public.search_trends.weekly_searches + 1,
    monthly_searches = public.search_trends.monthly_searches + 1,
    last_searched_at = now();

  -- bump per detected entity
  IF p_entities IS NOT NULL AND jsonb_typeof(p_entities) = 'array' THEN
    FOR v_entity IN SELECT * FROM jsonb_array_elements(p_entities)
    LOOP
      IF (v_entity->>'type') IS NOT NULL AND (v_entity->>'name') IS NOT NULL THEN
        INSERT INTO public.search_trends(term, entity_type, entity_id, total_searches, daily_searches, weekly_searches, monthly_searches, last_searched_at)
        VALUES (
          lower(v_entity->>'name'),
          v_entity->>'type',
          NULLIF(v_entity->>'id','')::uuid,
          1, 1, 1, 1, now()
        )
        ON CONFLICT (term, entity_type) DO UPDATE SET
          total_searches = public.search_trends.total_searches + 1,
          daily_searches = public.search_trends.daily_searches + 1,
          weekly_searches = public.search_trends.weekly_searches + 1,
          monthly_searches = public.search_trends.monthly_searches + 1,
          last_searched_at = now();

        INSERT INTO public.popular_entities(entity_type, entity_id, entity_name, search_count, period)
        VALUES (v_entity->>'type', COALESCE(v_entity->>'id', lower(v_entity->>'name')), v_entity->>'name', 1, 'all')
        ON CONFLICT (entity_type, entity_id, period) DO UPDATE SET
          search_count = public.popular_entities.search_count + 1,
          entity_name = EXCLUDED.entity_name;
      END IF;
    END LOOP;
  END IF;

  RETURN v_id;
END;
$$;

-- Record an AI answer
CREATE OR REPLACE FUNCTION public.record_ai_answer(
  p_question TEXT,
  p_normalized TEXT,
  p_answer TEXT,
  p_sources JSONB,
  p_confidence NUMERIC,
  p_has_enough BOOLEAN,
  p_user_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.ai_answers_log(user_id, question, normalized_question, answer, data_sources_used, confidence_score, has_enough_data)
  VALUES (p_user_id, p_question, p_normalized, p_answer, COALESCE(p_sources,'[]'::jsonb), COALESCE(p_confidence,0), COALESCE(p_has_enough,false))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Global fuzzy search across times, ligas, players
CREATE OR REPLACE FUNCTION public.search_global(p_query TEXT, p_limit INTEGER DEFAULT 20)
RETURNS TABLE(entity_type TEXT, entity_id UUID, name TEXT, extra JSONB, score INTEGER)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_norm TEXT;
BEGIN
  v_norm := lower(unaccent(coalesce(p_query,'')));
  IF length(trim(v_norm)) < 2 THEN RETURN; END IF;

  RETURN QUERY
  SELECT 'team'::text, t.id, t.nome,
    jsonb_build_object('slug', t.slug, 'pais', t.pais, 'escudo_url', t.escudo_url, 'cores', t.cores),
    CASE WHEN lower(unaccent(t.nome)) = v_norm THEN 100
         WHEN lower(unaccent(t.nome)) LIKE v_norm || '%' THEN 80
         ELSE 50 END
  FROM public.times t
  WHERE t.status = 'active'
    AND (lower(unaccent(t.nome)) LIKE '%' || v_norm || '%'
         OR EXISTS (SELECT 1 FROM public.team_aliases ta WHERE ta.team_id = t.id AND ta.normalized_alias LIKE '%' || v_norm || '%'))
  UNION ALL
  SELECT 'league'::text, l.id, l.nome,
    jsonb_build_object('slug', l.slug, 'pais', l.pais, 'logo_url', l.logo_url),
    CASE WHEN lower(unaccent(l.nome)) = v_norm THEN 100
         WHEN lower(unaccent(l.nome)) LIKE v_norm || '%' THEN 80
         ELSE 50 END
  FROM public.ligas l
  WHERE lower(unaccent(l.nome)) LIKE '%' || v_norm || '%'
  UNION ALL
  SELECT 'player'::text, p.id, p.name,
    jsonb_build_object('position', p.position, 'nationality', p.nationality, 'photo_url', p.photo_url, 'team_id', p.current_team_id),
    CASE WHEN lower(unaccent(p.name)) = v_norm THEN 100
         WHEN lower(unaccent(p.name)) LIKE v_norm || '%' THEN 80
         ELSE 40 END
  FROM public.players p
  WHERE lower(unaccent(p.name)) LIKE '%' || v_norm || '%'
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_search(TEXT,TEXT,TEXT,JSONB,UUID,INTEGER,TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_ai_answer(TEXT,TEXT,TEXT,JSONB,NUMERIC,BOOLEAN,UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_global(TEXT,INTEGER) TO anon, authenticated, service_role;
