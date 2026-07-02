
CREATE OR REPLACE FUNCTION public.seed_aliases_for_league(p_league_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_liga RECORD; v_variants text[]; v_v text; v_norm text;
  v_country_variants text[]; v_cv text; v_inserted integer := 0;
  v_is_youth boolean; v_is_women boolean; v_is_regional boolean;
  v_is_top boolean;
BEGIN
  SELECT id, nome, pais INTO v_liga FROM public.ligas WHERE id = p_league_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_is_youth := v_liga.nome ~* '(U-?\d+|Sub-?\d+|Aspirantes|Reserve|Amateur|Primavera)';
  v_is_women := v_liga.nome ~* '(Women|Feminin)';
  v_is_regional := v_liga.nome ~* '(Group\s+[A-Z]|Girone|Grupo\s+[A-Z])';

  v_variants := ARRAY[v_liga.nome];

  IF NOT v_is_youth AND NOT v_is_women AND NOT v_is_regional THEN
    v_variants := v_variants || ARRAY[
      regexp_replace(v_liga.nome, '^(Campeonato|Liga|Torneio)\s+', '', 'i'),
      regexp_replace(v_liga.nome, '\s+-\s+.*$', '')
    ];
  END IF;

  -- Brazilian divisions
  IF v_liga.nome ILIKE '%brasileir%' AND NOT v_is_youth AND NOT v_is_women THEN
    IF v_liga.nome ILIKE '%série a%' OR v_liga.nome ILIKE '%serie a%' THEN
      v_variants := v_variants || ARRAY['brasileirao','brasileirão','brasileiro','campeonato brasileiro',
                                        'serie a','série a'];
    ELSIF v_liga.nome ILIKE '%série b%' OR v_liga.nome ILIKE '%serie b%' THEN
      v_variants := v_variants || ARRAY['serie b','série b','brasileirao serie b','segunda divisao brasileira'];
    ELSIF v_liga.nome ILIKE '%série c%' OR v_liga.nome ILIKE '%serie c%' THEN
      v_variants := v_variants || ARRAY['serie c','série c'];
    ELSIF v_liga.nome ILIKE '%série d%' OR v_liga.nome ILIKE '%serie d%' THEN
      v_variants := v_variants || ARRAY['serie d','série d'];
    END IF;
  END IF;

  -- Top flight (primeira divisão) — usado para aliases genéricos por país
  v_is_top := v_liga.nome ~* '^(Premier League|La Liga|Serie A|Bundesliga|Ligue 1|Eredivisie|Primeira Liga|Primera Division|Primera División|Liga Profesional Argentina|Süper Lig|Super Lig)$'
           OR v_liga.nome ILIKE 'Campeonato Brasileiro Série A%';

  -- Copa do Mundo (seleção): só para nome exato "World Cup"/"Copa do Mundo", excluindo Club
  IF v_liga.nome ~* '^(World Cup|Copa do Mundo|FIFA World Cup)' AND v_liga.nome !~* 'Club' AND NOT v_is_youth AND NOT v_is_women THEN
    v_variants := v_variants || ARRAY['copa do mundo','mundial','world cup','copa do mundo fifa','copa fifa'];
  END IF;
  IF v_liga.nome ~* 'FIFA Club World Cup' THEN
    v_variants := v_variants || ARRAY['mundial de clubes','copa do mundo de clubes','fifa club world cup'];
  END IF;
  IF v_liga.nome ~* 'Champions League' AND v_liga.nome !~* 'Women' THEN
    v_variants := v_variants || ARRAY['champions','champions league','liga dos campeoes','liga dos campeões'];
  END IF;
  IF v_liga.nome ~* 'Europa League' AND v_liga.nome !~* 'Women' THEN
    v_variants := v_variants || ARRAY['europa league','liga europa'];
  END IF;
  IF v_liga.nome ~* 'Libertadores' THEN
    v_variants := v_variants || ARRAY['libertadores','copa libertadores','conmebol libertadores'];
  END IF;
  IF v_liga.nome ~* 'Sul-Americana|Sudamericana' THEN
    v_variants := v_variants || ARRAY['sul americana','sudamericana','copa sul americana'];
  END IF;
  IF v_liga.nome ~* '^Copa America' THEN
    v_variants := v_variants || ARRAY['copa america','copa américa'];
  END IF;
  IF v_liga.nome ~* 'Euro Championship|European Championship' THEN
    v_variants := v_variants || ARRAY['eurocopa','euro','campeonato europeu'];
  END IF;

  -- Country synonyms
  IF NOT v_is_youth AND NOT v_is_women AND NOT v_is_regional THEN
    v_country_variants := public.country_alias_variants(v_liga.pais);
    FOREACH v_cv IN ARRAY v_country_variants LOOP
      v_variants := v_variants || ARRAY[v_liga.nome || ' ' || v_cv];
      IF v_is_top THEN
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
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;

  RETURN v_inserted;
END; $$;

DELETE FROM public.competition_aliases;
SELECT public.seed_all_competition_aliases();
