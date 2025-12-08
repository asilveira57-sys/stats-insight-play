// Poisson distribution utilities for football match predictions

/**
 * Calculate factorial of a number
 */
function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Calculate Poisson probability
 * P(X = k) = (λ^k * e^-λ) / k!
 */
export function poissonProbability(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

/**
 * Calculate match probabilities using Poisson distribution
 * Returns probabilities for home win, draw, and away win
 */
export function calculateMatchProbabilities(
  homeExpectedGoals: number,
  awayExpectedGoals: number,
  maxGoals: number = 10
): { homeWin: number; draw: number; awayWin: number } {
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;

  for (let homeGoals = 0; homeGoals <= maxGoals; homeGoals++) {
    for (let awayGoals = 0; awayGoals <= maxGoals; awayGoals++) {
      const probability =
        poissonProbability(homeExpectedGoals, homeGoals) *
        poissonProbability(awayExpectedGoals, awayGoals);

      if (homeGoals > awayGoals) {
        homeWin += probability;
      } else if (homeGoals === awayGoals) {
        draw += probability;
      } else {
        awayWin += probability;
      }
    }
  }

  // Normalize to ensure sum is 100%
  const total = homeWin + draw + awayWin;
  return {
    homeWin: Math.round((homeWin / total) * 100),
    draw: Math.round((draw / total) * 100),
    awayWin: Math.round((awayWin / total) * 100),
  };
}

/**
 * Calculate expected goals based on team statistics
 */
export function calculateExpectedGoals(
  teamAvgScored: number,
  teamAvgConceded: number,
  opponentAvgScored: number,
  opponentAvgConceded: number,
  leagueAvgGoals: number = 1.3,
  isHome: boolean = true
): number {
  // Attack strength = team's avg goals scored / league average
  const attackStrength = teamAvgScored / leagueAvgGoals;
  
  // Defense weakness = opponent's avg goals conceded / league average
  const defenseWeakness = opponentAvgConceded / leagueAvgGoals;
  
  // Expected goals = attack strength * defense weakness * league average
  let expectedGoals = attackStrength * defenseWeakness * leagueAvgGoals;
  
  // Home advantage adjustment (typically ~10-15% more goals at home)
  if (isHome) {
    expectedGoals *= 1.1;
  } else {
    expectedGoals *= 0.9;
  }
  
  // Ensure minimum expected goals
  return Math.max(0.5, expectedGoals);
}

/**
 * Calculate most likely score based on expected goals
 */
export function calculateMostLikelyScore(
  homeExpectedGoals: number,
  awayExpectedGoals: number,
  maxGoals: number = 5
): { homeGoals: number; awayGoals: number; probability: number } {
  let mostLikely = { homeGoals: 0, awayGoals: 0, probability: 0 };

  for (let homeGoals = 0; homeGoals <= maxGoals; homeGoals++) {
    for (let awayGoals = 0; awayGoals <= maxGoals; awayGoals++) {
      const probability =
        poissonProbability(homeExpectedGoals, homeGoals) *
        poissonProbability(awayExpectedGoals, awayGoals);

      if (probability > mostLikely.probability) {
        mostLikely = { homeGoals, awayGoals, probability };
      }
    }
  }

  return mostLikely;
}

/**
 * Calculate confidence level based on probability spread
 */
export function calculateConfidence(
  homeWinProb: number,
  drawProb: number,
  awayWinProb: number
): "high" | "medium" | "low" {
  const maxProb = Math.max(homeWinProb, drawProb, awayWinProb);
  const spread = maxProb - Math.min(homeWinProb, drawProb, awayWinProb);
  
  if (maxProb >= 55 && spread >= 30) {
    return "high";
  } else if (maxProb >= 40 && spread >= 15) {
    return "medium";
  }
  return "low";
}

/**
 * Calculate team strength (0-100 scale)
 */
export function calculateTeamStrength(
  wins: number,
  draws: number,
  losses: number,
  goalsScored: number,
  goalsConceded: number
): number {
  const totalMatches = wins + draws + losses;
  if (totalMatches === 0) return 50;

  // Win rate component (40% weight)
  const winRate = ((wins + draws * 0.5) / totalMatches) * 100;
  
  // Goal difference component (30% weight)
  const avgGoalDiff = (goalsScored - goalsConceded) / totalMatches;
  const goalDiffScore = Math.min(100, Math.max(0, 50 + avgGoalDiff * 15));
  
  // Goals scored component (30% weight)
  const avgGoalsScored = goalsScored / totalMatches;
  const scoringScore = Math.min(100, avgGoalsScored * 30);

  return Math.round(winRate * 0.4 + goalDiffScore * 0.3 + scoringScore * 0.3);
}
