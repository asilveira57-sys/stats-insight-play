import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { normalizeName, slugify } from "../_shared/canonicalUtils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIME_LIMIT_MS = 120_000;
let REQUEST_START_TIME = Date.now();
function isTimeLimitClose(): boolean {
  return Date.now() - REQUEST_START_TIME > TIME_LIMIT_MS;
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
  return dateStr;
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

interface ParsedMatch {
  date: string;
  home_team: string;
  away_team: string;
  home_goals: number | null;
  away_goals: number | null;
  round: string | null;
  status: string;
  season: string;
}

function parseCsv(content: string): ParsedMatch[] {
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
    return -1;
  };

  const dateIdx = colIdx(["date", "data", "datetime", "match_date"]);
  const homeIdx = colIdx(["home_team", "home", "mandante", "time_casa"]);
  const awayIdx = colIdx(["away_team", "away", "visitante", "time_fora"]);
  const hgIdx = colIdx(["home_goal", "home_goals", "gols_casa", "fthg", "home_score"]);
  const agIdx = colIdx(["away_goal", "away_goals", "gols_fora", "ftag", "away_score"]);
  const roundIdx = colIdx(["round", "rodada", "matchday", "stage"]);
  const seasonIdx = colIdx(["season", "temporada", "year"]);

  if (dateIdx < 0 || homeIdx < 0 || awayIdx < 0) return [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    if (cols.length <= Math.max(dateIdx, homeIdx, awayIdx)) continue;

    const clean = (idx: number) => cols[idx]?.trim().replace(/^["']|["']$/g, "") || "";

    const homeGoals = hgIdx >= 0 ? parseIntSafe(clean(hgIdx)) : null;
    const awayGoals = agIdx >= 0 ? parseIntSafe(clean(agIdx)) : null;

    let matchSeason = "";
    if (seasonIdx >= 0 && clean(seasonIdx)) {
      matchSeason = clean(seasonIdx);
    } else {
      const yearMatch = clean(dateIdx).match(/((?:19|20)\d{2})/);
      matchSeason = yearMatch ? yearMatch[1] : "";
    }

    matches.push({
      date: normalizeDate(clean(dateIdx)),
      home_team: clean(homeIdx),
      away_team: clean(awayIdx),
      home_goals: homeGoals,
      away_goals: awayGoals,
      round: roundIdx >= 0 ? clean(roundIdx) || null : null,
      status: homeGoals !== null && awayGoals !== null ? "finished" : "scheduled",
      season: matchSeason,
    });
  }

  return matches;
}

async function fetchAll(supabase: any, table: string, select: string, filter?: { col: string; val: string }) {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    REQUEST_START_TIME = Date.now();
    const body = await req.json();
    const { csv_text, league_id, country, file_name, batch_id, offset } = body as {
      csv_text: string;
      league_id: string;
      country: string;
      file_name: string;
      batch_id?: string;
      offset?: number;
    };

    if (!csv_text || !league_id || !file_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: csv_text, league_id, file_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse all matches
    const allMatches = parseCsv(csv_text);
    if (allMatches.length === 0) {
      return new Response(
        JSON.stringify({ error: "No matches detected in CSV" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startOffset = offset || 0;
    const matches = allMatches.slice(startOffset);

    // Create or reuse batch record
    let currentBatchId = batch_id;
    if (!currentBatchId) {
      // Get auth user from header
      const authHeader = req.headers.get("Authorization");
      let userId = "00000000-0000-0000-0000-000000000000";
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        if (user) userId = user.id;
      }

      const { data: batchData } = await supabase.from("csv_imports").insert({
        user_id: userId,
        file_name,
        file_type: "matches",
        provider: "csv_direct",
        liga_id: league_id,
        status: "processing",
        total_rows: allMatches.length,
      }).select("id").single();
      currentBatchId = batchData?.id;
    }

    // Pre-load caches
    const teamCache = new Map<string, string>();
    const allTeams = await fetchAll(supabase, "times", "id, nome, slug", { col: "status", val: "active" });
    for (const t of allTeams) {
      teamCache.set(normalizeName(t.nome), t.id);
      if (t.slug) teamCache.set(t.slug, t.id);
    }
    const allAliases = await fetchAll(supabase, "team_aliases", "team_id, normalized_alias");
    for (const a of allAliases) {
      if (a.team_id && a.normalized_alias) teamCache.set(a.normalized_alias, a.team_id);
    }

    let inserted = 0, updated = 0, skipped = 0, failed = 0;
    const errors: string[] = [];

    const BATCH_SIZE = 3;
    for (let i = 0; i < matches.length; i += BATCH_SIZE) {
      if (isTimeLimitClose()) {
        // Save progress and signal continuation
        if (currentBatchId) {
          await supabase.from("csv_imports").update({
            status: "processing",
            progress_detail: {
              offset: startOffset + i,
              total: allMatches.length,
              inserted, updated, skipped, failed,
            },
            rows_inserted: inserted,
            rows_updated: updated,
            rows_skipped: skipped,
            rows_failed: failed,
            error_report: errors.slice(0, 100),
            updated_at: new Date().toISOString(),
          }).eq("id", currentBatchId);
        }

        return new Response(
          JSON.stringify({
            success: true,
            status: "partial",
            batch_id: currentBatchId,
            next_offset: startOffset + i,
            total: allMatches.length,
            inserted, updated, skipped, failed,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const batch = matches.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (match) => {
        if (!match.date || !match.home_team || !match.away_team) { skipped++; return; }
        if (normalizeName(match.home_team) === normalizeName(match.away_team)) { skipped++; return; }

        // Resolve home team
        const homeNorm = normalizeName(match.home_team);
        const homeSlug = slugify(match.home_team);
        let homeId = teamCache.get(homeNorm) || teamCache.get(homeSlug);
        if (!homeId) {
          const { data: hid, error: herr } = await supabase.rpc("resolve_or_create_team", {
            p_nome: match.home_team, p_pais: country || null,
          });
          if (herr || !hid) { failed++; errors.push(`Team resolve failed: ${match.home_team}`); return; }
          homeId = hid;
          teamCache.set(homeNorm, homeId);
          teamCache.set(homeSlug, homeId);
        }

        // Resolve away team
        const awayNorm = normalizeName(match.away_team);
        const awaySlug = slugify(match.away_team);
        let awayId = teamCache.get(awayNorm) || teamCache.get(awaySlug);
        if (!awayId) {
          const { data: aid, error: aerr } = await supabase.rpc("resolve_or_create_team", {
            p_nome: match.away_team, p_pais: country || null,
          });
          if (aerr || !aid) { failed++; errors.push(`Team resolve failed: ${match.away_team}`); return; }
          awayId = aid;
          teamCache.set(awayNorm, awayId);
          teamCache.set(awaySlug, awayId);
        }

        // Check existing
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
          p_liga_id: league_id,
          p_status: match.status || "scheduled",
          p_rodada: match.round ? parseInt(match.round) || null : null,
        });

        if (merr || !matchId) {
          failed++;
          errors.push(`${match.home_team} vs ${match.away_team} (${match.date}): ${merr?.message || "RPC error"}`);
          return;
        }

        // Update goals + batch ID
        if (match.home_goals !== null && match.away_goals !== null) {
          await supabase.from("partidas").update({
            gols_casa: match.home_goals,
            gols_fora: match.away_goals,
            status: "finished",
            import_batch_id: currentBatchId,
          }).eq("id", matchId);
        } else if (isNew && currentBatchId) {
          await supabase.from("partidas").update({
            import_batch_id: currentBatchId,
          }).eq("id", matchId);
        }

        if (isNew) inserted++;
        else updated++;
      });

      await Promise.all(promises);

      // Update progress every 30 matches
      if (i % 30 === 0 && currentBatchId) {
        await supabase.from("csv_imports").update({
          status: "processing",
          progress_detail: {
            offset: startOffset + i + BATCH_SIZE,
            total: allMatches.length,
            inserted, updated, skipped, failed,
          },
          rows_inserted: inserted,
          rows_updated: updated,
          rows_skipped: skipped,
          rows_failed: failed,
          updated_at: new Date().toISOString(),
        }).eq("id", currentBatchId);
      }
    }

    // Final update
    if (currentBatchId) {
      await supabase.from("csv_imports").update({
        status: "completed",
        progress_detail: {
          offset: allMatches.length,
          total: allMatches.length,
          inserted, updated, skipped, failed,
        },
        total_rows: allMatches.length,
        rows_inserted: inserted,
        rows_updated: updated,
        rows_skipped: skipped,
        rows_failed: failed,
        error_report: errors.slice(0, 200),
        updated_at: new Date().toISOString(),
      }).eq("id", currentBatchId);
    }

    // Log
    await supabase.from("sync_logs").insert({
      entity_type: "csv_direct_import",
      status: "completed",
      items_processed: inserted + updated + skipped + failed,
      items_created: inserted,
      items_failed: failed,
      details: {
        batch_id: currentBatchId,
        file_name,
        league_id,
        inserted, updated, skipped, failed,
        time_elapsed_ms: Date.now() - REQUEST_START_TIME,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        status: "completed",
        batch_id: currentBatchId,
        total: allMatches.length,
        inserted, updated, skipped, failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Import error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
