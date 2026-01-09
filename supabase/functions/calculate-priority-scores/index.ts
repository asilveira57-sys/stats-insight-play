import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeagueScoreFactors {
  structural_relevance: number;
  seo_potential: number;
  match_volume: number;
  engagement: number;
}

interface TeamScoreFactors {
  popularity: number;
  frequency: number;
  performance: number;
  engagement: number;
}

// Known league priorities (Brazilian leagues prioritized)
const LEAGUE_BASE_SCORES: Record<string, number> = {
  'BSA': 95,   // Brasileirão Série A
  'BSB': 90,   // Brasileirão Série B
  'CLI': 88,   // Libertadores
  'CSA': 82,   // Copa Sul-Americana
  'PL': 85,    // Premier League
  'PD': 85,    // La Liga
  'BL1': 80,   // Bundesliga
  'SA': 80,    // Serie A
  'FL1': 75,   // Ligue 1
  'CL': 92,    // Champions League
  'EL': 78,    // Europa League
  'WC': 98,    // World Cup
  'EC': 95,    // Euro
};

const STRUCTURAL_RELEVANCE: Record<string, number> = {
  'BSA': 100, 'BSB': 90, 'CLI': 95, 'CSA': 80,
  'PL': 95, 'PD': 95, 'BL1': 85, 'SA': 85, 'FL1': 80,
  'CL': 100, 'EL': 75, 'WC': 100, 'EC': 95,
};

const SEO_POTENTIAL: Record<string, number> = {
  'BSA': 100, 'BSB': 75, 'CLI': 85, 'CSA': 60,
  'PL': 95, 'PD': 90, 'BL1': 80, 'SA': 80, 'FL1': 70,
  'CL': 100, 'EL': 65, 'WC': 100, 'EC': 90,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { target } = await req.json().catch(() => ({ target: 'all' }));

    const results = {
      leagues_updated: 0,
      teams_updated: 0,
      errors: [] as string[],
    };

    // Calculate league scores
    if (target === 'all' || target === 'leagues') {
      const { data: leagues, error: leaguesError } = await supabase
        .from('ligas')
        .select('id, codigo_api, nome');

      if (leaguesError) {
        results.errors.push(`Failed to fetch leagues: ${leaguesError.message}`);
      } else if (leagues) {
        for (const league of leagues) {
          try {
            // Get match count for this league (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const { count: recentMatches } = await supabase
              .from('partidas')
              .select('*', { count: 'exact', head: true })
              .eq('liga_id', league.id)
              .gte('data', thirtyDaysAgo.toISOString().split('T')[0]);

            // Get upcoming matches (next 14 days)
            const fourteenDaysAhead = new Date();
            fourteenDaysAhead.setDate(fourteenDaysAhead.getDate() + 14);
            
            const { count: upcomingMatches } = await supabase
              .from('partidas')
              .select('*', { count: 'exact', head: true })
              .eq('liga_id', league.id)
              .eq('status', 'scheduled')
              .lte('data', fourteenDaysAhead.toISOString().split('T')[0]);

            const codigoApi = league.codigo_api || '';
            
            // Calculate factors
            const structuralRelevance = STRUCTURAL_RELEVANCE[codigoApi] || 50;
            const seoPotential = SEO_POTENTIAL[codigoApi] || 50;
            const matchVolume = Math.min(100, ((recentMatches || 0) + (upcomingMatches || 0)) * 2);
            const engagement = 50; // Base engagement, would be updated with real analytics

            const factors: LeagueScoreFactors = {
              structural_relevance: structuralRelevance,
              seo_potential: seoPotential,
              match_volume: matchVolume,
              engagement: engagement,
            };

            // Calculate weighted score
            const priorityScore = Math.round(
              structuralRelevance * 0.35 +
              seoPotential * 0.30 +
              matchVolume * 0.20 +
              engagement * 0.15
            );

            await supabase
              .from('ligas')
              .update({
                priority_score: priorityScore,
                score_factors: factors,
                score_updated_at: new Date().toISOString(),
              })
              .eq('id', league.id);

            results.leagues_updated++;
          } catch (err) {
            results.errors.push(`League ${league.nome}: ${err}`);
          }
        }
      }
    }

    // Calculate team scores
    if (target === 'all' || target === 'teams') {
      const { data: teams, error: teamsError } = await supabase
        .from('times')
        .select('id, nome, api_id');

      if (teamsError) {
        results.errors.push(`Failed to fetch teams: ${teamsError.message}`);
      } else if (teams) {
        for (const team of teams) {
          try {
            // Get recent matches (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const { data: recentMatches } = await supabase
              .from('partidas')
              .select('gols_casa, gols_fora, time_casa_id, time_fora_id, status')
              .or(`time_casa_id.eq.${team.id},time_fora_id.eq.${team.id}`)
              .gte('data', thirtyDaysAgo.toISOString().split('T')[0])
              .eq('status', 'finished')
              .limit(10);

            // Calculate performance score based on recent results
            let wins = 0, draws = 0, losses = 0;
            if (recentMatches) {
              for (const match of recentMatches) {
                const isHome = match.time_casa_id === team.id;
                const teamGoals = isHome ? match.gols_casa : match.gols_fora;
                const opponentGoals = isHome ? match.gols_fora : match.gols_casa;
                
                if (teamGoals !== null && opponentGoals !== null) {
                  if (teamGoals > opponentGoals) wins++;
                  else if (teamGoals === opponentGoals) draws++;
                  else losses++;
                }
              }
            }

            const totalMatches = wins + draws + losses;
            const performanceScore = totalMatches > 0
              ? Math.round(((wins * 3 + draws) / (totalMatches * 3)) * 100)
              : 50;

            // Frequency score based on number of matches
            const frequencyScore = Math.min(100, (totalMatches || 0) * 10);

            // Popularity score - base estimate (could be enhanced with analytics)
            // Larger teams tend to have more API appearances
            const { count: totalHistoricalMatches } = await supabase
              .from('partidas')
              .select('*', { count: 'exact', head: true })
              .or(`time_casa_id.eq.${team.id},time_fora_id.eq.${team.id}`);

            const popularityScore = Math.min(100, Math.round(Math.sqrt((totalHistoricalMatches || 0)) * 5));

            const factors: TeamScoreFactors = {
              popularity: popularityScore,
              frequency: frequencyScore,
              performance: performanceScore,
              engagement: 50, // Base engagement
            };

            // Calculate weighted score
            const priorityScore = Math.round(
              popularityScore * 0.30 +
              frequencyScore * 0.25 +
              performanceScore * 0.25 +
              50 * 0.20 // engagement placeholder
            );

            await supabase
              .from('times')
              .update({
                priority_score: priorityScore,
                score_factors: factors,
                score_updated_at: new Date().toISOString(),
              })
              .eq('id', team.id);

            results.teams_updated++;
          } catch (err) {
            results.errors.push(`Team ${team.nome}: ${err}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
