
-- Currículo de clubes: títulos e participações
CREATE TABLE IF NOT EXISTS public.team_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
  competition_name text NOT NULL,
  competition_tier text NOT NULL CHECK (competition_tier IN ('estadual','regional','nacional','continental','mundial','amistoso','outro')),
  edition_year integer,
  position text NOT NULL DEFAULT 'Campeão',
  confederation text,
  source_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.team_titles TO anon, authenticated;
GRANT ALL ON public.team_titles TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.team_titles TO authenticated;

ALTER TABLE public.team_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team titles are viewable by everyone"
  ON public.team_titles FOR SELECT USING (true);
CREATE POLICY "Admins manage team titles - insert"
  ON public.team_titles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage team titles - update"
  ON public.team_titles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage team titles - delete"
  ON public.team_titles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_team_titles_team ON public.team_titles(team_id);
CREATE INDEX IF NOT EXISTS idx_team_titles_tier ON public.team_titles(competition_tier);

CREATE TRIGGER update_team_titles_updated_at
  BEFORE UPDATE ON public.team_titles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.team_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
  competition_name text NOT NULL,
  competition_tier text NOT NULL CHECK (competition_tier IN ('estadual','regional','nacional','continental','mundial','amistoso','outro')),
  year_from integer,
  year_to integer,
  total_editions integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.team_participations TO anon, authenticated;
GRANT ALL ON public.team_participations TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.team_participations TO authenticated;

ALTER TABLE public.team_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team participations are viewable by everyone"
  ON public.team_participations FOR SELECT USING (true);
CREATE POLICY "Admins manage team participations - insert"
  ON public.team_participations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage team participations - update"
  ON public.team_participations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage team participations - delete"
  ON public.team_participations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_team_participations_team ON public.team_participations(team_id);

CREATE TRIGGER update_team_participations_updated_at
  BEFORE UPDATE ON public.team_participations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Estender team_profiles com metadados básicos
ALTER TABLE public.team_profiles
  ADD COLUMN IF NOT EXISTS founded_year integer,
  ADD COLUMN IF NOT EXISTS stadium_name text,
  ADD COLUMN IF NOT EXISTS stadium_capacity integer,
  ADD COLUMN IF NOT EXISTS mascot text,
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS anthem_url text;
