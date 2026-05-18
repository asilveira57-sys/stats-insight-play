import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SAFETY_TIMEOUT_MS = 120_000 // stop work before platform 150s idle limit

async function runJob(limit: number, jobId: string | null) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const startTime = Date.now()

  try {
    console.log(`[job ${jobId}] Starting retroactive prediction generation (limit: ${limit})...`)

    // Existing predictions
    const existingPartidaIds = new Set<string>()
    let offset = 0
    const batchSize = 1000
    while (true) {
      const { data, error } = await supabase
        .from('palpites')
        .select('partida_id')
        .range(offset, offset + batchSize - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      data.forEach((p: any) => existingPartidaIds.add(p.partida_id))
      if (data.length < batchSize) break
      offset += batchSize
    }
    console.log(`[job ${jobId}] Found ${existingPartidaIds.size} existing predictions`)

    let successCount = 0
    let errorCount = 0
    const generated: string[] = []
    const errors: string[] = []

    // Stream finished matches page by page; stop when limit reached or time runs out
    offset = 0
    outer: while (successCount + errorCount < limit) {
      if (Date.now() - startTime > SAFETY_TIMEOUT_MS) {
        console.log(`[job ${jobId}] Safety timeout reached, stopping`)
        break
      }

      const { data: matches, error } = await supabase
        .from('partidas')
        .select('id, data')
        .eq('status', 'finished')
        .not('gols_casa', 'is', null)
        .not('gols_fora', 'is', null)
        .order('data', { ascending: true })
        .range(offset, offset + batchSize - 1)
      if (error) throw error
      if (!matches || matches.length === 0) break

      for (const match of matches) {
        if (successCount + errorCount >= limit) break outer
        if (Date.now() - startTime > SAFETY_TIMEOUT_MS) break outer
        if (existingPartidaIds.has(match.id)) continue

        try {
          const { data, error: rpcErr } = await supabase.rpc('gerar_palpite_sistema', {
            p_partida_id: match.id,
          })
          if (rpcErr) {
            errors.push(`Match ${match.id}: ${rpcErr.message}`)
            errorCount++
          } else {
            generated.push(match.id)
            successCount++
            try {
              await supabase.rpc('processar_resultado_partida', { p_partida_id: match.id })
            } catch (procError) {
              console.error(`Error processing result for match ${match.id}:`, procError)
            }
          }
        } catch (e: any) {
          errors.push(`Match ${match.id}: ${e?.message || String(e)}`)
          errorCount++
        }
      }

      if (matches.length < batchSize) break
      offset += batchSize
    }

    const result = {
      generated: successCount,
      failed: errorCount,
      matchIdsGenerated: generated.slice(0, 10),
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
    console.log(`[job ${jobId}] Complete:`, result)

    if (jobId) {
      await supabase.from('sync_logs').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        records_processed: successCount,
        records_failed: errorCount,
        details: result,
      }).eq('id', jobId)
    }
  } catch (error: any) {
    console.error(`[job ${jobId}] Fatal error:`, error)
    if (jobId) {
      await supabase.from('sync_logs').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error?.message || String(error),
      }).eq('id', jobId)
    }
  }
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

    // Fire and forget — survives the 150s response timeout
    // @ts-ignore EdgeRuntime is provided at runtime
    EdgeRuntime.waitUntil(runJob(limit, jobId))

    return new Response(
      JSON.stringify({
        success: true,
        accepted: true,
        job_id: jobId,
        message: `Geração iniciada em background (limite: ${limit}). Acompanhe pelos logs.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 202,
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
