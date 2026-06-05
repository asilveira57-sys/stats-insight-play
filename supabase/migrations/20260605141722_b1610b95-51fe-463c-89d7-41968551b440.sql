
-- =========================================================
-- MÓDULO COPA 2026
-- =========================================================

-- Função auxiliar update_updated_at já existe (public.update_updated_at_column)

-- ---------- 1. TEAMS ----------
CREATE TABLE public.world_cup_2026_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  country_code TEXT,
  flag_url TEXT,
  confederation TEXT,
  group_letter TEXT,
  coach_name TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | qualified | eliminated | champion
  historical_summary TEXT,
  best_campaign TEXT,
  participations_count INTEGER DEFAULT 0,
  external_team_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.world_cup_2026_teams TO anon, authenticated;
GRANT ALL ON public.world_cup_2026_teams TO service_role;
ALTER TABLE public.world_cup_2026_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wc2026_teams_public_read" ON public.world_cup_2026_teams FOR SELECT USING (true);
CREATE POLICY "wc2026_teams_admin_write" ON public.world_cup_2026_teams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_wc2026_teams_updated BEFORE UPDATE ON public.world_cup_2026_teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_wc2026_teams_group ON public.world_cup_2026_teams(group_letter);
CREATE INDEX idx_wc2026_teams_status ON public.world_cup_2026_teams(status);

-- ---------- 2. TEAM HISTORY ----------
CREATE TABLE public.world_cup_2026_team_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.world_cup_2026_teams(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  final_position TEXT,
  stage_reached TEXT,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.world_cup_2026_team_history TO anon, authenticated;
GRANT ALL ON public.world_cup_2026_team_history TO service_role;
ALTER TABLE public.world_cup_2026_team_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wc2026_history_public_read" ON public.world_cup_2026_team_history FOR SELECT USING (true);
CREATE POLICY "wc2026_history_admin_write" ON public.world_cup_2026_team_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_wc2026_history_team ON public.world_cup_2026_team_history(team_id);
CREATE INDEX idx_wc2026_history_year ON public.world_cup_2026_team_history(year);

-- ---------- 3. PLAYERS ----------
CREATE TABLE public.world_cup_2026_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.world_cup_2026_teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  position TEXT,
  shirt_number INTEGER,
  club TEXT,
  birth_date DATE,
  photo_url TEXT,
  is_called_up BOOLEAN DEFAULT true,
  is_probable_starter BOOLEAN DEFAULT false,
  external_player_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, slug)
);
GRANT SELECT ON public.world_cup_2026_players TO anon, authenticated;
GRANT ALL ON public.world_cup_2026_players TO service_role;
ALTER TABLE public.world_cup_2026_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wc2026_players_public_read" ON public.world_cup_2026_players FOR SELECT USING (true);
CREATE POLICY "wc2026_players_admin_write" ON public.world_cup_2026_players FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_wc2026_players_updated BEFORE UPDATE ON public.world_cup_2026_players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_wc2026_players_team ON public.world_cup_2026_players(team_id);

-- ---------- 4. MATCHES ----------
CREATE TABLE public.world_cup_2026_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_fixture_id INTEGER UNIQUE,
  home_team_id UUID REFERENCES public.world_cup_2026_teams(id) ON DELETE SET NULL,
  away_team_id UUID REFERENCES public.world_cup_2026_teams(id) ON DELETE SET NULL,
  group_letter TEXT,
  stage TEXT NOT NULL DEFAULT 'group', -- group | r32 | r16 | qf | sf | third | final
  round TEXT,
  match_date TIMESTAMPTZ,
  stadium TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | live | finished | postponed | cancelled
  home_score INTEGER,
  away_score INTEGER,
  winner_team_id UUID REFERENCES public.world_cup_2026_teams(id) ON DELETE SET NULL,
  attendance INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.world_cup_2026_matches TO anon, authenticated;
GRANT ALL ON public.world_cup_2026_matches TO service_role;
ALTER TABLE public.world_cup_2026_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wc2026_matches_public_read" ON public.world_cup_2026_matches FOR SELECT USING (true);
CREATE POLICY "wc2026_matches_admin_write" ON public.world_cup_2026_matches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_wc2026_matches_updated BEFORE UPDATE ON public.world_cup_2026_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_wc2026_matches_date ON public.world_cup_2026_matches(match_date);
CREATE INDEX idx_wc2026_matches_group ON public.world_cup_2026_matches(group_letter);
CREATE INDEX idx_wc2026_matches_stage ON public.world_cup_2026_matches(stage);
CREATE INDEX idx_wc2026_matches_status ON public.world_cup_2026_matches(status);

-- ---------- 5. LINEUPS ----------
CREATE TABLE public.world_cup_2026_lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.world_cup_2026_matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.world_cup_2026_teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.world_cup_2026_players(id) ON DELETE SET NULL,
  position TEXT,
  formation TEXT,
  is_starter BOOLEAN DEFAULT true,
  is_official BOOLEAN DEFAULT false,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.world_cup_2026_lineups TO anon, authenticated;
GRANT ALL ON public.world_cup_2026_lineups TO service_role;
ALTER TABLE public.world_cup_2026_lineups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wc2026_lineups_public_read" ON public.world_cup_2026_lineups FOR SELECT USING (true);
CREATE POLICY "wc2026_lineups_admin_write" ON public.world_cup_2026_lineups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_wc2026_lineups_match ON public.world_cup_2026_lineups(match_id);
CREATE INDEX idx_wc2026_lineups_team ON public.world_cup_2026_lineups(team_id);

-- ---------- 6. MATCH EVENTS ----------
CREATE TABLE public.world_cup_2026_match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.world_cup_2026_matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.world_cup_2026_teams(id) ON DELETE SET NULL,
  player_id UUID REFERENCES public.world_cup_2026_players(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- goal | own_goal | penalty | yellow | red | sub | var
  minute INTEGER,
  extra_minute INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.world_cup_2026_match_events TO anon, authenticated;
GRANT ALL ON public.world_cup_2026_match_events TO service_role;
ALTER TABLE public.world_cup_2026_match_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wc2026_events_public_read" ON public.world_cup_2026_match_events FOR SELECT USING (true);
CREATE POLICY "wc2026_events_admin_write" ON public.world_cup_2026_match_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_wc2026_events_match ON public.world_cup_2026_match_events(match_id);

-- ---------- 7. STANDINGS ----------
CREATE TABLE public.world_cup_2026_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.world_cup_2026_teams(id) ON DELETE CASCADE,
  group_letter TEXT NOT NULL,
  played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  position INTEGER,
  status TEXT DEFAULT 'active',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, group_letter)
);
GRANT SELECT ON public.world_cup_2026_standings TO anon, authenticated;
GRANT ALL ON public.world_cup_2026_standings TO service_role;
ALTER TABLE public.world_cup_2026_standings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wc2026_standings_public_read" ON public.world_cup_2026_standings FOR SELECT USING (true);
CREATE POLICY "wc2026_standings_admin_write" ON public.world_cup_2026_standings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_wc2026_standings_updated BEFORE UPDATE ON public.world_cup_2026_standings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_wc2026_standings_group ON public.world_cup_2026_standings(group_letter);

-- ---------- 8. AI ANALYSES ----------
CREATE TABLE public.world_cup_2026_ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.world_cup_2026_matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.world_cup_2026_teams(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('pre_match','prediction','post_match','elimination','qualification','group_preview','team_profile','final_recap')),
  title TEXT,
  content TEXT,
  predicted_home_score INTEGER,
  predicted_away_score INTEGER,
  confidence_score NUMERIC,
  has_enough_data BOOLEAN DEFAULT true,
  model_used TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.world_cup_2026_ai_analyses TO anon, authenticated;
GRANT ALL ON public.world_cup_2026_ai_analyses TO service_role;
ALTER TABLE public.world_cup_2026_ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wc2026_ai_public_read" ON public.world_cup_2026_ai_analyses FOR SELECT USING (true);
CREATE POLICY "wc2026_ai_admin_write" ON public.world_cup_2026_ai_analyses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_wc2026_ai_match ON public.world_cup_2026_ai_analyses(match_id);
CREATE INDEX idx_wc2026_ai_team ON public.world_cup_2026_ai_analyses(team_id);
CREATE INDEX idx_wc2026_ai_type ON public.world_cup_2026_ai_analyses(analysis_type);

-- ---------- 9. POSTS ----------
CREATE TABLE public.world_cup_2026_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_match_id UUID REFERENCES public.world_cup_2026_matches(id) ON DELETE SET NULL,
  related_team_id UUID REFERENCES public.world_cup_2026_teams(id) ON DELETE SET NULL,
  post_type TEXT NOT NULL, -- preview | recap | qualification | elimination | profile | bracket_update
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | published | archived
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.world_cup_2026_posts TO anon, authenticated;
GRANT ALL ON public.world_cup_2026_posts TO service_role;
ALTER TABLE public.world_cup_2026_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wc2026_posts_published_read" ON public.world_cup_2026_posts FOR SELECT USING (status = 'published');
CREATE POLICY "wc2026_posts_admin_all" ON public.world_cup_2026_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_wc2026_posts_updated BEFORE UPDATE ON public.world_cup_2026_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_wc2026_posts_published ON public.world_cup_2026_posts(published_at DESC);
CREATE INDEX idx_wc2026_posts_type ON public.world_cup_2026_posts(post_type);

-- ---------- 10. SYNC LOGS ----------
CREATE TABLE public.world_cup_2026_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  provider TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  payload_snapshot JSONB
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.world_cup_2026_sync_logs TO authenticated;
GRANT ALL ON public.world_cup_2026_sync_logs TO service_role;
ALTER TABLE public.world_cup_2026_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wc2026_logs_admin_read" ON public.world_cup_2026_sync_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "wc2026_logs_admin_all" ON public.world_cup_2026_sync_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_wc2026_logs_started ON public.world_cup_2026_sync_logs(started_at DESC);
CREATE INDEX idx_wc2026_logs_type ON public.world_cup_2026_sync_logs(sync_type);
