import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Manual search hints (PT -> API-Football English name) for tricky cases
const SEARCH_HINTS: Record<string, string> = {
  "alemanha": "Germany",
  "arabia-saudita": "Saudi Arabia",
  "argelia": "Algeria",
  "africa-do-sul": "South Africa",
  "australia": "Australia",
  "austria": "Austria",
  "belgica": "Belgium",
  "bolivia": "Bolivia",
  "brasil": "Brazil",
  "camaroes": "Cameroon",
  "canada": "Canada",
  "catar": "Qatar",
  "chile": "Chile",
  "colombia": "Colombia",
  "coreia-do-sul": "South Korea",
  "costa-do-marfim": "Ivory Coast",
  "costa-rica": "Costa Rica",
  "croacia": "Croatia",
  "dinamarca": "Denmark",
  "egito": "Egypt",
  "equador": "Ecuador",
  "espanha": "Spain",
  "estados-unidos": "USA",
  "franca": "France",
  "gana": "Ghana",
  "inglaterra": "England",
  "ira": "Iran",
  "italia": "Italy",
  "japao": "Japan",
  "marrocos": "Morocco",
  "mexico": "Mexico",
  "nigeria": "Nigeria",
  "nova-zelandia": "New Zealand",
  "paises-baixos": "Netherlands",
  "panama": "Panama",
  "paraguai": "Paraguay",
  "peru": "Peru",
  "polonia": "Poland",
  "portugal": "Portugal",
  "senegal": "Senegal",
  "servia": "Serbia",
  "suica": "Switzerland",
  "tunisia": "Tunisia",
  "turquia": "Turkey",
  "ucrania": "Ukraine",
  "uruguai": "Uruguay",
  "venezuela": "Venezuela",
  "argentina": "Argentina",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const apiKey = Deno.env.get("API_FOOTBALL_KEY");

  const { data: logRow } = await supabase.from("world_cup_2026_sync_logs").insert({
    sync_type: "resolve_ids", provider: "api-football", status: "running",
  }).select().single();
  const logId = logRow?.id;

  try {
    if (!apiKey) throw new Error("API_FOOTBALL_KEY ausente");

    const { data: teams } = await supabase.from("world_cup_2026_teams")
      .select("id,slug,name,external_team_id")
      .eq("is_active", true)
      .is("external_team_id", null);

    if (!teams?.length) {
      await supabase.from("world_cup_2026_sync_logs").update({
        status: "success", finished_at: new Date().toISOString(), records_processed: 0,
        payload_snapshot: { message: "Nada a resolver" },
      }).eq("id", logId);
      return new Response(JSON.stringify({ success: true, resolved: 0, message: "Nada a resolver" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[resolve-ids] ${teams.length} seleções sem external_team_id`);
    let resolved = 0;
    const failures: string[] = [];

    for (const t of teams) {
      const hint = SEARCH_HINTS[t.slug] ?? t.name;
      try {
        // National teams require country=World OR direct search by name
        const url = `https://v3.football.api-sports.io/teams?name=${encodeURIComponent(hint)}`;
        const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });
        if (!res.ok) {
          console.error(`[resolve-ids] ${t.slug} HTTP ${res.status}`);
          failures.push(`${t.slug}: HTTP ${res.status}`);
          continue;
        }
        const json = await res.json();
        // Prefer national_team / country=World
        const candidates = (json?.response ?? []) as any[];
        const nat = candidates.find((c) => c?.team?.national === true) ?? candidates[0];
        const externalId = nat?.team?.id;
        if (!externalId) {
          console.warn(`[resolve-ids] ${t.slug} sem resultado para "${hint}"`);
          failures.push(`${t.slug}: sem match`);
          continue;
        }
        await supabase.from("world_cup_2026_teams")
          .update({ external_team_id: externalId })
          .eq("id", t.id);
        resolved++;
        console.log(`[resolve-ids] ${t.slug} -> ${externalId} (${hint})`);
        // light rate limit
        await new Promise((r) => setTimeout(r, 200));
      } catch (inner) {
        const msg = inner instanceof Error ? inner.message : String(inner);
        console.error(`[resolve-ids] ${t.slug} erro`, msg);
        failures.push(`${t.slug}: ${msg}`);
      }
    }

    await supabase.from("world_cup_2026_sync_logs").update({
      status: "success", finished_at: new Date().toISOString(), records_processed: resolved,
      payload_snapshot: { resolved, attempted: teams.length, failures },
    }).eq("id", logId);

    return new Response(JSON.stringify({ success: true, resolved, attempted: teams.length, failures }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[resolve-ids] ERROR", msg);
    await supabase.from("world_cup_2026_sync_logs").update({
      status: "error", finished_at: new Date().toISOString(), error_message: msg,
    }).eq("id", logId);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
