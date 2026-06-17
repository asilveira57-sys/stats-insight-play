ALTER PUBLICATION supabase_realtime ADD TABLE public.world_cup_2026_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_cup_2026_ai_analyses;
ALTER TABLE public.world_cup_2026_matches REPLICA IDENTITY FULL;
ALTER TABLE public.world_cup_2026_ai_analyses REPLICA IDENTITY FULL;