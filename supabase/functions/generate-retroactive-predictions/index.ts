import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function runJob(limit: number, jobId: string | null) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log(`[job ${jobId}] Starting retroactive prediction batch (limit: ${limit})...`)
    const { data: result, error } = await supabase.rpc('gerar_palpites_sistema_lote', {
      p_status: 'finished',
      p_limit: limit,
      p_process_results: true,
    })
    if (error) throw error
    console.log(`[job ${jobId}] Complete:`, result)

    if (jobId) {
      await supabase.from('sync_logs').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        records_processed: result?.generated || 0,
        records_failed: result?.failed || 0,
        details: result,
      }).eq('id', jobId)
    }
    return result
  } catch (error: any) {
    console.error(`[job ${jobId}] Fatal error:`, error)
    if (jobId) {
      await supabase.from('sync_logs').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error?.message || String(error),
      }).eq('id', jobId)
    }
    throw error
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // === KILL-SWITCH: cost control ===
  if (!(await isContentGenerationEnabled())) {
    return disabledResponse(corsHeaders, "generate-retroactive-predictions");
  }


  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { limit = 100 } = await req.json().catch(() => ({}))

    // Create a sync_logs row to track this background job
    let jobId: string | null = null
    try {
      const { data: log } = await supabase
        .from('sync_logs')
        .insert({
          entity_type: 'retroactive_predictions',
          status: 'running',
          started_at: new Date().toISOString(),
          details: { limit },
        })
        .select('id')
        .single()
      jobId = log?.id ?? null
    } catch (e) {
      console.error('Could not create sync_log:', e)
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 1000, 1), 2000)
    const result = await runJob(safeLimit, jobId)

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        generated: result?.generated || 0,
        failed: result?.failed || 0,
        remaining: result?.remaining || 0,
        totalFinished: (result?.generated || 0) + (result?.remaining || 0),
        duration_ms: result?.duration_ms || 0,
        errors: result?.errors || undefined,
        message: `Lote processado: ${result?.generated || 0} palpites, restam ${result?.remaining || 0}.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in generate-retroactive-predictions:', error)
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
