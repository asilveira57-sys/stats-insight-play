/**
 * GitHub Repository Import Utilities
 * Parses and normalizes data from GitHub football data repositories
 */

export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  branch?: string;
  provider: string;
  name: string;
}

export interface DetectedCompetition {
  path: string;
  name: string;
  country: string;
  seasons: DetectedSeason[];
  selected: boolean;
}

export interface DetectedSeason {
  path: string;
  year: string;
  fileType: "json" | "csv" | "unknown";
  fileName: string;
  selected: boolean;
}

export interface ParsedMatch {
  date: string;
  home_team: string;
  away_team: string;
  home_goals: number | null;
  away_goals: number | null;
  round: string | null;
  status: string;
  league_name: string;
  country: string;
  season: string;
}

/**
 * Parse a GitHub repo URL into owner/repo
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\s#?]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

/**
 * Analyze repository tree to detect competitions and seasons
 */
export function analyzeRepoTree(
  tree: { path: string; type: string; size?: number }[]
): DetectedCompetition[] {
  const dataFiles = tree.filter(
    (f) => f.type === "blob" && /\.(json|csv)$/i.test(f.path)
  );

  // Filter out non-data files (scripts, configs, docs, etc.)
  const relevantFiles = dataFiles.filter((f) => {
    const lower = f.path.toLowerCase();
    return (
      !lower.includes(".github/") &&
      !lower.includes("docs/") &&
      !lower.includes("reports/") &&
      !lower.includes("renv/") &&
      !lower.includes("node_modules/") &&
      !lower.endsWith(".rmd") &&
      !lower.endsWith(".r") &&
      (f.size || 0) > 500 // Skip tiny files
    );
  });

  const competitionMap = new Map<string, DetectedCompetition>();

  for (const file of relevantFiles) {
    const parts = file.path.split("/");
    const fileName = parts[parts.length - 1];
    const ext = fileName.split(".").pop()?.toLowerCase();
    const fileType: "json" | "csv" | "unknown" = ext === "json" ? "json" : ext === "csv" ? "csv" : "unknown";
    if (fileType === "unknown") continue;

    // Try to extract year from filename
    const yearMatch = fileName.match(/((?:19|20)\d{2})/);
    const hasYearInName = !!yearMatch;

    // Determine if this file IS a competition (contains all seasons)
    // or if it's a season file within a competition directory
    const baseName = fileName.replace(/\.(json|csv)$/i, "").replace(/[-_]/g, " ");
    
    if (parts.length >= 2 && !hasYearInName) {
      // File without year in name = entire competition in one file
      const competitionKey = file.path;
      const competitionName = baseName.replace(/\b\w/g, (c) => c.toUpperCase());
      const dirName = parts.slice(0, -1).join("/");
      const country = inferCountry(file.path, competitionName);

      competitionMap.set(competitionKey, {
        path: competitionKey,
        name: competitionName,
        country,
        seasons: [{
          path: file.path,
          year: "all",
          fileType,
          fileName,
          selected: true,
        }],
        selected: true,
      });
    } else {
      // File with year = season file within competition directory
      const dirParts = parts.slice(0, -1);
      const competitionPath = dirParts.join("/");
      const competitionName = dirParts
        .map((p) => p.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
        .join(" / ");
      const country = inferCountry(competitionPath, competitionName);

      if (!competitionMap.has(competitionPath)) {
        competitionMap.set(competitionPath, {
          path: competitionPath,
          name: competitionName,
          country,
          seasons: [],
          selected: true,
        });
      }

      const comp = competitionMap.get(competitionPath)!;
      comp.seasons.push({
        path: file.path,
        year: yearMatch ? yearMatch[1] : baseName,
        fileType,
        fileName,
        selected: true,
      });
    }
  }

  // Sort seasons within each competition
  for (const comp of competitionMap.values()) {
    comp.seasons.sort((a, b) => a.year.localeCompare(b.year));
  }

  return Array.from(competitionMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Infer country from competition path/name
 */
function inferCountry(path: string, name: string): string {
  const lower = (path + " " + name).toLowerCase();
  const countryMap: Record<string, string> = {
    "brasil": "Brasil",
    "brazil": "Brasil",
    "serie-a": "Brasil",
    "serie-b": "Brasil",
    "brasileirao": "Brasil",
    "paulista": "Brasil",
    "carioca": "Brasil",
    "gaucho": "Brasil",
    "mineiro": "Brasil",
    "copa-do-brasil": "Brasil",
    "copa do brasil": "Brasil",
    "libertadores": "América do Sul",
    "sudamericana": "América do Sul",
    "copa america": "América do Sul",
    "england": "Inglaterra",
    "premier-league": "Inglaterra",
    "la-liga": "Espanha",
    "spain": "Espanha",
    "bundesliga": "Alemanha",
    "germany": "Alemanha",
    "serie_a": "Itália",
    "italy": "Itália",
    "ligue-1": "França",
    "france": "França",
    "world-cup": "Internacional",
    "champions": "Europa",
  };

  for (const [key, value] of Object.entries(countryMap)) {
    if (lower.includes(key)) return value;
  }
  return "Brasil"; // Default for Brazilian-Soccer-Data repo
}

/**
 * Parse JSON match data from Brazilian-Soccer-Data format
 */
export function parseJsonMatches(
  content: string,
  leagueName: string,
  country: string,
  season: string
): ParsedMatch[] {
  try {
    const data = JSON.parse(content);
    const matches: ParsedMatch[] = [];

    // Handle array of matches directly
    if (Array.isArray(data)) {
      for (const item of data) {
        const match = parseJsonMatchItem(item, leagueName, country, season);
        if (match) matches.push(match);
      }
      return matches;
    }

    // Handle object with rounds or matches array
    if (data.matches && Array.isArray(data.matches)) {
      for (const item of data.matches) {
        const match = parseJsonMatchItem(item, leagueName, country, season);
        if (match) matches.push(match);
      }
      return matches;
    }

    if (data.rounds && Array.isArray(data.rounds)) {
      for (const round of data.rounds) {
        const roundName = round.name || round.round || null;
        const roundMatches = round.matches || round.games || [];
        for (const item of roundMatches) {
          const match = parseJsonMatchItem(item, leagueName, country, season, roundName);
          if (match) matches.push(match);
        }
      }
      return matches;
    }

    // Try to iterate over object values (each key could be a round/matchday)
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        for (const item of value as any[]) {
          const match = parseJsonMatchItem(item, leagueName, country, season, key);
          if (match) matches.push(match);
        }
      }
    }

    return matches;
  } catch {
    return [];
  }
}

/**
 * Parse a single JSON match item (flexible field names)
 */
function parseJsonMatchItem(
  item: any,
  leagueName: string,
  country: string,
  season: string,
  round?: string | null
): ParsedMatch | null {
  // Flexible field extraction
  const date = item.date || item.data || item.match_date || item.Date || null;
  const homeTeam =
    item.home_team || item.mandante || item.home || item.team1 || item.HomeTeam ||
    item.time_casa || item.hteam || (item.teams && item.teams[0]) || null;
  const awayTeam =
    item.away_team || item.visitante || item.away || item.team2 || item.AwayTeam ||
    item.time_fora || item.ateam || (item.teams && item.teams[1]) || null;

  if (!date || !homeTeam || !awayTeam) return null;

  // Extract goals
  let homeGoals: number | null = null;
  let awayGoals: number | null = null;

  if (item.score !== undefined && item.score !== null) {
    if (typeof item.score === "object") {
      homeGoals = item.score.home ?? item.score[0] ?? null;
      awayGoals = item.score.away ?? item.score[1] ?? null;
    } else if (typeof item.score === "string") {
      const scoreParts = item.score.split(/[-x:]/);
      if (scoreParts.length === 2) {
        homeGoals = parseInt(scoreParts[0].trim());
        awayGoals = parseInt(scoreParts[1].trim());
      }
    }
  }

  if (homeGoals === null) {
    homeGoals = parseIntSafe(item.home_goals ?? item.gols_casa ?? item.score1 ?? item.FTHG ?? item.home_score ?? item.goalsHome);
  }
  if (awayGoals === null) {
    awayGoals = parseIntSafe(item.away_goals ?? item.gols_fora ?? item.score2 ?? item.FTAG ?? item.away_score ?? item.goalsAway);
  }

  const matchRound = round || item.round || item.rodada || item.matchday || item.Rodada || null;
  const hasScore = homeGoals !== null && awayGoals !== null;

  return {
    date: normalizeJsonDate(date),
    home_team: typeof homeTeam === "object" ? homeTeam.name || homeTeam.nome || String(homeTeam) : String(homeTeam),
    away_team: typeof awayTeam === "object" ? awayTeam.name || awayTeam.nome || String(awayTeam) : String(awayTeam),
    home_goals: homeGoals,
    away_goals: awayGoals,
    round: matchRound ? String(matchRound) : null,
    status: hasScore ? "finished" : "scheduled",
    league_name: leagueName,
    country,
    season,
  };
}

function parseIntSafe(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  const n = parseInt(String(val));
  return isNaN(n) ? null : n;
}

function normalizeJsonDate(dateStr: string): string {
  if (!dateStr) return "";
  // Try ISO format
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  // Try DD/MM/YYYY
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
    const d2 = new Date(`${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`);
    if (!isNaN(d2.getTime())) return d2.toISOString().split("T")[0];
  }
  return dateStr;
}

/**
 * Parse CSV match data with auto-mapping
 */
export function parseCsvMatches(
  content: string,
  leagueName: string,
  country: string,
  season: string
): ParsedMatch[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detect delimiter
  const firstLine = lines[0];
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolons > commas ? ";" : ",";

  const headers = parseCsvLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());
  const matches: ParsedMatch[] = [];

  // Build column index mapping with broad aliases
  const colIdx = (aliases: string[]): number => {
    for (const a of aliases) {
      const idx = headers.indexOf(a.toLowerCase());
      if (idx >= 0) return idx;
    }
    // Fuzzy: check if header contains alias
    for (const a of aliases) {
      const idx = headers.findIndex((h) => h.includes(a.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const dateIdx = colIdx(["date", "data", "match_date", "matchdate", "fecha"]);
  const homeIdx = colIdx(["home", "hometeam", "home_team", "mandante", "time_casa", "hteam", "home_team_name"]);
  const awayIdx = colIdx(["away", "awayteam", "away_team", "visitante", "time_fora", "ateam", "away_team_name"]);
  const hgIdx = colIdx(["fthg", "hg", "home_goals", "gols_casa", "score1", "home_score", "home_team_score"]);
  const agIdx = colIdx(["ftag", "ag", "away_goals", "gols_fora", "score2", "away_score", "away_team_score"]);
  const roundIdx = colIdx(["round", "rodada", "matchday", "jornada"]);
  const seasonIdx = colIdx(["season", "temporada", "year", "ano", "season_year"]);
  const leagueIdx = colIdx(["league", "competition", "liga", "campeonato", "comp"]);

  if (dateIdx < 0 || homeIdx < 0 || awayIdx < 0) return [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    if (cols.length <= Math.max(dateIdx, homeIdx, awayIdx)) continue;

    const homeGoals = hgIdx >= 0 ? parseIntSafe(cols[hgIdx]?.trim()) : null;
    const awayGoals = agIdx >= 0 ? parseIntSafe(cols[agIdx]?.trim()) : null;

    // Extract season from data: from column, from date year, or from parameter
    let matchSeason = season;
    if (seasonIdx >= 0 && cols[seasonIdx]?.trim()) {
      matchSeason = cols[seasonIdx].trim();
    } else if (matchSeason === "all") {
      // Extract year from date
      const dateStr = cols[dateIdx]?.trim() || "";
      const yearMatch = dateStr.match(/((?:19|20)\d{2})/);
      matchSeason = yearMatch ? yearMatch[1] : "";
    }

    // Extract league from column if available
    let matchLeague = leagueName;
    if (leagueIdx >= 0 && cols[leagueIdx]?.trim()) {
      matchLeague = cols[leagueIdx].trim();
    }

    matches.push({
      date: normalizeJsonDate(cols[dateIdx]?.trim() || ""),
      home_team: cols[homeIdx]?.trim() || "",
      away_team: cols[awayIdx]?.trim() || "",
      home_goals: homeGoals,
      away_goals: awayGoals,
      round: roundIdx >= 0 ? cols[roundIdx]?.trim() || null : null,
      status: homeGoals !== null && awayGoals !== null ? "finished" : "scheduled",
      league_name: matchLeague,
      country,
      season: matchSeason,
    });
  }

  return matches;
}

/**
 * Simple CSV line parser that handles quoted fields
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
