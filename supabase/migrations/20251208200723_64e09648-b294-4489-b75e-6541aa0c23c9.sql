-- Add unique constraint on user_id and partida_id for upsert to work correctly
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'palpites_usuarios_user_partida_unique'
  ) THEN
    ALTER TABLE public.palpites_usuarios 
    ADD CONSTRAINT palpites_usuarios_user_partida_unique UNIQUE (user_id, partida_id);
  END IF;
END $$;