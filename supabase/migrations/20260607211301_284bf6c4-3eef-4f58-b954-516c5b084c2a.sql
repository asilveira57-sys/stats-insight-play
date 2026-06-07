
-- 1) New columns
ALTER TABLE public.world_cup_2026_teams
  ADD COLUMN IF NOT EXISTS historical_summary_status text DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.world_cup_2026_players
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'api-football-base';

-- 2) Move external_team_id from EN duplicates -> PT canonical (only when PT is empty)
WITH pairs(en_slug, pt_slug) AS (
  VALUES
    ('algeria','argelia'),('belgium','belgica'),('brazil','brasil'),
    ('croatia','croacia'),('ecuador','equador'),('egypt','egito'),
    ('england','inglaterra'),('france','franca'),('germany','alemanha'),
    ('ghana','gana'),('iran','ira'),('ivory-coast','costa-do-marfim'),
    ('japan','japao'),('morocco','marrocos'),('netherlands','paises-baixos'),
    ('new-zealand','nova-zelandia'),('paraguay','paraguai'),
    ('qatar','catar'),('saudi-arabia','arabia-saudita'),
    ('south-africa','africa-do-sul'),('south-korea','coreia-do-sul'),
    ('spain','espanha'),('switzerland','suica'),('turkiye','turquia'),
    ('uruguay','uruguai'),('usa','estados-unidos')
)
UPDATE public.world_cup_2026_teams pt
SET external_team_id = en.external_team_id
FROM public.world_cup_2026_teams en, pairs p
WHERE pt.slug = p.pt_slug
  AND en.slug = p.en_slug
  AND pt.external_team_id IS NULL
  AND en.external_team_id IS NOT NULL;

-- 3) Deactivate EN duplicates that map to a PT canonical
UPDATE public.world_cup_2026_teams
SET is_active = false
WHERE slug IN (
  'algeria','belgium','brazil','croatia','ecuador','egypt','england',
  'france','germany','ghana','iran','ivory-coast','japan','morocco',
  'netherlands','new-zealand','paraguay','qatar','saudi-arabia',
  'south-africa','south-korea','spain','switzerland','turkiye',
  'uruguay','usa'
);
