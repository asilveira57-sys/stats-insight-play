import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Você é um historiador de futebol brasileiro. Devolve SOMENTE JSON válido, sem comentários.
Use APENAS informações que tem certeza. Quando não souber, devolve array vazio ou null. Não invente títulos.`;

function buildPrompt(team: { nome: string; pais: string | null }) {
  return `Gere o currículo histórico do clube "${team.nome}"${team.pais ? ` (${team.pais})` : ""}.

Devolva JSON com este schema EXATO:
{
  "profile": {
    "founded_year": number|null,
    "stadium_name": string|null,
    "stadium_capacity": number|null,
    "mascot": string|null,
    "nickname": string|null,
    "history_text": string,           // 2-3 parágrafos HTML <p>
    "stadium_text": string,           // 1-2 parágrafos HTML <p>
    "culture_text": string,           // 1-2 parágrafos HTML <p>
    "rivalries_text": string,         // 1-2 parágrafos HTML <p>
    "legacy_text": string             // 1-2 parágrafos HTML <p>
  },
  "titles": [
    {
      "competition_name": string,
      "competition_tier": "mundial"|"continental"|"nacional"|"regional"|"estadual"|"copa",
      "edition_year": number,
      "position": "campeão",
      "confederation": "FIFA"|"CONMEBOL"|"CBF"|"FERJ"|"FPF"|null,
      "notes": string|null
    }
  ],
  "participations": [
    {
      "competition_name": string,
      "competition_tier": "mundial"|"continental"|"nacional"|"regional"|"estadual"|"copa",
      "year_from": number|null,
      "year_to": number|null,
      "total_editions": number|null,
      "notes": string|null
    }
  ]
}

REGRAS:
- Liste TODOS os títulos conhecidos (estaduais, nacionais, continentais, mundiais, copas).
- Não invente. Se não souber nada do clube, devolve arrays vazios e textos curtos genéricos.
- HTML apenas <p>, nada de <h1>/<h2>/<script>.
- Nunca mencione apostas/odds.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { team_id, team_slug, dry_run } = await req.json();
    if (!team_id && !team_slug) throw new Error("team_id or team_slug required");

    const q = supabase.from("times").select("id, nome, pais, slug").limit(1);
    const { data: teams, error: tErr } = team_id
      ? await q.eq("id", team_id)
      : await q.eq("slug", team_slug);
    if (tErr) throw tErr;
    const team = teams?.[0];
    if (!team) throw new Error("Team not found");

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: buildPrompt(team) },
        ],
        max_tokens: 4000,
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`OpenAI ${aiRes.status}: ${t.slice(0, 300)}`);
    }

    const data = await aiRes.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    if (dry_run) {
      return new Response(JSON.stringify({ success: true, team, generated: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert profile
    if (parsed.profile) {
      const p = parsed.profile;
      await supabase.from("team_profiles").upsert(
        {
          team_id: team.id,
          founded_year: p.founded_year ?? null,
          stadium_name: p.stadium_name ?? null,
          stadium_capacity: p.stadium_capacity ?? null,
          mascot: p.mascot ?? null,
          nickname: p.nickname ?? null,
          history_text: p.history_text ?? null,
          stadium_text: p.stadium_text ?? null,
          culture_text: p.culture_text ?? null,
          rivalries_text: p.rivalries_text ?? null,
          legacy_text: p.legacy_text ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "team_id" }
      );
    }

    // Replace titles
    if (Array.isArray(parsed.titles) && parsed.titles.length > 0) {
      await supabase.from("team_titles").delete().eq("team_id", team.id);
      const rows = parsed.titles.map((t: any) => ({
        team_id: team.id,
        competition_name: t.competition_name,
        competition_tier: t.competition_tier,
        edition_year: t.edition_year,
        position: t.position ?? "campeão",
        confederation: t.confederation ?? null,
        notes: t.notes ?? null,
      }));
      await supabase.from("team_titles").insert(rows);
    }

    // Replace participations
    if (Array.isArray(parsed.participations) && parsed.participations.length > 0) {
      await supabase.from("team_participations").delete().eq("team_id", team.id);
      const rows = parsed.participations.map((p: any) => ({
        team_id: team.id,
        competition_name: p.competition_name,
        competition_tier: p.competition_tier,
        year_from: p.year_from ?? null,
        year_to: p.year_to ?? null,
        total_editions: p.total_editions ?? null,
        notes: p.notes ?? null,
      }));
      await supabase.from("team_participations").insert(rows);
    }

    return new Response(
      JSON.stringify({
        success: true,
        team_id: team.id,
        titles_count: parsed.titles?.length ?? 0,
        participations_count: parsed.participations?.length ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-team-curriculum error", err);
    return new Response(JSON.stringify({ success: false, error: String((err as Error).message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
