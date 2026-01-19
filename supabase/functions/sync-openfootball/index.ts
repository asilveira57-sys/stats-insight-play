import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Match format varies between repos - support multiple formats
interface OpenFootballMatch {
  date: string
  time?: string
  team1: string | { name: string; code?: string }
  team2: string | { name: string; code?: string }
  score?: { ft?: number[]; ht?: number[] }
  score1?: number
  score2?: number
  round?: string
  group?: string
}

interface OpenFootballRound {
  name: string
  matches: OpenFootballMatch[]
}

interface OpenFootballData {
  name?: string
  rounds?: OpenFootballRound[]
  matches?: OpenFootballMatch[]
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
    // Parse request body with error handling
    let body: { league?: string; season?: string } = {}
    try {
      const text = await req.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch (parseError) {
      console.error('[OpenFootball] Invalid JSON in request body:', parseError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body. Please provide { "league": "...", "season": "..." }'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { league, season } = body

    if (!league || !season) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameters: league and season'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
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
    
    console.log(`[OpenFootball] Will try ${urls.length} URLs:`, urls)
    
    let data: OpenFootballData | null = null
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
        console.log(`[OpenFootball] Fetch error for URL: ${url}`, e)
      }
    }

    if (!data) {
      throw new Error(`No valid data found for ${league} ${season}. Tried ${urls.length} URLs: ${urls.join(', ')}`)
    }

    // Handle both formats: data with rounds array OR flat matches array
    const hasRounds = data.rounds && data.rounds.length > 0
    const hasMatches = data.matches && data.matches.length > 0
    
    console.log(`[OpenFootball] Data format: rounds=${hasRounds}, matches=${hasMatches}`)
    console.log(`[OpenFootball] Received data with ${data.rounds?.length || 0} rounds, ${data.matches?.length || 0} matches`)

    let itemsProcessed = 0
    let itemsCreated = 0
    let itemsUpdated = 0
    let itemsFailed = 0

    // Get or create league
    const leagueInfo = getLeagueInfo(league)
    const leagueCode = league.toUpperCase()
    
    // First try to find existing league
    let { data: dbLeague } = await supabase
      .from('ligas')
      .select('*')
      .eq('codigo_api', leagueCode)
      .maybeSingle()
    
    // If not found, create it
    if (!dbLeague) {
      const { data: newLeague, error: leagueError } = await supabase
        .from('ligas')
        .insert({
          nome: leagueInfo.name,
          pais: leagueInfo.country,
          codigo_api: leagueCode,
          api_source: 'openfootball',
          ativa: true
        })
        .select()
        .single()
      
      if (leagueError) {
        console.error('[OpenFootball] Error creating league:', leagueError)
      } else {
        dbLeague = newLeague
      }
    }

    const leagueId = dbLeague?.id
    console.log(`[OpenFootball] Using league: ${dbLeague?.nome} (${leagueId})`)

    // Process matches - handle both formats
    let allMatches: { match: OpenFootballMatch; roundNumber: number | null; roundName?: string }[] = []
    
    if (hasRounds && data.rounds) {
      // Format with rounds array
      for (const round of data.rounds) {
        const roundNumber = extractRoundNumber(round.name)
        for (const match of round.matches || []) {
          allMatches.push({ match, roundNumber, roundName: round.name })
        }
      }
    } else if (hasMatches && data.matches) {
      // Flat matches array format
      for (const match of data.matches) {
        const roundNumber = match.round ? extractRoundNumber(match.round) : null
        allMatches.push({ match, roundNumber })
      }
    }

    console.log(`[OpenFootball] Processing ${allMatches.length} matches`)

    for (const { match, roundNumber } of allMatches) {
      try {
        itemsProcessed++

        // Get team names - handle both string and object formats
        const team1Name = getTeamName(match.team1)
        const team2Name = getTeamName(match.team2)

        // Find or create home team
        const homeTeam = await findOrCreateTeam(supabase, team1Name, leagueInfo.country, source.id)
        const awayTeam = await findOrCreateTeam(supabase, team2Name, leagueInfo.country, source.id)

        if (!homeTeam || !awayTeam) {
          console.warn(`[OpenFootball] Could not find/create teams: ${team1Name} vs ${team2Name}`)
          itemsFailed++
          continue
        }

        // Parse match date
        const matchDate = new Date(match.date)
        const dateStr = matchDate.toISOString().split('T')[0]

        // Determine match status - handle both score formats
        const hasScoreFt = match.score?.ft && match.score.ft.length === 2
        const hasScore12 = match.score1 !== undefined && match.score2 !== undefined
        const hasScore = hasScoreFt || hasScore12
        const status = hasScore ? 'finished' : 'scheduled'

        // Upsert match
        const matchData: Record<string, unknown> = {
          data: dateStr,
          hora: match.time || null,
          time_casa_id: homeTeam.id,
          time_fora_id: awayTeam.id,
          liga_id: leagueId,
          rodada: roundNumber,
          status: status
        }

        // Extract score - handle both formats
        if (hasScoreFt && match.score?.ft) {
          matchData.gols_casa = match.score.ft[0]
          matchData.gols_fora = match.score.ft[1]
        } else if (hasScore12) {
          matchData.gols_casa = match.score1
          matchData.gols_fora = match.score2
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
                external_id: `${league}-${season}-${team1Name}-${team2Name}-${dateStr}`,
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
          details: { league, season, url: successUrl, matchCount: allMatches.length }
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

// Extract team name from string or object format
function getTeamName(team: string | { name: string; code?: string }): string {
  if (typeof team === 'string') {
    return team
  }
  return team.name
}

function getOpenFootballUrls(league: string, season: string): string[] {
  const urls: string[] = []
  
  // Configuration for different league types
  interface LeagueConfig {
    code: string
    division?: number
    altRepo?: string
    type: 'league' | 'cup' | 'international'
    jsonRepo?: string  // The .json repository name
    fileName?: string  // The actual filename inside the repo
  }
  
  const leagueConfigs: Record<string, LeagueConfig> = {
    // National leagues
    'br': { code: 'br', division: 1, altRepo: 'brazil', type: 'league' },
    'en': { code: 'en', division: 1, altRepo: 'england', type: 'league' },
    'de': { code: 'de', division: 1, altRepo: 'deutschland', type: 'league' },
    'es': { code: 'es', division: 1, altRepo: 'espana', type: 'league' },
    'it': { code: 'it', division: 1, altRepo: 'italy', type: 'league' },
    'fr': { code: 'fr', division: 1, altRepo: 'france', type: 'league' },
    'at': { code: 'at', division: 1, altRepo: 'austria', type: 'league' },
    'nl': { code: 'nl', division: 1, altRepo: 'netherlands', type: 'league' },
    'pt': { code: 'pt', division: 1, altRepo: 'portugal', type: 'league' },
    'ru': { code: 'ru', division: 1, altRepo: 'russia', type: 'league' },
    'mx': { code: 'mx', division: 1, altRepo: 'mexico', type: 'league' },
    // International tournaments - use correct .json repos
    'world': { code: 'world', type: 'international', jsonRepo: 'worldcup.json', fileName: 'worldcup' },
    'euro': { code: 'euro', type: 'international', jsonRepo: 'euro.json', fileName: 'euro' },
    'copa-america': { code: 'copa', type: 'international', jsonRepo: 'copa-america.json', fileName: 'copa' },
    'africa': { code: 'africa', type: 'international', jsonRepo: 'africa-cup.json', fileName: 'africacup' },
    // European cups
    'cl': { code: 'cl', type: 'cup', jsonRepo: 'champions-league.json', fileName: 'cl' },
    'el': { code: 'el', type: 'cup', jsonRepo: 'europa-league.json', fileName: 'el' },
    'ecl': { code: 'ecl', type: 'cup', jsonRepo: 'europa-conference-league.json', fileName: 'ecl' }
  }

  const config = leagueConfigs[league]
  const year = season.split('-')[0]
  
  if (config) {
    if (config.type === 'league' && config.division) {
      // National league format: football.json repo with code.division.json pattern
      urls.push(`https://raw.githubusercontent.com/openfootball/football.json/master/${season}/${config.code}.${config.division}.json`)
      urls.push(`https://raw.githubusercontent.com/openfootball/football.json/master/${year}/${config.code}.${config.division}.json`)
      
      // Try OpenFootball Pages mirror
      if (config.altRepo) {
        urls.push(`https://openfootball.github.io/${config.altRepo}/${season}/1-${getLeagueFileName(league)}.json`)
      }
    } else if (config.type === 'international' || config.type === 'cup') {
      // For international tournaments, try football.json repo FIRST (has scores)
      // World Cup uses special naming in football.json
      if (league === 'world') {
        urls.push(`https://raw.githubusercontent.com/openfootball/football.json/master/${year}/worldcup.json`)
        urls.push(`https://raw.githubusercontent.com/openfootball/football.json/master/${year}/wc.json`)
      }
      
      // Use the dedicated .json repositories as fallback
      if (config.jsonRepo && config.fileName) {
        // Primary: dedicated .json repo (e.g., worldcup.json, euro.json)
        urls.push(`https://raw.githubusercontent.com/openfootball/${config.jsonRepo}/master/${year}/${config.fileName}.json`)
        urls.push(`https://raw.githubusercontent.com/openfootball/${config.jsonRepo}/master/${season}/${config.fileName}.json`)
        
        // Alternative file names
        urls.push(`https://raw.githubusercontent.com/openfootball/${config.jsonRepo}/master/${year}/cup.json`)
        urls.push(`https://raw.githubusercontent.com/openfootball/${config.jsonRepo}/master/${year}/${config.code}.json`)
      }
      
      // Fallback: try football.json repo
      urls.push(`https://raw.githubusercontent.com/openfootball/football.json/master/${year}/${config.code}.json`)
    }
  }

  return urls
}

function getLeagueFileName(code: string): string {
  const names: Record<string, string> = {
    'br': 'brasileirao-serie-a',
    'en': 'premierleague',
    'de': 'bundesliga',
    'es': 'liga',
    'it': 'seriea',
    'fr': 'ligue1',
    'at': 'bundesliga',
    'nl': 'eredivisie',
    'pt': 'primeiraliga',
    'ru': 'premierliga',
    'mx': 'liga-mx'
  }
  return names[code] || code
}

function extractRoundNumber(roundName: string): number | null {
  // Handle international tournament rounds
  const roundLower = roundName.toLowerCase()
  if (roundLower.includes('final') && !roundLower.includes('quarter') && !roundLower.includes('semi')) {
    return 100 // Final
  }
  if (roundLower.includes('3rd place') || roundLower.includes('third place')) return 99
  if (roundLower.includes('semi')) return 98
  if (roundLower.includes('quarter')) return 97
  if (roundLower.includes('round of 16') || roundLower.includes('round16')) return 96
  if (roundLower.includes('round of 32') || roundLower.includes('round32')) return 95
  
  // Group stage - try to extract matchday number
  if (roundLower.includes('group') || roundLower.includes('matchday')) {
    const matchdayMatch = roundLower.match(/matchday\s*(\d+)|round\s*(\d+)|(\d+)/)
    if (matchdayMatch) {
      return parseInt(matchdayMatch[1] || matchdayMatch[2] || matchdayMatch[3])
    }
    return 1
  }
  
  const match = roundName.match(/(\d+)/)
  return match ? parseInt(match[1]) : null
}

function getLeagueInfo(code: string): { name: string; country: string } {
  const info: Record<string, { name: string; country: string }> = {
    // National leagues
    'br': { name: 'Brasileirão Série A', country: 'Brazil' },
    'en': { name: 'Premier League', country: 'England' },
    'de': { name: 'Bundesliga', country: 'Germany' },
    'es': { name: 'La Liga', country: 'Spain' },
    'it': { name: 'Serie A', country: 'Italy' },
    'fr': { name: 'Ligue 1', country: 'France' },
    'pt': { name: 'Primeira Liga', country: 'Portugal' },
    'at': { name: 'Bundesliga', country: 'Austria' },
    'nl': { name: 'Eredivisie', country: 'Netherlands' },
    'ru': { name: 'Premier Liga', country: 'Russia' },
    'mx': { name: 'Liga MX', country: 'Mexico' },
    // International tournaments
    'world': { name: 'FIFA World Cup', country: 'International' },
    'euro': { name: 'UEFA Euro', country: 'Europe' },
    'copa-america': { name: 'Copa América', country: 'South America' },
    'africa': { name: 'Africa Cup of Nations', country: 'Africa' },
    // European cups
    'cl': { name: 'UEFA Champions League', country: 'Europe' },
    'el': { name: 'UEFA Europa League', country: 'Europe' },
    'ecl': { name: 'UEFA Conference League', country: 'Europe' }
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

  // Check team aliases first (exact match on normalized name)
  const { data: alias } = await supabase
    .from('team_aliases')
    .select('team_id')
    .eq('normalized_alias', normalizedName)
    .maybeSingle()

  if (alias?.team_id) {
    return { id: alias.team_id, nome: teamName }
  }

  // Try EXACT name match first (case-insensitive)
  const { data: exactMatch } = await supabase
    .from('times')
    .select('id, nome')
    .ilike('nome', teamName)
    .maybeSingle()

  if (exactMatch) {
    // Register alias for future matching
    await supabase
      .from('team_aliases')
      .upsert({
        team_id: exactMatch.id,
        source_id: sourceId,
        alias: teamName,
        normalized_alias: normalizedName
      }, { onConflict: 'team_id,alias' })

    return exactMatch
  }

  // For international teams (short country names), skip partial matching to avoid false matches
  // Only do partial matching for club teams with longer names (>10 chars)
  if (teamName.length > 10) {
    const { data: partialMatch } = await supabase
      .from('times')
      .select('id, nome')
      .ilike('nome', `%${teamName}%`)
      .maybeSingle()

    if (partialMatch) {
      await supabase
        .from('team_aliases')
        .upsert({
          team_id: partialMatch.id,
          source_id: sourceId,
          alias: teamName,
          normalized_alias: normalizedName
        }, { onConflict: 'team_id,alias' })

      return partialMatch
    }
  }

  // Create new team
  const { data: newTeam, error } = await supabase
    .from('times')
    .insert({
      nome: teamName,
      pais: country
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
