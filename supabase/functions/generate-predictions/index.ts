import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SAFETY_TIMEOUT_MS = 120_000

async function runJob() {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const startTime = Date.now()

  try {
    console.log('Starting automatic prediction generation...')

    // Existing predictions (paginated to avoid 1000-row cap)
    const existingPartidaIds = new Set<string>()
    let offset = 0
    const PAGE = 1000
    while (true) {
      const { data, error } = await supabase
        .from('palpites')
        .select('partida_id')
        .range(offset, offset + PAGE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      data.forEach((p: any) => existingPartidaIds.add(p.partida_id))
      if (data.length < PAGE) break
      offset += PAGE
    }
    console.log(`Found ${existingPartidaIds.size} existing predictions`)

    // Scheduled matches (paginated)
    const today = new Date().toISOString().split('T')[0]
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []
    offset = 0

    outer: while (true) {
      if (Date.now() - startTime > SAFETY_TIMEOUT_MS) {
        console.log('Safety timeout reached, stopping')
        break
      }
      const { data: matches, error } = await supabase
        .from('partidas')
        .select('id')
        .eq('status', 'scheduled')
        .gte('data', today)
        .order('data', { ascending: true })
        .range(offset, offset + PAGE - 1)
      if (error) throw error
      if (!matches || matches.length === 0) break

      for (const match of matches) {
        if (Date.now() - startTime > SAFETY_TIMEOUT_MS) break outer
        if (existingPartidaIds.has(match.id)) continue
        try {
          const { error: rpcErr } = await supabase.rpc('gerar_palpite_sistema', {
            p_partida_id: match.id,
          })
          if (rpcErr) {
            errors.push(`Match ${match.id}: ${rpcErr.message}`)
            errorCount++
          } else {
            successCount++
          }
        } catch (e: any) {
          errors.push(`Match ${match.id}: ${e?.message || String(e)}`)
          errorCount++
        }
      }
      if (matches.length < PAGE) break
      offset += PAGE
    }

    console.log('Prediction generation complete:', {
      generated: successCount,
      failed: errorCount,
      duration_ms: Date.now() - startTime,
      errors: errors.slice(0, 10),
    })
  } catch (error: any) {
    console.error('Error in generate-predictions background job:', error)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // @ts-ignore EdgeRuntime is provided at runtime
  EdgeRuntime.waitUntil(runJob())

  return new Response(
    JSON.stringify({
      success: true,
      accepted: true,
      message: 'Geração de palpites iniciada em background. Acompanhe pelos logs.',
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 202,
    },
  )
})
