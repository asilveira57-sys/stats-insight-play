
-- =============================================
-- GAMIFICATION MODULE - FULL SCHEMA
-- =============================================

-- 1. gamification_rules (configurable XP rules)
CREATE TABLE public.gamification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT UNIQUE NOT NULL,
  xp_value INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gamification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gamification rules"
  ON public.gamification_rules FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage gamification rules"
  ON public.gamification_rules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default rules
INSERT INTO public.gamification_rules (rule_key, xp_value, description) VALUES
  ('WINNER_HIT', 10, 'Acertou vencedor/resultado (1X2)'),
  ('SCORE_HIT', 25, 'Acertou placar exato'),
  ('OVER25_HIT', 8, 'Acertou tendência (ex: acima de 2.5 gols)'),
  ('STREAK_BONUS', 5, 'Bônus por dia seguido com palpite (máx 30 dias)'),
  ('LATE_PICK_PENALTY', 0, 'Palpite após início do jogo = 0 XP');

-- 2. user_xp (XP/level tracking)
CREATE TABLE public.user_xp (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak_days INTEGER NOT NULL DEFAULT 0,
  best_streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own XP"
  ON public.user_xp FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all XP"
  ON public.user_xp FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage XP"
  ON public.user_xp FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 3. xp_events (XP ledger)
CREATE TABLE public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'prediction',
  source_id UUID,
  rule_key TEXT NOT NULL,
  xp_delta INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  match_id UUID REFERENCES public.partidas(id),
  competition_id UUID REFERENCES public.ligas(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own XP events"
  ON public.xp_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage XP events"
  ON public.xp_events FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert XP events"
  ON public.xp_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. badges
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'trophy',
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read badges"
  ON public.badges FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage badges"
  ON public.badges FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default badges
INSERT INTO public.badges (badge_key, name, description, icon, rarity) VALUES
  ('PRIMEIRO_PALPITE', 'Primeiro Palpite', 'Fez o primeiro palpite', 'target', 'common'),
  ('DEZ_PALPITES', 'Palpiteiro', '10 palpites válidos', 'target', 'common'),
  ('CEM_PALPITES', 'Palpiteiro Experiente', '100 palpites válidos', 'rare', 'rare'),
  ('PLACAR_EXATO_1', 'Vidente', 'Acertou 1 placar exato', 'eye', 'rare'),
  ('PLACAR_EXATO_10', 'Oráculo', 'Acertou 10 placares exatos', 'sparkles', 'epic'),
  ('STREAK_7', 'Dedicado', '7 dias seguidos de palpites', 'flame', 'rare'),
  ('STREAK_30', 'Imparável', '30 dias seguidos de palpites', 'zap', 'legendary'),
  ('TOP10_SEMANAL', 'Top 10 Semanal', 'Entrou no Top 10 do ranking semanal', 'medal', 'epic'),
  ('TOP1_MENSAL', 'Campeão Mensal', '#1 no ranking mensal', 'crown', 'legendary');

-- 5. user_badges
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_type TEXT,
  source_id UUID,
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own badges"
  ON public.user_badges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can read badges for public profiles"
  ON public.user_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_preferences up
      WHERE up.user_id = user_badges.user_id AND up.public_profile = true
    )
  );

CREATE POLICY "Admins can manage user badges"
  ON public.user_badges FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. public_rankings_cache
CREATE TABLE public.public_rankings_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  rank_position INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period, period_start, user_id)
);

ALTER TABLE public.public_rankings_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rankings"
  ON public.public_rankings_cache FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage rankings"
  ON public.public_rankings_cache FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- INDICES
-- =============================================
CREATE INDEX idx_xp_events_user_id ON public.xp_events(user_id);
CREATE INDEX idx_xp_events_created_at ON public.xp_events(created_at);
CREATE INDEX idx_xp_events_match_id ON public.xp_events(match_id);
CREATE INDEX idx_user_xp_total_xp ON public.user_xp(total_xp DESC);
CREATE INDEX idx_rankings_period_score ON public.public_rankings_cache(period, period_start, score DESC);
CREATE INDEX idx_rankings_user_period ON public.public_rankings_cache(user_id, period);
CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);

-- =============================================
-- VIEWS
-- =============================================
CREATE OR REPLACE VIEW public.v_public_user_summary AS
SELECT
  ux.user_id,
  upp.nickname,
  upp.avatar_url,
  p.nome,
  p.country,
  p.state,
  p.city,
  ux.total_xp,
  ux.level,
  ux.current_streak_days,
  ux.best_streak_days,
  ugs.total_palpites,
  ugs.total_acertos,
  ugs.acertos_placar_exato,
  ugs.pontuacao_total,
  CASE WHEN ugs.total_palpites > 0
    THEN ROUND((ugs.total_acertos::numeric / ugs.total_palpites) * 100, 1)
    ELSE 0
  END AS accuracy_pct,
  (SELECT COUNT(*) FROM public.user_badges ub WHERE ub.user_id = ux.user_id) AS badge_count
FROM public.user_xp ux
LEFT JOIN public.user_public_profiles upp ON upp.user_id = ux.user_id
LEFT JOIN public.profiles p ON p.user_id = ux.user_id
LEFT JOIN public.user_gamification_stats ugs ON ugs.user_id = ux.user_id;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Calculate level from XP
CREATE OR REPLACE FUNCTION public.calculate_level(p_total_xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_level INTEGER := 1;
  v_required INTEGER;
BEGIN
  LOOP
    v_required := ROUND(100 * POWER(v_level, 1.2))::INTEGER;
    IF p_total_xp < v_required THEN
      RETURN v_level;
    END IF;
    v_level := v_level + 1;
    IF v_level > 999 THEN
      RETURN 999;
    END IF;
  END LOOP;
END;
$$;

-- XP needed for a given level
CREATE OR REPLACE FUNCTION public.xp_for_level(p_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN ROUND(100 * POWER(p_level, 1.2))::INTEGER;
END;
$$;

-- Grant XP to a user (core function)
CREATE OR REPLACE FUNCTION public.grant_xp(
  p_user_id UUID,
  p_rule_key TEXT,
  p_source_type TEXT DEFAULT 'prediction',
  p_source_id UUID DEFAULT NULL,
  p_match_id UUID DEFAULT NULL,
  p_competition_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_rule RECORD;
  v_xp_delta INTEGER;
  v_new_total INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Get rule
  SELECT * INTO v_rule FROM public.gamification_rules
  WHERE rule_key = p_rule_key AND is_enabled = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Rule not found or disabled');
  END IF;

  v_xp_delta := v_rule.xp_value;
  IF v_xp_delta = 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Zero XP rule');
  END IF;

  -- Insert XP event
  INSERT INTO public.xp_events (user_id, source_type, source_id, rule_key, xp_delta, description, match_id, competition_id)
  VALUES (p_user_id, p_source_type, p_source_id, p_rule_key, v_xp_delta, COALESCE(p_description, v_rule.description), p_match_id, p_competition_id);

  -- Upsert user_xp
  INSERT INTO public.user_xp (user_id, total_xp, level)
  VALUES (p_user_id, v_xp_delta, public.calculate_level(v_xp_delta))
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = user_xp.total_xp + v_xp_delta,
    level = public.calculate_level(user_xp.total_xp + v_xp_delta),
    updated_at = now();

  SELECT total_xp, level INTO v_new_total, v_new_level
  FROM public.user_xp WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'xp_granted', v_xp_delta,
    'total_xp', v_new_total,
    'level', v_new_level
  );
END;
$$;

-- Update streak for a user
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_last DATE;
  v_streak INTEGER;
  v_best INTEGER;
  v_xp_result JSONB;
BEGIN
  SELECT last_activity_date, current_streak_days, best_streak_days
  INTO v_last, v_streak, v_best
  FROM public.user_xp WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_xp (user_id, last_activity_date, current_streak_days, best_streak_days)
    VALUES (p_user_id, v_today, 1, 1);
    RETURN jsonb_build_object('streak', 1, 'best', 1);
  END IF;

  IF v_last = v_today THEN
    -- Already updated today
    RETURN jsonb_build_object('streak', v_streak, 'best', v_best, 'already_counted', true);
  ELSIF v_last = v_today - 1 THEN
    -- Consecutive day
    v_streak := v_streak + 1;
  ELSE
    -- Streak broken
    v_streak := 1;
  END IF;

  IF v_streak > v_best THEN
    v_best := v_streak;
  END IF;

  UPDATE public.user_xp SET
    last_activity_date = v_today,
    current_streak_days = v_streak,
    best_streak_days = v_best,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Grant streak bonus (max 30 days)
  IF v_streak <= 30 THEN
    SELECT public.grant_xp(p_user_id, 'STREAK_BONUS', 'streak', NULL, NULL, NULL,
      'Streak de ' || v_streak || ' dias') INTO v_xp_result;
  END IF;

  RETURN jsonb_build_object('streak', v_streak, 'best', v_best, 'xp', v_xp_result);
END;
$$;

-- Auto-create user_xp on user signup
CREATE OR REPLACE FUNCTION public.create_user_xp_record()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.user_xp (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_xp
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_xp_record();

-- Trigger to update updated_at on gamification_rules
CREATE TRIGGER update_gamification_rules_updated_at
  BEFORE UPDATE ON public.gamification_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
