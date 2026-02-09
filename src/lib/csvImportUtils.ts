import Papa from "papaparse";
import { normalizeName, slugify } from "./canonicalUtils";

// Canonical field definitions for each file type
export const CANONICAL_FIELDS: Record<string, { key: string; label: string; required: boolean }[]> = {
  matches: [
    { key: "data", label: "Data (YYYY-MM-DD)", required: true },
    { key: "time_casa", label: "Time Casa", required: true },
    { key: "time_fora", label: "Time Fora", required: true },
    { key: "gols_casa", label: "Gols Casa", required: false },
    { key: "gols_fora", label: "Gols Fora", required: false },
    { key: "rodada", label: "Rodada", required: false },
    { key: "hora", label: "Hora (HH:MM)", required: false },
    { key: "estadio", label: "Estádio", required: false },
    { key: "status", label: "Status", required: false },
    { key: "external_id", label: "ID Externo", required: false },
  ],
  teams: [
    { key: "nome", label: "Nome", required: true },
    { key: "pais", label: "País", required: false },
    { key: "escudo_url", label: "URL Escudo", required: false },
    { key: "external_id", label: "ID Externo", required: false },
  ],
  scorers: [
    { key: "jogador_nome", label: "Nome Jogador", required: true },
    { key: "time", label: "Time", required: true },
    { key: "minuto", label: "Minuto", required: false },
    { key: "data", label: "Data Partida", required: true },
    { key: "time_casa", label: "Time Casa (partida)", required: false },
    { key: "time_fora", label: "Time Fora (partida)", required: false },
    { key: "tipo", label: "Tipo (normal/penalty/og)", required: false },
  ],
  season_scorers: [
    { key: "jogador_nome", label: "Nome Jogador", required: true },
    { key: "time", label: "Time", required: true },
    { key: "gols", label: "Gols", required: true },
    { key: "partidas_com_gol", label: "Partidas com Gol", required: false },
  ],
};

// Auto-detect delimiter
export function detectDelimiter(text: string): string {
  const firstLines = text.split("\n").slice(0, 5).join("\n");
  const semicolons = (firstLines.match(/;/g) || []).length;
  const commas = (firstLines.match(/,/g) || []).length;
  const tabs = (firstLines.match(/\t/g) || []).length;
  if (tabs > commas && tabs > semicolons) return "\t";
  if (semicolons > commas) return ";";
  return ",";
}

// Parse CSV text
export function parseCSV(text: string, delimiter?: string): { headers: string[]; rows: string[][]; detectedDelimiter: string } {
  const det = delimiter || detectDelimiter(text);
  const result = Papa.parse(text, { delimiter: det, skipEmptyLines: true });
  const data = result.data as string[][];
  if (data.length === 0) return { headers: [], rows: [], detectedDelimiter: det };
  return { headers: data[0], rows: data.slice(1), detectedDelimiter: det };
}

// Auto-guess column mappings
export function autoGuessMapping(headers: string[], fileType: string): Record<string, string> {
  const mapping: Record<string, string> = {};
  const fields = CANONICAL_FIELDS[fileType] || [];
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  const ALIASES: Record<string, string[]> = {
    data: ["date", "data", "match_date", "matchdate", "fecha"],
    time_casa: ["home", "hometeam", "home_team", "time_casa", "mandante", "equipe_casa", "hteam"],
    time_fora: ["away", "awayteam", "away_team", "time_fora", "visitante", "equipe_fora", "ateam"],
    gols_casa: ["fthg", "hg", "home_goals", "gols_casa", "score1", "home_score", "goalsHome", "goals_home"],
    gols_fora: ["ftag", "ag", "away_goals", "gols_fora", "score2", "away_score", "goalsAway", "goals_away"],
    rodada: ["round", "rodada", "matchday", "jornada", "gameweek"],
    hora: ["time", "hora", "kickoff", "horario"],
    estadio: ["stadium", "estadio", "venue", "ground"],
    status: ["status", "result", "resultado"],
    external_id: ["id", "match_id", "external_id", "fixture_id"],
    nome: ["name", "nome", "team", "team_name", "club"],
    pais: ["country", "pais", "nation"],
    escudo_url: ["logo", "badge", "crest", "escudo", "escudo_url", "logo_url"],
    jogador_nome: ["player", "scorer", "jogador", "jogador_nome", "player_name", "goalscorer"],
    time: ["team", "time", "club", "squad"],
    minuto: ["minute", "minuto", "min", "time"],
    tipo: ["type", "tipo", "goal_type"],
    gols: ["goals", "gols", "total_goals", "g"],
    partidas_com_gol: ["matches", "partidas", "appearances", "apps"],
  };

  for (const field of fields) {
    const aliases = ALIASES[field.key] || [field.key];
    const match = lowerHeaders.findIndex((h) => aliases.some((a) => h === a || h.replace(/[_\s-]/g, "") === a.replace(/[_\s-]/g, "")));
    if (match >= 0) {
      mapping[field.key] = headers[match];
    }
  }
  return mapping;
}

// Validate a single row based on file type and mapping
export interface RowValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateRow(row: Record<string, string>, fileType: string): RowValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (fileType === "matches") {
    if (!row.data) errors.push("Data ausente");
    else {
      const parsed = new Date(row.data);
      if (isNaN(parsed.getTime())) errors.push(`Data inválida: ${row.data}`);
    }
    if (!row.time_casa) errors.push("Time casa ausente");
    if (!row.time_fora) errors.push("Time fora ausente");
    if (row.time_casa && row.time_fora && normalizeName(row.time_casa) === normalizeName(row.time_fora)) {
      errors.push("Time casa = Time fora");
    }
    const gc = row.gols_casa, gf = row.gols_fora;
    if (gc && isNaN(Number(gc))) errors.push(`Gols casa inválido: ${gc}`);
    if (gf && isNaN(Number(gf))) errors.push(`Gols fora inválido: ${gf}`);
    if ((gc && !gf) || (!gc && gf)) warnings.push("Apenas um placar informado");
  }

  if (fileType === "scorers") {
    if (!row.jogador_nome) errors.push("Nome jogador ausente");
    if (!row.time) errors.push("Time ausente");
    if (!row.data) errors.push("Data partida ausente");
  }

  if (fileType === "season_scorers") {
    if (!row.jogador_nome) errors.push("Nome jogador ausente");
    if (!row.time) errors.push("Time ausente");
    if (!row.gols || isNaN(Number(row.gols))) errors.push("Gols inválido");
  }

  if (fileType === "teams") {
    if (!row.nome) errors.push("Nome ausente");
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Map a raw CSV row to canonical fields
export function mapRow(rawRow: string[], headers: string[], mapping: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [canonicalKey, csvHeader] of Object.entries(mapping)) {
    const idx = headers.indexOf(csvHeader);
    if (idx >= 0 && rawRow[idx] !== undefined) {
      result[canonicalKey] = rawRow[idx].trim();
    }
  }
  return result;
}

// Normalize date to YYYY-MM-DD
export function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  // Try ISO
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  // Try DD/MM/YYYY
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) d = new Date(`${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`);
    else d = new Date(`${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  return null;
}

// Dry-run analysis result
export interface DryRunResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newTeams: string[];
  existingTeams: string[];
  duplicateMatches: number;
  newMatches: number;
  rowErrors: { row: number; errors: string[]; data: Record<string, string> }[];
  warnings: string[];
}
