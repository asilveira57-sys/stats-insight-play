-- Add slug aliases for common variations
UPDATE ligas SET slug = 'brasileirao-serie-a' WHERE id = 'c47cb84c-8cb0-444b-a2b7-9f328c20cc72';
UPDATE ligas SET slug = 'brasileirao-serie-b' WHERE id = 'bd6f6ab6-fbf8-4755-ac46-1c6c1cf42fdb';

-- Add competition aliases for slug fallback
INSERT INTO competition_aliases (league_id, alias, normalized_alias)
VALUES 
  ('c47cb84c-8cb0-444b-a2b7-9f328c20cc72', 'campeonato-brasileiro-serie-a', 'campeonato-brasileiro-serie-a'),
  ('c47cb84c-8cb0-444b-a2b7-9f328c20cc72', 'brasileirao', 'brasileirao'),
  ('bd6f6ab6-fbf8-4755-ac46-1c6c1cf42fdb', 'campeonato-brasileiro-serie-b', 'campeonato-brasileiro-serie-b')
ON CONFLICT DO NOTHING;