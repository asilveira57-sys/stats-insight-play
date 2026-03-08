import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple fast hash (no crypto API needed)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const SAFETY_TIMEOUT = 110_000;
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { action, job_id } = body;

    const log = async (stage: string, level: string, message: string, payload?: any) => {
      await supabase.from("kaggle_import_logs").insert({ job_id, stage, level, message, payload: payload ? JSON.stringify(payload) : null });
    };

    const shouldStop = () => Date.now() - startTime > SAFETY_TIMEOUT;

    // ========== PROFILE FILE ==========
    if (action === "profile") {
      await supabase.from("kaggle_import_jobs").update({ status: "profiling" }).eq("id", job_id);
      await log("profile", "info", "Starting file profiling");

      const { data: job } = await supabase.from("kaggle_import_jobs").select("*, kaggle_dataset_files(*)").eq("id", job_id).single();
      if (!job) throw new Error("Job not found");

      const { data: rawAsset } = await supabase.from("kaggle_raw_assets")
        .select("*").eq("job_id", job_id).order("created_at", { ascending: false }).limit(1).single();

      if (!rawAsset?.raw_text) {
        await log("profile", "error", "No raw text found for profiling");
        await supabase.from("kaggle_import_jobs").update({ status: "failed", error_summary: "No raw data" }).eq("id", job_id);
        return new Response(JSON.stringify({ error: "No raw data" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const lines = rawAsset.raw_text.split("\n").filter((l: string) => l.trim());
      if (lines.length < 2) throw new Error("File has insufficient data");

      // Detect delimiter
      const firstLine = lines[0];
      const delimiters = [",", ";", "\t", "|"];
      let bestDelim = ",";
      let maxCols = 0;
      for (const d of delimiters) {
        const cols = firstLine.split(d).length;
        if (cols > maxCols) { maxCols = cols; bestDelim = d; }
      }

      const headers = firstLine.split(bestDelim).map((h: string) => h.trim().replace(/^["']|["']$/g, ""));
      const sampleRows: any[] = [];
      for (let i = 1; i < Math.min(6, lines.length); i++) {
        const vals = lines[i].split(bestDelim).map((v: string) => v.trim().replace(/^["']|["']$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h: string, idx: number) => { row[h] = vals[idx] || ""; });
        sampleRows.push(row);
      }

      // Infer schema types
      const schema: Record<string, string> = {};
      headers.forEach((h: string) => {
        const vals = sampleRows.map(r => r[h]).filter(Boolean);
        if (vals.every((v: string) => /^\d{4}[-/]\d{2}[-/]\d{2}/.test(v))) schema[h] = "date";
        else if (vals.every((v: string) => /^-?\d+$/.test(v))) schema[h] = "integer";
        else if (vals.every((v: string) => /^-?\d+\.?\d*$/.test(v))) schema[h] = "number";
        else schema[h] = "text";
      });

      // Auto-infer entity type from column names
      const colStr = headers.join(" ").toLowerCase();
      let entityType = "unknown";
      if (colStr.includes("home") && colStr.includes("away") && (colStr.includes("score") || colStr.includes("goal") || colStr.includes("result"))) entityType = "matches";
      else if (colStr.includes("team") && !colStr.includes("match") && !colStr.includes("score")) entityType = "teams";
      else if (colStr.includes("player") && (colStr.includes("position") || colStr.includes("birth"))) entityType = "players";
      else if (colStr.includes("league") || colStr.includes("competition")) entityType = "competitions";
      else if (colStr.includes("season") && !colStr.includes("match")) entityType = "seasons";
      else if (colStr.includes("odds") || colStr.includes("bet")) entityType = "odds";

      const { data: profile } = await supabase.from("kaggle_file_profiles").insert({
        job_id, dataset_file_id: job.dataset_file_id,
        detected_columns: headers, detected_row_count: lines.length - 1,
        inferred_schema: schema, delimiter: bestDelim,
        sample_rows: sampleRows,
      }).select().single();

      // Update file entity type
      if (entityType !== "unknown" && job.dataset_file_id) {
        await supabase.from("kaggle_dataset_files").update({ inferred_entity_type: entityType }).eq("id", job.dataset_file_id);
      }

      // Auto-suggest column mappings
      const mappings: any[] = [];
      const matchMappings: Record<string, { entity: string; field: string; conf: number }> = {
        date: { entity: "match", field: "data", conf: 90 },
        match_date: { entity: "match", field: "data", conf: 95 },
        home_team: { entity: "match", field: "time_casa", conf: 95 },
        away_team: { entity: "match", field: "time_fora", conf: 95 },
        home_score: { entity: "match", field: "gols_casa", conf: 90 },
        away_score: { entity: "match", field: "gols_fora", conf: 90 },
        home_goals: { entity: "match", field: "gols_casa", conf: 90 },
        away_goals: { entity: "match", field: "gols_fora", conf: 90 },
        fthg: { entity: "match", field: "gols_casa", conf: 85 },
        ftag: { entity: "match", field: "gols_fora", conf: 85 },
        hthg: { entity: "match", field: "gols_casa_ht", conf: 80 },
        htag: { entity: "match", field: "gols_fora_ht", conf: 80 },
        ftr: { entity: "match", field: "resultado", conf: 85 },
        season: { entity: "match", field: "temporada", conf: 85 },
        league: { entity: "match", field: "competicao", conf: 85 },
        competition: { entity: "match", field: "competicao", conf: 85 },
        tournament: { entity: "match", field: "competicao", conf: 85 },
        div: { entity: "match", field: "competicao", conf: 75 },
        country: { entity: "match", field: "pais", conf: 70 },
        round: { entity: "match", field: "rodada", conf: 80 },
        referee: { entity: "match", field: "arbitro", conf: 80 },
        venue: { entity: "match", field: "estadio", conf: 80 },
        city: { entity: "match", field: "cidade", conf: 70 },
        neutral: { entity: "match", field: "campo_neutro", conf: 70 },
        hometeam: { entity: "match", field: "time_casa", conf: 90 },
        awayteam: { entity: "match", field: "time_fora", conf: 90 },
        team_name: { entity: "team", field: "nome", conf: 90 },
        player_name: { entity: "player", field: "nome", conf: 90 },
        // Additional aliases for common Kaggle datasets
        scorer: { entity: "scorer", field: "jogador_nome", conf: 85 },
        minute: { entity: "scorer", field: "minuto", conf: 85 },
        own_goal: { entity: "scorer", field: "gol_contra", conf: 80 },
        penalty: { entity: "scorer", field: "penalti", conf: 80 },
        team: { entity: "scorer", field: "time", conf: 80 },
      };

      for (const col of headers) {
        const norm = col.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const mapping = matchMappings[norm];
        if (mapping && job.dataset_file_id) {
          mappings.push({
            dataset_file_id: job.dataset_file_id,
            source_column_name: col,
            normalized_column_name: norm,
            target_entity: mapping.entity,
            target_field: mapping.field,
            mapping_confidence: mapping.conf,
          });
        }
      }

      if (mappings.length && job.dataset_file_id) {
        // Use upsert with the new unique constraint
        const { error: upsertErr } = await supabase.from("kaggle_column_mappings")
          .upsert(mappings, { onConflict: "dataset_file_id,source_column_name" });
        
        if (upsertErr) {
          await log("profile", "warn", `Upsert failed (${upsertErr.message}), trying individual inserts`);
          // Fallback: insert one by one, ignoring conflicts
          for (const m of mappings) {
            await supabase.from("kaggle_column_mappings").insert(m);
          }
        }
        
        await log("profile", "info", `Persisted ${mappings.length} column mappings`);
      }

      await supabase.from("kaggle_import_jobs").update({ status: "mapping" }).eq("id", job_id);
      await log("profile", "info", `Profile complete: ${headers.length} cols, ${lines.length - 1} rows, entity: ${entityType}`, { delimiter: bestDelim });

      return new Response(JSON.stringify({ success: true, profile, entityType, mappings: mappings.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== STAGE DATA ==========
    if (action === "stage") {
      await supabase.from("kaggle_import_jobs").update({ status: "staging" }).eq("id", job_id);
      await log("stage", "info", "Starting staging");

      const { data: job } = await supabase.from("kaggle_import_jobs")
        .select("*, kaggle_dataset_files(*)").eq("id", job_id).single();

      const { data: rawAsset } = await supabase.from("kaggle_raw_assets")
        .select("*").eq("job_id", job_id).order("created_at", { ascending: false }).limit(1).single();

      const { data: profile } = await supabase.from("kaggle_file_profiles")
        .select("*").eq("job_id", job_id).limit(1).single();

      const { data: colMappings } = await supabase.from("kaggle_column_mappings")
        .select("*").eq("dataset_file_id", job.dataset_file_id).eq("is_active", true);

      if (!rawAsset?.raw_text || !profile) throw new Error("Missing raw data or profile");

      const delimiter = profile.delimiter || ",";
      const headers: string[] = profile.detected_columns as string[] || [];
      const lines = rawAsset.raw_text.split("\n").filter((l: string) => l.trim());

      // Build mapping lookup
      const mappingLookup: Record<string, { entity: string; field: string }> = {};
      (colMappings || []).forEach((m: any) => {
        mappingLookup[m.source_column_name] = { entity: m.target_entity, field: m.target_field };
      });

      const entityType = job.kaggle_dataset_files?.inferred_entity_type || "unknown";
      let totalStaged = 0;
      let totalErrors = 0;

      // Larger batch for performance
      const BATCH_SIZE = 500;

      // Process matches - NO per-row crypto hashing (use simple hash instead)
      if (entityType === "matches" || entityType === "mixed" || entityType === "unknown") {
        const matchBatch: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          if (shouldStop()) {
            await log("stage", "warn", `Safety timeout at row ${i}/${lines.length}`);
            break;
          }

          const vals = lines[i].split(delimiter).map((v: string) => v.trim().replace(/^["']|["']$/g, ""));
          const row: Record<string, string> = {};
          headers.forEach((h: string, idx: number) => { row[h] = vals[idx] || ""; });

          // Map to staging match using column mappings
          const mapped: Record<string, string> = {};
          Object.entries(row).forEach(([col, val]) => {
            const m = mappingLookup[col];
            if (m) mapped[m.field] = val;
          });

          // Simple fast hash (no crypto)
          const rowRef = `row:${i}:${simpleHash(lines[i])}`;

          // Parse date
          let parsedDate = null;
          const dateStr = mapped.data || "";
          if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) parsedDate = d.toISOString().split("T")[0];
          }

          matchBatch.push({
            job_id,
            raw_competition_name: mapped.competicao || null,
            raw_season_label: mapped.temporada || null,
            raw_round_label: mapped.rodada || null,
            raw_date_text: dateStr,
            parsed_date: parsedDate,
            raw_home_team: mapped.time_casa || null,
            raw_away_team: mapped.time_fora || null,
            parsed_home_score: mapped.gols_casa ? parseInt(mapped.gols_casa) : null,
            parsed_away_score: mapped.gols_fora ? parseInt(mapped.gols_fora) : null,
            raw_score_text: mapped.resultado || null,
            venue_text: mapped.estadio || null,
            referee_text: mapped.arbitro || null,
            source_row_reference: rowRef,
          });

          if (matchBatch.length >= BATCH_SIZE) {
            const { error } = await supabase.from("kaggle_staging_matches").insert(matchBatch);
            if (error) { totalErrors += matchBatch.length; await log("stage", "error", `Batch error at row ${i}: ${error.message}`); }
            else totalStaged += matchBatch.length;
            matchBatch.length = 0;
          }
        }

        // Flush remaining
        if (matchBatch.length) {
          const { error } = await supabase.from("kaggle_staging_matches").insert(matchBatch);
          if (error) totalErrors += matchBatch.length;
          else totalStaged += matchBatch.length;
        }

        await log("stage", "info", `Staged ${totalStaged} matches, extracting teams/competitions...`);

        // Extract unique teams from staging (paginated)
        const teamSet = new Set<string>();
        const compSet = new Set<string>();
        const seasonSet = new Set<string>();
        let from = 0;
        const PAGE = 5000;
        
        while (true) {
          const { data: batch } = await supabase.from("kaggle_staging_matches")
            .select("raw_home_team, raw_away_team, raw_competition_name, raw_season_label")
            .eq("job_id", job_id)
            .range(from, from + PAGE - 1);
          
          if (!batch || batch.length === 0) break;
          
          batch.forEach((m: any) => {
            if (m.raw_home_team) teamSet.add(m.raw_home_team);
            if (m.raw_away_team) teamSet.add(m.raw_away_team);
            if (m.raw_competition_name) compSet.add(m.raw_competition_name);
            if (m.raw_season_label) seasonSet.add(m.raw_season_label);
          });
          
          if (batch.length < PAGE) break;
          from += PAGE;
        }

        // Insert staging teams
        const teamInserts = Array.from(teamSet).map(name => ({
          job_id, raw_name: name, normalized_name: name.toLowerCase().trim(),
          inferred_slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        }));

        if (teamInserts.length) {
          // Batch inserts for large sets
          for (let b = 0; b < teamInserts.length; b += 500) {
            await supabase.from("kaggle_staging_teams").insert(teamInserts.slice(b, b + 500));
          }
        }

        // Insert staging competitions
        const compInserts = Array.from(compSet).map(name => ({
          job_id, raw_name: name, normalized_name: name.toLowerCase().trim(),
        }));

        if (compInserts.length) {
          await supabase.from("kaggle_staging_competitions").insert(compInserts);
        }

        // Insert staging seasons
        const seasonInserts = Array.from(seasonSet).map(label => {
          const yearMatch = label.match(/(\d{4})/);
          return {
            job_id, raw_label: label, normalized_label: label.trim(),
            inferred_year_start: yearMatch ? parseInt(yearMatch[1]) : null,
          };
        });

        if (seasonInserts.length) {
          await supabase.from("kaggle_staging_seasons").insert(seasonInserts);
        }

        await log("stage", "info", `Extracted ${teamSet.size} teams, ${compSet.size} competitions, ${seasonSet.size} seasons`);
      }

      // Skip staging_rows entirely for large files - they're redundant with staging_matches
      // staging_rows are only useful for non-match entity types

      await supabase.from("kaggle_import_jobs").update({
        status: "awaiting_review", total_rows_read: lines.length - 1,
        total_rows_staged: totalStaged, total_errors: totalErrors,
        total_matches_detected: totalStaged,
      }).eq("id", job_id);

      await log("stage", "info", `Staging complete: ${totalStaged} staged, ${totalErrors} errors, elapsed: ${Date.now() - startTime}ms`);

      return new Response(JSON.stringify({ success: true, staged: totalStaged, errors: totalErrors }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
