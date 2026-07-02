
CREATE OR REPLACE FUNCTION public.seed_aliases_for_league(p_league_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_liga RECORD; v_variants text[]; v_v text; v_norm text;
  v_country_variants text[]; v_cv text; v_inserted integer := 0;
  v_is_youth boolean; v_is_women boolean; v_is_regional boolean;
  v_tier text;
BEGIN
  SELECT id, nome, pais INTO v_liga FROM public.ligas WHERE id = p_league_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_is_youth := v_liga.nome ~* '(U-?\d+|Sub-?\d+|Aspirantes)';
  v_is_women := v_liga.nome ~* '(Women|Feminin)';
  v_is_regional := v_liga.nome ~* '(Group\s+[A-Z]|Girone)';

  v_variants := ARRAY[v_liga.nome];

  -- Do NOT strip prefixes for youth/women leagues (avoid collision with top-flight)
  IF NOT v_is_youth AND NOT v_is_women AND NOT v_is_regional THEN
    v_variants := v_variants || ARRAY[
      regexp_replace(v_liga.nome, '^(Campeonato|Copa|Liga|Torneio|Taça|Taca)\s+', '', 'i'),
      regexp_replace(v_liga.nome, '\s+-\s+.*$', '')
    ];
  END IF;

  -- Brazilian divisions: generic aliases only for the correct tier
  IF v_liga.nome ILIKE '%brasileir%' AND NOT v_is_youth AND NOT v_is_women THEN
    IF v_liga.nome ILIKE '%série a%' OR v_liga.nome ILIKE '%serie a%' THEN
      v_variants := v_variants || ARRAY['brasileirao','brasileirão','brasileiro','campeonato brasileiro',
                                        'serie a','série a','brasileirao serie a','brasileirão série a'];
    ELSIF v_liga.nome ILIKE '%série b%' OR v_liga.nome ILIKE '%serie b%' THEN
      v_variants := v_variants || ARRAY['serie b','série b','brasileirao serie b','brasileirão série b','segunda divisao brasileira'];
    ELSIF v_liga.nome ILIKE '%série c%' OR v_liga.nome ILIKE '%serie c%' THEN
      v_variants := v_variants || ARRAY['serie c','série c','brasileirao serie c','brasileirão série c','terceira divisao brasileira'];
    ELSIF v_liga.nome ILIKE '%série d%' OR v_liga.nome ILIKE '%serie d%' THEN
      v_variants := v_variants || ARRAY['serie d','série d','brasileirao serie d','brasileirão série d'];
    END IF;
  END IF;

  -- Country synonyms only for top-tier leagues (avoid youth flooding)
  IF NOT v_is_youth AND NOT v_is_women AND NOT v_is_regional THEN
    v_country_variants := public.country_alias_variants(v_liga.pais);
    FOREACH v_cv IN ARRAY v_country_variants LOOP
      v_variants := v_variants || ARRAY[v_liga.nome || ' ' || v_cv];
      -- add short country-adjective only for well-known top competitions
      IF v_liga.nome ~* '^(Premier League|La Liga|Serie A|Bundesliga|Ligue 1|Eredivisie|Primeira Liga|Championship)$' THEN
        v_variants := v_variants || ARRAY[v_cv, 'campeonato ' || v_cv, 'liga ' || v_cv];
      END IF;
    END LOOP;
  END IF;

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

-- wipe + reseed to purge previous ambiguous aliases
DELETE FROM public.competition_aliases;
SELECT public.seed_all_competition_aliases();
