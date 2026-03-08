import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const SAFETY_TIMEOUT = 110_000;
  const startTime = Date.now();

  try {
    const { job_id, promote_mode } = await req.json();
    // promote_mode: "new_only" | "all_resolved" | "exact_match_update"
    const mode = promote_mode || "new_only";

    const shouldStop = () => Date.now() - startTime > SAFETY_TIMEOUT;

    const log = async (stage: string, level: string, message: string, payload?: any) => {
      await supabase.from("kaggle_import_logs").insert({ job_id, stage, level, message, payload: payload ? JSON.stringify(payload) : null });
    };

    await log("promote", "info", `Starting promotion, mode: ${mode}`);

    // Get job info
    const { data: job } = await supabase.from("kaggle_import_jobs")
      .select("*, kaggle_datasets(dataset_slug)").eq("id", job_id).single();
    if (!job) throw new Error("Job not found");

    const datasetSlug = job.kaggle_datasets?.dataset_slug || "unknown";

    // Build filter based on mode
    let query = supabase.from("kaggle_staging_matches")
      .select("*").eq("job_id", job_id).eq("resolution_status", "resolved");

    if (mode === "new_only") {
      query = query.eq("dedupe_status", "new_record");
    } else if (mode === "exact_match_update") {
      query = query.in("dedupe_status", ["exact_match", "probable_match"]);
    }

    const { data: matches } = await query;

    let promoted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const sm of matches || []) {
      if (shouldStop()) {
        await log("promote", "warn", `Safety timeout at ${promoted + updated + skipped} items`);
        break;
      }

      if (!sm.matched_home_team_id || !sm.matched_away_team_id || !sm.parsed_date) {
        skipped++;
        continue;
      }

      try {
        if (sm.dedupe_status === "new_record") {
          // Insert new match
          const { data: newMatch, error } = await supabase.from("partidas").insert({
            time_casa_id: sm.matched_home_team_id,
            time_fora_id: sm.matched_away_team_id,
            data: sm.parsed_date,
            liga_id: sm.matched_competition_id,
            gols_casa: sm.parsed_home_score,
            gols_fora: sm.parsed_away_score,
            status: sm.parsed_home_score !== null ? "finished" : "scheduled",
            rodada: sm.raw_round_label ? parseInt(sm.raw_round_label) || null : null,
          }).select("id").single();

          if (error) {
            errors++;
            await log("promote", "error", `Insert failed: ${error.message}`, { staging_id: sm.id });
            continue;
          }

          // Register in external_id_map
          await supabase.from("external_id_map").insert({
            source_id: null, // Could link to kaggle data_source
            entity_type: "match",
            external_id: `kaggle:${datasetSlug}:${sm.source_row_reference || sm.id}`,
            internal_id: newMatch.id,
            confidence: "high",
            metadata: { kaggle_job_id: job_id, staging_id: sm.id },
          }).onConflict("source_id,entity_type,external_id");

          // Create link
          await supabase.from("kaggle_match_links").insert({
            staging_match_id: sm.id, partida_id: newMatch.id,
            dataset_file_id: job.dataset_file_id,
            external_key: sm.source_row_reference || sm.id,
            confidence_score: sm.confidence_score || 85,
          });

          // Update staging
          await supabase.from("kaggle_staging_matches").update({
            matched_match_id: newMatch.id, resolution_status: "promoted",
          }).eq("id", sm.id);

          promoted++;
        } else if (sm.matched_match_id && (sm.dedupe_status === "exact_match" || sm.dedupe_status === "probable_match")) {
          // Update existing match with Kaggle data
          const updateData: any = {};
          if (sm.parsed_home_score !== null) updateData.gols_casa = sm.parsed_home_score;
          if (sm.parsed_away_score !== null) updateData.gols_fora = sm.parsed_away_score;
          if (sm.matched_competition_id) updateData.liga_id = sm.matched_competition_id;
          if (Object.keys(updateData).length) {
            updateData.status = "finished";
            updateData.updated_at = new Date().toISOString();
            await supabase.from("partidas").update(updateData).eq("id", sm.matched_match_id);
          }

          // Register link
          await supabase.from("kaggle_match_links").insert({
            staging_match_id: sm.id, partida_id: sm.matched_match_id,
            dataset_file_id: job.dataset_file_id,
            external_key: sm.source_row_reference || sm.id,
            confidence_score: sm.confidence_score || 80,
          });

          await supabase.from("kaggle_staging_matches").update({
            resolution_status: "promoted",
          }).eq("id", sm.id);

          updated++;
        } else {
          skipped++;
        }
      } catch (err) {
        errors++;
        await log("promote", "error", `Row error: ${err.message}`, { staging_id: sm.id });
      }
    }

    // Also register team aliases for unmatched teams that were resolved
    const { data: newTeamsToCreate } = await supabase.from("kaggle_staging_teams")
      .select("*").eq("job_id", job_id).eq("resolution_status", "unmatched");

    let teamsCreated = 0;

    // Create new teams only if there are staging matches referencing them
    // (to avoid creating orphans)

    // Create snapshot
    await supabase.from("kaggle_import_snapshots").insert({
      job_id,
      summary_json: { promoted, updated, skipped, errors, teams_created: teamsCreated, mode },
    });

    // Update job
    await supabase.from("kaggle_import_jobs").update({
      status: errors > 0 ? "completed_with_alerts" : "completed",
      total_promoted: promoted, total_updated: updated,
      total_ignored: skipped, total_errors: errors,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
    }).eq("id", job_id);

    await log("promote", "info", `Promotion complete: ${promoted} new, ${updated} updated, ${skipped} skipped, ${errors} errors`);

    return new Response(JSON.stringify({
      success: true, promoted, updated, skipped, errors,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
