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
      .select('id')
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

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process each match
    for (const match of matchesToProcess) {
      try {
        const { error } = await supabase.rpc('processar_resultado_partida', {
          p_partida_id: match.id
        })

        if (error) {
          console.error(`Error processing result for match ${match.id}:`, error)
          errors.push(`Match ${match.id}: ${error.message}`)
          errorCount++
        } else {
          console.log(`Processed result for match ${match.id}`)
          successCount++
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
