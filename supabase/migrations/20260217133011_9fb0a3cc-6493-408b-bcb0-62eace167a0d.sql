
-- Add missing columns to team_aliases
ALTER TABLE public.team_aliases ADD COLUMN IF NOT EXISTS source text DEFAULT NULL;
ALTER TABLE public.team_aliases ADD COLUMN IF NOT EXISTS external_id text DEFAULT NULL;
ALTER TABLE public.team_aliases ADD COLUMN IF NOT EXISTS confidence integer DEFAULT 100;
