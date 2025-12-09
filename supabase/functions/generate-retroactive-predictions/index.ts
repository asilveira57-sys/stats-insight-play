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

    const { limit = 100 } = await req.json().catch(() => ({}))

    console.log(`Starting retroactive prediction generation (limit: ${limit})...`)

    // Get all existing prediction partida_ids first
    const { data: existingPalpites, error: palpitesError } = await supabase
      .from('palpites')
      .select('partida_id')

    if (palpitesError) {
      console.error('Error fetching existing predictions:', palpitesError)
      throw palpitesError
    }

    const existingPartidaIds = new Set(existingPalpites?.map(p => p.partida_id) || [])
    console.log(`Found ${existingPartidaIds.size} existing predictions`)

    // Get finished matches without predictions
    const { data: matches, error: matchesError } = await supabase
      .from('partidas')
      .select('id, data, hora, time_casa_id, time_fora_id, gols_casa, gols_fora')
      .eq('status', 'finished')
      .not('gols_casa', 'is', null)
      .not('gols_fora', 'is', null)
      .order('data', { ascending: false })
      .limit(limit * 3)

    if (matchesError) {
      console.error('Error fetching matches:', matchesError)
      throw matchesError
    }

    console.log(`Found ${matches?.length || 0} finished matches`)

    // Filter matches without predictions
    const matchesWithoutPredictions = (matches || [])
      .filter(m => !existingPartidaIds.has(m.id))
      .slice(0, limit)

    console.log(`${matchesWithoutPredictions.length} finished matches need predictions`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []
    const generated: string[] = []

    // Generate predictions for each match
    for (const match of matchesWithoutPredictions) {
      try {
        const { data, error } = await supabase.rpc('gerar_palpite_sistema', {
          p_partida_id: match.id
        })

        if (error) {
          console.error(`Error generating prediction for match ${match.id}:`, error)
          errors.push(`Match ${match.id}: ${error.message}`)
          errorCount++
        } else {
          console.log(`Generated retroactive prediction ${data} for match ${match.id} (${match.data})`)
          generated.push(match.id)
          successCount++
          
          // Also process the result comparison
          try {
            await supabase.rpc('processar_resultado_partida', {
              p_partida_id: match.id
            })
            console.log(`Processed result comparison for match ${match.id}`)
          } catch (procError) {
            console.error(`Error processing result for match ${match.id}:`, procError)
          }
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e)
        console.error(`Exception generating prediction for match ${match.id}:`, e)
        errors.push(`Match ${match.id}: ${errorMessage}`)
        errorCount++
      }
    }

    const result = {
      success: true,
      totalFinished: matches?.length || 0,
      alreadyHadPredictions: existingPartidaIds.size,
      generated: successCount,
      failed: errorCount,
      matchIdsGenerated: generated.slice(0, 10),
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      timestamp: new Date().toISOString()
    }

    console.log('Retroactive prediction generation complete:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error in generate-retroactive-predictions function:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})