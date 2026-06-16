import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Você é um historiador especialista em futebol mundial, com foco em clubes brasileiros e sul-americanos.
Devolve SOMENTE JSON válido, sem comentários, sem markdown.
Regras absolutas:
- Use APENAS informações que tem certeza, com base em fontes confiáveis (Wikipedia, sites oficiais, federações).
- Se NÃO TEM CERTEZA de qual é o clube específico, devolve confidence:"low" e listas vazias. NUNCA invente títulos.
- Diferencie clubes com nomes parecidos pelo dossiê (estado, país, ligas disputadas).
- Não inclua amistosos, torneios juvenis ou Sub-20 a menos que seja explicitamente categoria de base.
- Nunca mencione apostas/odds.`;

type Dossier = {
  nome: string;
  pais: string | null;
  estado: string | null;
  short_code: string | null;
  api_id: number | null;
  total_matches: number;
  leagues: { nome: string; pais: string | null; years: string }[];
  first_match: string | null;
  last_match: string | null;
};

function buildPrompt(d: Dossier) {
  const leagueLines = d.leagues.length
    ? d.leagues.map((l) => `  - ${l.nome}${l.pais ? ` (${l.pais})` : ""} — anos: ${l.years}`).join("\n")
    : "  (sem registro de ligas no nosso banco)";

  return `DOSSIÊ DO CLUBE A IDENTIFICAR:
- Nome: ${d.nome}
- País: ${d.pais ?? "desconhecido"}
- Estado/UF: ${d.estado ?? "desconhecido"}
- Sigla: ${d.short_code ?? "—"}
- ID externo (API-Football/Football-Data): ${d.api_id ?? "—"}
- Total de partidas no nosso banco: ${d.total_matches}
- Primeira partida: ${d.first_match ?? "—"}
- Última partida: ${d.last_match ?? "—"}
- Ligas disputadas:
${leagueLines}

Use este dossiê para identificar o clube ESPECÍFICO. Existem muitos clubes com nomes parecidos —
se os dados acima não te dão certeza de qual clube é, devolve confidence:"low".

Devolva JSON com este schema EXATO:
{
  "confidence": "high" | "medium" | "low",
  "identified_as": string,            // nome canônico do clube que você identificou
  "profile": {
    "founded_year": number|null,
    "stadium_name": string|null,
    "stadium_capacity": number|null,
    "mascot": string|null,
    "nickname": string|null,
    "history_text": string,           // 2-3 parágrafos HTML <p>
    "stadium_text": string,
    "culture_text": string,
    "rivalries_text": string,
    "legacy_text": string
  },
  "titles": [
    {
      "competition_name": string,
      "competition_tier": "mundial"|"continental"|"nacional"|"regional"|"estadual"|"copa",
      "edition_year": number,
      "position": "campeão",
      "confederation": "FIFA"|"CONMEBOL"|"CBF"|"FERJ"|"FPF"|"FMF"|"FGF"|"FCF"|"FPF-PR"|"UEFA"|string|null,
      "source_url": string|null,      // URL de referência (Wikipedia/site oficial)
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

REGRAS DE TÍTULOS:
- Liste TODOS os títulos conhecidos do clube identificado.
- Para títulos estaduais brasileiros, use o nome oficial (ex: "Campeonato Carioca", "Campeonato Paulista") e a federação correta (FERJ, FPF, FMG, etc.).
- HTML apenas <p>, nada de <h1>/<h2>/<script>/<img>.
- Se confidence="low", devolva titles:[], participations:[] e textos curtos genéricos.`;
}

async function buildDossier(supabase: any, teamId: string): Promise<{ team: any; dossier: Dossier } | null> {
  const { data: team } = await supabase
    .from("times")
    .select("id, nome, pais, estado, short_code, api_id, slug, total_matches")
    .eq("id", teamId)
    .maybeSingle();
  if (!team) return null;

  // ligas disputadas
  const { data: leagueRows } = await supabase.rpc("get_team_leagues_history", { p_team_id: teamId }).maybeSingle?.() ?? { data: null };

  // fallback manual: buscar via partidas
  let leagues: Dossier["leagues"] = [];
  let firstMatch: string | null = null;
  let lastMatch: string | null = null;

  const { data: matches } = await supabase
    .from("partidas")
    .select("data, liga_id, ligas(nome, pais)")
    .or(`time_casa_id.eq.${teamId},time_fora_id.eq.${teamId}`)
    .order("data", { ascending: true })
    .limit(2000);

  if (matches && matches.length) {
    firstMatch = matches[0].data;
    lastMatch = matches[matches.length - 1].data;
    const map = new Map<string, { nome: string; pais: string | null; years: Set<number> }>();
    for (const m of matches) {
      const liga = (m as any).ligas;
      if (!liga?.nome) continue;
      const key = liga.nome;
      if (!map.has(key)) map.set(key, { nome: liga.nome, pais: liga.pais ?? null, years: new Set() });
      if (m.data) map.get(key)!.years.add(new Date(m.data).getUTCFullYear());
    }
    leagues = Array.from(map.values()).map((l) => {
      const ys = Array.from(l.years).sort();
      const years = ys.length > 4 ? `${ys[0]}–${ys[ys.length - 1]}` : ys.join(", ");
      return { nome: l.nome, pais: l.pais, years };
    });
  }

  return {
    team,
    dossier: {
      nome: team.nome,
      pais: team.pais,
      estado: team.estado,
      short_code: team.short_code,
      api_id: team.api_id,
      total_matches: team.total_matches ?? matches?.length ?? 0,
      leagues,
      first_match: firstMatch,
      last_match: lastMatch,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { team_id, team_slug, dry_run, model } = await req.json();
    if (!team_id && !team_slug) throw new Error("team_id or team_slug required");

    let resolvedId = team_id as string | null;
    if (!resolvedId) {
      const { data } = await supabase.from("times").select("id").eq("slug", team_slug).maybeSingle();
      resolvedId = data?.id ?? null;
    }
    if (!resolvedId) throw new Error("Team not found");

    const built = await buildDossier(supabase, resolvedId);
    if (!built) throw new Error("Team not found");
    const { team, dossier } = built;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: buildPrompt(dossier) },
        ],
        max_tokens: 5000,
        temperature: 0.2,
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`OpenAI ${aiRes.status}: ${t.slice(0, 400)}`);
    }

    const data = await aiRes.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const confidence = (parsed.confidence || "medium").toLowerCase();

    if (dry_run) {
      return new Response(JSON.stringify({ success: true, team, dossier, generated: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bloqueia escrita se confidence baixa
    if (confidence === "low") {
      return new Response(
        JSON.stringify({
          success: true,
          team_id: team.id,
          confidence: "low",
          identified_as: parsed.identified_as ?? null,
          titles_count: 0,
          participations_count: 0,
          skipped_reason: "low_confidence",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    if (Array.isArray(parsed.titles) && parsed.titles.length > 0) {
      await supabase.from("team_titles").delete().eq("team_id", team.id);
      const rows = parsed.titles.map((t: any) => ({
        team_id: team.id,
        competition_name: t.competition_name,
        competition_tier: t.competition_tier,
        edition_year: t.edition_year,
        position: t.position ?? "campeão",
        confederation: t.confederation ?? null,
        source_url: t.source_url ?? null,
        notes: t.notes ?? null,
      }));
      await supabase.from("team_titles").insert(rows);
    }

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

    // marca atualização no times.pillar_updated_at
    await supabase
      .from("times")
      .update({ pillar_updated_at: new Date().toISOString() })
      .eq("id", team.id);

    return new Response(
      JSON.stringify({
        success: true,
        team_id: team.id,
        confidence,
        identified_as: parsed.identified_as ?? team.nome,
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
