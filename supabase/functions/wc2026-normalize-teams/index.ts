import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// EN duplicate slug -> PT canonical slug
const EN_TO_PT: Record<string, { slug: string; name: string }> = {
  sweden: { slug: "suecia", name: "Suécia" },
  norway: { slug: "noruega", name: "Noruega" },
  scotland: { slug: "escocia", name: "Escócia" },
  "czech-republic": { slug: "republica-tcheca", name: "República Tcheca" },
  "bosnia-herzegovina": { slug: "bosnia-herzegovina", name: "Bósnia e Herzegovina" }, // keep slug, rename
  "cape-verde-islands": { slug: "cabo-verde", name: "Cabo Verde" },
  curacao: { slug: "curacao", name: "Curaçao" },
  iraq: { slug: "iraque", name: "Iraque" },
  jordan: { slug: "jordania", name: "Jordânia" },
  haiti: { slug: "haiti", name: "Haiti" },
  "congo-dr": { slug: "rd-congo", name: "RD Congo" },
  uzbekistan: { slug: "uzbequistao", name: "Uzbequistão" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: any[] = [];
  for (const [enSlug, pt] of Object.entries(EN_TO_PT)) {
    const { data: en } = await supabase
      .from("world_cup_2026_teams")
      .select("*")
      .eq("slug", enSlug)
      .maybeSingle();
    if (!en) { results.push({ enSlug, status: "not-found" }); continue; }

    // Check if canonical PT slug already exists
    const { data: existing } = await supabase
      .from("world_cup_2026_teams")
      .select("id")
      .eq("slug", pt.slug)
      .maybeSingle();

    if (existing && existing.id !== en.id) {
      // Move players from EN to PT
      await supabase.from("world_cup_2026_players").update({ team_id: existing.id }).eq("team_id", en.id);
      // Merge external_team_id + coach if PT is missing them
      const { data: ptRow } = await supabase
        .from("world_cup_2026_teams").select("*").eq("id", existing.id).single();
      const patch: any = {};
      if (!ptRow?.external_team_id && en.external_team_id) patch.external_team_id = en.external_team_id;
      if (!ptRow?.coach_name && en.coach_name) patch.coach_name = en.coach_name;
      if (!ptRow?.coach_nationality && en.coach_nationality) patch.coach_nationality = en.coach_nationality;
      if (Object.keys(patch).length) {
        await supabase.from("world_cup_2026_teams").update(patch).eq("id", existing.id);
      }
      // Deactivate EN
      await supabase.from("world_cup_2026_teams").update({ is_active: false }).eq("id", en.id);
      results.push({ enSlug, status: "merged-into-existing", into: pt.slug });
    } else {
      // Rename EN row to PT slug+name in place
      await supabase
        .from("world_cup_2026_teams")
        .update({ slug: pt.slug, name: pt.name, updated_at: new Date().toISOString() })
        .eq("id", en.id);
      results.push({ enSlug, status: "renamed", to: pt.slug });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
