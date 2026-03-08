import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Paginated fetch - no 1000 row limits
async function fetchAll(supabase: any, table: string, filters: Record<string, any>, select = "*") {
  const PAGE_SIZE = 5000;
  let all: any[] = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    for (const [k, v] of Object.entries(filters)) {
      q = q.eq(k, v);
    }
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
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
    const { job_id } = await req.json();
    const shouldStop = () => Date.now() - startTime > SAFETY_TIMEOUT;

    const log = async (stage: string, level: string, message: string, payload?: any) => {
      await supabase.from("kaggle_import_logs").insert({ job_id, stage, level, message, payload: payload ? JSON.stringify(payload) : null });
    };

    await log("resolve", "info", "Starting resolution (bulk mode)");

    // ========== RESOLVE TEAMS ==========
    const stagingTeams = await fetchAll(supabase, "kaggle_staging_teams", { job_id, resolution_status: "pending" });

    let teamsResolved = 0;
    let teamsCreated = 0;
    let teamsConflict = 0;

    for (const st of stagingTeams) {
      if (shouldStop()) break;

      const slug = st.inferred_slug || st.normalized_name?.replace(/[^a-z0-9]+/g, "-") || "";
      const normalizedName = st.normalized_name || st.raw_name?.toLowerCase().trim() || "";

      let { data: team } = await supabase.from("times")
        .select("id, nome").eq("slug", slug).eq("status", "active").limit(1).single();

      let confidence = 0;

      if (team) {
        confidence = 95;
      } else {
        const { data: alias } = await supabase.from("team_aliases")
          .select("team_id").eq("normalized_alias", normalizedName).limit(1).single();

        if (alias) {
          const { data: t } = await supabase.from("times").select("id, nome").eq("id", alias.team_id).single();
          team = t;
          confidence = 85;
        }
      }

      if (!team) {
        const prefix = normalizedName.substring(0, 8);
        if (prefix.length >= 3) {
          const { data: fuzzy } = await supabase.from("times")
            .select("id, nome, name_normalized")
            .eq("status", "active")
            .ilike("name_normalized", `%${prefix}%`)
            .limit(5);

          if (fuzzy?.length === 1) {
            team = fuzzy[0];
            confidence = 70;
          } else if (fuzzy && fuzzy.length > 1) {
            const exactMatch = fuzzy.find((f: any) => f.name_normalized === normalizedName);
            if (exactMatch) {
              team = exactMatch;
              confidence = 90;
            } else {
              confidence = 50;
              await supabase.from("kaggle_staging_conflicts").insert({
                job_id, entity_type: "team", conflict_type: "ambiguous_match",
                raw_value: st.raw_name,
                suggested_value: fuzzy.map((f: any) => `${f.nome}(${f.id})`).join(" | "),
                confidence_score: confidence,
              });
              teamsConflict++;
            }
          }
        }
      }

      if (team && confidence >= 70) {
        await supabase.from("kaggle_staging_teams").update({
          matched_team_id: team.id, confidence_score: confidence,
          resolution_status: "resolved",
        }).eq("id", st.id);

        await supabase.from("team_aliases").upsert({
          team_id: team.id,
          alias: st.raw_name,
          normalized_alias: normalizedName,
          source: "kaggle_import",
          confidence: confidence,
        }, { onConflict: "team_id,normalized_alias", ignoreDuplicates: true });

        await supabase.from("kaggle_team_links").insert({
          staging_team_id: st.id, team_id: team.id,
          external_key: st.raw_name, confidence_score: confidence,
        });

        teamsResolved++;
      } else if (!team && confidence < 70) {
        const teamName = st.raw_name || normalizedName;
        
        const { data: newTeam, error: createErr } = await supabase.from("times").insert({
          nome: teamName,
          status: "active",
        }).select("id, nome, slug").single();

        if (createErr) {
          await log("resolve", "error", `Failed to create team: ${teamName} - ${createErr.message}`);
          await supabase.from("kaggle_staging_teams").update({
            resolution_status: "unmatched", confidence_score: 0,
          }).eq("id", st.id);
        } else {
          await supabase.from("team_aliases").upsert({
            team_id: newTeam.id,
            alias: teamName,
            normalized_alias: normalizedName,
            source: "kaggle_import",
            confidence: 100,
          }, { onConflict: "team_id,normalized_alias", ignoreDuplicates: true });

          await supabase.from("kaggle_staging_teams").update({
            matched_team_id: newTeam.id, confidence_score: 100,
            resolution_status: "resolved",
          }).eq("id", st.id);

          await supabase.from("kaggle_team_links").insert({
            staging_team_id: st.id, team_id: newTeam.id,
            external_key: st.raw_name, confidence_score: 100,
          });

          teamsCreated++;
          teamsResolved++;
          await log("resolve", "info", `Auto-created team: ${teamName} → ${newTeam.id}`);
        }
      }
    }

    await log("resolve", "info", `Teams: ${teamsResolved} resolved (${teamsCreated} new), ${teamsConflict} conflicts`);

    // ========== RESOLVE COMPETITIONS ==========
    const stagingComps = await fetchAll(supabase, "kaggle_staging_competitions", { job_id, resolution_status: "pending" });

    let compsResolved = 0;
    let compsCreated = 0;

    for (const sc of stagingComps) {
      if (shouldStop()) break;

      const normalizedName = sc.normalized_name || sc.raw_name?.toLowerCase().trim() || "";
      const slug = normalizedName.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      let { data: liga } = await supabase.from("ligas")
        .select("id, nome").eq("slug", slug).limit(1).single();

      let confidence = 0;

      if (liga) {
        confidence = 95;
      } else {
        const { data: alias } = await supabase.from("competition_aliases")
          .select("league_id").eq("normalized_alias", normalizedName).limit(1).single();
        if (alias) {
          const { data: l } = await supabase.from("ligas").select("id, nome").eq("id", alias.league_id).single();
          liga = l;
          confidence = 85;
        }
      }

      if (!liga) {
        const prefix = slug.substring(0, 10);
        if (prefix.length >= 3) {
          const { data: fuzzy } = await supabase.from("ligas")
            .select("id, nome, slug")
            .ilike("slug", `%${prefix}%`)
            .limit(5);
          
          if (fuzzy?.length === 1) {
            liga = fuzzy[0];
            confidence = 70;
          }
        }
      }

      if (liga && confidence >= 70) {
        await supabase.from("kaggle_staging_competitions").update({
          matched_competition_id: liga.id, confidence_score: confidence,
          resolution_status: "resolved",
        }).eq("id", sc.id);

        await supabase.from("competition_aliases").upsert({
          league_id: liga.id,
          alias: sc.raw_name,
          normalized_alias: normalizedName,
        }, { onConflict: "league_id,normalized_alias", ignoreDuplicates: true });

        await supabase.from("kaggle_competition_links").insert({
          staging_competition_id: sc.id, competition_id: liga.id,
          external_key: sc.raw_name, confidence_score: confidence,
        });

        compsResolved++;
      } else {
        const leagueName = sc.raw_name || normalizedName;
        
        let inferredCountry = null;
        const nameLower = leagueName.toLowerCase();
        const countryHints: Record<string, string> = {
          "brazil": "Brazil", "brasil": "Brazil", "brasileir": "Brazil",
          "england": "England", "premier": "England", "championship": "England",
          "spain": "Spain", "la liga": "Spain", "liga bbva": "Spain",
          "italy": "Italy", "serie a": "Italy", "calcio": "Italy",
          "germany": "Germany", "bundesliga": "Germany",
          "france": "France", "ligue": "France",
          "portugal": "Portugal", "primeira": "Portugal",
          "argentina": "Argentina", "superliga": "Argentina",
          "mexico": "Mexico", "liga mx": "Mexico",
          "usa": "United States", "mls": "United States",
          "world cup": "International", "copa america": "International",
          "champions league": "International", "europa league": "International",
          "libertadores": "International", "sudamericana": "International",
          "friendly": "International", "international": "International",
        };

        for (const [hint, country] of Object.entries(countryHints)) {
          if (nameLower.includes(hint)) {
            inferredCountry = country;
            break;
          }
        }

        const { data: newLeague, error: createErr } = await supabase.from("ligas").insert({
          nome: leagueName,
          pais: inferredCountry,
          status: "active",
        }).select("id, nome, slug").single();

        if (createErr) {
          await log("resolve", "error", `Failed to create league: ${leagueName} - ${createErr.message}`);
          await supabase.from("kaggle_staging_competitions").update({
            resolution_status: "unmatched",
          }).eq("id", sc.id);
        } else {
          await supabase.from("competition_aliases").upsert({
            league_id: newLeague.id,
            alias: leagueName,
            normalized_alias: normalizedName,
          }, { onConflict: "league_id,normalized_alias", ignoreDuplicates: true });

          await supabase.from("kaggle_staging_competitions").update({
            matched_competition_id: newLeague.id, confidence_score: 100,
            resolution_status: "resolved",
          }).eq("id", sc.id);

          await supabase.from("kaggle_competition_links").insert({
            staging_competition_id: sc.id, competition_id: newLeague.id,
            external_key: sc.raw_name, confidence_score: 100,
          });

          compsCreated++;
          compsResolved++;
          await log("resolve", "info", `Auto-created league: ${leagueName} → ${newLeague.id} (country: ${inferredCountry || "unknown"})`);
        }
      }
    }

    await log("resolve", "info", `Competitions: ${compsResolved} resolved (${compsCreated} new)`);

    // ========== RESOLVE MATCHES — BULK MODE ==========
    // Build team and competition maps from resolved staging entities
    const resolvedTeams = await fetchAll(supabase, "kaggle_staging_teams", { job_id, resolution_status: "resolved" }, "raw_name, matched_team_id");
    const teamMap: Record<string, string> = {};
    resolvedTeams.forEach((t: any) => { if (t.matched_team_id) teamMap[t.raw_name] = t.matched_team_id; });

    const resolvedComps = await fetchAll(supabase, "kaggle_staging_competitions", { job_id, resolution_status: "resolved" }, "raw_name, matched_competition_id");
    const compMap: Record<string, string> = {};
    resolvedComps.forEach((c: any) => { if (c.matched_competition_id) compMap[c.raw_name] = c.matched_competition_id; });

    // Fetch pending staging matches in pages
    const stagingMatches = await fetchAll(supabase, "kaggle_staging_matches", { job_id, resolution_status: "pending" }, "id, raw_home_team, raw_away_team, raw_competition_name, parsed_date");

    let matchesResolved = 0;
    let matchesPartial = 0;
    let matchesUnmatched = 0;

    // Process in bulk batches of 500
    const BATCH_SIZE = 500;
    const resolvedBatch: { id: string; update: any }[] = [];
    const partialBatch: string[] = [];
    const unmatchedBatch: string[] = [];

    for (const sm of stagingMatches) {
      const homeId = sm.raw_home_team ? teamMap[sm.raw_home_team] : null;
      const awayId = sm.raw_away_team ? teamMap[sm.raw_away_team] : null;
      const compId = sm.raw_competition_name ? compMap[sm.raw_competition_name] : null;

      if (homeId && awayId) {
        resolvedBatch.push({
          id: sm.id,
          update: {
            matched_home_team_id: homeId,
            matched_away_team_id: awayId,
            matched_competition_id: compId || null,
            resolution_status: "resolved",
            dedupe_status: "new_record",
            confidence_score: 85,
          }
        });
        matchesResolved++;
      } else if (homeId || awayId) {
        partialBatch.push(sm.id);
        matchesPartial++;
      } else {
        unmatchedBatch.push(sm.id);
        matchesUnmatched++;
      }

      // Flush resolved batch
      if (resolvedBatch.length >= BATCH_SIZE) {
        await flushResolvedBatch(supabase, resolvedBatch);
        resolvedBatch.length = 0;
      }

      // Flush partial batch
      if (partialBatch.length >= BATCH_SIZE) {
        await flushStatusBatch(supabase, partialBatch, "partial", 30);
        partialBatch.length = 0;
      }

      // Flush unmatched batch
      if (unmatchedBatch.length >= BATCH_SIZE) {
        await flushStatusBatch(supabase, unmatchedBatch, "unmatched", 0);
        unmatchedBatch.length = 0;
      }

      if (shouldStop()) {
        await log("resolve", "warn", `Safety timeout at ${matchesResolved} matches resolved`);
        break;
      }
    }

    // Flush remaining
    if (resolvedBatch.length > 0) await flushResolvedBatch(supabase, resolvedBatch);
    if (partialBatch.length > 0) await flushStatusBatch(supabase, partialBatch, "partial", 30);
    if (unmatchedBatch.length > 0) await flushStatusBatch(supabase, unmatchedBatch, "unmatched", 0);

    // Count remaining pending
    const { count: pendingTeamsLeft } = await supabase.from("kaggle_staging_teams")
      .select("id", { count: "exact", head: true }).eq("job_id", job_id).eq("resolution_status", "pending");
    const { count: pendingCompsLeft } = await supabase.from("kaggle_staging_competitions")
      .select("id", { count: "exact", head: true }).eq("job_id", job_id).eq("resolution_status", "pending");
    const { count: pendingMatchesLeft } = await supabase.from("kaggle_staging_matches")
      .select("id", { count: "exact", head: true }).eq("job_id", job_id).eq("resolution_status", "pending");

    const isComplete = (pendingTeamsLeft || 0) === 0 && (pendingCompsLeft || 0) === 0 && (pendingMatchesLeft || 0) === 0;

    await supabase.from("kaggle_import_jobs").update({
      status: isComplete ? "awaiting_review" : "resolving",
      total_conflicts: matchesPartial + matchesUnmatched,
    }).eq("id", job_id);

    await log("resolve", "info", `Matches BULK: ${matchesResolved} resolved, ${matchesPartial} partial, ${matchesUnmatched} unmatched. Remaining: ${pendingTeamsLeft || 0} teams, ${pendingCompsLeft || 0} comps, ${pendingMatchesLeft || 0} matches`);

    return new Response(JSON.stringify({
      success: true,
      complete: isComplete,
      pending: { teams: pendingTeamsLeft || 0, competitions: pendingCompsLeft || 0, matches: pendingMatchesLeft || 0 },
      teams: { resolved: teamsResolved, created: teamsCreated, conflicts: teamsConflict },
      competitions: { resolved: compsResolved, created: compsCreated },
      matches: { resolved: matchesResolved, partial: matchesPartial, unmatched: matchesUnmatched },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.job_id) {
        await supabase.from("kaggle_import_jobs").update({
          status: "failed", error_summary: e.message,
        }).eq("id", body.job_id);
      }
    } catch {}
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// Flush resolved matches in bulk — one update per record but no extra queries
async function flushResolvedBatch(supabase: any, batch: { id: string; update: any }[]) {
  // Use parallel updates in chunks of 50 for speed
  const CHUNK = 50;
  for (let i = 0; i < batch.length; i += CHUNK) {
    const chunk = batch.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map(item =>
        supabase.from("kaggle_staging_matches").update(item.update).eq("id", item.id)
      )
    );
  }
}

// Flush status-only updates by IDs
async function flushStatusBatch(supabase: any, ids: string[], status: string, confidence: number) {
  // Update in chunks using .in()
  const CHUNK = 200;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    await supabase.from("kaggle_staging_matches").update({
      resolution_status: status,
      confidence_score: confidence,
    }).in("id", chunk);
  }
}
