-- Add missing 'status' column to times table
ALTER TABLE public.times ADD COLUMN status text NOT NULL DEFAULT 'active';

-- Update the get_teams_with_aliases function to work correctly
CREATE OR REPLACE FUNCTION public.get_teams_with_aliases(
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'active',
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  nome text,
  slug text,
  pais text,
  status text,
  escudo_url text,
  updated_at timestamptz,
  alias_count bigint,
  match_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    COALESCE(ac.cnt, 0)::bigint as alias_count,
    COALESCE(mc.cnt, 0)::bigint as match_count
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

-- Update consolidate_team_aliases to work with the new column
CREATE OR REPLACE FUNCTION public.consolidate_team_aliases()
RETURNS TABLE(team_id uuid, team_name text, alias_created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

-- Also fix count_teams_with_aliases
CREATE OR REPLACE FUNCTION public.count_teams_with_aliases(
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'active'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result bigint;
BEGIN
  SELECT COUNT(*) INTO result
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
  RETURN result;
END;
$$;