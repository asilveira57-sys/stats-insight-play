import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate admin
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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // default true

    // Get orphan teams via RPC
    const { data: orphans, error: orphanError } = await adminClient.rpc(
      "get_teams_without_matches"
    );
    if (orphanError) throw orphanError;

    // Filter: only teams with NO aliases AND NO external IDs are safe to disable
    const safeToDisable = (orphans || []).filter(
      (t: any) => !t.has_aliases && !t.has_external_ids
    );

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          total_orphans: orphans?.length || 0,
          safe_to_disable: safeToDisable.length,
          kept_with_aliases: (orphans || []).filter((t: any) => t.has_aliases).length,
          kept_with_external_ids: (orphans || []).filter((t: any) => t.has_external_ids).length,
          teams: safeToDisable.map((t: any) => ({
            id: t.id,
            nome: t.nome,
            slug: t.slug,
            created_at: t.created_at,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute: disable orphan teams
    const disabledIds = safeToDisable.map((t: any) => t.id);
    let disabledCount = 0;

    if (disabledIds.length > 0) {
      const { error: updateError, count } = await adminClient
        .from("times")
        .update({ status: "disabled" as any })
        .in("id", disabledIds);

      if (updateError) throw updateError;
      disabledCount = count || disabledIds.length;
    }

    // Log the action
    await adminClient.from("sync_logs").insert({
      entity_type: "cleanup_orphan_teams",
      status: "completed",
      details: {
        disabled_count: disabledCount,
        team_names: safeToDisable.map((t: any) => t.nome),
        executed_by: user.id,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        dry_run: false,
        disabled_count: disabledCount,
        team_names: safeToDisable.map((t: any) => t.nome),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in cleanup-orphan-teams:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
