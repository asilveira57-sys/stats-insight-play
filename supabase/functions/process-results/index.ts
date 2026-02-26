import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Paginated fetch to bypass 1000-row limit
async function fetchAll<T>(
  supabase: any,
  table: string,
  select: string,
  filters?: (q: any) => any,
  batchSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    let q = supabase.from(table).select(select).range(offset, offset + batchSize - 1);
    if (filters) q = filters(q);
    const { data, error } = await q;
    if (error) throw error;
    if (data && data.length > 0) {
      all.push(...data);
      offset += batchSize;
      if (data.length < batchSize) hasMore = false;
    } else {
      hasMore = false;
    }
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  const SAFETY_TIMEOUT_MS = 120_000 // 120s safety

  function hasTimeLeft(): boolean {
    return (Date.now() - startTime) < SAFETY_TIMEOUT_MS
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting automatic result processing...')

    // Get all finished matches (paginated)
    const finishedMatches = await fetchAll<{
      id: string; gols_casa: number | null; gols_fora: number | null;
      time_casa_id: string | null; time_fora_id: string | null; liga_id: string | null;
    }>(
      supabase, 'partidas',
      'id, gols_casa, gols_fora, time_casa_id, time_fora_id, liga_id',
      (q: any) => q.eq('status', 'finished').not('gols_casa', 'is', null).not('gols_fora', 'is', null)
    )

    console.log(`Found ${finishedMatches.length} finished matches`)

    // Get already processed matches (paginated)
    const processedMatches = await fetchAll<{ partida_id: string }>(
      supabase, 'comparativo_resultados', 'partida_id'
    )

    const processedIds = new Set(processedMatches.map(p => p.partida_id))

    // Filter matches that need processing
    const matchesToProcess = finishedMatches.filter(m => !processedIds.has(m.id))

    console.log(`${matchesToProcess.length} matches need result processing`)

    // Load gamification rules
    const { data: rules } = await supabase
      .from('gamification_rules')
      .select('rule_key, xp_value, is_enabled')

    const rulesMap: Record<string, { xp_value: number; is_enabled: boolean }> = {}
    for (const r of rules || []) {
      rulesMap[r.rule_key] = { xp_value: r.xp_value, is_enabled: r.is_enabled }
    }

    let successCount = 0
    let errorCount = 0
    let xpGranted = 0
    const errors: string[] = []

    // Process each match
    for (const match of matchesToProcess) {
      if (!hasTimeLeft()) {
        console.log(`Safety timer reached after processing ${successCount} matches. Stopping.`)
        break
      }

      try {
        // 1) Process comparativo_resultados via RPC
        const { error } = await supabase.rpc('processar_resultado_partida', {
          p_partida_id: match.id
        })

        if (error) {
          console.error(`Error processing result for match ${match.id}:`, error)
          errors.push(`Match ${match.id}: ${error.message}`)
          errorCount++
          continue
        }

        console.log(`Processed result for match ${match.id}`)
        successCount++

        // 2) Grant XP to users who predicted this match
        const { data: userPalpites } = await supabase
          .from('palpites_usuarios')
          .select('id, user_id, placar_casa, placar_fora')
          .eq('partida_id', match.id)

        if (!userPalpites || userPalpites.length === 0) continue

        const golsCasa = match.gols_casa ?? 0
        const golsFora = match.gols_fora ?? 0
        const resultadoReal = golsCasa > golsFora ? 'casa' : golsCasa < golsFora ? 'fora' : 'empate'

        for (const palpite of userPalpites) {
          try {
            const resultadoPalpite = palpite.placar_casa > palpite.placar_fora ? 'casa' :
              palpite.placar_casa < palpite.placar_fora ? 'fora' : 'empate'

            const acertouResultado = resultadoReal === resultadoPalpite
            const acertouPlacar = palpite.placar_casa === golsCasa && palpite.placar_fora === golsFora

            // Grant XP for exact score
            if (acertouPlacar && rulesMap['SCORE_HIT']?.is_enabled) {
              const { error: xpErr } = await supabase.rpc('grant_xp', {
                p_user_id: palpite.user_id,
                p_rule_key: 'SCORE_HIT',
                p_source_type: 'prediction',
                p_source_id: palpite.id,
                p_match_id: match.id,
                p_competition_id: match.liga_id || null,
                p_description: `Placar exato: ${golsCasa}x${golsFora}`,
              })
              if (!xpErr) xpGranted++
            }
            // Grant XP for correct result (only if not exact score)
            else if (acertouResultado && rulesMap['WINNER_HIT']?.is_enabled) {
              const { error: xpErr } = await supabase.rpc('grant_xp', {
                p_user_id: palpite.user_id,
                p_rule_key: 'WINNER_HIT',
                p_source_type: 'prediction',
                p_source_id: palpite.id,
                p_match_id: match.id,
                p_competition_id: match.liga_id || null,
                p_description: `Resultado correto: ${resultadoReal === 'casa' ? 'Vitória Casa' : resultadoReal === 'fora' ? 'Vitória Fora' : 'Empate'}`,
              })
              if (!xpErr) xpGranted++
            }
          } catch (e) {
            console.error(`Error granting XP for palpite ${palpite.id}:`, e)
          }
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e)
        console.error(`Exception processing result for match ${match.id}:`, e)
        errors.push(`Match ${match.id}: ${errorMessage}`)
        errorCount++
      }
    }

    const result = {
      success: true,
      totalFinished: finishedMatches.length,
      alreadyProcessed: processedIds.size,
      processed: successCount,
      failed: errorCount,
      xpEventsGranted: xpGranted,
      stoppedEarly: !hasTimeLeft(),
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }

    console.log('Result processing complete:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error in process-results function:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
