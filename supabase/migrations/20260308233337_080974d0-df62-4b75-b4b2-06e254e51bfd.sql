
CREATE OR REPLACE FUNCTION public.get_teams_without_matches()
RETURNS TABLE(id uuid, nome text, slug text, created_at timestamptz, has_aliases boolean, has_external_ids boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.nome,
    t.slug,
    t.created_at,
    EXISTS(SELECT 1 FROM public.team_aliases ta WHERE ta.team_id = t.id) as has_aliases,
    EXISTS(SELECT 1 FROM public.external_id_map eim WHERE eim.entity_type = 'team' AND eim.internal_id = t.id::text) as has_external_ids
  FROM public.times t
  WHERE t.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.partidas p WHERE p.time_casa_id = t.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.partidas p WHERE p.time_fora_id = t.id
    )
  ORDER BY t.nome;
END;
$$;
