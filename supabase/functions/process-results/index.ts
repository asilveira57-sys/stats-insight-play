import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting automatic result processing...')

    // Get all finished matches
    const { data: finishedMatches, error: matchesError } = await supabase
      .from('partidas')
      .select('id, gols_casa, gols_fora, time_casa_id, time_fora_id, liga_id')
      .eq('status', 'finished')
      .not('gols_casa', 'is', null)
      .not('gols_fora', 'is', null)

    if (matchesError) {
      console.error('Error fetching finished matches:', matchesError)
      throw matchesError
    }

    console.log(`Found ${finishedMatches?.length || 0} finished matches`)

    // Get already processed matches
    const { data: processedMatches, error: processedError } = await supabase
      .from('comparativo_resultados')
      .select('partida_id')

    if (processedError) {
      console.error('Error fetching processed matches:', processedError)
      throw processedError
    }

    const processedIds = new Set(processedMatches?.map(p => p.partida_id) || [])

    // Filter matches that need processing
    const matchesToProcess = finishedMatches?.filter(m => !processedIds.has(m.id)) || []

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
            // Grant XP for correct result (only if not exact score, to avoid double)
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
      totalFinished: finishedMatches?.length || 0,
      alreadyProcessed: processedIds.size,
      processed: successCount,
      failed: errorCount,
      xpEventsGranted: xpGranted,
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
