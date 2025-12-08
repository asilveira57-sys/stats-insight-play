-- Add cores column to times table
ALTER TABLE public.times ADD COLUMN IF NOT EXISTS cores jsonb DEFAULT '{"primary": "#6B7280", "secondary": "#FFFFFF"}';

-- Update colors for major teams (by name matching)
-- Brazilian Teams
UPDATE public.times SET cores = '{"primary": "#000000", "secondary": "#C8102E"}' WHERE nome ILIKE '%Flamengo%';
UPDATE public.times SET cores = '{"primary": "#006437", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Palmeiras%';
UPDATE public.times SET cores = '{"primary": "#000000", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Corinthians%';
UPDATE public.times SET cores = '{"primary": "#FF0000", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%São Paulo%' OR nome ILIKE '%Sao Paulo%';
UPDATE public.times SET cores = '{"primary": "#0066B2", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Cruzeiro%';
UPDATE public.times SET cores = '{"primary": "#000000", "secondary": "#FFD700"}' WHERE nome ILIKE '%Atlético%Mineiro%' OR nome ILIKE '%Atletico%MG%';
UPDATE public.times SET cores = '{"primary": "#005BAC", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Grêmio%' OR nome ILIKE '%Gremio%';
UPDATE public.times SET cores = '{"primary": "#E31937", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Internacional%';
UPDATE public.times SET cores = '{"primary": "#000000", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Botafogo%';
UPDATE public.times SET cores = '{"primary": "#8B0000", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Fluminense%';
UPDATE public.times SET cores = '{"primary": "#FF0000", "secondary": "#000000"}' WHERE nome ILIKE '%Sport%Recife%';
UPDATE public.times SET cores = '{"primary": "#007A33", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Coritiba%';
UPDATE public.times SET cores = '{"primary": "#CC0000", "secondary": "#000000"}' WHERE nome ILIKE '%Athletico%' OR nome ILIKE '%Atlético%Paranaense%';
UPDATE public.times SET cores = '{"primary": "#FFCC00", "secondary": "#000000"}' WHERE nome ILIKE '%Bahia%';
UPDATE public.times SET cores = '{"primary": "#0033A0", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Fortaleza%';
UPDATE public.times SET cores = '{"primary": "#006B3F", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Goiás%' OR nome ILIKE '%Goias%';
UPDATE public.times SET cores = '{"primary": "#FFD700", "secondary": "#000000"}' WHERE nome ILIKE '%Ceará%' OR nome ILIKE '%Ceara%';
UPDATE public.times SET cores = '{"primary": "#DC143C", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Náutico%' OR nome ILIKE '%Nautico%';
UPDATE public.times SET cores = '{"primary": "#000080", "secondary": "#FFD700"}' WHERE nome ILIKE '%Boca Juniors%';
UPDATE public.times SET cores = '{"primary": "#FF0000", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%River Plate%';
UPDATE public.times SET cores = '{"primary": "#E31937", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Santos%';

-- English Premier League
UPDATE public.times SET cores = '{"primary": "#6CABDD", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Manchester City%';
UPDATE public.times SET cores = '{"primary": "#DA291C", "secondary": "#FBE122"}' WHERE nome ILIKE '%Manchester United%';
UPDATE public.times SET cores = '{"primary": "#C8102E", "secondary": "#F6EB61"}' WHERE nome ILIKE '%Liverpool%';
UPDATE public.times SET cores = '{"primary": "#034694", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Chelsea%';
UPDATE public.times SET cores = '{"primary": "#EF0107", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Arsenal%';
UPDATE public.times SET cores = '{"primary": "#132257", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Tottenham%';
UPDATE public.times SET cores = '{"primary": "#003399", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Everton%';
UPDATE public.times SET cores = '{"primary": "#7A263A", "secondary": "#95BFE5"}' WHERE nome ILIKE '%Aston Villa%';
UPDATE public.times SET cores = '{"primary": "#1B458F", "secondary": "#C8102E"}' WHERE nome ILIKE '%Crystal Palace%';
UPDATE public.times SET cores = '{"primary": "#7C2C3B", "secondary": "#1BB1E7"}' WHERE nome ILIKE '%West Ham%';
UPDATE public.times SET cores = '{"primary": "#EE2737", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Nottingham%';
UPDATE public.times SET cores = '{"primary": "#003090", "secondary": "#FFD200"}' WHERE nome ILIKE '%Brighton%';
UPDATE public.times SET cores = '{"primary": "#DA020E", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Southampton%';
UPDATE public.times SET cores = '{"primary": "#FBEE23", "secondary": "#000000"}' WHERE nome ILIKE '%Wolves%' OR nome ILIKE '%Wolverhampton%';
UPDATE public.times SET cores = '{"primary": "#0057B8", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Leicester%';
UPDATE public.times SET cores = '{"primary": "#6C1D45", "secondary": "#99D6EA"}' WHERE nome ILIKE '%Burnley%';
UPDATE public.times SET cores = '{"primary": "#241F20", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Fulham%';
UPDATE public.times SET cores = '{"primary": "#FBEE23", "secondary": "#1B458F"}' WHERE nome ILIKE '%Leeds%';
UPDATE public.times SET cores = '{"primary": "#FFFFFF", "secondary": "#000000"}' WHERE nome ILIKE '%Newcastle%';
UPDATE public.times SET cores = '{"primary": "#FDB913", "secondary": "#00A650"}' WHERE nome ILIKE '%Norwich%';
UPDATE public.times SET cores = '{"primary": "#EF0107", "secondary": "#000000"}' WHERE nome ILIKE '%Bournemouth%';
UPDATE public.times SET cores = '{"primary": "#E03A3E", "secondary": "#1C2C5B"}' WHERE nome ILIKE '%Brentford%';
UPDATE public.times SET cores = '{"primary": "#0E63AD", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Ipswich%';

-- La Liga (Spain)
UPDATE public.times SET cores = '{"primary": "#FFFFFF", "secondary": "#00529F"}' WHERE nome ILIKE '%Real Madrid%';
UPDATE public.times SET cores = '{"primary": "#A50044", "secondary": "#004D98"}' WHERE nome ILIKE '%Barcelona%';
UPDATE public.times SET cores = '{"primary": "#CE1126", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Atlético Madrid%' OR nome ILIKE '%Atletico Madrid%';
UPDATE public.times SET cores = '{"primary": "#FEBE10", "secondary": "#004D98"}' WHERE nome ILIKE '%Villarreal%';
UPDATE public.times SET cores = '{"primary": "#004D98", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Deportivo%';
UPDATE public.times SET cores = '{"primary": "#0066B3", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Real Sociedad%';
UPDATE public.times SET cores = '{"primary": "#EE2523", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Sevilla%';
UPDATE public.times SET cores = '{"primary": "#048A81", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Real Betis%';
UPDATE public.times SET cores = '{"primary": "#004B93", "secondary": "#F5D033"}' WHERE nome ILIKE '%Celta%Vigo%';
UPDATE public.times SET cores = '{"primary": "#EE1C25", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Athletic%Bilbao%' OR nome ILIKE '%Athletic Club%';
UPDATE public.times SET cores = '{"primary": "#FFFFFF", "secondary": "#DA291C"}' WHERE nome ILIKE '%Valencia%';
UPDATE public.times SET cores = '{"primary": "#005CB9", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Getafe%';
UPDATE public.times SET cores = '{"primary": "#DA291C", "secondary": "#003DA5"}' WHERE nome ILIKE '%Osasuna%';
UPDATE public.times SET cores = '{"primary": "#A50034", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Girona%';
UPDATE public.times SET cores = '{"primary": "#FFCD00", "secondary": "#0033A0"}' WHERE nome ILIKE '%Las Palmas%';
UPDATE public.times SET cores = '{"primary": "#ED1C24", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Mallorca%';
UPDATE public.times SET cores = '{"primary": "#0055A5", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Alavés%' OR nome ILIKE '%Alaves%';
UPDATE public.times SET cores = '{"primary": "#0072CE", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Leganés%' OR nome ILIKE '%Leganes%';
UPDATE public.times SET cores = '{"primary": "#1E4D8C", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Espanyol%';
UPDATE public.times SET cores = '{"primary": "#BE1E2D", "secondary": "#003DA5"}' WHERE nome ILIKE '%Rayo Vallecano%';

-- Serie A (Italy)
UPDATE public.times SET cores = '{"primary": "#000000", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Juventus%';
UPDATE public.times SET cores = '{"primary": "#0068A8", "secondary": "#000000"}' WHERE nome ILIKE '%Inter%' AND nome ILIKE '%Milan%';
UPDATE public.times SET cores = '{"primary": "#FB090B", "secondary": "#000000"}' WHERE nome ILIKE '%AC Milan%' OR nome = 'Milan';
UPDATE public.times SET cores = '{"primary": "#87CEEB", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%SSC Napoli%' OR nome = 'Napoli';
UPDATE public.times SET cores = '{"primary": "#A6093D", "secondary": "#F0BC42"}' WHERE nome ILIKE '%Roma%';
UPDATE public.times SET cores = '{"primary": "#87CEEB", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Lazio%';
UPDATE public.times SET cores = '{"primary": "#AC1E44", "secondary": "#000000"}' WHERE nome ILIKE '%Torino%';
UPDATE public.times SET cores = '{"primary": "#0066CC", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Atalanta%';
UPDATE public.times SET cores = '{"primary": "#10069F", "secondary": "#FDB71A"}' WHERE nome ILIKE '%Hellas Verona%' OR nome = 'Verona';
UPDATE public.times SET cores = '{"primary": "#FFFFFF", "secondary": "#00A551"}' WHERE nome ILIKE '%Sassuolo%';
UPDATE public.times SET cores = '{"primary": "#1A1A6B", "secondary": "#CF152D"}' WHERE nome ILIKE '%Bologna%';
UPDATE public.times SET cores = '{"primary": "#7B1E7A", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Fiorentina%';
UPDATE public.times SET cores = '{"primary": "#004D98", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Empoli%';
UPDATE public.times SET cores = '{"primary": "#F68712", "secondary": "#0066B1"}' WHERE nome ILIKE '%Lecce%';
UPDATE public.times SET cores = '{"primary": "#004A99", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Sampdoria%';
UPDATE public.times SET cores = '{"primary": "#1C4F9C", "secondary": "#E31C23"}' WHERE nome ILIKE '%Genoa%';
UPDATE public.times SET cores = '{"primary": "#98002E", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Salernitana%';
UPDATE public.times SET cores = '{"primary": "#0046AD", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Como%';
UPDATE public.times SET cores = '{"primary": "#EE3124", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Monza%';
UPDATE public.times SET cores = '{"primary": "#1E1E1E", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Udinese%';
UPDATE public.times SET cores = '{"primary": "#C19D60", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Venezia%';
UPDATE public.times SET cores = '{"primary": "#DC0714", "secondary": "#232323"}' WHERE nome ILIKE '%Cagliari%';
UPDATE public.times SET cores = '{"primary": "#FFCD00", "secondary": "#003DA5"}' WHERE nome ILIKE '%Parma%';

-- Bundesliga (Germany)
UPDATE public.times SET cores = '{"primary": "#DC052D", "secondary": "#0066B2"}' WHERE nome ILIKE '%Bayern%';
UPDATE public.times SET cores = '{"primary": "#FDE100", "secondary": "#000000"}' WHERE nome ILIKE '%Borussia Dortmund%' OR nome ILIKE '%Dortmund%';
UPDATE public.times SET cores = '{"primary": "#1E5631", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Werder Bremen%' OR nome ILIKE '%Bremen%';
UPDATE public.times SET cores = '{"primary": "#000000", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Borussia M%' OR nome ILIKE '%Gladbach%';
UPDATE public.times SET cores = '{"primary": "#ED1C24", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Bayer%Leverkusen%' OR nome ILIKE '%Leverkusen%';
UPDATE public.times SET cores = '{"primary": "#004D9E", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Schalke%';
UPDATE public.times SET cores = '{"primary": "#E32221", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%RB Leipzig%' OR nome ILIKE '%Leipzig%';
UPDATE public.times SET cores = '{"primary": "#FFFFFF", "secondary": "#ED1C24"}' WHERE nome ILIKE '%Mainz%';
UPDATE public.times SET cores = '{"primary": "#005CA9", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Hoffenheim%';
UPDATE public.times SET cores = '{"primary": "#E2001A", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Freiburg%';
UPDATE public.times SET cores = '{"primary": "#00995C", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Wolfsburg%';
UPDATE public.times SET cores = '{"primary": "#E1000F", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Union Berlin%';
UPDATE public.times SET cores = '{"primary": "#004A99", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Hertha%';
UPDATE public.times SET cores = '{"primary": "#E30613", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Köln%' OR nome ILIKE '%Koln%' OR nome ILIKE '%Cologne%';
UPDATE public.times SET cores = '{"primary": "#00529B", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Bochum%';
UPDATE public.times SET cores = '{"primary": "#005DAA", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Holstein%Kiel%';
UPDATE public.times SET cores = '{"primary": "#E2001A", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Augsburg%';
UPDATE public.times SET cores = '{"primary": "#004C96", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Heidenheim%';
UPDATE public.times SET cores = '{"primary": "#AF1E2D", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Stuttgart%';
UPDATE public.times SET cores = '{"primary": "#0A589E", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Darmstadt%';
UPDATE public.times SET cores = '{"primary": "#E40520", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%St. Pauli%';
UPDATE public.times SET cores = '{"primary": "#1A3A74", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Eintracht Frankfurt%' OR nome ILIKE '%Frankfurt%';

-- Ligue 1 (France)
UPDATE public.times SET cores = '{"primary": "#004170", "secondary": "#DA291C"}' WHERE nome ILIKE '%Paris Saint%' OR nome ILIKE '%PSG%';
UPDATE public.times SET cores = '{"primary": "#0055A4", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Olympique%Marseille%' OR nome ILIKE '%Marseille%';
UPDATE public.times SET cores = '{"primary": "#E30613", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Lyon%' OR nome ILIKE '%Olympique Lyonnais%';
UPDATE public.times SET cores = '{"primary": "#E30613", "secondary": "#000000"}' WHERE nome ILIKE '%Monaco%';
UPDATE public.times SET cores = '{"primary": "#D71920", "secondary": "#000000"}' WHERE nome ILIKE '%Lille%';
UPDATE public.times SET cores = '{"primary": "#E30613", "secondary": "#000000"}' WHERE nome ILIKE '%Rennes%';
UPDATE public.times SET cores = '{"primary": "#0055A4", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%RC Strasbourg%' OR nome ILIKE '%Strasbourg%';
UPDATE public.times SET cores = '{"primary": "#FCDD09", "secondary": "#E30613"}' WHERE nome ILIKE '%Lens%';
UPDATE public.times SET cores = '{"primary": "#FCB515", "secondary": "#004D35"}' WHERE nome ILIKE '%Nantes%';
UPDATE public.times SET cores = '{"primary": "#EC1C24", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Brest%';
UPDATE public.times SET cores = '{"primary": "#E60000", "secondary": "#000000"}' WHERE nome ILIKE '%Nice%';
UPDATE public.times SET cores = '{"primary": "#0F4C81", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Montpellier%';
UPDATE public.times SET cores = '{"primary": "#E30613", "secondary": "#0055A4"}' WHERE nome ILIKE '%Toulouse%';
UPDATE public.times SET cores = '{"primary": "#78BE20", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Saint%Etienne%' OR nome ILIKE '%St Etienne%';
UPDATE public.times SET cores = '{"primary": "#005BAC", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Auxerre%';
UPDATE public.times SET cores = '{"primary": "#C8102E", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Reims%';
UPDATE public.times SET cores = '{"primary": "#0033A0", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Le Havre%';
UPDATE public.times SET cores = '{"primary": "#FFFFFF", "secondary": "#0055A4"}' WHERE nome ILIKE '%Angers%';

-- Primeira Liga (Portugal)
UPDATE public.times SET cores = '{"primary": "#E4002B", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Benfica%';
UPDATE public.times SET cores = '{"primary": "#0066B3", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%FC Porto%' OR nome = 'Porto';
UPDATE public.times SET cores = '{"primary": "#006D44", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Sporting%' AND nome ILIKE '%Lisboa%';
UPDATE public.times SET cores = '{"primary": "#003366", "secondary": "#FFFFFF"}' WHERE nome ILIKE '%Braga%';