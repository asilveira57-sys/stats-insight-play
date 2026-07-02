
-- 1. SEARCH DIAGNOSTICS TABLE
CREATE TABLE IF NOT EXISTS public.search_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_raw text NOT NULL,
  query_normalized text,
  intent text,
  entities jsonb DEFAULT '{}'::jsonb,
  resolved jsonb DEFAULT '{}'::jsonb,
  confidence numeric,
  sql_source text,
  filters_used jsonb DEFAULT '[]'::jsonb,
  result_count integer DEFAULT 0,
  error_reason text,
  duration_ms integer,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.search_diagnostics TO authenticated;
GRANT INSERT ON public.search_diagnostics TO anon, authenticated;
GRANT ALL ON public.search_diagnostics TO service_role;
ALTER TABLE public.search_diagnostics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read diagnostics" ON public.search_diagnostics;
CREATE POLICY "Admins can read diagnostics" ON public.search_diagnostics
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Anyone can log diagnostics" ON public.search_diagnostics;
CREATE POLICY "Anyone can log diagnostics" ON public.search_diagnostics
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_search_diagnostics_created ON public.search_diagnostics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_diagnostics_intent ON public.search_diagnostics (intent);

-- 2. Country synonyms
CREATE OR REPLACE FUNCTION public.country_alias_variants(p_country text)
RETURNS text[] LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE c text := lower(coalesce(p_country, ''));
BEGIN
  RETURN CASE c
    WHEN 'brazil'      THEN ARRAY['brasileiro','brasileira','brasil','brasileirao']
    WHEN 'england'     THEN ARRAY['ingles','inglesa','inglaterra']
    WHEN 'spain'       THEN ARRAY['espanhol','espanhola','espanha']
    WHEN 'italy'       THEN ARRAY['italiano','italiana','italia']
    WHEN 'germany'     THEN ARRAY['alemao','alema','alemanha']
    WHEN 'france'      THEN ARRAY['frances','francesa','franca']
    WHEN 'portugal'    THEN ARRAY['portugues','portuguesa','portugal']
    WHEN 'netherlands' THEN ARRAY['holandes','holandesa','holanda']
    WHEN 'argentina'   THEN ARRAY['argentino','argentina']
    WHEN 'mexico'      THEN ARRAY['mexicano','mexicana','mexico']
    WHEN 'usa'         THEN ARRAY['americano','americana','eua','estados unidos']
    WHEN 'united states' THEN ARRAY['americano','americana','eua','estados unidos']
    WHEN 'scotland'    THEN ARRAY['escoces','escocesa','escocia']
    WHEN 'belgium'     THEN ARRAY['belga','belgica']
    WHEN 'chile'       THEN ARRAY['chileno','chilena','chile']
    WHEN 'colombia'    THEN ARRAY['colombiano','colombiana','colombia']
    WHEN 'japan'       THEN ARRAY['japones','japonesa','japao']
    WHEN 'world'       THEN ARRAY['mundial','internacional']
    WHEN 'europe'      THEN ARRAY['europeu','europeia','europa']
    ELSE ARRAY[]::text[]
  END;
END; $$;

-- 3. Seed aliases for one league
CREATE OR REPLACE FUNCTION public.seed_aliases_for_league(p_league_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_liga RECORD; v_variants text[]; v_v text; v_norm text;
  v_country_variants text[]; v_cv text; v_inserted integer := 0;
BEGIN
  SELECT id, nome, pais INTO v_liga FROM public.ligas WHERE id = p_league_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_variants := ARRAY[v_liga.nome];
  v_variants := v_variants || ARRAY[
    regexp_replace(v_liga.nome, '^(Campeonato|Copa|Liga|Torneio|Taça|Taca)\s+', '', 'i'),
    regexp_replace(v_liga.nome, '\s+-\s+.*$', ''),
    regexp_replace(v_liga.nome, '\s+(U-?\d+|Sub-?\d+|Women|Femininas?|Group\s+\w+)$', '', 'i')
  ];

  IF v_liga.nome ILIKE '%brasileir%' THEN
    v_variants := v_variants || ARRAY['brasileirao','brasileirão','brasileiro'];
    IF v_liga.nome ILIKE '%série a%' OR v_liga.nome ILIKE '%serie a%' THEN
      v_variants := v_variants || ARRAY['serie a','série a','brasileirao serie a','brasileirão série a'];
    END IF;
    IF v_liga.nome ILIKE '%série b%' OR v_liga.nome ILIKE '%serie b%' THEN
      v_variants := v_variants || ARRAY['serie b','série b','brasileirao serie b','brasileirão série b','segunda divisao brasileira'];
    END IF;
  END IF;

  v_country_variants := public.country_alias_variants(v_liga.pais);
  FOREACH v_cv IN ARRAY v_country_variants LOOP
    v_variants := v_variants || ARRAY[
      v_cv,
      'campeonato ' || v_cv,
      'liga ' || v_cv,
      v_liga.nome || ' ' || v_cv
    ];
  END LOOP;

  FOREACH v_v IN ARRAY v_variants LOOP
    IF v_v IS NULL OR trim(v_v) = '' THEN CONTINUE; END IF;
    v_norm := public.normalize_name(v_v);
    IF v_norm = '' THEN CONTINUE; END IF;
    BEGIN
      INSERT INTO public.competition_aliases (league_id, alias, normalized_alias)
      VALUES (v_liga.id, trim(v_v), v_norm)
      ON CONFLICT (alias) DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;

  RETURN v_inserted;
END; $$;

CREATE OR REPLACE FUNCTION public.seed_all_competition_aliases()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r RECORD; v_total integer := 0;
BEGIN
  FOR r IN SELECT id FROM public.ligas LOOP
    v_total := v_total + public.seed_aliases_for_league(r.id);
  END LOOP;
  RETURN v_total;
END; $$;

SELECT public.seed_all_competition_aliases();

CREATE OR REPLACE FUNCTION public.trg_seed_league_aliases()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN PERFORM public.seed_aliases_for_league(NEW.id); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ligas_seed_aliases ON public.ligas;
CREATE TRIGGER trg_ligas_seed_aliases
  AFTER INSERT ON public.ligas
  FOR EACH ROW EXECUTE FUNCTION public.trg_seed_league_aliases();

-- 4. Resolve competition (returns candidates)
CREATE OR REPLACE FUNCTION public.resolve_competition(p_query text)
RETURNS TABLE(out_league_id uuid, out_nome text, out_pais text, out_alias text, out_score int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_norm text := public.normalize_name(p_query);
BEGIN
  IF v_norm IS NULL OR v_norm = '' THEN RETURN; END IF;
  RETURN QUERY
  WITH matches AS (
    SELECT ca.league_id, ca.alias, 100 AS score
    FROM public.competition_aliases ca WHERE ca.normalized_alias = v_norm
    UNION ALL
    SELECT ca.league_id, ca.alias, 60
    FROM public.competition_aliases ca
    WHERE length(ca.normalized_alias) >= 4
      AND (v_norm LIKE '%' || ca.normalized_alias || '%'
           OR ca.normalized_alias LIKE '%' || v_norm || '%')
    UNION ALL
    SELECT l.id, l.nome, 80
    FROM public.ligas l WHERE public.normalize_name(l.nome) = v_norm
  ),
  best AS (
    SELECT league_id, MAX(score) AS score, (array_agg(alias ORDER BY score DESC))[1] AS alias
    FROM matches GROUP BY league_id
  )
  SELECT l.id, l.nome, l.pais, b.alias, b.score
  FROM best b JOIN public.ligas l ON l.id = b.league_id
  ORDER BY b.score DESC, l.nome LIMIT 10;
END; $$;
GRANT EXECUTE ON FUNCTION public.resolve_competition(text) TO anon, authenticated, service_role;

-- 5. Champion universal
CREATE OR REPLACE FUNCTION public.search_champion_universal(p_league_id uuid, p_year int)
RETURNS TABLE(out_team_id uuid, out_team_nome text, out_team_slug text, out_source text, out_year int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_liga_nome text;
BEGIN
  SELECT nome INTO v_liga_nome FROM public.ligas WHERE id = p_league_id;

  RETURN QUERY
  SELECT t.id, t.nome, t.slug, 'seasons.winner_team_id'::text, s.year
  FROM public.seasons s JOIN public.times t ON t.id = s.winner_team_id
  WHERE s.league_id = p_league_id AND (p_year IS NULL OR s.year = p_year)
    AND s.winner_team_id IS NOT NULL
  ORDER BY s.year DESC LIMIT 5;
  IF FOUND THEN RETURN; END IF;

  IF v_liga_nome IS NOT NULL THEN
    RETURN QUERY
    SELECT t.id, t.nome, t.slug, 'team_titles'::text, tt.edition_year
    FROM public.team_titles tt JOIN public.times t ON t.id = tt.team_id
    WHERE tt.position ILIKE 'campe%'
      AND (p_year IS NULL OR tt.edition_year = p_year)
      AND (
        public.normalize_name(tt.competition_name) = public.normalize_name(v_liga_nome)
        OR public.normalize_name(tt.competition_name) LIKE '%' || public.normalize_name(v_liga_nome) || '%'
        OR public.normalize_name(v_liga_nome) LIKE '%' || public.normalize_name(tt.competition_name) || '%'
      )
    ORDER BY tt.edition_year DESC LIMIT 5;
    IF FOUND THEN RETURN; END IF;
  END IF;

  RETURN QUERY
  SELECT t.id, t.nome, t.slug, 'standings'::text, s.year
  FROM public.standings st
  JOIN public.seasons s ON s.id = st.season_id
  JOIN public.times t ON t.id = st.team_id
  WHERE s.league_id = p_league_id AND (p_year IS NULL OR s.year = p_year)
    AND st.position = 1
  ORDER BY s.year DESC LIMIT 5;
END; $$;
GRANT EXECUTE ON FUNCTION public.search_champion_universal(uuid, int) TO anon, authenticated, service_role;

-- 6. Top scorer universal
CREATE OR REPLACE FUNCTION public.search_top_scorer_universal(p_league_id uuid, p_year int, p_limit int DEFAULT 10)
RETURNS TABLE(out_jogador text, out_slug text, out_time text, out_gols int, out_temporada text, out_source text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_temp text := CASE WHEN p_year IS NULL THEN NULL ELSE p_year::text END;
BEGIN
  RETURN QUERY
  SELECT aa.jogador_nome, aa.jogador_slug, t.nome, aa.gols, aa.temporada, 'artilharia_agregada'::text
  FROM public.artilharia_agregada aa LEFT JOIN public.times t ON t.id = aa.time_id
  WHERE aa.competicao_id = p_league_id
    AND (v_temp IS NULL OR aa.temporada = v_temp)
  ORDER BY aa.gols DESC LIMIT p_limit;
END; $$;
GRANT EXECUTE ON FUNCTION public.search_top_scorer_universal(uuid, int, int) TO anon, authenticated, service_role;

-- 7. Standings universal
CREATE OR REPLACE FUNCTION public.search_standings_universal(p_league_id uuid, p_year int)
RETURNS TABLE(out_pos int, out_team_id uuid, out_team_nome text, out_team_slug text,
              out_points int, out_played int, out_won int, out_drawn int, out_lost int,
              out_gf int, out_ga int, out_gd int, out_year int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT st.position, t.id, t.nome, t.slug, st.points, st.played, st.won, st.drawn, st.lost,
         st.goals_for, st.goals_against, st.goal_difference, s.year
  FROM public.standings st
  JOIN public.seasons s ON s.id = st.season_id
  JOIN public.times t ON t.id = st.team_id
  WHERE s.league_id = p_league_id AND (p_year IS NULL OR s.year = p_year)
  ORDER BY s.year DESC, st.position ASC;
END; $$;
GRANT EXECUTE ON FUNCTION public.search_standings_universal(uuid, int) TO anon, authenticated, service_role;
