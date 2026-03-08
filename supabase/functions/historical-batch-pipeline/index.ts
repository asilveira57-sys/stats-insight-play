import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SAFETY_TIMEOUT_MS = 110_000; // 110s safety (platform limit ~150s)

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
    const { source_id, batch_size = 5, phases = ['fetch', 'parse', 'resolve', 'promote'] } = body;

    if (!source_id) {
      return new Response(JSON.stringify({ error: 'source_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a background job for tracking
    const { data: job } = await supabase.from('background_jobs').insert({
      job_type: 'historical_batch_pipeline',
      status: 'running',
      started_at: new Date().toISOString(),
      progress: { source_id, batch_size, phases, processed: 0, errors: 0 },
    }).select().single();
    const jobId = job?.id;

    // Get pending URLs (those that haven't completed the full pipeline)
    const { data: urls, error: urlErr } = await supabase
      .from('historical_source_urls')
      .select('id, url, pipeline_status, last_fetched_at, last_parsed_at, last_resolved_at, last_promoted_at')
      .eq('source_id', source_id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (urlErr) throw urlErr;
    if (!urls?.length) {
      await supabase.from('background_jobs').update({
        status: 'completed', progress: { message: 'No URLs to process' },
      }).eq('id', jobId);
      return new Response(JSON.stringify({ success: true, processed: 0, message: 'Nenhuma URL para processar' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine which URLs need work based on their pipeline status
    const needsWork = urls.filter((u: any) => {
      if (phases.includes('fetch') && !u.last_fetched_at) return true;
      if (phases.includes('parse') && u.last_fetched_at && !u.last_parsed_at) return true;
      if (phases.includes('resolve') && u.last_parsed_at && !u.last_resolved_at) return true;
      if (phases.includes('promote') && u.last_resolved_at && !u.last_promoted_at) return true;
      // Also include URLs that are partially through the pipeline
      if (u.pipeline_status === 'idle' || u.pipeline_status === 'fetched' || u.pipeline_status === 'parsed' || u.pipeline_status === 'resolved' || u.pipeline_status === 'conflicts') return true;
      return false;
    }).slice(0, batch_size);

    let processed = 0;
    let errors = 0;
    const results: any[] = [];

    for (const url of needsWork) {
      // Safety timeout check
      if (Date.now() - startTime > SAFETY_TIMEOUT_MS) {
        results.push({ url: url.url, status: 'timeout', message: 'Safety timeout reached' });
        break;
      }

      try {
        const urlResult: any = { url: url.url, phases: {} };

        // Phase 1: Fetch (if needed)
        if (phases.includes('fetch') && !url.last_fetched_at) {
          const { data, error } = await supabase.functions.invoke('historical-fetch', {
            body: { source_url_id: url.id },
          });
          urlResult.phases.fetch = error ? { error: error.message } : { status: data?.status };
          if (error) { errors++; results.push(urlResult); continue; }
          // Small delay to be respectful
          await new Promise(r => setTimeout(r, 500));
        }

        // Phase 2: Parse (if needed)
        if (phases.includes('parse') && (url.last_fetched_at || urlResult.phases.fetch)) {
          const { data, error } = await supabase.functions.invoke('historical-parse', {
            body: { source_url_id: url.id },
          });
          urlResult.phases.parse = error ? { error: error.message } : { matches: data?.matches_parsed };
          if (error) { errors++; results.push(urlResult); continue; }
        }

        // Phase 3: Resolve (if needed)
        if (phases.includes('resolve') && (url.last_parsed_at || urlResult.phases.parse)) {
          const { data, error } = await supabase.functions.invoke('historical-resolve', {
            body: { source_url_id: url.id },
          });
          urlResult.phases.resolve = error ? { error: error.message } : { resolved: data?.resolved, conflicts: data?.conflicts };
          if (error) { errors++; results.push(urlResult); continue; }
        }

        // Phase 4: Promote (if needed)
        if (phases.includes('promote') && (url.last_resolved_at || urlResult.phases.resolve)) {
          const { data, error } = await supabase.functions.invoke('historical-promote', {
            body: { source_url_id: url.id },
          });
          urlResult.phases.promote = error ? { error: error.message } : { promoted: data?.promoted, duplicates: data?.duplicates };
          if (error) { errors++; results.push(urlResult); continue; }
        }

        processed++;
        results.push(urlResult);

        // Update progress
        await supabase.from('background_jobs').update({
          progress: { source_id, processed, errors, total: needsWork.length, current_url: url.url },
        }).eq('id', jobId);

      } catch (urlError: any) {
        errors++;
        results.push({ url: url.url, error: urlError.message });
      }
    }

    const durationMs = Date.now() - startTime;
    await supabase.from('background_jobs').update({
      status: 'completed',
      progress: {
        source_id,
        processed,
        errors,
        total_urls: urls.length,
        needs_work: needsWork.length,
        duration_ms: durationMs,
      },
    }).eq('id', jobId);

    return new Response(JSON.stringify({
      success: true,
      job_id: jobId,
      total_urls: urls.length,
      needs_work: needsWork.length,
      processed,
      errors,
      duration_ms: durationMs,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('historical-batch-pipeline error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
