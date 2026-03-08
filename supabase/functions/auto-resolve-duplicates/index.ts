import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 5; // pairs per invocation (stay under 120s timeout)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 60_000;
const SAFETY_TIMEOUT_MS = 110_000; // stop before platform kills us

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const jobId = body.job_id as string | null;

    // Fetch all suggested duplicates
    const { data: allDuplicates, error: dupError } = await supabase.rpc(
      "get_suggested_duplicates",
      { p_limit: 10000 }
    );
    if (dupError) throw dupError;

    // Fetch dismissed pairs
    const { data: dismissed } = await supabase
      .from("dismissed_duplicates")
      .select("team_a_id, team_b_id");

    const dismissedSet = new Set(
      (dismissed || []).map((d: any) => [d.team_a_id, d.team_b_id].sort().join("|"))
    );

    // Fetch already merged teams to skip
    const { data: mergedTeams } = await supabase
      .from("times")
      .select("id")
      .eq("status", "merged");
    const mergedSet = new Set((mergedTeams || []).map((t: any) => t.id));

    // Filter to pending pairs
    const pendingPairs = (allDuplicates || []).filter((dup: any) => {
      const key = [dup.team_a_id, dup.team_b_id].sort().join("|");
      return !dismissedSet.has(key) && !mergedSet.has(dup.team_a_id) && !mergedSet.has(dup.team_b_id);
    });

    const totalPending = pendingPairs.length;
    const batch = pendingPairs.slice(0, BATCH_SIZE);

    // Update job progress if we have a job_id
    if (jobId) {
      await supabase
        .from("background_jobs")
        .update({
          progress: {
            total: totalPending,
            batch_size: batch.length,
            status: "processing",
          },
          status: "running",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    const results = {
      merged: 0,
      dismissed: 0,
      inconclusive: 0,
      errors: 0,
      processed: 0,
      total_pending: totalPending,
      details: [] as any[],
    };

    for (const pair of batch) {
      // Safety timeout check
      if (Date.now() - startTime > SAFETY_TIMEOUT_MS) {
        console.log("Safety timeout reached, stopping batch");
        break;
      }

      const keptId = pair.team_a_id;
      const removedId = pair.team_b_id;

      let retries = 0;
      let success = false;

      while (retries < MAX_RETRIES && !success) {
        try {
          // Call the existing run-team-merge-validation function internally
          const validationResponse = await fetch(
            `${supabaseUrl}/functions/v1/run-team-merge-validation`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
              },
              body: JSON.stringify({
                kept_team_id: keptId,
                removed_team_id: removedId,
                force_refresh: false,
                auto_merge_mode: true,
                strict_mode: false,
              }),
            }
          );

          if (validationResponse.status === 429) {
            retries++;
            console.log(`Rate limited on pair ${keptId}/${removedId}, retry ${retries}/${MAX_RETRIES} after ${RETRY_DELAY_MS / 1000}s`);
            if (retries < MAX_RETRIES) {
              await sleep(RETRY_DELAY_MS);
              continue;
            }
            // Max retries reached, mark as error
            results.errors++;
            results.details.push({
              team_a: pair.team_a_name,
              team_b: pair.team_b_name,
              result: "rate_limited",
            });
            success = true; // move on
            break;
          }

          if (!validationResponse.ok) {
            const errText = await validationResponse.text();
            console.error(`Validation failed for ${pair.team_a_name} / ${pair.team_b_name}:`, errText);
            results.errors++;
            results.details.push({
              team_a: pair.team_a_name,
              team_b: pair.team_b_name,
              result: "error",
              error: errText.slice(0, 200),
            });
            success = true;
            break;
          }

          const validationResult = await validationResponse.json();
          const decision = validationResult.decision;
          const confidence = validationResult.confidence_score || 0;
          const action = validationResult.recommended_action || validationResult.slug_suggestion?.recommended_action;

          if (decision === "SAME_TEAM" && confidence >= 85 && action === "auto_merge") {
            // Already merged by run-team-merge-validation with auto_merge_mode=true
            if (validationResult.merge_result && !validationResult.merge_result.error) {
              results.merged++;
              results.details.push({
                team_a: pair.team_a_name,
                team_b: pair.team_b_name,
                result: "merged",
                confidence,
              });
            } else if (validationResult.merge_result?.error) {
              // Merge was attempted but failed, try dismissing if different
              results.errors++;
              results.details.push({
                team_a: pair.team_a_name,
                team_b: pair.team_b_name,
                result: "merge_failed",
                error: validationResult.merge_result.error,
              });
            } else {
              // auto_merge criteria not met by the function but decision is SAME_TEAM
              // Try manual merge via RPC
              try {
                const { error: mergeErr } = await supabase.rpc("merge_teams", {
                  p_target_id: keptId,
                  p_source_id: removedId,
                  p_merged_by: user.id,
                });
                if (mergeErr) throw mergeErr;
                results.merged++;
                results.details.push({
                  team_a: pair.team_a_name,
                  team_b: pair.team_b_name,
                  result: "merged",
                  confidence,
                });
              } catch (mergeError: any) {
                console.error("Manual merge failed:", mergeError);
                results.errors++;
                results.details.push({
                  team_a: pair.team_a_name,
                  team_b: pair.team_b_name,
                  result: "merge_failed",
                  error: mergeError.message,
                });
              }
            }
          } else if (decision === "DIFFERENT_TEAM" && confidence >= 70) {
            // Dismiss this pair
            const [a, b] = [keptId, removedId].sort();
            await supabase.from("dismissed_duplicates").upsert(
              {
                team_a_id: a,
                team_b_id: b,
                dismissed_by: user.id,
                reason: `AI: ${decision} (${confidence}%)`,
              },
              { onConflict: "team_a_id,team_b_id" }
            );
            results.dismissed++;
            results.details.push({
              team_a: pair.team_a_name,
              team_b: pair.team_b_name,
              result: "dismissed",
              confidence,
            });
          } else {
            // Inconclusive
            results.inconclusive++;
            results.details.push({
              team_a: pair.team_a_name,
              team_b: pair.team_b_name,
              result: "inconclusive",
              decision,
              confidence,
            });
          }

          success = true;
        } catch (error: any) {
          retries++;
          console.error(`Error processing ${pair.team_a_name} / ${pair.team_b_name} (retry ${retries}):`, error);

          if (retries >= MAX_RETRIES) {
            results.errors++;
            results.details.push({
              team_a: pair.team_a_name,
              team_b: pair.team_b_name,
              result: "error",
              error: error.message?.slice(0, 200),
            });
            success = true;
          } else {
            await sleep(5000); // brief pause before retry
          }
        }
      }

      results.processed++;

      // Update job progress
      if (jobId) {
        await supabase
          .from("background_jobs")
          .update({
            progress: {
              ...results,
              status: "processing",
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }
    }

    // Remaining pending after this batch
    const remainingPending = totalPending - results.processed;

    // Finalize job if done
    if (jobId) {
      const jobStatus = remainingPending <= 0 ? "completed" : "running";
      await supabase
        .from("background_jobs")
        .update({
          progress: {
            ...results,
            remaining: remainingPending,
            status: remainingPending <= 0 ? "completed" : "has_more",
          },
          status: jobStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    return new Response(
      JSON.stringify({
        ...results,
        remaining: remainingPending,
        has_more: remainingPending > 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Auto-resolve error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
