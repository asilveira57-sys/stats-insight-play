
CREATE OR REPLACE FUNCTION public.search_global(p_query text, p_limit integer DEFAULT 20)
 RETURNS TABLE(entity_type text, entity_id uuid, name text, extra jsonb, score integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_norm TEXT;
BEGIN
  v_norm := lower(unaccent(coalesce(p_query,'')));
  IF length(trim(v_norm)) < 2 THEN RETURN; END IF;

  RETURN QUERY
  WITH teams_scored AS (
    SELECT
      'team'::text AS r_type,
      t.id AS r_id,
      t.nome AS r_name,
      jsonb_build_object('slug', t.slug, 'pais', t.pais, 'escudo_url', t.escudo_url, 'cores', t.cores, 'estado', t.estado) AS r_extra,
      (
        CASE WHEN lower(unaccent(t.nome)) = v_norm THEN 100
             WHEN lower(unaccent(regexp_replace(t.nome, '\s*-\s*[A-Z]{2}$', '', 'g'))) = v_norm THEN 95
             WHEN t.slug = v_norm THEN 90
             WHEN lower(unaccent(t.nome)) LIKE v_norm || '%' THEN 75
             ELSE 50 END
        - CASE WHEN t.nome ~* '(\s|^)(U-?17|U-?20|U-?23|Sub-?\d+|Women|Feminin|\bW\b)(\s|$)' THEN 25 ELSE 0 END
        + LEAST(30, (COALESCE(t.priority_score, 0) / 3))::int
      ) AS r_score,
      COALESCE(t.priority_score, 0) AS r_pop
    FROM public.times t
    WHERE t.status = 'active'
      AND (lower(unaccent(t.nome)) LIKE '%' || v_norm || '%'
           OR EXISTS (SELECT 1 FROM public.team_aliases ta WHERE ta.team_id = t.id AND ta.normalized_alias LIKE '%' || v_norm || '%'))
  ),
  leagues_scored AS (
    SELECT 'league'::text AS r_type, l.id AS r_id, l.nome AS r_name,
      jsonb_build_object('slug', l.slug, 'pais', l.pais, 'logo_url', l.logo_url) AS r_extra,
      (CASE WHEN lower(unaccent(l.nome)) = v_norm THEN 100
            WHEN lower(unaccent(l.nome)) LIKE v_norm || '%' THEN 80
            ELSE 50 END
       + CASE WHEN l.pais ILIKE 'brazil%' OR l.pais ILIKE 'brasil%' THEN 10 ELSE 0 END
      ) AS r_score,
      0 AS r_pop
    FROM public.ligas l
    WHERE lower(unaccent(l.nome)) LIKE '%' || v_norm || '%'
  ),
  players_scored AS (
    SELECT 'player'::text AS r_type, p.id AS r_id, p.name AS r_name,
      jsonb_build_object('position', p.position, 'nationality', p.nationality, 'photo_url', p.photo_url, 'team_id', p.current_team_id) AS r_extra,
      CASE WHEN lower(unaccent(p.name)) = v_norm THEN 100
           WHEN lower(unaccent(p.name)) LIKE v_norm || '%' THEN 80
           ELSE 40 END AS r_score,
      0 AS r_pop
    FROM public.players p
    WHERE lower(unaccent(p.name)) LIKE '%' || v_norm || '%'
  ),
  all_results AS (
    SELECT * FROM teams_scored
    UNION ALL SELECT * FROM leagues_scored
    UNION ALL SELECT * FROM players_scored
  )
  SELECT r_type, r_id, r_name, r_extra, r_score
  FROM all_results
  ORDER BY r_score DESC, r_pop DESC, r_name ASC
  LIMIT p_limit;
END;
$function$;
