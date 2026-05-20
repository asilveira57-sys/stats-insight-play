import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function runJob(limit: number) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  try {
    console.log(`Starting scheduled prediction batch (limit: ${limit})...`)
    const { data, error } = await supabase.rpc('gerar_palpites_sistema_lote', {
      p_status: 'scheduled',
      p_limit: limit,
      p_process_results: false,
    })
    if (error) throw error
    console.log('Prediction generation complete:', data)
    return data
  } catch (error: any) {
    console.error('Error in generate-predictions background job:', error)
    throw error
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { limit = 1000 } = await req.json().catch(() => ({}))
  const result = await runJob(Math.min(Math.max(Number(limit) || 1000, 1), 2000))

  return new Response(
    JSON.stringify({
      success: true,
      generated: result?.generated || 0,
      failed: result?.failed || 0,
      remaining: result?.remaining || 0,
      totalScheduled: (result?.generated || 0) + (result?.remaining || 0),
      duration_ms: result?.duration_ms || 0,
      errors: result?.errors || undefined,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 202,
    },
  )
})
