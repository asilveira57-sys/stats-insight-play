import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SampleGame {
  match_id: string;
  data: string;
  liga_nome: string | null;
  mandante: string;
  visitante: string;
  gols_casa: number | null;
  gols_fora: number | null;
  context: string; // "oldest" | "newest" | "notable_opponent" | "unusual_score"
}

interface SearchEvidence {
  game: SampleGame;
  status: "verified_strong" | "verified_medium" | "not_verified" | "conflict";
  links: { url: string; title: string; snippet: string }[];
  summary: string;
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
    const { kept_team_id, removed_team_id, force_refresh, auto_merge_mode, strict_mode } = body;

    if (!kept_team_id || !removed_team_id) {
      return new Response(JSON.stringify({ error: "kept_team_id and removed_team_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache
    if (!force_refresh) {
      const { data: existing } = await supabase
        .from("team_merge_validation_runs")
        .select("*")
        .eq("kept_team_id", kept_team_id)
        .eq("removed_team_id", removed_team_id)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        return new Response(JSON.stringify(existing), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create validation run record
    const { data: run, error: runError } = await supabase
      .from("team_merge_validation_runs")
      .insert({
        kept_team_id,
        removed_team_id,
        created_by_user_id: user.id,
        search_provider_used: "firecrawl",
        ai_model_used: "openai/gpt-4o-mini",
      })
      .select()
      .single();

    if (runError) throw runError;

    // Fetch teams
    const [{ data: teamA }, { data: teamB }] = await Promise.all([
      supabase.from("times").select("id, nome, slug, pais").eq("id", kept_team_id).single(),
      supabase.from("times").select("id, nome, slug, pais").eq("id", removed_team_id).single(),
    ]);

    if (!teamA || !teamB) throw new Error("Teams not found");

    // Fetch matches for both teams (all, for sampling)
    const [matchesA, matchesB] = await Promise.all([
      fetchFinishedMatches(supabase, kept_team_id),
      fetchFinishedMatches(supabase, removed_team_id),
    ]);

    // Generate smart samples
    const sampleA = selectSmartSample(matchesA, kept_team_id, teamA.nome);
    const sampleB = selectSmartSample(matchesB, removed_team_id, teamB.nome);

    // Search external evidence via Firecrawl
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY not configured");
    }

    const allSamples = [
      ...sampleA.map(s => ({ ...s, team: "A", teamName: teamA.nome })),
      ...sampleB.map(s => ({ ...s, team: "B", teamName: teamB.nome })),
    ];

    const evidenceResults: SearchEvidence[] = [];
    
    // Search for each sample game (limit to 20 page opens total)
    let totalSearches = 0;
    const MAX_SEARCHES = 20;

    for (const sample of allSamples) {
      if (totalSearches >= MAX_SEARCHES) break;

      const queries = buildSearchQueries(sample);
      let bestResults: { url: string; title: string; snippet: string }[] = [];
      let verified = false;

      for (const query of queries) {
        if (totalSearches >= MAX_SEARCHES) break;
        totalSearches++;

        try {
          const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: 5,
              lang: "pt",
              country: "BR",
            }),
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const results = searchData.data || searchData.results || [];
            
            for (const r of results.slice(0, 3)) {
              bestResults.push({
                url: r.url || "",
                title: r.title || "",
                snippet: r.description || r.markdown?.slice(0, 200) || "",
              });
            }

            // Check if any result mentions the match
            const combinedText = bestResults.map(r => `${r.title} ${r.snippet}`).join(" ").toLowerCase();
            if (combinedText.includes(sample.mandante.toLowerCase()) || 
                combinedText.includes(sample.visitante.toLowerCase())) {
              verified = true;
            }
          }
        } catch (e) {
          console.error("Search error:", e);
        }
      }

      const hasStrongEvidence = bestResults.length >= 2 && verified;
      const hasMediumEvidence = bestResults.length >= 1 && verified;

      evidenceResults.push({
        game: sample,
        status: hasStrongEvidence ? "verified_strong" : hasMediumEvidence ? "verified_medium" : "not_verified",
        links: bestResults.slice(0, 3),
        summary: verified
          ? `Jogo confirmado em ${bestResults.length} fonte(s)`
          : `Sem confirmação externa encontrada`,
      });
    }

    // Build aggregation summaries for AI
    const leaguesA = [...new Set(matchesA.map(m => m.liga_nome).filter(Boolean))];
    const leaguesB = [...new Set(matchesB.map(m => m.liga_nome).filter(Boolean))];
    const topOppsA = getTopOpponents(matchesA, kept_team_id, 10);
    const topOppsB = getTopOpponents(matchesB, removed_team_id, 10);

    // Call OpenAI API for analysis
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const aiPrompt = buildAIPrompt(
      teamA, teamB, sampleA, sampleB, evidenceResults,
      leaguesA, leaguesB, topOppsA, topOppsB, strict_mode
    );

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a football data analyst. Respond ONLY with valid JSON, no markdown." },
          { role: "user", content: aiPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "team_identity_analysis",
            description: "Analyze whether two team records represent the same football club",
            parameters: {
              type: "object",
              properties: {
                decision: { type: "string", enum: ["SAME_TEAM", "DIFFERENT_TEAM", "INCONCLUSIVE"] },
                confidence_score: { type: "number", minimum: 0, maximum: 100 },
                reasons: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 3,
                  maxItems: 7,
                },
                team_a_identity: {
                  type: "object",
                  properties: {
                    most_common_name: { type: "string" },
                    city: { type: "string" },
                    state: { type: "string" },
                    country: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low", "unknown"] },
                  },
                  required: ["most_common_name", "confidence"],
                },
                team_b_identity: {
                  type: "object",
                  properties: {
                    most_common_name: { type: "string" },
                    city: { type: "string" },
                    state: { type: "string" },
                    country: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low", "unknown"] },
                  },
                  required: ["most_common_name", "confidence"],
                },
                suggested_canonical_slug: { type: "string" },
                suggested_aliases: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["decision", "confidence_score", "reasons", "team_a_identity", "team_b_identity"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "team_identity_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (aiResponse.status === 402) {
        throw new Error("AI credits exhausted. Please add credits.");
      }
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let analysis: any;

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        analysis = typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      } else {
        // Fallback: try parsing content
        const content = aiData.choices?.[0]?.message?.content || "";
        analysis = JSON.parse(content.replace(/```json\n?|```/g, "").trim());
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      analysis = {
        decision: "INCONCLUSIVE",
        confidence_score: 30,
        reasons: ["Não foi possível analisar a resposta da IA"],
        team_a_identity: { most_common_name: teamA.nome, confidence: "unknown" },
        team_b_identity: { most_common_name: teamB.nome, confidence: "unknown" },
      };
    }

    // Determine risk level
    let riskLevel = "medio";
    if (analysis.decision === "SAME_TEAM" && analysis.confidence_score >= 80) riskLevel = "baixo";
    else if (analysis.decision === "DIFFERENT_TEAM" && analysis.confidence_score >= 70) riskLevel = "alto";
    else if (analysis.confidence_score < 40) riskLevel = "alto";

    // Determine action
    const strongVerifiedA = evidenceResults.filter(e => e.game.team === "A" && e.status === "verified_strong").length;
    const strongVerifiedB = evidenceResults.filter(e => e.game.team === "B" && e.status === "verified_strong").length;

    let recommendedAction = "manual_review";
    if (
      analysis.decision === "SAME_TEAM" &&
      analysis.confidence_score >= 85 &&
      strongVerifiedA >= 3 &&
      strongVerifiedB >= 3
    ) {
      recommendedAction = "auto_merge";
    } else if (
      analysis.decision === "DIFFERENT_TEAM" &&
      analysis.confidence_score >= 80
    ) {
      recommendedAction = "block";
    }

    if (strict_mode && recommendedAction === "auto_merge" && analysis.confidence_score < 95) {
      recommendedAction = "manual_review";
    }

    // Build slug suggestion
    const slugSuggestion = {
      canonical_slug: analysis.suggested_canonical_slug || teamA.slug,
      aliases: [
        teamA.nome,
        teamB.nome,
        ...(analysis.suggested_aliases || []),
      ].filter((v, i, a) => a.indexOf(v) === i),
    };

    // Update the validation run
    const updatedRun = {
      finished_at: new Date().toISOString(),
      decision: analysis.decision,
      confidence_score: analysis.confidence_score,
      risk_level: riskLevel,
      reasons_json: analysis.reasons,
      evidence_json: evidenceResults.map(e => ({
        ...e,
        game: { ...e.game, team: undefined }, // clean up
      })),
      sample_games_json: allSamples,
      slug_suggestion: {
        ...slugSuggestion,
        team_a_identity: analysis.team_a_identity,
        team_b_identity: analysis.team_b_identity,
        recommended_action: recommendedAction,
      },
    };

    await supabase
      .from("team_merge_validation_runs")
      .update(updatedRun)
      .eq("id", run.id);

    // If auto_merge_mode is on and criteria met, execute merge
    let mergeResult = null;
    if (auto_merge_mode && recommendedAction === "auto_merge") {
      try {
        const { data: mergeData, error: mergeError } = await supabase.rpc("merge_teams", {
          p_target_id: kept_team_id,
          p_source_id: removed_team_id,
          p_merged_by: user.id,
        });

        if (mergeError) throw mergeError;

        // Save alias for old name
        await supabase.from("team_aliases").insert([
          {
            team_id: kept_team_id,
            alias: teamB.nome,
            normalized_alias: teamB.nome.toLowerCase().replace(/\s+/g, " ").trim(),
            source: "merge_validation",
            confidence: 100,
          },
        ]).onConflict("DO NOTHING" as any);

        // Record merge decision
        await supabase.from("team_merge_decisions").insert({
          kept_team_id,
          removed_team_id,
          similarity_score: analysis.confidence_score,
          risk_level: riskLevel,
          decision_reason: "validacao_externa_automatica",
          decision_reason_detail: analysis.reasons.join("; "),
          validation_run_id: run.id,
          decision_source: "auto",
          decided_by_user_id: user.id,
        });

        mergeResult = mergeData;
      } catch (e) {
        console.error("Auto-merge failed:", e);
        mergeResult = { error: e.message };
      }
    }

    const response = {
      ...run,
      ...updatedRun,
      recommended_action: recommendedAction,
      merge_result: mergeResult,
      team_a_name: teamA.nome,
      team_b_name: teamB.nome,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Validation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---- Helper Functions ----

async function fetchFinishedMatches(supabase: any, teamId: string) {
  const PAGE_SIZE = 1000;
  let all: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("partidas")
      .select(`
        id, data, gols_casa, gols_fora, status,
        liga:ligas(nome),
        time_casa:times!partidas_time_casa_id_fkey(id, nome),
        time_fora:times!partidas_time_fora_id_fkey(id, nome)
      `)
      .or(`time_casa_id.eq.${teamId},time_fora_id.eq.${teamId}`)
      .eq("status", "finished")
      .order("data", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    all = all.concat(data || []);
    hasMore = (data?.length || 0) === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  return all.map(m => ({
    ...m,
    liga_nome: m.liga?.nome || null,
    mandante: m.time_casa?.nome || "?",
    visitante: m.time_fora?.nome || "?",
    time_casa_id: m.time_casa?.id,
    time_fora_id: m.time_fora?.id,
  }));
}

function selectSmartSample(matches: any[], teamId: string, teamName: string): SampleGame[] {
  if (matches.length === 0) return [];

  const sorted = [...matches].sort((a, b) => a.data.localeCompare(b.data));
  const selected: SampleGame[] = [];
  const usedIds = new Set<string>();

  const addGame = (m: any, context: string) => {
    if (usedIds.has(m.id)) return;
    usedIds.add(m.id);
    selected.push({
      match_id: m.id,
      data: m.data,
      liga_nome: m.liga_nome,
      mandante: m.mandante,
      visitante: m.visitante,
      gols_casa: m.gols_casa,
      gols_fora: m.gols_fora,
      context,
    });
  };

  // 2 oldest
  sorted.slice(0, 2).forEach(m => addGame(m, "oldest"));
  // 2 newest
  sorted.slice(-2).forEach(m => addGame(m, "newest"));

  // 1-2 with unusual score (blowout)
  const blowouts = sorted.filter(m => {
    const diff = Math.abs((m.gols_casa || 0) - (m.gols_fora || 0));
    return diff >= 3 && !usedIds.has(m.id);
  });
  blowouts.slice(0, 2).forEach(m => addGame(m, "unusual_score"));

  // 1-2 with well-known competition
  const knownComps = sorted.filter(m =>
    m.liga_nome && !usedIds.has(m.id) &&
    /copa|champions|libertadores|mundial|brasileir|premier|la liga|serie a|bundesliga/i.test(m.liga_nome)
  );
  knownComps.slice(0, 2).forEach(m => addGame(m, "notable_competition"));

  // Fill to at least 5 with random middle games
  if (selected.length < 5 && sorted.length > 4) {
    const middle = sorted.slice(
      Math.floor(sorted.length * 0.3),
      Math.floor(sorted.length * 0.7)
    );
    for (const m of middle) {
      if (selected.length >= 8) break;
      addGame(m, "representative");
    }
  }

  return selected.slice(0, 8);
}

function buildSearchQueries(sample: SampleGame & { teamName: string }): string[] {
  const date = sample.data;
  const home = sample.mandante;
  const away = sample.visitante;
  const league = sample.liga_nome || "";
  const score = sample.gols_casa !== null ? `${sample.gols_casa}-${sample.gols_fora}` : "";

  const queries = [
    `${home} ${away} ${date} ${league} ${score}`.trim(),
    `${home} ${away} ${date}`.trim(),
  ];
  if (league) {
    queries.push(`${home} ${away} ${league}`.trim());
  }
  return queries.slice(0, 3);
}

function getTopOpponents(matches: any[], teamId: string, limit: number) {
  const counts = new Map<string, { name: string; count: number }>();
  for (const m of matches) {
    const isHome = m.time_casa_id === teamId;
    const oppName = isHome ? m.visitante : m.mandante;
    const c = counts.get(oppName) || { name: oppName, count: 0 };
    c.count++;
    counts.set(oppName, c);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([name, v]) => name);
}

function buildAIPrompt(
  teamA: any, teamB: any,
  sampleA: SampleGame[], sampleB: SampleGame[],
  evidence: SearchEvidence[],
  leaguesA: string[], leaguesB: string[],
  topOppsA: string[], topOppsB: string[],
  strictMode: boolean
): string {
  const evidenceA = evidence.filter(e => (e.game as any).team === "A");
  const evidenceB = evidence.filter(e => (e.game as any).team === "B");

  return `Analyze whether two database records represent the SAME football club or DIFFERENT clubs.

TEAM A (kept): "${teamA.nome}" (slug: ${teamA.slug || "none"}, country: ${teamA.pais || "unknown"})
- Leagues: ${leaguesA.join(", ") || "unknown"}
- Top opponents: ${topOppsA.join(", ") || "unknown"}
- Sample games verified:
${evidenceA.map(e => `  [${e.status}] ${e.game.data} ${e.game.mandante} vs ${e.game.visitante} (${e.game.liga_nome || "?"}) ${e.game.gols_casa ?? "?"}-${e.game.gols_fora ?? "?"} | Sources: ${e.links.map(l => l.title).join("; ") || "none"}`).join("\n")}

TEAM B (removed): "${teamB.nome}" (slug: ${teamB.slug || "none"}, country: ${teamB.pais || "unknown"})
- Leagues: ${leaguesB.join(", ") || "unknown"}
- Top opponents: ${topOppsB.join(", ") || "unknown"}
- Sample games verified:
${evidenceB.map(e => `  [${e.status}] ${e.game.data} ${e.game.mandante} vs ${e.game.visitante} (${e.game.liga_nome || "?"}) ${e.game.gols_casa ?? "?"}-${e.game.gols_fora ?? "?"} | Sources: ${e.links.map(l => l.title).join("; ") || "none"}`).join("\n")}

INSTRUCTIONS:
- Determine if A and B are the SAME club (name variations, data splits) or DIFFERENT clubs (same name, different city/country).
- Consider: league overlap, opponent overlap, temporal continuity, verified evidence.
- A club can have gaps in data and still be the same club.
- ${strictMode ? "STRICT MODE: be conservative, prefer INCONCLUSIVE over SAME_TEAM when evidence is weak." : "Standard mode."}
- Infer city/state/country ONLY if evidence supports it. Otherwise say "unknown".
- Suggest a canonical slug and alias list for the merged entity.`;
}
