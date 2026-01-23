
-- =====================================================
-- SISTEMA ANTI-DUPLICIDADE - PARTE 2 (Funções corrigidas)
-- =====================================================

-- ETAPA 1: Função merge_teams corrigida
CREATE OR REPLACE FUNCTION public.merge_teams(
  p_target_id uuid,
  p_source_id uuid,
  p_merged_by uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target_record RECORD;
  v_source_record RECORD;
  v_matches_home int;
  v_matches_away int;
  v_aliases_migrated int;
  v_external_ids_migrated int;
  v_summary jsonb;
BEGIN
  -- Validações
  IF p_target_id IS NULL OR p_source_id IS NULL THEN
    RAISE EXCEPTION 'target_id e source_id são obrigatórios';
  END IF;
  
  IF p_target_id = p_source_id THEN
    RAISE EXCEPTION 'Não é possível fundir um time consigo mesmo';
  END IF;
  
  -- Buscar times
  SELECT id, nome, slug, status INTO v_target_record FROM public.times WHERE id = p_target_id;
  SELECT id, nome, slug, status INTO v_source_record FROM public.times WHERE id = p_source_id;
  
  IF v_target_record.id IS NULL THEN
    RAISE EXCEPTION 'Time alvo não encontrado';
  END IF;
  
  IF v_source_record.id IS NULL THEN
    RAISE EXCEPTION 'Time origem não encontrado';
  END IF;
  
  IF v_target_record.status = 'merged' THEN
    RAISE EXCEPTION 'Time alvo já foi fundido anteriormente';
  END IF;
  
  IF v_source_record.status = 'merged' THEN
    RAISE EXCEPTION 'Time origem já foi fundido anteriormente';
  END IF;
  
  -- 1. Contar e migrar partidas (time_casa_id)
  SELECT COUNT(*) INTO v_matches_home FROM public.partidas WHERE time_casa_id = p_source_id;
  UPDATE public.partidas
  SET time_casa_id = p_target_id, updated_at = now()
  WHERE time_casa_id = p_source_id;
  
  -- Contar e migrar partidas (time_fora_id)
  SELECT COUNT(*) INTO v_matches_away FROM public.partidas WHERE time_fora_id = p_source_id;
  UPDATE public.partidas
  SET time_fora_id = p_target_id, updated_at = now()
  WHERE time_fora_id = p_source_id;
  
  -- 2. Criar alias com o nome canônico do source (se não existir)
  INSERT INTO public.team_aliases (team_id, alias, normalized_alias, source, confidence)
  VALUES (
    p_target_id,
    v_source_record.nome,
    public.normalize_name(v_source_record.nome),
    'merge',
    100
  )
  ON CONFLICT DO NOTHING;
  
  -- 3. Contar e migrar todos os aliases do source para o target
  SELECT COUNT(*) INTO v_aliases_migrated FROM public.team_aliases WHERE team_id = p_source_id;
  UPDATE public.team_aliases
  SET team_id = p_target_id
  WHERE team_id = p_source_id;
  
  -- 4. Contar e migrar external_id_map
  SELECT COUNT(*) INTO v_external_ids_migrated 
  FROM public.external_id_map 
  WHERE entity_type = 'team' AND internal_id = p_source_id;
  
  UPDATE public.external_id_map
  SET internal_id = p_target_id
  WHERE entity_type = 'team' AND internal_id = p_source_id;
  
  -- 5. Marcar source como merged
  UPDATE public.times
  SET status = 'merged', updated_at = now()
  WHERE id = p_source_id;
  
  -- 6. Montar summary
  v_summary := jsonb_build_object(
    'matches_updated', v_matches_home + v_matches_away,
    'matches_home', v_matches_home,
    'matches_away', v_matches_away,
    'aliases_migrated', v_aliases_migrated,
    'external_ids_migrated', v_external_ids_migrated,
    'source_name', v_source_record.nome,
    'source_slug', v_source_record.slug,
    'target_name', v_target_record.nome,
    'target_slug', v_target_record.slug
  );
  
  -- 7. Registrar no log
  INSERT INTO public.team_merge_logs (
    team_target_id, team_source_id, source_canonical_name, source_canonical_slug, merged_by, summary
  ) VALUES (
    p_target_id, p_source_id, v_source_record.nome, v_source_record.slug, p_merged_by, v_summary
  );
  
  RETURN v_summary;
END;
$$;

-- ETAPA 2: Função para detectar duplicados sugeridos (corrigida, sem levenshtein por ora)
CREATE OR REPLACE FUNCTION public.get_suggested_duplicates(p_limit int DEFAULT 50)
RETURNS TABLE (
  team_a_id uuid,
  team_a_name text,
  team_a_slug text,
  team_b_id uuid,
  team_b_name text,
  team_b_slug text,
  similarity_score numeric,
  reason text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH normalized_teams AS (
    SELECT 
      t.id,
      t.nome,
      t.slug,
      public.normalize_name(t.nome) as norm_name,
      -- Remover prefixos/sufixos comuns para comparação
      regexp_replace(
        regexp_replace(
          regexp_replace(
            lower(unaccent(t.nome)),
            '^(fc|sc|ec|ac|cr|ce|se|ad|cd|cf|rc|rcd|ud|sd|ss|asd|ssd)\s+', '', 'i'
          ),
          '\s+(fc|sc|ec|ac|cr|ce|se|ad|cd|cf|rc|rcd|ud|sd|ss|asd|ssd|club|clube|esporte|futebol|football)$', '', 'i'
        ),
        '\s+', ' ', 'g'
      ) as clean_name
    FROM public.times t
    WHERE t.status = 'active'
  )
  SELECT DISTINCT ON (LEAST(a.id, b.id), GREATEST(a.id, b.id))
    a.id as team_a_id,
    a.nome as team_a_name,
    a.slug as team_a_slug,
    b.id as team_b_id,
    b.nome as team_b_name,
    b.slug as team_b_slug,
    CASE 
      WHEN a.clean_name = b.clean_name THEN 100.0
      WHEN a.norm_name = b.norm_name THEN 95.0
      WHEN a.slug = b.slug THEN 90.0
      ELSE 70.0
    END as similarity_score,
    CASE 
      WHEN a.clean_name = b.clean_name THEN 'Nomes limpos idênticos'
      WHEN a.norm_name = b.norm_name THEN 'Nomes normalizados idênticos'
      WHEN a.slug = b.slug THEN 'Slugs idênticos'
      ELSE 'Similaridade por prefixo'
    END as reason
  FROM normalized_teams a
  JOIN normalized_teams b ON a.id < b.id
  WHERE (
    a.clean_name = b.clean_name 
    OR a.norm_name = b.norm_name
    OR a.slug = b.slug
    OR left(a.clean_name, 10) = left(b.clean_name, 10)
  )
  ORDER BY LEAST(a.id, b.id), GREATEST(a.id, b.id), similarity_score DESC
  LIMIT p_limit;
END;
$$;

-- ETAPA 3: Função para consolidar aliases existentes
CREATE OR REPLACE FUNCTION public.consolidate_team_aliases()
RETURNS TABLE (
  team_id uuid,
  team_name text,
  alias_created boolean
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_team RECORD;
  v_created boolean;
BEGIN
  FOR v_team IN 
    SELECT t.id, t.nome, t.slug
    FROM public.times t
    WHERE t.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.team_aliases ta
      WHERE ta.team_id = t.id
      AND ta.source = 'internal'
    )
  LOOP
    BEGIN
      INSERT INTO public.team_aliases (team_id, alias, normalized_alias, source, confidence)
      VALUES (
        v_team.id,
        v_team.nome,
        public.normalize_name(v_team.nome),
        'internal',
        100
      )
      ON CONFLICT DO NOTHING;
      
      v_created := true;
    EXCEPTION WHEN OTHERS THEN
      v_created := false;
    END;
    
    team_id := v_team.id;
    team_name := v_team.nome;
    alias_created := v_created;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ETAPA 4: Função para buscar times com detalhes de aliases
CREATE OR REPLACE FUNCTION public.get_teams_with_aliases(
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'active',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  nome text,
  slug text,
  pais text,
  status text,
  escudo_url text,
  updated_at timestamptz,
  alias_count bigint,
  match_count bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.nome,
    t.slug,
    t.pais,
    t.status,
    t.escudo_url,
    t.updated_at,
    COALESCE(ac.cnt, 0) as alias_count,
    COALESCE(mc.cnt, 0) as match_count
  FROM public.times t
  LEFT JOIN (
    SELECT ta.team_id, COUNT(*) as cnt 
    FROM public.team_aliases ta 
    GROUP BY ta.team_id
  ) ac ON ac.team_id = t.id
  LEFT JOIN (
    SELECT team_id, COUNT(*) as cnt FROM (
      SELECT time_casa_id as team_id FROM public.partidas
      UNION ALL
      SELECT time_fora_id as team_id FROM public.partidas
    ) sub
    GROUP BY team_id
  ) mc ON mc.team_id = t.id
  WHERE 
    (p_status IS NULL OR p_status = 'all' OR t.status = p_status)
    AND (
      p_search IS NULL 
      OR p_search = ''
      OR t.nome ILIKE '%' || p_search || '%'
      OR t.slug ILIKE '%' || p_search || '%'
      OR EXISTS (
        SELECT 1 FROM public.team_aliases ta2
        WHERE ta2.team_id = t.id 
        AND (ta2.alias ILIKE '%' || p_search || '%' OR ta2.normalized_alias ILIKE '%' || p_search || '%')
      )
    )
  ORDER BY t.nome
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ETAPA 5: Função para contar times
CREATE OR REPLACE FUNCTION public.count_teams_with_aliases(
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'active'
)
RETURNS bigint LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.times t
  WHERE 
    (p_status IS NULL OR p_status = 'all' OR t.status = p_status)
    AND (
      p_search IS NULL 
      OR p_search = ''
      OR t.nome ILIKE '%' || p_search || '%'
      OR t.slug ILIKE '%' || p_search || '%'
      OR EXISTS (
        SELECT 1 FROM public.team_aliases ta2
        WHERE ta2.team_id = t.id 
        AND (ta2.alias ILIKE '%' || p_search || '%' OR ta2.normalized_alias ILIKE '%' || p_search || '%')
      )
    );
  
  RETURN v_count;
END;
$$;
