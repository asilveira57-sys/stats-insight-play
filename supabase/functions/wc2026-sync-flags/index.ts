import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// slug -> ISO-2 (FlagCDN codes; supports gb-eng / gb-sct subdivisions)
const SLUG_TO_ISO2: Record<string, string> = {
  brasil: "br", argentina: "ar", alemanha: "de", franca: "fr", espanha: "es",
  italia: "it", inglaterra: "gb-eng", portugal: "pt", "paises-baixos": "nl",
  belgica: "be", suica: "ch", croacia: "hr", dinamarca: "dk", polonia: "pl",
  servia: "rs", ucrania: "ua", austria: "at", turquia: "tr",
  scotland: "gb-sct", norway: "no", sweden: "se", "czech-republic": "cz",
  "bosnia-herzegovina": "ba",
  mexico: "mx", "estados-unidos": "us", canada: "ca", "costa-rica": "cr",
  panama: "pa", haiti: "ht", curacao: "cw",
  uruguai: "uy", paraguai: "py", chile: "cl", colombia: "co", equador: "ec",
  peru: "pe", bolivia: "bo", venezuela: "ve",
  japao: "jp", "coreia-do-sul": "kr", australia: "au", ira: "ir",
  "arabia-saudita": "sa", catar: "qa", iraq: "iq", jordan: "jo", uzbekistan: "uz",
  "nova-zelandia": "nz",
  "africa-do-sul": "za", argelia: "dz", marrocos: "ma", tunisia: "tn",
  egito: "eg", camaroes: "cm", senegal: "sn", nigeria: "ng", gana: "gh",
  "costa-do-marfim": "ci", "cape-verde-islands": "cv", "congo-dr": "cd",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: teams, error } = await supabase
    .from("world_cup_2026_teams")
    .select("id, slug, country_code, flag_url")
    .neq("is_active", false);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let updated = 0, skipped = 0, missing: string[] = [];
  for (const t of teams ?? []) {
    const iso = SLUG_TO_ISO2[t.slug];
    if (!iso) { missing.push(t.slug); skipped++; continue; }
    const flag = `https://flagcdn.com/w320/${iso}.png`;
    const cc = t.country_code || iso.toUpperCase().replace("GB-", "");
    const { error: upErr } = await supabase
      .from("world_cup_2026_teams")
      .update({ flag_url: flag, country_code: cc, updated_at: new Date().toISOString() })
      .eq("id", t.id);
    if (!upErr) updated++;
  }

  return new Response(JSON.stringify({ updated, skipped, missing, total: teams?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
