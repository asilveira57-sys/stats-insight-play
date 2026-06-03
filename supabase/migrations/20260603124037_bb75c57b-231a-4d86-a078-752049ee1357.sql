
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
  SELECT u.entity_type, u.entity_id, u.name, u.extra, u.score
  FROM (
    SELECT 'team'::text AS entity_type, t.id AS entity_id, t.nome AS name,
      jsonb_build_object('slug', t.slug, 'pais', t.pais, 'escudo_url', t.escudo_url, 'cores', t.cores) AS extra,
      CASE WHEN lower(unaccent(t.nome)) = v_norm THEN 100
           WHEN lower(unaccent(t.nome)) LIKE v_norm || '%' THEN 80
           ELSE 50 END AS score
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
  ) u
  ORDER BY u.score DESC
  LIMIT p_limit;
END;
$$;
