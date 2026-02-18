import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TeamReport {
  team_id: string;
  nome: string;
  slug: string | null;
  api_id: number | null;
  pais: string | null;
  escudo_url: string | null;
  total_matches: number;
  first_match_date: string | null;
  last_match_date: string | null;
  distinct_leagues: number;
  distinct_providers: number;
  stats: {
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
    avg_goals_for: number;
    avg_goals_against: number;
  };
  leagues: { league_id: string | null; league_name: string; count: number; pct: number }[];
  top_opponents: { team_id: string; team_name: string; count: number; pct: number }[];
  external_ids: { source_id: string; external_id: string; confidence: string }[];
  matches: MatchEntry[];
}

interface MatchEntry {
  match_id: string;
  data: string;
  liga_id: string | null;
  liga_nome: string | null;
  time_casa_id: string;
  time_casa_nome: string;
  time_fora_id: string;
  time_fora_nome: string;
  gols_casa: number | null;
  gols_fora: number | null;
  status: string;
  api_id: number | null;
  providers: { source_id: string; external_id: string }[];
}

interface SimilarityResult {
  similarity_score: number;
  risk_level: "baixo" | "medio" | "alto";
  recommendation_text: string;
  top_reasons: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Verify admin
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

    const { team_a_id, team_b_id, force_refresh } = await req.json();
    if (!team_a_id || !team_b_id) {
      return new Response(JSON.stringify({ error: "team_a_id and team_b_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache (normalized: smaller ID first)
    const cacheKeyA = team_a_id < team_b_id ? team_a_id : team_b_id;
    const cacheKeyB = team_a_id < team_b_id ? team_b_id : team_a_id;

    if (!force_refresh) {
      // Compute version hash to check if cache is valid
      const versionHash = await computeVersionHash(supabase, team_a_id, team_b_id);

      const { data: cached } = await supabase
        .from("team_merge_analysis_cache")
        .select("*")
        .eq("team_a_id", cacheKeyA)
        .eq("team_b_id", cacheKeyB)
        .single();

      if (cached && cached.data_version_hash === versionHash) {
        return new Response(JSON.stringify(cached.payload_json), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Generate full report
    const [reportA, reportB] = await Promise.all([
      generateTeamReport(supabase, team_a_id),
      generateTeamReport(supabase, team_b_id),
    ]);

    const similarity = computeSimilarity(reportA, reportB);

    const payload = {
      team_a: reportA,
      team_b: reportB,
      similarity,
      generated_at: new Date().toISOString(),
    };

    // Save cache
    const versionHash = await computeVersionHash(supabase, team_a_id, team_b_id);
    await supabase.from("team_merge_analysis_cache").upsert(
      {
        team_a_id: cacheKeyA,
        team_b_id: cacheKeyB,
        payload_json: payload,
        data_version_hash: versionHash,
        generated_at: new Date().toISOString(),
        created_by_user_id: user.id,
      },
      { onConflict: "team_a_id,team_b_id" }
    );

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function computeVersionHash(supabase: any, teamA: string, teamB: string): Promise<string> {
  const { count: countA } = await supabase
    .from("partidas")
    .select("*", { count: "exact", head: true })
    .or(`time_casa_id.eq.${teamA},time_fora_id.eq.${teamA}`);

  const { count: countB } = await supabase
    .from("partidas")
    .select("*", { count: "exact", head: true })
    .or(`time_casa_id.eq.${teamB},time_fora_id.eq.${teamB}`);

  const { data: lastA } = await supabase
    .from("partidas")
    .select("data")
    .or(`time_casa_id.eq.${teamA},time_fora_id.eq.${teamA}`)
    .order("data", { ascending: false })
    .limit(1)
    .single();

  const { data: lastB } = await supabase
    .from("partidas")
    .select("data")
    .or(`time_casa_id.eq.${teamB},time_fora_id.eq.${teamB}`)
    .order("data", { ascending: false })
    .limit(1)
    .single();

  return `${countA || 0}-${lastA?.data || "none"}-${countB || 0}-${lastB?.data || "none"}`;
}

async function fetchAllMatches(supabase: any, teamId: string) {
  // Paginate to get ALL matches (no limits)
  const PAGE_SIZE = 1000;
  let allMatches: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("partidas")
      .select(`
        id, data, liga_id, time_casa_id, time_fora_id, gols_casa, gols_fora, status, api_id,
        liga:ligas(nome),
        time_casa:times!partidas_time_casa_id_fkey(nome),
        time_fora:times!partidas_time_fora_id_fkey(nome)
      `)
      .or(`time_casa_id.eq.${teamId},time_fora_id.eq.${teamId}`)
      .order("data", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    allMatches = allMatches.concat(data || []);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  return allMatches;
}

async function generateTeamReport(supabase: any, teamId: string): Promise<TeamReport> {
  // Fetch team info
  const { data: team, error: teamError } = await supabase
    .from("times")
    .select("id, nome, slug, api_id, pais, escudo_url")
    .eq("id", teamId)
    .single();

  if (teamError) throw new Error(`Team not found: ${teamId}`);

  // Fetch ALL matches
  const matches = await fetchAllMatches(supabase, teamId);

  // Fetch external IDs for this team
  const { data: extIds } = await supabase
    .from("external_id_map")
    .select("source_id, external_id, confidence")
    .eq("entity_type", "team")
    .eq("internal_id", teamId);

  // Fetch external IDs for matches (batch by match IDs)
  const matchIds = matches.map((m: any) => m.id);
  let matchExtIds: any[] = [];
  if (matchIds.length > 0) {
    // Batch in chunks of 500
    for (let i = 0; i < matchIds.length; i += 500) {
      const chunk = matchIds.slice(i, i + 500);
      const { data } = await supabase
        .from("external_id_map")
        .select("internal_id, source_id, external_id")
        .eq("entity_type", "match")
        .in("internal_id", chunk);
      if (data) matchExtIds = matchExtIds.concat(data);
    }
  }

  // Build match ext IDs lookup
  const matchExtMap = new Map<string, { source_id: string; external_id: string }[]>();
  matchExtIds.forEach((e: any) => {
    const list = matchExtMap.get(e.internal_id) || [];
    list.push({ source_id: e.source_id, external_id: e.external_id });
    matchExtMap.set(e.internal_id, list);
  });

  // Build match entries
  const matchEntries: MatchEntry[] = matches.map((m: any) => ({
    match_id: m.id,
    data: m.data,
    liga_id: m.liga_id,
    liga_nome: m.liga?.nome || null,
    time_casa_id: m.time_casa_id,
    time_casa_nome: m.time_casa?.nome || "Desconhecido",
    time_fora_id: m.time_fora_id,
    time_fora_nome: m.time_fora?.nome || "Desconhecido",
    gols_casa: m.gols_casa,
    gols_fora: m.gols_fora,
    status: m.status,
    api_id: m.api_id,
    providers: matchExtMap.get(m.id) || [],
  }));

  // Compute stats
  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  const leagueCounts = new Map<string, { name: string; count: number }>();
  const opponentCounts = new Map<string, { name: string; count: number }>();
  const providerSet = new Set<string>();

  matches.forEach((m: any) => {
    const isHome = m.time_casa_id === teamId;
    const gH = m.gols_casa ?? 0;
    const gA = m.gols_fora ?? 0;

    if (m.status === "finished" && m.gols_casa !== null && m.gols_fora !== null) {
      if (isHome) {
        goalsFor += gH; goalsAgainst += gA;
        if (gH > gA) wins++; else if (gH === gA) draws++; else losses++;
      } else {
        goalsFor += gA; goalsAgainst += gH;
        if (gA > gH) wins++; else if (gA === gH) draws++; else losses++;
      }
    }

    // Leagues
    const leagueKey = m.liga_id || "__unknown__";
    const leagueName = m.liga?.nome || "Desconhecida";
    const lc = leagueCounts.get(leagueKey) || { name: leagueName, count: 0 };
    lc.count++;
    leagueCounts.set(leagueKey, lc);

    // Opponents
    const oppId = isHome ? m.time_fora_id : m.time_casa_id;
    const oppName = isHome ? (m.time_fora?.nome || "Desconhecido") : (m.time_casa?.nome || "Desconhecido");
    const oc = opponentCounts.get(oppId) || { name: oppName, count: 0 };
    oc.count++;
    opponentCounts.set(oppId, oc);

    // Providers from match ext IDs
    const mProviders = matchExtMap.get(m.id) || [];
    mProviders.forEach((p: any) => providerSet.add(p.source_id));
  });

  // Also add team-level providers
  (extIds || []).forEach((e: any) => providerSet.add(e.source_id));

  const totalFinished = wins + draws + losses;

  // Sort leagues by count desc
  const leaguesSorted = Array.from(leagueCounts.entries())
    .map(([id, v]) => ({ league_id: id === "__unknown__" ? null : id, league_name: v.name, count: v.count, pct: matches.length > 0 ? Math.round((v.count / matches.length) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  // Sort opponents by count desc, top 20
  const opponentsSorted = Array.from(opponentCounts.entries())
    .map(([id, v]) => ({ team_id: id, team_name: v.name, count: v.count, pct: matches.length > 0 ? Math.round((v.count / matches.length) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const dates = matches.map((m: any) => m.data).filter(Boolean).sort();

  return {
    team_id: team.id,
    nome: team.nome,
    slug: team.slug,
    api_id: team.api_id,
    pais: team.pais,
    escudo_url: team.escudo_url,
    total_matches: matches.length,
    first_match_date: dates[0] || null,
    last_match_date: dates[dates.length - 1] || null,
    distinct_leagues: leagueCounts.size - (leagueCounts.has("__unknown__") ? 1 : 0),
    distinct_providers: providerSet.size,
    stats: {
      wins,
      draws,
      losses,
      goals_for: goalsFor,
      goals_against: goalsAgainst,
      goal_difference: goalsFor - goalsAgainst,
      avg_goals_for: totalFinished > 0 ? Math.round((goalsFor / totalFinished) * 100) / 100 : 0,
      avg_goals_against: totalFinished > 0 ? Math.round((goalsAgainst / totalFinished) * 100) / 100 : 0,
    },
    leagues: leaguesSorted,
    top_opponents: opponentsSorted,
    external_ids: (extIds || []).map((e: any) => ({ source_id: e.source_id, external_id: e.external_id, confidence: e.confidence })),
    matches: matchEntries,
  };
}

function computeSimilarity(a: TeamReport, b: TeamReport): SimilarityResult {
  const reasons: string[] = [];
  let score = 50; // Start neutral

  // 1. League similarity (weight: 30)
  const leaguesA = new Set(a.leagues.filter(l => l.league_id).map(l => l.league_id));
  const leaguesB = new Set(b.leagues.filter(l => l.league_id).map(l => l.league_id));
  const leagueIntersection = [...leaguesA].filter(l => leaguesB.has(l));
  const leagueUnion = new Set([...leaguesA, ...leaguesB]);

  if (leagueUnion.size > 0) {
    const leagueSim = leagueIntersection.length / leagueUnion.size;
    score += (leagueSim - 0.5) * 60; // -30 to +30

    if (leagueIntersection.length === 0 && leaguesA.size > 0 && leaguesB.size > 0) {
      reasons.push("Nenhuma competição em comum");
      score -= 20; // Extra penalty
    } else if (leagueIntersection.length > 0) {
      reasons.push(`${leagueIntersection.length} competição(ões) em comum`);
    }
  } else {
    reasons.push("Sem dados de competição para comparar");
  }

  // 2. Opponent similarity (weight: 25)
  const oppsA = new Set(a.top_opponents.map(o => o.team_id));
  const oppsB = new Set(b.top_opponents.map(o => o.team_id));
  const oppIntersection = [...oppsA].filter(o => oppsB.has(o));
  const oppUnion = new Set([...oppsA, ...oppsB]);

  if (oppUnion.size > 0) {
    const oppSim = oppIntersection.length / oppUnion.size;
    score += (oppSim - 0.5) * 50; // -25 to +25

    if (oppIntersection.length === 0 && oppsA.size > 2 && oppsB.size > 2) {
      reasons.push("Adversários completamente diferentes");
    } else if (oppIntersection.length > 0) {
      reasons.push(`${oppIntersection.length} adversário(s) em comum`);
    }
  }

  // 3. Temporal overlap (weight: 15)
  if (a.first_match_date && b.first_match_date && a.last_match_date && b.last_match_date) {
    const aStart = new Date(a.first_match_date).getTime();
    const aEnd = new Date(a.last_match_date).getTime();
    const bStart = new Date(b.first_match_date).getTime();
    const bEnd = new Date(b.last_match_date).getTime();

    const overlapStart = Math.max(aStart, bStart);
    const overlapEnd = Math.min(aEnd, bEnd);
    const overlap = Math.max(0, overlapEnd - overlapStart);
    const totalSpan = Math.max(aEnd, bEnd) - Math.min(aStart, bStart);

    if (totalSpan > 0) {
      const temporalSim = overlap / totalSpan;
      score += (temporalSim - 0.5) * 30; // -15 to +15

      if (overlap === 0) {
        reasons.push("Intervalos de datas sem sobreposição");
      } else {
        const overlapYears = Math.round(overlap / (365.25 * 24 * 60 * 60 * 1000));
        if (overlapYears > 0) {
          reasons.push(`~${overlapYears} ano(s) de sobreposição temporal`);
        }
      }
    }
  } else {
    reasons.push("Dados temporais insuficientes");
  }

  // 4. External ID coherence (weight: 20 when available)
  const extIdsA = a.external_ids;
  const extIdsB = b.external_ids;
  if (extIdsA.length > 0 && extIdsB.length > 0) {
    // Check if same source has same external_id (strong proof)
    const mapA = new Map(extIdsA.map(e => [e.source_id, e.external_id]));
    let sharedSource = false;
    let sameId = false;
    for (const eb of extIdsB) {
      if (mapA.has(eb.source_id)) {
        sharedSource = true;
        if (mapA.get(eb.source_id) === eb.external_id) {
          sameId = true;
        }
      }
    }
    if (sameId) {
      score += 25;
      reasons.push("ID externo idêntico no mesmo provider (forte evidência de duplicidade)");
    } else if (sharedSource) {
      score -= 20;
      reasons.push("Mesmo provider com IDs diferentes (evidência contra duplicidade)");
    }
  }

  // 5. Provider distribution (weight: 10)
  if (a.distinct_providers > 0 && b.distinct_providers > 0) {
    const provA = new Set(a.external_ids.map(e => e.source_id));
    const provB = new Set(b.external_ids.map(e => e.source_id));
    const provOverlap = [...provA].filter(p => provB.has(p)).length;
    if (provOverlap === 0 && provA.size > 0 && provB.size > 0) {
      score -= 5;
      reasons.push("Providers de dados completamente diferentes");
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Risk triggers
  let risk_level: "baixo" | "medio" | "alto";
  if (leaguesA.size > 0 && leaguesB.size > 0 && leagueIntersection.length === 0) {
    risk_level = "alto";
    if (!reasons.includes("Nenhuma competição em comum")) {
      reasons.unshift("Nenhuma competição em comum");
    }
    score = Math.min(score, 35);
  } else if (score >= 70) {
    risk_level = "baixo";
  } else if (score >= 40) {
    risk_level = "medio";
  } else {
    risk_level = "alto";
  }

  let recommendation_text: string;
  if (risk_level === "baixo") {
    recommendation_text = "Provável duplicidade — competições e adversários compatíveis.";
  } else if (risk_level === "medio") {
    recommendation_text = "Risco moderado — verifique manualmente as competições e adversários antes de decidir.";
  } else {
    recommendation_text = "Alto risco de serem times diferentes — fusão não recomendada sem verificação externa.";
  }

  // Data insufficiency check
  if (a.total_matches < 3 || b.total_matches < 3) {
    recommendation_text = "Dados insuficientes para conclusão segura — poucos jogos registrados.";
    if (!reasons.includes("Poucos jogos para análise confiável")) {
      reasons.push("Poucos jogos para análise confiável");
    }
  }

  return {
    similarity_score: score,
    risk_level,
    recommendation_text,
    top_reasons: reasons.slice(0, 8),
  };
}
