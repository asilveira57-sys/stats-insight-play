import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OpenFootballMatch {
  date: string
  team1: string
  team2: string
  score?: { ft?: number[] }
  round?: string
}

interface OpenFootballRound {
  name: string
  matches: OpenFootballMatch[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { league, season } = await req.json()
    
    console.log(`[OpenFootball] Starting sync for ${league} ${season}`)

    // Get OpenFootball source
    const { data: source } = await supabase
      .from('data_sources')
      .select('*')
      .eq('name', 'openfootball')
      .single()

    if (!source || source.status !== 'active') {
      throw new Error('OpenFootball source not found or inactive')
    }

    // Create sync log
    const { data: syncLog, error: logError } = await supabase
      .from('sync_logs')
      .insert({
        source_id: source.id,
        entity_type: 'matches',
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (logError) {
      console.error('[OpenFootball] Error creating sync log:', logError)
    }

    // OpenFootball GitHub raw URLs - try multiple URL formats
    const urls = getOpenFootballUrls(league, season)
    
    let data: any = null
    let successUrl = ''
    
    for (const url of urls) {
      console.log(`[OpenFootball] Trying URL: ${url}`)
      try {
        const response = await fetch(url)
        if (response.ok) {
          data = await response.json()
          successUrl = url
          console.log(`[OpenFootball] Success with URL: ${url}`)
          break
        } else {
          console.log(`[OpenFootball] URL returned ${response.status}: ${url}`)
        }
      } catch (e) {
        console.log(`[OpenFootball] Fetch error for URL: ${url}`)
      }
    }

    if (!data) {
      throw new Error(`No valid data found for ${league} ${season}. Tried ${urls.length} URLs.`)
    }

    console.log(`[OpenFootball] Received data with ${data.rounds?.length || 0} rounds`)

    let itemsProcessed = 0
    let itemsCreated = 0
    let itemsUpdated = 0
    let itemsFailed = 0

    // Get or create league
    const leagueInfo = getLeagueInfo(league)
    const { data: dbLeague, error: leagueError } = await supabase
      .from('ligas')
      .upsert({
        nome: leagueInfo.name,
        pais: leagueInfo.country,
        codigo_api: league.toUpperCase(),
        api_source: 'openfootball',
        ativa: true
      }, { onConflict: 'codigo_api' })
      .select()
      .single()

    if (leagueError) {
      console.error('[OpenFootball] Error upserting league:', leagueError)
    }

    const leagueId = dbLeague?.id

    // Process rounds and matches
    const rounds: OpenFootballRound[] = data.rounds || []
    
    for (const round of rounds) {
      const roundNumber = extractRoundNumber(round.name)
      
      for (const match of round.matches || []) {
        try {
          itemsProcessed++

          // Find or create home team
          const homeTeam = await findOrCreateTeam(supabase, match.team1, leagueInfo.country, source.id)
          const awayTeam = await findOrCreateTeam(supabase, match.team2, leagueInfo.country, source.id)

          if (!homeTeam || !awayTeam) {
            console.warn(`[OpenFootball] Could not find/create teams: ${match.team1} vs ${match.team2}`)
            itemsFailed++
            continue
          }

          // Parse match date
          const matchDate = new Date(match.date)
          const dateStr = matchDate.toISOString().split('T')[0]

          // Determine match status
          const hasScore = match.score?.ft && match.score.ft.length === 2
          const status = hasScore ? 'finished' : 'scheduled'

          // Upsert match
          const matchData: Record<string, unknown> = {
            data: dateStr,
            time_casa_id: homeTeam.id,
            time_fora_id: awayTeam.id,
            liga_id: leagueId,
            rodada: roundNumber,
            status: status
          }

          if (hasScore) {
            matchData.gols_casa = match.score!.ft![0]
            matchData.gols_fora = match.score!.ft![1]
          }

          // Check if match exists
          const { data: existingMatch } = await supabase
            .from('partidas')
            .select('id')
            .eq('data', dateStr)
            .eq('time_casa_id', homeTeam.id)
            .eq('time_fora_id', awayTeam.id)
            .maybeSingle()

          if (existingMatch) {
            await supabase
              .from('partidas')
              .update(matchData)
              .eq('id', existingMatch.id)
            itemsUpdated++
          } else {
            await supabase
              .from('partidas')
              .insert(matchData)
            itemsCreated++
          }

          // Register external ID mapping
          if (existingMatch || itemsCreated > 0) {
            const internalId = existingMatch?.id
            if (internalId) {
              await supabase
                .from('external_id_map')
                .upsert({
                  source_id: source.id,
                  entity_type: 'match',
                  external_id: `${league}-${season}-${match.team1}-${match.team2}-${dateStr}`,
                  internal_id: internalId,
                  confidence: 'high'
                }, { onConflict: 'source_id,entity_type,external_id' })
            }
          }

        } catch (error: unknown) {
          console.error(`[OpenFootball] Error processing match:`, error)
          itemsFailed++
        }
      }
    }

    // Update sync log
    if (syncLog) {
      await supabase
        .from('sync_logs')
        .update({
          status: itemsFailed > 0 && itemsProcessed === itemsFailed ? 'failed' : 'completed',
          completed_at: new Date().toISOString(),
          items_processed: itemsProcessed,
          items_created: itemsCreated,
          items_updated: itemsUpdated,
          items_failed: itemsFailed,
          requests_made: 1,
          details: { league, season, rounds: rounds.length, url: successUrl }
        })
        .eq('id', syncLog.id)
    }

    console.log(`[OpenFootball] Sync completed: ${itemsProcessed} processed, ${itemsCreated} created, ${itemsUpdated} updated, ${itemsFailed} failed`)

    return new Response(JSON.stringify({
      success: true,
      league,
      season,
      url: successUrl,
      stats: {
        processed: itemsProcessed,
        created: itemsCreated,
        updated: itemsUpdated,
        failed: itemsFailed
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('[OpenFootball] Sync error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function getOpenFootballUrls(league: string, season: string): string[] {
  // Map league codes to various URL formats that OpenFootball uses
  const urls: string[] = []
  
  // Format season for different URL patterns (e.g., "2024-25" or "2024")
  const seasonYear = season.split('-')[0]
  
  // League-specific paths
  const leagueConfigs: Record<string, { repo: string; paths: string[] }> = {
    'br': { 
      repo: 'brazil', 
      paths: [`${season}/1-brasileirao-serie-a.json`, `${seasonYear}/1-brasileirao-serie-a.json`]
    },
    'en': { 
      repo: 'england', 
      paths: [`${season}/1-premierleague.json`, `${season}/1-premier-league.json`, `${seasonYear}/1-premierleague.json`]
    },
    'de': { 
      repo: 'deutschland', 
      paths: [`${season}/1-bundesliga.json`, `${seasonYear}/1-bundesliga.json`]
    },
    'es': { 
      repo: 'espana', 
      paths: [`${season}/1-liga.json`, `${season}/1-laliga.json`, `${seasonYear}/1-liga.json`]
    },
    'it': { 
      repo: 'italy', 
      paths: [`${season}/1-seriea.json`, `${season}/1-serie-a.json`, `${seasonYear}/1-seriea.json`]
    },
    'fr': { 
      repo: 'france', 
      paths: [`${season}/1-ligue1.json`, `${season}/1-ligue-1.json`, `${seasonYear}/1-ligue1.json`]
    },
    'at': { 
      repo: 'austria', 
      paths: [`${season}/1-bundesliga.json`, `${seasonYear}/1-bundesliga.json`]
    }
  }

  const config = leagueConfigs[league]
  
  if (config) {
    // Try openfootball/football.json repo first (has combined data)
    urls.push(`https://raw.githubusercontent.com/openfootball/football.json/master/${season}/${config.repo}.json`)
    urls.push(`https://raw.githubusercontent.com/openfootball/football.json/master/${seasonYear}/${config.repo}.json`)
    
    // Then try specific league repos
    for (const path of config.paths) {
      urls.push(`https://raw.githubusercontent.com/openfootball/${config.repo}/master/${path}`)
    }
  }

  return urls
}

function extractRoundNumber(roundName: string): number | null {
  const match = roundName.match(/(\d+)/)
  return match ? parseInt(match[1]) : null
}

function getLeagueInfo(code: string): { name: string; country: string } {
  const info: Record<string, { name: string; country: string }> = {
    'br': { name: 'Brasileirão Série A', country: 'Brazil' },
    'en': { name: 'Premier League', country: 'England' },
    'de': { name: 'Bundesliga', country: 'Germany' },
    'es': { name: 'La Liga', country: 'Spain' },
    'it': { name: 'Serie A', country: 'Italy' },
    'fr': { name: 'Ligue 1', country: 'France' },
    'pt': { name: 'Primeira Liga', country: 'Portugal' },
    'at': { name: 'Bundesliga', country: 'Austria' }
  }
  return info[code] || { name: code.toUpperCase(), country: 'Unknown' }
}

async function findOrCreateTeam(
  supabase: any,
  teamName: string,
  country: string,
  sourceId: string
): Promise<{ id: string; nome: string } | null> {
  // Normalize team name for matching
  const normalizedName = teamName.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/fc\s*/i, '')
    .replace(/\s*fc/i, '')
    .trim()

  // Check team aliases first
  const { data: alias } = await supabase
    .from('team_aliases')
    .select('team_id')
    .eq('normalized_alias', normalizedName)
    .maybeSingle()

  if (alias?.team_id) {
    return { id: alias.team_id, nome: teamName }
  }

  // Try direct name match
  const { data: existingTeam } = await supabase
    .from('times')
    .select('id, nome')
    .ilike('nome', `%${teamName}%`)
    .maybeSingle()

  if (existingTeam) {
    // Register alias for future matching
    await supabase
      .from('team_aliases')
      .upsert({
        team_id: existingTeam.id,
        source_id: sourceId,
        alias: teamName,
        normalized_alias: normalizedName
      }, { onConflict: 'team_id,alias' })

    return existingTeam
  }

  // Create new team
  const { data: newTeam, error } = await supabase
    .from('times')
    .insert({
      nome: teamName,
      pais: country,
      cores: { primary: '#6B7280', secondary: '#FFFFFF' }
    })
    .select('id, nome')
    .single()

  if (error) {
    console.error('[OpenFootball] Error creating team:', error)
    return null
  }

  // Register alias
  if (newTeam) {
    await supabase
      .from('team_aliases')
      .insert({
        team_id: newTeam.id,
        source_id: sourceId,
        alias: teamName,
        normalized_alias: normalizedName
      })
  }

  return newTeam
}
