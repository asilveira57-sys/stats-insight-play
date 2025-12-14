import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const footballDataApiKey = Deno.env.get("FOOTBALL_DATA_API_KEY");
    const apiFootballKey = Deno.env.get("API_FOOTBALL_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sourceId, entityType } = await req.json();

    console.log(`Starting sync for source: ${sourceId}, entity: ${entityType}`);

    // Get source details
    const { data: source, error: sourceError } = await supabase
      .from("data_sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError || !source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    if (source.status !== "active") {
      return new Response(
        JSON.stringify({ success: false, message: "Source not active" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limits
    const today = new Date().toISOString().split("T")[0];
    if (source.last_reset_date !== today) {
      // Reset daily counter
      await supabase
        .from("data_sources")
        .update({ requests_today: 0, last_reset_date: today })
        .eq("id", source.id);
      source.requests_today = 0;
    }

    if (source.requests_today >= (source.rate_limit_per_day || 1000)) {
      return new Response(
        JSON.stringify({ success: false, message: "Daily rate limit exceeded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create sync log
    const { data: syncLog } = await supabase
      .from("sync_logs")
      .insert({
        source_id: source.id,
        entity_type: entityType || "matches",
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    let result = { processed: 0, created: 0, updated: 0, failed: 0, requestsMade: 0 };

    try {
      switch (source.name) {
        case "football-data.org":
          result = await syncFootballData(supabase, source, footballDataApiKey, entityType);
          break;
        case "api-football":
          result = await syncApiFootball(supabase, source, apiFootballKey, entityType);
          break;
        case "scorebat":
          // Redirect to dedicated sync-highlights function
          const highlightsResponse = await supabase.functions.invoke("sync-highlights");
          result = highlightsResponse.data || { processed: 0, created: 0, updated: 0, failed: 0, requestsMade: 1 };
          break;
        default:
          console.log(`No sync handler for source: ${source.name}`);
      }

      // Update sync log
      if (syncLog) {
        await supabase
          .from("sync_logs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            items_processed: result.processed,
            items_created: result.created,
            items_updated: result.updated,
            items_failed: result.failed,
            requests_made: result.requestsMade,
          })
          .eq("id", syncLog.id);
      }

      // Update source request count
      await supabase
        .from("data_sources")
        .update({
          requests_today: (source.requests_today || 0) + result.requestsMade,
          updated_at: new Date().toISOString(),
        })
        .eq("id", source.id);

    } catch (syncError: unknown) {
      console.error("Sync error:", syncError);
      const errorMessage = syncError instanceof Error ? syncError.message : "Unknown error";
      
      if (syncLog) {
        await supabase
          .from("sync_logs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: errorMessage,
          })
          .eq("id", syncLog.id);
      }

      throw syncError;
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in sync-hub-data:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function syncFootballData(
  supabase: any,
  source: any,
  apiKey: string | undefined,
  entityType: string
) {
  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_API_KEY not configured");
  }

  const headers = { "X-Auth-Token": apiKey };
  const baseUrl = source.base_url || "https://api.football-data.org/v4";
  let requestsMade = 0;
  let processed = 0;
  let created = 0;
  let updated = 0;
  let failed = 0;

  // Sync active leagues
  const { data: leagues } = await supabase
    .from("ligas")
    .select("*")
    .eq("ativa", true)
    .eq("api_source", "football-data");

  if (!leagues || leagues.length === 0) {
    console.log("No active football-data leagues found");
    return { processed: 0, created: 0, updated: 0, failed: 0, requestsMade: 0 };
  }

  for (const league of leagues) {
    if (!league.codigo_api) continue;

    try {
      // Fetch matches for this competition
      const matchesUrl = `${baseUrl}/competitions/${league.codigo_api}/matches`;
      console.log(`Fetching matches from: ${matchesUrl}`);
      
      const response = await fetch(matchesUrl, { headers });
      requestsMade++;

      if (!response.ok) {
        console.error(`Error fetching matches for ${league.nome}: ${response.status}`);
        failed++;
        continue;
      }

      const data = await response.json();
      const matches = data.matches || [];

      console.log(`Found ${matches.length} matches for ${league.nome}`);

      for (const match of matches) {
        try {
          // Find or create home team
          let homeTeamId = await findOrCreateTeam(supabase, source.id, match.homeTeam);
          let awayTeamId = await findOrCreateTeam(supabase, source.id, match.awayTeam);

          // Upsert match
          const matchDate = new Date(match.utcDate);
          const { error: matchError } = await supabase
            .from("partidas")
            .upsert(
              {
                api_id: match.id,
                liga_id: league.id,
                time_casa_id: homeTeamId,
                time_fora_id: awayTeamId,
                data: matchDate.toISOString().split("T")[0],
                hora: matchDate.toISOString().split("T")[1].substring(0, 5),
                status: mapMatchStatus(match.status),
                gols_casa: match.score?.fullTime?.home,
                gols_fora: match.score?.fullTime?.away,
                rodada: match.matchday,
              },
              { onConflict: "api_id" }
            );

          if (matchError) {
            console.error("Error upserting match:", matchError);
            failed++;
          } else {
            processed++;
            created++;
          }
        } catch (err) {
          console.error("Error processing match:", err);
          failed++;
        }
      }

      // Rate limit delay (10 req/min for free tier)
      await new Promise((resolve) => setTimeout(resolve, 6000));
    } catch (err) {
      console.error(`Error syncing league ${league.nome}:`, err);
      failed++;
    }
  }

  return { processed, created, updated, failed, requestsMade };
}

async function syncApiFootball(
  supabase: any,
  source: any,
  apiKey: string | undefined,
  entityType: string
) {
  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY not configured");
  }

  const headers = {
    "x-rapidapi-host": "v3.football.api-sports.io",
    "x-rapidapi-key": apiKey,
  };
  const baseUrl = source.base_url || "https://v3.football.api-sports.io";
  let requestsMade = 0;
  let processed = 0;
  let created = 0;
  let updated = 0;
  let failed = 0;

  // Sync leagues that use api-football
  const { data: leagues } = await supabase
    .from("ligas")
    .select("*")
    .eq("ativa", true)
    .eq("api_source", "api-football");

  if (!leagues || leagues.length === 0) {
    console.log("No active api-football leagues found");
    return { processed: 0, created: 0, updated: 0, failed: 0, requestsMade: 0 };
  }

  for (const league of leagues) {
    if (!league.api_id) continue;

    try {
      // Get current season
      const currentYear = new Date().getFullYear();
      const season = currentYear;

      // Fetch fixtures
      const fixturesUrl = `${baseUrl}/fixtures?league=${league.api_id}&season=${season}`;
      console.log(`Fetching fixtures from: ${fixturesUrl}`);

      const response = await fetch(fixturesUrl, { headers });
      requestsMade++;

      if (!response.ok) {
        console.error(`Error fetching fixtures for ${league.nome}: ${response.status}`);
        failed++;
        continue;
      }

      const data = await response.json();
      const fixtures = data.response || [];

      console.log(`Found ${fixtures.length} fixtures for ${league.nome}`);

      for (const fixture of fixtures) {
        try {
          // Find or create teams
          let homeTeamId = await findOrCreateTeamApiFootball(supabase, source.id, fixture.teams.home);
          let awayTeamId = await findOrCreateTeamApiFootball(supabase, source.id, fixture.teams.away);

          // Upsert match
          const matchDate = new Date(fixture.fixture.date);
          const { error: matchError } = await supabase
            .from("partidas")
            .upsert(
              {
                api_id: fixture.fixture.id,
                liga_id: league.id,
                time_casa_id: homeTeamId,
                time_fora_id: awayTeamId,
                data: matchDate.toISOString().split("T")[0],
                hora: matchDate.toISOString().split("T")[1].substring(0, 5),
                status: mapApiFootballStatus(fixture.fixture.status.short),
                gols_casa: fixture.goals.home,
                gols_fora: fixture.goals.away,
                rodada: fixture.league.round ? parseInt(fixture.league.round.match(/\d+/)?.[0] || "0") : null,
              },
              { onConflict: "api_id" }
            );

          if (matchError) {
            console.error("Error upserting match:", matchError);
            failed++;
          } else {
            processed++;
            created++;
          }
        } catch (err) {
          console.error("Error processing fixture:", err);
          failed++;
        }
      }

      // Rate limit delay (be conservative with free tier)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`Error syncing league ${league.nome}:`, err);
      failed++;
    }
  }

  return { processed, created, updated, failed, requestsMade };
}

async function findOrCreateTeam(supabase: any, sourceId: string, teamData: any) {
  if (!teamData?.id) return null;

  // Check external ID map first
  const { data: mapping } = await supabase
    .from("external_id_map")
    .select("internal_id")
    .eq("source_id", sourceId)
    .eq("entity_type", "team")
    .eq("external_id", teamData.id.toString())
    .single();

  if (mapping) return mapping.internal_id;

  // Try to find by name
  const { data: existingTeam } = await supabase
    .from("times")
    .select("id")
    .ilike("nome", teamData.name)
    .single();

  if (existingTeam) {
    // Create mapping
    await supabase.from("external_id_map").insert({
      source_id: sourceId,
      entity_type: "team",
      external_id: teamData.id.toString(),
      internal_id: existingTeam.id,
      confidence: "high",
    });
    return existingTeam.id;
  }

  // Create new team
  const { data: newTeam } = await supabase
    .from("times")
    .insert({
      nome: teamData.name,
      escudo_url: teamData.crest,
      api_id: teamData.id,
    })
    .select()
    .single();

  if (newTeam) {
    // Create mapping
    await supabase.from("external_id_map").insert({
      source_id: sourceId,
      entity_type: "team",
      external_id: teamData.id.toString(),
      internal_id: newTeam.id,
      confidence: "exact",
    });
    return newTeam.id;
  }

  return null;
}

async function findOrCreateTeamApiFootball(supabase: any, sourceId: string, teamData: any) {
  if (!teamData?.id) return null;

  // Check external ID map first
  const { data: mapping } = await supabase
    .from("external_id_map")
    .select("internal_id")
    .eq("source_id", sourceId)
    .eq("entity_type", "team")
    .eq("external_id", teamData.id.toString())
    .single();

  if (mapping) return mapping.internal_id;

  // Try to find by name
  const { data: existingTeam } = await supabase
    .from("times")
    .select("id")
    .ilike("nome", teamData.name)
    .single();

  if (existingTeam) {
    // Create mapping
    await supabase.from("external_id_map").insert({
      source_id: sourceId,
      entity_type: "team",
      external_id: teamData.id.toString(),
      internal_id: existingTeam.id,
      confidence: "high",
    });
    return existingTeam.id;
  }

  // Create new team
  const { data: newTeam } = await supabase
    .from("times")
    .insert({
      nome: teamData.name,
      escudo_url: teamData.logo,
      api_id: teamData.id,
    })
    .select()
    .single();

  if (newTeam) {
    // Create mapping
    await supabase.from("external_id_map").insert({
      source_id: sourceId,
      entity_type: "team",
      external_id: teamData.id.toString(),
      internal_id: newTeam.id,
      confidence: "exact",
    });
    return newTeam.id;
  }

  return null;
}

function mapMatchStatus(status: string): string {
  const statusMap: Record<string, string> = {
    SCHEDULED: "scheduled",
    TIMED: "scheduled",
    IN_PLAY: "live",
    PAUSED: "live",
    FINISHED: "finished",
    POSTPONED: "postponed",
    CANCELLED: "cancelled",
    SUSPENDED: "postponed",
  };
  return statusMap[status] || "scheduled";
}

function mapApiFootballStatus(status: string): string {
  const statusMap: Record<string, string> = {
    TBD: "scheduled",
    NS: "scheduled",
    "1H": "live",
    HT: "live",
    "2H": "live",
    ET: "live",
    P: "live",
    FT: "finished",
    AET: "finished",
    PEN: "finished",
    PST: "postponed",
    CANC: "cancelled",
    ABD: "cancelled",
    AWD: "finished",
    WO: "finished",
  };
  return statusMap[status] || "scheduled";
}
