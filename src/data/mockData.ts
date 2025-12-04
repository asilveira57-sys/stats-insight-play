// Mock data for development
export const leagues = [
  {
    id: "PL",
    name: "Premier League",
    country: "Inglaterra",
    logo: "https://crests.football-data.org/PL.png",
    matchCount: 5,
  },
  {
    id: "PD",
    name: "La Liga",
    country: "Espanha",
    logo: "https://crests.football-data.org/PD.png",
    matchCount: 4,
  },
  {
    id: "SA",
    name: "Serie A",
    country: "Itália",
    logo: "https://crests.football-data.org/SA.png",
    matchCount: 6,
  },
  {
    id: "BL1",
    name: "Bundesliga",
    country: "Alemanha",
    logo: "https://crests.football-data.org/BL1.png",
    matchCount: 3,
  },
  {
    id: "FL1",
    name: "Ligue 1",
    country: "França",
    logo: "https://crests.football-data.org/FL1.png",
    matchCount: 5,
  },
  {
    id: "BSA",
    name: "Brasileirão Série A",
    country: "Brasil",
    logo: "https://crests.football-data.org/BSA.png",
    matchCount: 8,
  },
];

export const upcomingMatches = [
  {
    id: "1",
    homeTeam: {
      name: "Manchester City",
      logo: "https://crests.football-data.org/65.png",
    },
    awayTeam: {
      name: "Liverpool",
      logo: "https://crests.football-data.org/64.png",
    },
    date: "15 Dez",
    time: "14:30",
    league: "Premier League",
    status: "scheduled" as const,
    matchday: 17,
  },
  {
    id: "2",
    homeTeam: {
      name: "Real Madrid",
      logo: "https://crests.football-data.org/86.png",
      score: 2,
    },
    awayTeam: {
      name: "Barcelona",
      logo: "https://crests.football-data.org/81.png",
      score: 1,
    },
    date: "14 Dez",
    time: "17:00",
    league: "La Liga",
    status: "live" as const,
    matchday: 16,
  },
  {
    id: "3",
    homeTeam: {
      name: "Inter Milan",
      logo: "https://crests.football-data.org/108.png",
      score: 3,
    },
    awayTeam: {
      name: "Juventus",
      logo: "https://crests.football-data.org/109.png",
      score: 1,
    },
    date: "14 Dez",
    time: "15:45",
    league: "Serie A",
    status: "finished" as const,
    matchday: 15,
  },
  {
    id: "4",
    homeTeam: {
      name: "Bayern Munich",
      logo: "https://crests.football-data.org/5.png",
    },
    awayTeam: {
      name: "Borussia Dortmund",
      logo: "https://crests.football-data.org/4.png",
    },
    date: "16 Dez",
    time: "16:30",
    league: "Bundesliga",
    status: "scheduled" as const,
    matchday: 14,
  },
];

export const predictions = [
  {
    id: "1",
    homeTeam: {
      name: "Manchester City",
      logo: "https://crests.football-data.org/65.png",
      probability: 52,
      strength: 88,
    },
    awayTeam: {
      name: "Liverpool",
      logo: "https://crests.football-data.org/64.png",
      probability: 28,
      strength: 85,
    },
    drawProbability: 20,
    predictedScore: "2 - 1",
    confidence: "high" as const,
    league: "Premier League",
    date: "15 Dez",
    time: "14:30",
  },
  {
    id: "2",
    homeTeam: {
      name: "Real Madrid",
      logo: "https://crests.football-data.org/86.png",
      probability: 45,
      strength: 90,
    },
    awayTeam: {
      name: "Barcelona",
      logo: "https://crests.football-data.org/81.png",
      probability: 35,
      strength: 87,
    },
    drawProbability: 20,
    predictedScore: "2 - 2",
    confidence: "medium" as const,
    league: "La Liga",
    date: "14 Dez",
    time: "17:00",
  },
  {
    id: "3",
    homeTeam: {
      name: "PSG",
      logo: "https://crests.football-data.org/524.png",
      probability: 65,
      strength: 86,
    },
    awayTeam: {
      name: "Lyon",
      logo: "https://crests.football-data.org/523.png",
      probability: 15,
      strength: 72,
    },
    drawProbability: 20,
    predictedScore: "3 - 1",
    confidence: "high" as const,
    league: "Ligue 1",
    date: "15 Dez",
    time: "21:00",
  },
];

export const news = [
  {
    id: "1",
    title: "Manchester City busca título histórico na Premier League",
    excerpt: "Equipe de Guardiola lidera o campeonato com folga e pode quebrar recorde de pontos.",
    image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800",
    date: "14 Dez 2024",
  },
  {
    id: "2",
    title: "El Clásico promete ser decisivo para o título espanhol",
    excerpt: "Real Madrid e Barcelona se enfrentam em partida que pode definir os rumos da La Liga.",
    image: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800",
    date: "13 Dez 2024",
  },
  {
    id: "3",
    title: "Brasileirão: Análise estatística da reta final",
    excerpt: "Com as últimas rodadas se aproximando, veja os números que definem quem será campeão.",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800",
    date: "12 Dez 2024",
  },
];

export const standings = [
  { position: 1, team: "Manchester City", played: 16, won: 13, drawn: 2, lost: 1, gf: 42, ga: 12, gd: 30, points: 41 },
  { position: 2, team: "Liverpool", played: 16, won: 12, drawn: 3, lost: 1, gf: 38, ga: 14, gd: 24, points: 39 },
  { position: 3, team: "Arsenal", played: 16, won: 11, drawn: 3, lost: 2, gf: 35, ga: 16, gd: 19, points: 36 },
  { position: 4, team: "Chelsea", played: 16, won: 10, drawn: 2, lost: 4, gf: 32, ga: 18, gd: 14, points: 32 },
  { position: 5, team: "Tottenham", played: 16, won: 9, drawn: 3, lost: 4, gf: 28, ga: 20, gd: 8, points: 30 },
];

export const teamStats = {
  name: "Manchester City",
  logo: "https://crests.football-data.org/65.png",
  overall: {
    matches: 16,
    wins: 13,
    draws: 2,
    losses: 1,
    goalsFor: 42,
    goalsAgainst: 12,
  },
  home: {
    matches: 8,
    wins: 7,
    draws: 1,
    losses: 0,
    goalsFor: 24,
    goalsAgainst: 4,
  },
  away: {
    matches: 8,
    wins: 6,
    draws: 1,
    losses: 1,
    goalsFor: 18,
    goalsAgainst: 8,
  },
  form: ["W", "W", "D", "W", "W"],
  avgGoalsScored: 2.63,
  avgGoalsConceded: 0.75,
  cleanSheets: 8,
  xG: 38.5,
  xGA: 14.2,
};
