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

    console.log('Starting automatic prediction generation...')

    // Get all scheduled matches without predictions
    const { data: matches, error: matchesError } = await supabase
      .from('partidas')
      .select('id, data, hora, time_casa_id, time_fora_id')
      .eq('status', 'scheduled')
      .gte('data', new Date().toISOString().split('T')[0])

    if (matchesError) {
      console.error('Error fetching matches:', matchesError)
      throw matchesError
    }

    console.log(`Found ${matches?.length || 0} scheduled matches`)

    // Get existing predictions
    const { data: existingPalpites, error: palpitesError } = await supabase
      .from('palpites')
      .select('partida_id')

    if (palpitesError) {
      console.error('Error fetching existing predictions:', palpitesError)
      throw palpitesError
    }

    const existingPartidaIds = new Set(existingPalpites?.map(p => p.partida_id) || [])

    // Filter matches without predictions
    const matchesWithoutPredictions = matches?.filter(m => !existingPartidaIds.has(m.id)) || []

    console.log(`${matchesWithoutPredictions.length} matches need predictions`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

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
          console.log(`Generated prediction ${data} for match ${match.id}`)
          successCount++
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
      totalScheduled: matches?.length || 0,
      alreadyHadPredictions: existingPartidaIds.size,
      generated: successCount,
      failed: errorCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }

    console.log('Prediction generation complete:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error in generate-predictions function:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
