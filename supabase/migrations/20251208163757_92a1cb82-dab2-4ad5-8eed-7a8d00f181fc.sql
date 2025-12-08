-- Enable realtime for partidas table
ALTER TABLE partidas REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partidas;