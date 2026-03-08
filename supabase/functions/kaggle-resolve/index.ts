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
    const { job_id } = await req.json();
    const shouldStop = () => Date.now() - startTime > SAFETY_TIMEOUT;

    const log = async (stage: string, level: string, message: string, payload?: any) => {
      await supabase.from("kaggle_import_logs").insert({ job_id, stage, level, message, payload: payload ? JSON.stringify(payload) : null });
    };

    await log("resolve", "info", "Starting resolution");

    // ========== RESOLVE TEAMS ==========
    const { data: stagingTeams } = await supabase.from("kaggle_staging_teams")
      .select("*").eq("job_id", job_id).eq("resolution_status", "pending");

    let teamsResolved = 0;
    let teamsConflict = 0;

    for (const st of stagingTeams || []) {
      if (shouldStop()) break;

      const slug = st.inferred_slug || st.normalized_name?.replace(/[^a-z0-9]+/g, "-") || "";

      // Level 1: slug exact match
      let { data: team } = await supabase.from("times")
        .select("id, nome").eq("slug", slug).eq("status", "active").limit(1).single();

      let confidence = 0;

      if (team) {
        confidence = 95;
      } else {
        // Level 2: alias match
        const { data: alias } = await supabase.from("team_aliases")
          .select("team_id").eq("normalized_alias", st.normalized_name || "").limit(1).single();

        if (alias) {
          const { data: t } = await supabase.from("times").select("id, nome").eq("id", alias.team_id).single();
          team = t;
          confidence = 85;
        }
      }

      if (!team) {
        // Level 3: normalized name partial match
        const { data: fuzzy } = await supabase.from("times")
          .select("id, nome, name_normalized")
          .eq("status", "active")
          .ilike("name_normalized", `%${st.normalized_name?.substring(0, 6) || ""}%`)
          .limit(5);

        if (fuzzy?.length === 1) {
          team = fuzzy[0];
          confidence = 70;
        } else if (fuzzy && fuzzy.length > 1) {
          confidence = 50;
          // Register conflict
          await supabase.from("kaggle_staging_conflicts").insert({
            job_id, entity_type: "team", conflict_type: "ambiguous_match",
            raw_value: st.raw_name,
            suggested_value: fuzzy.map((f: any) => `${f.nome}(${f.id})`).join(" | "),
            confidence_score: confidence,
          });
          teamsConflict++;
        }
      }

      if (team && confidence >= 70) {
        await supabase.from("kaggle_staging_teams").update({
          matched_team_id: team.id, confidence_score: confidence,
          resolution_status: "resolved",
        }).eq("id", st.id);

        // Create link
        await supabase.from("kaggle_team_links").insert({
          staging_team_id: st.id, team_id: team.id,
          external_key: st.raw_name, confidence_score: confidence,
        });

        teamsResolved++;
      } else if (!team) {
        await supabase.from("kaggle_staging_teams").update({
          resolution_status: "unmatched", confidence_score: 0,
        }).eq("id", st.id);

        await supabase.from("kaggle_resolution_queue").insert({
          job_id, entity_type: "team", staging_entity_id: st.id,
          issue_type: "no_match",
        });
      }
    }

    await log("resolve", "info", `Teams: ${teamsResolved} resolved, ${teamsConflict} conflicts`);

    // ========== RESOLVE COMPETITIONS ==========
    const { data: stagingComps } = await supabase.from("kaggle_staging_competitions")
      .select("*").eq("job_id", job_id).eq("resolution_status", "pending");

    let compsResolved = 0;

    for (const sc of stagingComps || []) {
      if (shouldStop()) break;

      const slug = sc.normalized_name?.replace(/[^a-z0-9]+/g, "-") || "";

      let { data: liga } = await supabase.from("ligas")
        .select("id, nome").eq("slug", slug).limit(1).single();

      let confidence = 0;

      if (liga) {
        confidence = 95;
      } else {
        const { data: alias } = await supabase.from("competition_aliases")
          .select("league_id").eq("normalized_alias", sc.normalized_name || "").limit(1).single();
        if (alias) {
          const { data: l } = await supabase.from("ligas").select("id, nome").eq("id", alias.league_id).single();
          liga = l;
          confidence = 85;
        }
      }

      if (liga && confidence >= 70) {
        await supabase.from("kaggle_staging_competitions").update({
          matched_competition_id: liga.id, confidence_score: confidence,
          resolution_status: "resolved",
        }).eq("id", sc.id);

        await supabase.from("kaggle_competition_links").insert({
          staging_competition_id: sc.id, competition_id: liga.id,
          external_key: sc.raw_name, confidence_score: confidence,
        });

        compsResolved++;
      } else {
        await supabase.from("kaggle_staging_competitions").update({
          resolution_status: "unmatched",
        }).eq("id", sc.id);

        await supabase.from("kaggle_resolution_queue").insert({
          job_id, entity_type: "competition", staging_entity_id: sc.id,
          issue_type: "no_match",
        });
      }
    }

    await log("resolve", "info", `Competitions: ${compsResolved} resolved`);

    // ========== RESOLVE MATCHES (link staging teams to staging matches) ==========
    const { data: resolvedTeams } = await supabase.from("kaggle_staging_teams")
      .select("raw_name, matched_team_id").eq("job_id", job_id).eq("resolution_status", "resolved");

    const teamMap: Record<string, string> = {};
    resolvedTeams?.forEach((t: any) => { if (t.matched_team_id) teamMap[t.raw_name] = t.matched_team_id; });

    const { data: resolvedComps } = await supabase.from("kaggle_staging_competitions")
      .select("raw_name, matched_competition_id").eq("job_id", job_id).eq("resolution_status", "resolved");

    const compMap: Record<string, string> = {};
    resolvedComps?.forEach((c: any) => { if (c.matched_competition_id) compMap[c.raw_name] = c.matched_competition_id; });

    // Update staging matches with resolved IDs
    const { data: stagingMatches } = await supabase.from("kaggle_staging_matches")
      .select("id, raw_home_team, raw_away_team, raw_competition_name, parsed_date")
      .eq("job_id", job_id).eq("resolution_status", "pending");

    let matchesResolved = 0;
    let matchesConflict = 0;

    for (const sm of stagingMatches || []) {
      if (shouldStop()) break;

      const homeId = sm.raw_home_team ? teamMap[sm.raw_home_team] : null;
      const awayId = sm.raw_away_team ? teamMap[sm.raw_away_team] : null;
      const compId = sm.raw_competition_name ? compMap[sm.raw_competition_name] : null;

      const update: any = {
        matched_home_team_id: homeId || null,
        matched_away_team_id: awayId || null,
        matched_competition_id: compId || null,
      };

      if (homeId && awayId) {
        // Dedup check
        if (sm.parsed_date) {
          const { data: existing } = await supabase.from("partidas")
            .select("id").eq("time_casa_id", homeId).eq("time_fora_id", awayId)
            .eq("data", sm.parsed_date).limit(1);

          if (existing?.length) {
            update.matched_match_id = existing[0].id;
            update.dedupe_status = "exact_match";
            update.confidence_score = 95;
          } else {
            // Check with date tolerance ±2 days
            const d = new Date(sm.parsed_date);
            const dBefore = new Date(d.getTime() - 2 * 86400000).toISOString().split("T")[0];
            const dAfter = new Date(d.getTime() + 2 * 86400000).toISOString().split("T")[0];

            const { data: approx } = await supabase.from("partidas")
              .select("id, data").eq("time_casa_id", homeId).eq("time_fora_id", awayId)
              .gte("data", dBefore).lte("data", dAfter).limit(1);

            if (approx?.length) {
              update.matched_match_id = approx[0].id;
              update.dedupe_status = "probable_match";
              update.confidence_score = 80;
              matchesConflict++;
            } else {
              update.dedupe_status = "new_record";
              update.confidence_score = homeId && awayId ? 85 : 50;
            }
          }
        }

        update.resolution_status = "resolved";
        matchesResolved++;
      } else {
        update.resolution_status = homeId || awayId ? "partial" : "unmatched";
        update.confidence_score = 30;
      }

      await supabase.from("kaggle_staging_matches").update(update).eq("id", sm.id);
    }

    // Update job
    await supabase.from("kaggle_import_jobs").update({
      total_conflicts: teamsConflict + matchesConflict,
    }).eq("id", job_id);

    await log("resolve", "info", `Matches: ${matchesResolved} resolved, ${matchesConflict} probable`);

    return new Response(JSON.stringify({
      success: true,
      teams: { resolved: teamsResolved, conflicts: teamsConflict },
      competitions: { resolved: compsResolved },
      matches: { resolved: matchesResolved, conflicts: matchesConflict },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
