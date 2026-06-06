
ALTER TABLE public.world_cup_2026_teams
  ADD COLUMN IF NOT EXISTS fifa_ranking integer,
  ADD COLUMN IF NOT EXISTS confederation_full text,
  ADD COLUMN IF NOT EXISTS first_participation_year integer,
  ADD COLUMN IF NOT EXISTS titles_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coach_nationality text,
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text[];

ALTER TABLE public.world_cup_2026_team_history
  ADD COLUMN IF NOT EXISTS host_country text,
  ADD COLUMN IF NOT EXISTS coach_name text,
  ADD COLUMN IF NOT EXISTS notes text;
