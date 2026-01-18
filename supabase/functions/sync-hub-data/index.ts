import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Normalize a name: remove accents, trim, lowercase, collapse multiple spaces
 */
function normalizeName(str: string): string {
  if (!str) return '';
  const normalized = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return normalized.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Generate a URL-friendly slug from a string
 */
function slugify(str: string): string {
  if (!str) return '';
  let slug = normalizeName(str);
  slug = slug.replace(/\s/g, '-');
  slug = slug.replace(/[^a-z0-9-]/g, '');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-+|-+$/g, '');
  return slug;
}

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
          const highlightsResponse = await supabase.functions.invoke("sync-highlights");
          result = highlightsResponse.data || { processed: 0, created: 0, updated: 0, failed: 0, requestsMade: 1 };
          break;
        default:
          console.log(`No sync handler for source: ${source.name}`);
      }

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

/**
 * Resolve team using canonical SQL function resolve_or_create_team
 * Priority: external_id_map → slug → normalized name → create
 */
async function resolveTeam(
  supabase: any, 
  sourceId: string, 
  teamData: { id?: number; name: string; crest?: string; logo?: string }
): Promise<string | null> {
  if (!teamData?.name) {
    console.error("Cannot resolve team: missing name");
    return null;
  }

  const externalId = teamData.id?.toString() || null;
  const escudoUrl = teamData.crest || teamData.logo || null;

  try {
    // Use the canonical SQL function
    const { data: teamId, error } = await supabase.rpc("resolve_or_create_team", {
      p_nome: teamData.name,
      p_api_id: teamData.id || null,
      p_escudo_url: escudoUrl,
      p_pais: null,
      p_provider_id: sourceId,
      p_external_id: externalId,
    });

    if (error) {
      console.error("Error resolving team via RPC:", error);
      return null;
    }

    console.log(`Resolved team "${teamData.name}" → ${teamId}`);
    return teamId;
  } catch (err) {
    console.error("Exception resolving team:", err);
    return null;
  }
}

/**
 * Resolve match using canonical SQL function resolve_or_create_match
 * Priority: slug (home-vs-away-date) → create
 */
async function resolveMatch(
  supabase: any,
  params: {
    homeTeamId: string;
    awayTeamId: string;
    date: string;
    hora?: string;
    ligaId?: string;
    rodada?: number;
    status?: string;
    apiId?: number;
  }
): Promise<string | null> {
  if (!params.homeTeamId || !params.awayTeamId || !params.date) {
    console.error("Cannot resolve match: missing homeTeamId, awayTeamId, or date");
    return null;
  }

  try {
    const { data: matchId, error } = await supabase.rpc("resolve_or_create_match", {
      p_time_casa_id: params.homeTeamId,
      p_time_fora_id: params.awayTeamId,
      p_data: params.date,
      p_hora: params.hora || null,
      p_liga_id: params.ligaId || null,
      p_rodada: params.rodada || null,
      p_status: params.status || "scheduled",
      p_api_id: params.apiId || null,
    });

    if (error) {
      console.error("Error resolving match via RPC:", error);
      return null;
    }

    console.log(`Resolved match ${params.homeTeamId} vs ${params.awayTeamId} on ${params.date} → ${matchId}`);
    return matchId;
  } catch (err) {
    console.error("Exception resolving match:", err);
    return null;
  }
}

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
          // Validate team names before processing
          if (!match.homeTeam?.name || !match.awayTeam?.name) {
            console.warn(`Skipping match ${match.id}: missing team names`);
            failed++;
            continue;
          }

          // Resolve teams using canonical system
          const homeTeamId = await resolveTeam(supabase, source.id, match.homeTeam);
          const awayTeamId = await resolveTeam(supabase, source.id, match.awayTeam);

          if (!homeTeamId || !awayTeamId) {
            console.error(`Failed to resolve teams for match ${match.id}`);
            failed++;
            continue;
          }

          // Resolve/create match using canonical system
          const matchDate = new Date(match.utcDate);
          const matchId = await resolveMatch(supabase, {
            homeTeamId,
            awayTeamId,
            date: matchDate.toISOString().split("T")[0],
            hora: matchDate.toISOString().split("T")[1].substring(0, 5),
            ligaId: league.id,
            rodada: match.matchday,
            status: mapMatchStatus(match.status),
            apiId: match.id,
          });

          if (!matchId) {
            console.error(`Failed to resolve match ${match.id}`);
            failed++;
            continue;
          }

          // Update match scores if available
          if (match.score?.fullTime?.home !== null || match.score?.fullTime?.away !== null) {
            await supabase
              .from("partidas")
              .update({
                gols_casa: match.score?.fullTime?.home,
                gols_fora: match.score?.fullTime?.away,
                status: mapMatchStatus(match.status),
              })
              .eq("id", matchId);
          }

          processed++;
          created++;
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
      const currentYear = new Date().getFullYear();
      const season = currentYear;

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
          // Validate team names before processing
          if (!fixture.teams?.home?.name || !fixture.teams?.away?.name) {
            console.warn(`Skipping fixture ${fixture.fixture.id}: missing team names`);
            failed++;
            continue;
          }

          // Resolve teams using canonical system
          const homeTeamId = await resolveTeam(supabase, source.id, {
            id: fixture.teams.home.id,
            name: fixture.teams.home.name,
            logo: fixture.teams.home.logo,
          });
          const awayTeamId = await resolveTeam(supabase, source.id, {
            id: fixture.teams.away.id,
            name: fixture.teams.away.name,
            logo: fixture.teams.away.logo,
          });

          if (!homeTeamId || !awayTeamId) {
            console.error(`Failed to resolve teams for fixture ${fixture.fixture.id}`);
            failed++;
            continue;
          }

          // Resolve/create match using canonical system
          const matchDate = new Date(fixture.fixture.date);
          const matchId = await resolveMatch(supabase, {
            homeTeamId,
            awayTeamId,
            date: matchDate.toISOString().split("T")[0],
            hora: matchDate.toISOString().split("T")[1].substring(0, 5),
            ligaId: league.id,
            rodada: fixture.league.round ? parseInt(fixture.league.round.match(/\d+/)?.[0] || "0") : undefined,
            status: mapApiFootballStatus(fixture.fixture.status.short),
            apiId: fixture.fixture.id,
          });

          if (!matchId) {
            console.error(`Failed to resolve fixture ${fixture.fixture.id}`);
            failed++;
            continue;
          }

          // Update match scores if available
          if (fixture.goals.home !== null || fixture.goals.away !== null) {
            await supabase
              .from("partidas")
              .update({
                gols_casa: fixture.goals.home,
                gols_fora: fixture.goals.away,
                status: mapApiFootballStatus(fixture.fixture.status.short),
              })
              .eq("id", matchId);
          }

          processed++;
          created++;
        } catch (err) {
          console.error("Error processing fixture:", err);
          failed++;
        }
      }

      // Rate limit delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`Error syncing league ${league.nome}:`, err);
      failed++;
    }
  }

  return { processed, created, updated, failed, requestsMade };
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
