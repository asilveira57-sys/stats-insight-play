
-- Fix: Set view to SECURITY INVOKER (default, safe)
CREATE OR REPLACE VIEW public.v_public_user_summary
WITH (security_invoker = true)
AS
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

-- Add SELECT policy on user_xp for public ranking view (needed for SECURITY INVOKER)
CREATE POLICY "Public can read XP for public profiles"
  ON public.user_xp FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_preferences up
      WHERE up.user_id = user_xp.user_id AND up.public_profile = true
    )
  );
