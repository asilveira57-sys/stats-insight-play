import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  normalizeName,
  slugify,
} from "../_shared/canonicalUtils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIME_LIMIT_MS = 120_000; // 120s safety (reduced from 140s)

let REQUEST_START_TIME = Date.now();

function isTimeLimitClose(): boolean {
  return Date.now() - REQUEST_START_TIME > TIME_LIMIT_MS;
}

// ─── Parsing Logic (replicated from githubImportUtils.ts) ───

interface ParsedMatch {
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

function parseIntSafe(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  const n = parseInt(String(val));
  return isNaN(n) ? null : n;
}

function normalizeDate(dateStr: string): string {
  if (!dateStr) return "";
  const dateOnly = dateStr.split(/[T ]/)[0];
  const d = new Date(dateOnly + "T00:00:00Z");
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  const parts = dateOnly.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
    if (c.length === 4) {
      const d2 = new Date(`${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}T00:00:00Z`);
      if (!isNaN(d2.getTime())) return d2.toISOString().split("T")[0];
    }
  }
  return dateStr;
}

function parseJsonMatchItem(
  item: any,
  leagueName: string,
  country: string,
  season: string,
  round?: string | null
): ParsedMatch | null {
  const date = item.date || item.data || item.match_date || item.Date || item.datetime || null;
  const homeTeam =
    item.home_team || item.mandante || item.home || item.team1 || item.HomeTeam ||
    item.time_casa || item.hteam || (item.teams && item.teams[0]) || null;
  const awayTeam =
    item.away_team || item.visitante || item.away || item.team2 || item.AwayTeam ||
    item.time_fora || item.ateam || (item.teams && item.teams[1]) || null;

  if (!date || !homeTeam || !awayTeam) return null;

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
    homeGoals = parseIntSafe(item.home_goals ?? item.gols_casa ?? item.score1 ?? item.FTHG ?? item.home_score ?? item.goalsHome ?? item.home_goal);
  }
  if (awayGoals === null) {
    awayGoals = parseIntSafe(item.away_goals ?? item.gols_fora ?? item.score2 ?? item.FTAG ?? item.away_score ?? item.goalsAway ?? item.away_goal);
  }

  const matchRound = round || item.round || item.rodada || item.matchday || item.Rodada || null;
  const hasScore = homeGoals !== null && awayGoals !== null;

  return {
    date: normalizeDate(String(date)),
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

function parseJsonMatches(content: string, leagueName: string, country: string, season: string): ParsedMatch[] {
  try {
    const data = JSON.parse(content);
    const matches: ParsedMatch[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        const match = parseJsonMatchItem(item, leagueName, country, season);
        if (match) matches.push(match);
      }
      return matches;
    }

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

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === delimiter && !inQuotes) { result.push(current); current = ""; }
    else { current += char; }
  }
  result.push(current);
  return result;
}

function parseCsvMatches(content: string, leagueName: string, country: string, season: string): ParsedMatch[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolons > commas ? ";" : ",";

  const headers = parseCsvLine(lines[0], delimiter).map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
  const matches: ParsedMatch[] = [];

  const colIdx = (aliases: string[]): number => {
    for (const a of aliases) {
      const idx = headers.indexOf(a.toLowerCase());
      if (idx >= 0) return idx;
    }
    for (const a of aliases) {
      const idx = headers.findIndex((h) => h.includes(a.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const dateIdx = colIdx(["date", "data", "match_date", "matchdate", "fecha", "datetime", "match_datetime"]);
  const homeIdx = colIdx(["home", "hometeam", "home_team", "mandante", "time_casa", "hteam", "home_team_name"]);
  const awayIdx = colIdx(["away", "awayteam", "away_team", "visitante", "time_fora", "ateam", "away_team_name"]);
  const hgIdx = colIdx(["fthg", "hg", "home_goals", "home_goal", "gols_casa", "score1", "home_score", "home_team_score"]);
  const agIdx = colIdx(["ftag", "ag", "away_goals", "away_goal", "gols_fora", "score2", "away_score", "away_team_score"]);
  const roundIdx = colIdx(["round", "rodada", "matchday", "jornada"]);
  const seasonIdx = colIdx(["season", "temporada", "year", "ano", "season_year"]);
  const leagueIdx = colIdx(["league", "competition", "liga", "campeonato", "comp"]);

  if (dateIdx < 0 || homeIdx < 0 || awayIdx < 0) return [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    if (cols.length <= Math.max(dateIdx, homeIdx, awayIdx)) continue;

    const clean = (idx: number) => cols[idx]?.trim().replace(/^["']|["']$/g, "") || "";

    const homeGoals = hgIdx >= 0 ? parseIntSafe(clean(hgIdx)) : null;
    const awayGoals = agIdx >= 0 ? parseIntSafe(clean(agIdx)) : null;

    let matchSeason = season;
    if (seasonIdx >= 0 && clean(seasonIdx)) {
      matchSeason = clean(seasonIdx);
    } else if (matchSeason === "all") {
      const yearMatch = clean(dateIdx).match(/((?:19|20)\d{2})/);
      matchSeason = yearMatch ? yearMatch[1] : "";
    }

    let matchLeague = leagueName;
    if (leagueIdx >= 0 && clean(leagueIdx)) {
      matchLeague = clean(leagueIdx);
    }

    matches.push({
      date: normalizeDate(clean(dateIdx)),
      home_team: clean(homeIdx),
      away_team: clean(awayIdx),
      home_goals: homeGoals,
      away_goals: awayGoals,
      round: roundIdx >= 0 ? clean(roundIdx) || null : null,
      status: homeGoals !== null && awayGoals !== null ? "finished" : "scheduled",
      league_name: matchLeague,
      country,
      season: matchSeason,
    });
  }

  return matches;
}

// ─── Main Handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let batchId: string | undefined;

  try {
    // Reset start time per request (module-level var persists across invocations)
    REQUEST_START_TIME = Date.now();
    const body = await req.json();
    batchId = body.batch_id;
    const { owner, repo, provider, files } = body as {
      batch_id: string;
      owner: string;
      repo: string;
      provider: string;
      files: { path: string; leagueName: string; country: string; season: string; fileType: string }[];
    };

    if (!batchId || !owner || !repo || !files?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: batch_id, owner, repo, files" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GitHub headers
    const ghHeaders: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Statball-Importer",
    };
    const ghToken = Deno.env.get("GITHUB_TOKEN");
    if (ghToken) ghHeaders["Authorization"] = `Bearer ${ghToken}`;

    // Determine default branch
    let defaultBranch = "main";
    const branchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/main`, { headers: ghHeaders });
    if (!branchRes.ok) {
      const masterRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/master`, { headers: ghHeaders });
      if (masterRes.ok) defaultBranch = "master";
      else {
        await updateBatch(supabase, batchId, "failed", { processed_files: 0, total_files: files.length }, 0, 0, 0, 0, ["Não foi possível determinar a branch padrão do repositório"]);
        return new Response(JSON.stringify({ error: "Cannot determine default branch" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // In-memory caches for team/league resolution
    const teamCache = new Map<string, string>();
    const leagueCache = new Map<string, string>();

    // Pre-load teams into cache (paginated to avoid 1000-row default limit)
    async function fetchAll(table: string, select: string, filter?: { col: string; val: string }) {
      const allRows: any[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;
      while (true) {
        let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
        if (filter) query = query.eq(filter.col, filter.val);
        const { data, error } = await query;
        if (error || !data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return allRows;
    }

    const allTeams = await fetchAll("times", "id, nome, slug", { col: "status", val: "active" });
    for (const t of allTeams) {
      teamCache.set(normalizeName(t.nome), t.id);
      if (t.slug) teamCache.set(t.slug, t.id);
    }
    const allAliases = await fetchAll("team_aliases", "team_id, normalized_alias");
    for (const a of allAliases) {
      if (a.team_id && a.normalized_alias) teamCache.set(a.normalized_alias, a.team_id);
    }
    // Pre-load leagues into cache
    const allLeagues = await fetchAll("ligas", "id, nome, slug");
    for (const l of allLeagues) {
      leagueCache.set(normalizeName(l.nome), l.id);
      if (l.slug) leagueCache.set(l.slug, l.id);
    }

    let inserted = 0, updated = 0, skipped = 0, failed = 0;
    const errors: string[] = [];
    let processedFiles = 0;

    // Update initial progress
    await updateBatch(supabase, batchId, "processing", {
      processed_files: 0, total_files: files.length, current_file: files[0]?.path || "", inserted: 0, updated: 0, skipped: 0, failed: 0,
    }, 0, 0, 0, 0, []);

    // Process files in batches of 3
    for (let i = 0; i < files.length; i += 1) {
      if (isTimeLimitClose()) {
        errors.push("⏱ Tempo limite atingido, progresso salvo parcialmente");
        break;
      }

      const fileBatch = files.slice(i, i + 1);
      const paths = fileBatch.map((f) => f.path);

      // Fetch files from GitHub
      let filesData: { path: string; content: string | null; error?: string }[] = [];
      try {
        const fetchPromises = paths.map(async (p) => {
          let rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${p}`;
          let res = await fetch(rawUrl);
          if (!res.ok) {
            rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${p}`;
            res = await fetch(rawUrl);
          }
          if (res.ok) {
            return { path: p, content: await res.text() };
          }
          return { path: p, content: null, error: `HTTP ${res.status}` };
        });
        filesData = await Promise.all(fetchPromises);
      } catch (e) {
        errors.push(`Erro ao buscar arquivos: ${e.message}`);
        failed += fileBatch.length;
        processedFiles += fileBatch.length;
        continue;
      }

      for (let j = 0; j < filesData.length; j++) {
        if (isTimeLimitClose()) break;

        const file = filesData[j];
        const fileMeta = fileBatch[j];

        if (!file.content) {
          errors.push(`${file.path}: ${file.error || "Conteúdo vazio"}`);
          failed++;
          processedFiles++;
          continue;
        }

        // Parse
        let matches: ParsedMatch[] = [];
        if (fileMeta.fileType === "json") {
          matches = parseJsonMatches(file.content, fileMeta.leagueName, fileMeta.country, fileMeta.season);
        } else {
          matches = parseCsvMatches(file.content, fileMeta.leagueName, fileMeta.country, fileMeta.season);
        }

        if (matches.length === 0) {
          errors.push(`${file.path}: Nenhuma partida detectada`);
          skipped++;
          processedFiles++;
          continue;
        }

        // Import matches in batches for speed
        const MATCH_BATCH_SIZE = 3;
        for (let mi = 0; mi < matches.length; mi += MATCH_BATCH_SIZE) {
          if (isTimeLimitClose()) break;

          const matchBatch = matches.slice(mi, mi + MATCH_BATCH_SIZE);
          const promises = matchBatch.map(async (match) => {
            if (!match.date || !match.home_team || !match.away_team) { skipped++; return; }
            if (normalizeName(match.home_team) === normalizeName(match.away_team)) { skipped++; return; }

            // Resolve league (cache-first, then RPC)
            const leagueNorm = normalizeName(match.league_name);
            const leagueSlug = slugify(match.league_name);
            let leagueId = leagueCache.get(leagueNorm) || leagueCache.get(leagueSlug);

            if (!leagueId) {
              const { data: lid, error: lerr } = await supabase.rpc("resolve_or_create_league", {
                p_nome: match.league_name,
                p_pais: match.country || null,
              });
              if (lerr || !lid) { skipped++; return; }
              leagueId = lid;
              leagueCache.set(leagueNorm, leagueId);
              leagueCache.set(leagueSlug, leagueId);
            }

            // Resolve home team (cache-first, then RPC)
            const homeNorm = normalizeName(match.home_team);
            const homeSlug = slugify(match.home_team);
            let homeId = teamCache.get(homeNorm) || teamCache.get(homeSlug);

            if (!homeId) {
              const { data: hid, error: herr } = await supabase.rpc("resolve_or_create_team", {
                p_nome: match.home_team,
                p_pais: match.country || null,
              });
              if (herr || !hid) { failed++; return; }
              homeId = hid;
              teamCache.set(homeNorm, homeId);
              teamCache.set(homeSlug, homeId);
            }

            // Resolve away team (cache-first, then RPC)
            const awayNorm = normalizeName(match.away_team);
            const awaySlug = slugify(match.away_team);
            let awayId = teamCache.get(awayNorm) || teamCache.get(awaySlug);

            if (!awayId) {
              const { data: aid, error: aerr } = await supabase.rpc("resolve_or_create_team", {
                p_nome: match.away_team,
                p_pais: match.country || null,
              });
              if (aerr || !aid) { failed++; return; }
              awayId = aid;
              teamCache.set(awayNorm, awayId);
              teamCache.set(awaySlug, awayId);
            }

            // Resolve/create match via RPC (single DB call)
            // Check if match exists first to distinguish insert vs update
            const existingNorm = `${homeId}|${awayId}|${match.date}`;
            const { data: existingMatch } = await supabase.from("partidas")
              .select("id")
              .eq("time_casa_id", homeId)
              .eq("time_fora_id", awayId)
              .eq("data", match.date)
              .maybeSingle();

            const isNew = !existingMatch;

            const { data: matchId, error: merr } = await supabase.rpc("resolve_or_create_match", {
              p_time_casa_id: homeId,
              p_time_fora_id: awayId,
              p_data: match.date,
              p_liga_id: leagueId,
              p_status: match.status || "scheduled",
              p_rodada: match.round ? parseInt(match.round) || null : null,
            });

            if (merr || !matchId) {
              failed++;
              errors.push(`${match.home_team} vs ${match.away_team} (${match.date}): ${merr?.message || "RPC error"}`);
              return;
            }

            // Update goals if available
            if (match.home_goals !== null && match.away_goals !== null) {
              await supabase.from("partidas").update({
                gols_casa: match.home_goals,
                gols_fora: match.away_goals,
                status: "finished",
              }).eq("id", matchId);
            }

            if (isNew) {
              inserted++;
            } else {
              updated++;
            }
          });

          await Promise.all(promises);
        }

        processedFiles++;
      }

      // Update progress after each batch of files
      await updateBatch(supabase, batchId, "processing", {
        processed_files: processedFiles,
        total_files: files.length,
        current_file: fileBatch[fileBatch.length - 1]?.path || "",
        inserted, updated, skipped, failed,
      }, inserted, updated, skipped, failed, errors);
    }

    // Final update — only "failed" if work was actually skipped
    const allFilesProcessed = processedFiles >= files.length;
    const finalStatus = allFilesProcessed ? "completed" : (isTimeLimitClose() ? "failed" : (failed > 0 && inserted === 0 ? "failed" : "completed"));
    await updateBatch(supabase, batchId, finalStatus, {
      processed_files: processedFiles,
      total_files: files.length,
      current_file: "",
      inserted, updated, skipped, failed,
    }, inserted, updated, skipped, failed, errors);

    // Log to sync_logs
    await supabase.from("sync_logs").insert({
      entity_type: "github_import",
      status: finalStatus === "completed" ? "completed" : "partial",
      items_processed: inserted + updated + skipped + failed,
      items_created: inserted,
      items_failed: failed,
      details: {
        batch_id: batchId,
        repo: `${owner}/${repo}`,
        provider,
        inserted, updated, skipped, failed,
        files_processed: processedFiles,
        total_files: files.length,
        time_elapsed_ms: Date.now() - REQUEST_START_TIME,
      },
    });

    return new Response(
      JSON.stringify({ success: true, status: finalStatus, inserted, updated, skipped, failed, processedFiles, totalFiles: files.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Import error:", err);
    if (batchId) {
      await updateBatch(
        createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!),
        batchId, "failed", {}, 0, 0, 0, 0, [err.message]
      );
    }
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateBatch(
  supabase: any,
  batchId: string,
  status: string,
  progressDetail: any,
  inserted: number,
  updated: number,
  skipped: number,
  failed: number,
  errors: string[]
) {
  await supabase.from("csv_imports").update({
    status,
    progress_detail: progressDetail,
    total_rows: inserted + updated + skipped + failed,
    rows_inserted: inserted,
    rows_updated: updated,
    rows_skipped: skipped,
    rows_failed: failed,
    error_report: errors.slice(0, 200),
    updated_at: new Date().toISOString(),
  }).eq("id", batchId);
}
