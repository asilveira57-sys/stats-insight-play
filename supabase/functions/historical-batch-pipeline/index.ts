import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SAFETY_TIMEOUT_MS = 100_000; // 100s safety (platform limit ~150s)

async function fetchAllUrls(supabase: any, sourceId: string) {
  const allUrls: any[] = [];
  let from = 0;
  const PAGE_SIZE = 500;
  while (true) {
    const { data: page, error } = await supabase
      .from('historical_source_urls')
      .select('id, url, pipeline_status, last_fetched_at, last_parsed_at, last_resolved_at, last_promoted_at')
      .eq('source_id', sourceId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!page?.length) break;
    allUrls.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allUrls;
}

function getUrlsNeedingWork(allUrls: any[], phases: string[]) {
  return allUrls
    .filter((u: any) => {
      if (u.pipeline_status === 'conflicts' || u.pipeline_status === 'promoted') return false;
      if (phases.includes('fetch') && !u.last_fetched_at) return true;
      if (phases.includes('parse') && u.last_fetched_at && !u.last_parsed_at) return true;
      if (phases.includes('resolve') && u.last_parsed_at && !u.last_resolved_at) return true;
      if (phases.includes('promote') && u.last_resolved_at && !u.last_promoted_at) return true;
      if (['idle', 'fetched', 'parsed', 'resolved'].includes(u.pipeline_status)) return true;
      return false;
    })
    .sort((a: any, b: any) => {
      const priority: Record<string, number> = { idle: 0, fetched: 1, parsed: 2, resolved: 3 };
      return (priority[a.pipeline_status] ?? 10) - (priority[b.pipeline_status] ?? 10);
    });
}

async function processOneUrl(supabase: any, url: any, phases: string[]) {
  const urlResult: any = { url: url.url, phases: {} };

  // Phase 1: Fetch
  if (phases.includes('fetch') && !url.last_fetched_at) {
    const { data, error } = await supabase.functions.invoke('historical-fetch', {
      body: { source_url_id: url.id },
    });
    urlResult.phases.fetch = error ? { error: error.message } : { status: data?.status };
    if (error) return { ...urlResult, failed: true };
    await new Promise(r => setTimeout(r, 500));
  }

  // Phase 2: Parse
  if (phases.includes('parse') && (url.last_fetched_at || urlResult.phases.fetch)) {
    const { data, error } = await supabase.functions.invoke('historical-parse', {
      body: { source_url_id: url.id },
    });
    urlResult.phases.parse = error ? { error: error.message } : { matches: data?.matches_parsed };
    if (error) return { ...urlResult, failed: true };
  }

  // Phase 3: Resolve
  if (phases.includes('resolve') && (url.last_parsed_at || urlResult.phases.parse)) {
    const { data, error } = await supabase.functions.invoke('historical-resolve', {
      body: { source_url_id: url.id },
    });
    urlResult.phases.resolve = error ? { error: error.message } : { resolved: data?.resolved, conflicts: data?.conflicts };
    if (error) return { ...urlResult, failed: true };
  }

  // Phase 4: Promote
  if (phases.includes('promote') && (url.last_resolved_at || urlResult.phases.resolve)) {
    const { data, error } = await supabase.functions.invoke('historical-promote', {
      body: { source_url_id: url.id },
    });
    urlResult.phases.promote = error ? { error: error.message } : { promoted: data?.promoted, duplicates: data?.duplicates };
    if (error) return { ...urlResult, failed: true };
  }

  return urlResult;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const body = await req.json();
    const { source_id, batch_size = 5, phases = ['fetch', 'parse', 'resolve', 'promote'], job_id: existing_job_id } = body;

    if (!source_id) {
      return new Response(JSON.stringify({ error: 'source_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Reuse existing job or create new one
    let jobId = existing_job_id;
    if (!jobId) {
      const { data: job } = await supabase.from('background_jobs').insert({
        job_type: 'historical_batch_pipeline',
        status: 'running',
        started_at: new Date().toISOString(),
        progress: { source_id, batch_size, phases, processed: 0, errors: 0 },
      }).select().single();
      jobId = job?.id;
    } else {
      await supabase.from('background_jobs').update({
        status: 'running',
        progress: { source_id, batch_size, phases, message: 'Continuing batch...' },
      }).eq('id', jobId);
    }

    // Fetch all URLs once
    const allUrls = await fetchAllUrls(supabase, source_id);

    if (!allUrls.length) {
      await supabase.from('background_jobs').update({
        status: 'completed', progress: { message: 'No URLs to process', total_urls: 0 },
      }).eq('id', jobId);
      return new Response(JSON.stringify({ success: true, processed: 0, message: 'Nenhuma URL para processar' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalProcessed = 0;
    let totalErrors = 0;
    const results: any[] = [];

    // ─── MAIN LOOP: process multiple batches within one invocation ───
    while (Date.now() - startTime < SAFETY_TIMEOUT_MS) {
      const needsWork = getUrlsNeedingWork(allUrls, phases);
      if (!needsWork.length) break;

      const batch = needsWork.slice(0, batch_size);

      for (const url of batch) {
        if (Date.now() - startTime > SAFETY_TIMEOUT_MS) break;

        try {
          const result = await processOneUrl(supabase, url, phases);
          results.push(result);
          if (result.failed) {
            totalErrors++;
          } else {
            totalProcessed++;
            // Update the in-memory URL so the next loop iteration knows it's done
            url.last_fetched_at = url.last_fetched_at || (result.phases.fetch ? new Date().toISOString() : null);
            url.last_parsed_at = url.last_parsed_at || (result.phases.parse ? new Date().toISOString() : null);
            url.last_resolved_at = url.last_resolved_at || (result.phases.resolve ? new Date().toISOString() : null);
            url.last_promoted_at = url.last_promoted_at || (result.phases.promote ? new Date().toISOString() : null);
            if (result.phases.promote) url.pipeline_status = 'promoted';
            else if (result.phases.resolve) url.pipeline_status = 'resolved';
            else if (result.phases.parse) url.pipeline_status = 'parsed';
            else if (result.phases.fetch) url.pipeline_status = 'fetched';
          }
        } catch (urlError: any) {
          totalErrors++;
          results.push({ url: url.url, error: urlError.message });
        }
      }

      // Update progress
      const remaining = getUrlsNeedingWork(allUrls, phases).length;
      await supabase.from('background_jobs').update({
        progress: {
          source_id, processed: totalProcessed, errors: totalErrors,
          remaining, total_urls: allUrls.length,
          duration_ms: Date.now() - startTime,
          message: `Processando... ${totalProcessed} concluídas, ${remaining} restantes`,
        },
      }).eq('id', jobId);

      if (remaining === 0) break;
    }

    const durationMs = Date.now() - startTime;
    const finalRemaining = getUrlsNeedingWork(allUrls, phases).length;

    if (finalRemaining > 0) {
      // Self-invoke for next round — AWAIT to ensure it fires before response
      await supabase.from('background_jobs').update({
        status: 'running',
        progress: {
          source_id, batch_size, phases,
          processed: totalProcessed, errors: totalErrors,
          remaining: finalRemaining, total_urls: allUrls.length,
          duration_ms: durationMs, auto_continue: true,
          message: `Lote concluído: ${totalProcessed} processadas. ${finalRemaining} restantes. Auto-continuando...`,
        },
      }).eq('id', jobId);

      const selfUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/historical-batch-pipeline`;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      // Await the fetch to ensure it's dispatched before function exits
      try {
        await fetch(selfUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ source_id, batch_size, phases, job_id: jobId }),
        });
      } catch (err) {
        console.error('Auto-continue dispatch failed:', err);
      }
    } else {
      await supabase.from('background_jobs').update({
        status: 'completed',
        progress: {
          source_id, processed: totalProcessed, errors: totalErrors,
          total_urls: allUrls.length, remaining: 0,
          duration_ms: durationMs,
          message: `Pipeline completo! ${totalProcessed} URLs processadas nesta execução.`,
        },
      }).eq('id', jobId);
    }

    return new Response(JSON.stringify({
      success: true, job_id: jobId,
      total_urls: allUrls.length, remaining: finalRemaining,
      processed: totalProcessed, errors: totalErrors,
      duration_ms: durationMs, auto_continue: finalRemaining > 0,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('historical-batch-pipeline error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
