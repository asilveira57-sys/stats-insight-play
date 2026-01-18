-- =============================================
-- SISTEMA COMPLETO DE SLUGS CANÔNICOS PARA IMPORTAÇÃO
-- =============================================

-- 1. Adicionar coluna slug na tabela partidas
ALTER TABLE public.partidas ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Função para gerar slug de partida: time-casa-vs-time-fora-YYYY-MM-DD
CREATE OR REPLACE FUNCTION public.generate_match_slug(
  p_time_casa_id UUID,
  p_time_fora_id UUID,
  p_data DATE
) RETURNS TEXT AS $$
DECLARE
  v_home_slug TEXT;
  v_away_slug TEXT;
  v_base_slug TEXT;
BEGIN
  -- Buscar slugs dos times
  SELECT slug INTO v_home_slug FROM public.times WHERE id = p_time_casa_id;
  SELECT slug INTO v_away_slug FROM public.times WHERE id = p_time_fora_id;
  
  -- Se algum time não tem slug, usar um placeholder
  IF v_home_slug IS NULL OR v_home_slug = '' THEN
    v_home_slug := 'time-casa';
  END IF;
  
  IF v_away_slug IS NULL OR v_away_slug = '' THEN
    v_away_slug := 'time-fora';
  END IF;
  
  -- Formato: time-casa-vs-time-fora-YYYY-MM-DD
  v_base_slug := v_home_slug || '-vs-' || v_away_slug || '-' || to_char(p_data, 'YYYY-MM-DD');
  
  RETURN v_base_slug;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Função de trigger para gerar slug da partida (com unicidade incremental)
CREATE OR REPLACE FUNCTION public.set_partida_slug()
RETURNS TRIGGER AS $$
DECLARE
  v_base_slug TEXT;
  v_slug TEXT;
  v_counter INTEGER := 1;
BEGIN
  -- Só gerar slug se não existir (imutável após criação)
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Gerar slug base
    v_base_slug := public.generate_match_slug(NEW.time_casa_id, NEW.time_fora_id, NEW.data);
    v_slug := v_base_slug;
    
    -- Verificar unicidade e adicionar sufixo se necessário
    WHILE EXISTS (
      SELECT 1 FROM public.partidas 
      WHERE slug = v_slug 
      AND (NEW.id IS NULL OR id != NEW.id)
    ) LOOP
      v_counter := v_counter + 1;
      v_slug := v_base_slug || '-' || v_counter;
    END LOOP;
    
    NEW.slug := v_slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para partidas (se não existir)
DROP TRIGGER IF EXISTS trigger_set_partida_slug ON public.partidas;
CREATE TRIGGER trigger_set_partida_slug
  BEFORE INSERT ON public.partidas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_partida_slug();

-- 5. Atualizar trigger de times para NÃO alterar slug existente (imutabilidade)
CREATE OR REPLACE FUNCTION public.set_time_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Só gerar slug no INSERT ou se slug está vazio
  -- NUNCA alterar slug existente (imutabilidade)
  IF TG_OP = 'INSERT' THEN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      -- Validar nome
      IF NEW.nome IS NULL OR TRIM(NEW.nome) = '' THEN
        RAISE EXCEPTION 'Nome do time não pode ser vazio';
      END IF;
      NEW.slug := public.generate_unique_slug(public.slugify(NEW.nome), 'times', NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Manter slug anterior (imutável)
    IF OLD.slug IS NOT NULL AND OLD.slug != '' THEN
      NEW.slug := OLD.slug;
    ELSIF NEW.slug IS NULL OR NEW.slug = '' THEN
      IF NEW.nome IS NULL OR TRIM(NEW.nome) = '' THEN
        RAISE EXCEPTION 'Nome do time não pode ser vazio';
      END IF;
      NEW.slug := public.generate_unique_slug(public.slugify(NEW.nome), 'times', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Atualizar trigger de ligas para NÃO alterar slug existente (imutabilidade)
CREATE OR REPLACE FUNCTION public.set_liga_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Só gerar slug no INSERT ou se slug está vazio
  -- NUNCA alterar slug existente (imutabilidade)
  IF TG_OP = 'INSERT' THEN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      -- Validar nome
      IF NEW.nome IS NULL OR TRIM(NEW.nome) = '' THEN
        RAISE EXCEPTION 'Nome da liga não pode ser vazio';
      END IF;
      NEW.slug := public.generate_unique_slug(public.slugify(NEW.nome), 'ligas', NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Manter slug anterior (imutável)
    IF OLD.slug IS NOT NULL AND OLD.slug != '' THEN
      NEW.slug := OLD.slug;
    ELSIF NEW.slug IS NULL OR NEW.slug = '' THEN
      IF NEW.nome IS NULL OR TRIM(NEW.nome) = '' THEN
        RAISE EXCEPTION 'Nome da liga não pode ser vazio';
      END IF;
      NEW.slug := public.generate_unique_slug(public.slugify(NEW.nome), 'ligas', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Atualizar trigger de times para INSERT e UPDATE
DROP TRIGGER IF EXISTS trigger_set_time_slug ON public.times;
CREATE TRIGGER trigger_set_time_slug
  BEFORE INSERT OR UPDATE ON public.times
  FOR EACH ROW
  EXECUTE FUNCTION public.set_time_slug();

-- 8. Atualizar trigger de ligas para INSERT e UPDATE
DROP TRIGGER IF EXISTS trigger_set_liga_slug ON public.ligas;
CREATE TRIGGER trigger_set_liga_slug
  BEFORE INSERT OR UPDATE ON public.ligas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_liga_slug();

-- 9. Criar índice único para partidas.slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_partidas_slug ON public.partidas(slug) WHERE slug IS NOT NULL;

-- 10. Gerar slugs para partidas existentes que não têm
WITH partidas_sem_slug AS (
  SELECT p.id, p.time_casa_id, p.time_fora_id, p.data,
         ROW_NUMBER() OVER (
           PARTITION BY public.generate_match_slug(p.time_casa_id, p.time_fora_id, p.data)
           ORDER BY p.created_at
         ) as rn
  FROM public.partidas p
  WHERE p.slug IS NULL OR p.slug = ''
)
UPDATE public.partidas p
SET slug = CASE 
  WHEN pss.rn = 1 THEN public.generate_match_slug(pss.time_casa_id, pss.time_fora_id, pss.data)
  ELSE public.generate_match_slug(pss.time_casa_id, pss.time_fora_id, pss.data) || '-' || pss.rn
END
FROM partidas_sem_slug pss
WHERE p.id = pss.id;

-- 11. Função para buscar partida por slug (usada em imports)
CREATE OR REPLACE FUNCTION public.find_match_by_canonical_key(
  p_time_casa_id UUID,
  p_time_fora_id UUID,
  p_data DATE
) RETURNS UUID AS $$
DECLARE
  v_match_id UUID;
  v_expected_slug TEXT;
BEGIN
  -- Primeiro, buscar pelo slug esperado
  v_expected_slug := public.generate_match_slug(p_time_casa_id, p_time_fora_id, p_data);
  
  SELECT id INTO v_match_id
  FROM public.partidas
  WHERE slug = v_expected_slug
  LIMIT 1;
  
  IF v_match_id IS NOT NULL THEN
    RETURN v_match_id;
  END IF;
  
  -- Fallback: buscar por time_casa_id, time_fora_id e data
  SELECT id INTO v_match_id
  FROM public.partidas
  WHERE time_casa_id = p_time_casa_id
    AND time_fora_id = p_time_fora_id
    AND data = p_data
  LIMIT 1;
  
  RETURN v_match_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- 12. Função para resolver ou criar partida (idempotente)
CREATE OR REPLACE FUNCTION public.resolve_or_create_match(
  p_time_casa_id UUID,
  p_time_fora_id UUID,
  p_data DATE,
  p_hora TIME DEFAULT NULL,
  p_liga_id UUID DEFAULT NULL,
  p_api_id INTEGER DEFAULT NULL,
  p_status TEXT DEFAULT 'scheduled',
  p_rodada INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_match_id UUID;
BEGIN
  -- Validar dados obrigatórios
  IF p_time_casa_id IS NULL OR p_time_fora_id IS NULL OR p_data IS NULL THEN
    RAISE EXCEPTION 'time_casa_id, time_fora_id e data são obrigatórios';
  END IF;
  
  -- Buscar partida existente
  v_match_id := public.find_match_by_canonical_key(p_time_casa_id, p_time_fora_id, p_data);
  
  IF v_match_id IS NOT NULL THEN
    -- Atualizar campos que podem mudar (mas não o slug!)
    UPDATE public.partidas
    SET hora = COALESCE(p_hora, hora),
        liga_id = COALESCE(p_liga_id, liga_id),
        api_id = COALESCE(p_api_id, api_id),
        status = COALESCE(p_status::partida_status, status),
        rodada = COALESCE(p_rodada, rodada),
        updated_at = NOW()
    WHERE id = v_match_id;
    
    RETURN v_match_id;
  END IF;
  
  -- Criar nova partida (trigger vai gerar o slug)
  INSERT INTO public.partidas (
    time_casa_id, time_fora_id, data, hora, liga_id, api_id, status, rodada
  ) VALUES (
    p_time_casa_id, p_time_fora_id, p_data, p_hora, p_liga_id, p_api_id, 
    COALESCE(p_status, 'scheduled')::partida_status, p_rodada
  )
  RETURNING id INTO v_match_id;
  
  RETURN v_match_id;
END;
$$ LANGUAGE plpgsql;

-- 13. Função para resolver ou criar time (idempotente)
CREATE OR REPLACE FUNCTION public.resolve_or_create_team(
  p_nome TEXT,
  p_provider_id UUID DEFAULT NULL,
  p_external_id TEXT DEFAULT NULL,
  p_escudo_url TEXT DEFAULT NULL,
  p_pais TEXT DEFAULT NULL,
  p_api_id INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_team_id UUID;
  v_slug TEXT;
  v_normalized_name TEXT;
BEGIN
  -- Validar nome
  IF p_nome IS NULL OR TRIM(p_nome) = '' THEN
    RAISE EXCEPTION 'Nome do time não pode ser vazio';
  END IF;
  
  v_slug := public.slugify(p_nome);
  v_normalized_name := public.normalize_name(p_nome);
  
  -- 1. Tentar buscar por external_id_map
  IF p_provider_id IS NOT NULL AND p_external_id IS NOT NULL THEN
    SELECT internal_id INTO v_team_id
    FROM public.external_id_map
    WHERE source_id = p_provider_id
      AND entity_type = 'team'
      AND external_id = p_external_id;
    
    IF v_team_id IS NOT NULL THEN
      RETURN v_team_id;
    END IF;
  END IF;
  
  -- 2. Tentar buscar por slug
  SELECT id INTO v_team_id
  FROM public.times
  WHERE slug = v_slug;
  
  IF v_team_id IS NOT NULL THEN
    -- Registrar mapeamento se temos external_id
    IF p_provider_id IS NOT NULL AND p_external_id IS NOT NULL THEN
      INSERT INTO public.external_id_map (source_id, entity_type, external_id, internal_id, confidence)
      VALUES (p_provider_id, 'team', p_external_id, v_team_id, 'high')
      ON CONFLICT (source_id, entity_type, external_id) DO NOTHING;
    END IF;
    RETURN v_team_id;
  END IF;
  
  -- 3. Tentar buscar por nome normalizado
  SELECT id INTO v_team_id
  FROM public.times
  WHERE public.normalize_name(nome) = v_normalized_name;
  
  IF v_team_id IS NOT NULL THEN
    -- Registrar mapeamento se temos external_id
    IF p_provider_id IS NOT NULL AND p_external_id IS NOT NULL THEN
      INSERT INTO public.external_id_map (source_id, entity_type, external_id, internal_id, confidence)
      VALUES (p_provider_id, 'team', p_external_id, v_team_id, 'medium')
      ON CONFLICT (source_id, entity_type, external_id) DO NOTHING;
    END IF;
    RETURN v_team_id;
  END IF;
  
  -- 4. Criar novo time (trigger vai gerar slug único)
  INSERT INTO public.times (nome, escudo_url, pais, api_id)
  VALUES (p_nome, p_escudo_url, p_pais, p_api_id)
  RETURNING id INTO v_team_id;
  
  -- Registrar mapeamento
  IF p_provider_id IS NOT NULL AND p_external_id IS NOT NULL THEN
    INSERT INTO public.external_id_map (source_id, entity_type, external_id, internal_id, confidence)
    VALUES (p_provider_id, 'team', p_external_id, v_team_id, 'exact')
    ON CONFLICT (source_id, entity_type, external_id) DO NOTHING;
  END IF;
  
  -- Registrar alias
  INSERT INTO public.team_aliases (team_id, source_id, alias, normalized_alias)
  VALUES (v_team_id, p_provider_id, p_nome, v_normalized_name)
  ON CONFLICT DO NOTHING;
  
  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql;

-- 14. Função para resolver ou criar liga (idempotente)
CREATE OR REPLACE FUNCTION public.resolve_or_create_league(
  p_nome TEXT,
  p_provider_id UUID DEFAULT NULL,
  p_external_id TEXT DEFAULT NULL,
  p_codigo_api TEXT DEFAULT NULL,
  p_pais TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_api_id INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_league_id UUID;
  v_slug TEXT;
  v_normalized_name TEXT;
BEGIN
  -- Validar nome
  IF p_nome IS NULL OR TRIM(p_nome) = '' THEN
    RAISE EXCEPTION 'Nome da liga não pode ser vazio';
  END IF;
  
  v_slug := public.slugify(p_nome);
  v_normalized_name := public.normalize_name(p_nome);
  
  -- 1. Tentar buscar por external_id_map
  IF p_provider_id IS NOT NULL AND p_external_id IS NOT NULL THEN
    SELECT internal_id INTO v_league_id
    FROM public.external_id_map
    WHERE source_id = p_provider_id
      AND entity_type = 'league'
      AND external_id = p_external_id;
    
    IF v_league_id IS NOT NULL THEN
      RETURN v_league_id;
    END IF;
  END IF;
  
  -- 2. Tentar buscar por slug
  SELECT id INTO v_league_id
  FROM public.ligas
  WHERE slug = v_slug;
  
  IF v_league_id IS NOT NULL THEN
    -- Registrar mapeamento se temos external_id
    IF p_provider_id IS NOT NULL AND p_external_id IS NOT NULL THEN
      INSERT INTO public.external_id_map (source_id, entity_type, external_id, internal_id, confidence)
      VALUES (p_provider_id, 'league', p_external_id, v_league_id, 'high')
      ON CONFLICT (source_id, entity_type, external_id) DO NOTHING;
    END IF;
    RETURN v_league_id;
  END IF;
  
  -- 3. Tentar buscar por nome normalizado
  SELECT id INTO v_league_id
  FROM public.ligas
  WHERE public.normalize_name(nome) = v_normalized_name;
  
  IF v_league_id IS NOT NULL THEN
    -- Registrar mapeamento se temos external_id
    IF p_provider_id IS NOT NULL AND p_external_id IS NOT NULL THEN
      INSERT INTO public.external_id_map (source_id, entity_type, external_id, internal_id, confidence)
      VALUES (p_provider_id, 'league', p_external_id, v_league_id, 'medium')
      ON CONFLICT (source_id, entity_type, external_id) DO NOTHING;
    END IF;
    RETURN v_league_id;
  END IF;
  
  -- 4. Criar nova liga (trigger vai gerar slug único)
  INSERT INTO public.ligas (nome, codigo_api, pais, logo_url, api_id)
  VALUES (p_nome, p_codigo_api, p_pais, p_logo_url, p_api_id)
  RETURNING id INTO v_league_id;
  
  -- Registrar mapeamento
  IF p_provider_id IS NOT NULL AND p_external_id IS NOT NULL THEN
    INSERT INTO public.external_id_map (source_id, entity_type, external_id, internal_id, confidence)
    VALUES (p_provider_id, 'league', p_external_id, v_league_id, 'exact')
    ON CONFLICT (source_id, entity_type, external_id) DO NOTHING;
  END IF;
  
  -- Registrar alias
  INSERT INTO public.competition_aliases (league_id, source_id, alias, normalized_alias)
  VALUES (v_league_id, p_provider_id, p_nome, v_normalized_name)
  ON CONFLICT DO NOTHING;
  
  RETURN v_league_id;
END;
$$ LANGUAGE plpgsql;