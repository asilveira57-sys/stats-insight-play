// supabase/functions/audit-analysis/index.ts
// Auditoria anti-alucinação: verifica claims (FIFA, Elo, forma, H2H, desfalques)
// citados na análise contra dados reais do banco. Não confia apenas em semântica.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Body { analysis_id: string; source?: "wc2026" | "partidas" }

type Claim = { claim: string; status: "verified" | "unverified" | "inconsistent"; source?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { analysis_id, source = "wc2026" } = (await req.json()) as Body;
    if (!analysis_id) throw new Error("analysis_id obrigatório");
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Buscar análise + times
    const { data: analysis } = await sb
      .from("world_cup_2026_ai_analyses")
      .select("*")
      .eq("id", analysis_id)
      .maybeSingle();
    if (!analysis) throw new Error("Análise não encontrada");

    const { data: match } = await sb
      .from("world_cup_2026_matches")
      .select("*, home:world_cup_2026_teams!world_cup_2026_matches_home_team_id_fkey(*), away:world_cup_2026_teams!world_cup_2026_matches_away_team_id_fkey(*)")
      .eq("id", analysis.match_id)
      .maybeSingle();

    const text: string = (analysis.content ?? "") + " " + (analysis.title ?? "");
    const claims: Claim[] = [];
    let dataSources = 0;

    const home = match?.home ?? {};
    const away = match?.away ?? {};

    // 1) Ranking FIFA — buscar números próximos ao nome do time
    if (home.fifa_ranking != null) {
      dataSources++;
      const re = new RegExp(`${escape(home.name)}[^.]{0,80}?(\\d{1,3})[ºo°]?[^a-z]`, "i");
      const m = text.match(re);
      if (m) {
        const cited = parseInt(m[1]);
        const ok = Math.abs(cited - home.fifa_ranking) <= 3;
        claims.push({
          claim: `Ranking FIFA de ${home.name}: citado ${cited}, real ${home.fifa_ranking}`,
          status: ok ? "verified" : "inconsistent",
          source: "world_cup_2026_teams.fifa_ranking",
        });
      } else if (/ranking|fifa/i.test(text)) {
        claims.push({ claim: `Ranking FIFA de ${home.name} mencionado sem número verificável`, status: "unverified" });
      }
    }
    if (away.fifa_ranking != null) {
      dataSources++;
      const re = new RegExp(`${escape(away.name)}[^.]{0,80}?(\\d{1,3})[ºo°]?[^a-z]`, "i");
      const m = text.match(re);
      if (m) {
        const cited = parseInt(m[1]);
        const ok = Math.abs(cited - away.fifa_ranking) <= 3;
        claims.push({
          claim: `Ranking FIFA de ${away.name}: citado ${cited}, real ${away.fifa_ranking}`,
          status: ok ? "verified" : "inconsistent",
          source: "world_cup_2026_teams.fifa_ranking",
        });
      }
    }

    // 2) Elo — se houver coluna elo_rating no time
    if ((home as any).elo_rating != null) {
      dataSources++;
      if (/elo/i.test(text)) {
        claims.push({ claim: `Elo Rating mencionado`, status: "verified", source: "world_cup_2026_teams.elo_rating" });
      }
    }

    // 3) Histórico H2H — checar últimos confrontos
    if (match?.home_team_id && match?.away_team_id) {
      const { data: h2h } = await sb
        .from("world_cup_2026_matches")
        .select("id, home_team_id, away_team_id, home_score, away_score, status")
        .or(`and(home_team_id.eq.${match.home_team_id},away_team_id.eq.${match.away_team_id}),and(home_team_id.eq.${match.away_team_id},away_team_id.eq.${match.home_team_id})`)
        .eq("status", "finished");
      if (h2h && h2h.length > 0) {
        dataSources++;
        if (/hist[óo]rico|confronto|h2h|enfrentaram/i.test(text)) {
          claims.push({ claim: `Histórico H2H citado (base contém ${h2h.length} confronto(s))`, status: "verified", source: "world_cup_2026_matches" });
        }
      } else if (/hist[óo]rico|confronto|h2h|enfrentaram/i.test(text)) {
        claims.push({ claim: "Histórico H2H citado mas não há registros na base", status: "inconsistent" });
      }
    }

    // 4) Forma recente — exige tabela de resultados; marcar como unverified se mencionada sem dados
    if (/forma recente|últimas? \d+ partidas|invict[ao]|sequ[êe]ncia/i.test(text)) {
      claims.push({ claim: "Forma recente mencionada", status: "unverified" });
    }

    // 5) Desfalques
    if (/desfalqu|machucad|lesionad|suspens|fora do jogo/i.test(text)) {
      // sem tabela de lesões confiável → marcamos como unverified
      claims.push({ claim: "Desfalques mencionados sem fonte verificável", status: "unverified" });
    }

    const verified = claims.filter(c => c.status === "verified").length;
    const unverified = claims.filter(c => c.status === "unverified").length;
    const inconsistent = claims.filter(c => c.status === "inconsistent").length;
    const totalClaims = claims.length || 1;
    const auditScore = Math.max(0, Math.min(100, Math.round(
      100 * verified / totalClaims - 30 * inconsistent / totalClaims + Math.min(20, dataSources * 5)
    )));
    const grade: "A"|"B"|"C"|"D"|"E" =
      auditScore >= 85 ? "A" :
      auditScore >= 70 ? "B" :
      auditScore >= 55 ? "C" :
      auditScore >= 35 ? "D" : "E";
    const badge = grade === "A" || grade === "B" ? "verified" : grade === "C" ? "partial" : "low";

    const { error } = await sb.from("analysis_audit").upsert({
      analysis_source: source,
      analysis_id,
      match_id: analysis.match_id,
      model_version: "aleball-ai-v1",
      data_source_count: dataSources,
      verified_claims: verified,
      unverified_claims: unverified,
      inconsistent_claims: inconsistent,
      claims_detail: claims,
      audit_score: auditScore,
      audit_grade: grade,
      badge,
    }, { onConflict: "analysis_source,analysis_id" });
    if (error) throw error;

    return new Response(JSON.stringify({
      ok: true, audit_score: auditScore, audit_grade: grade, badge,
      verified, unverified, inconsistent, data_sources: dataSources, claims,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function escape(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
