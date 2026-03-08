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
        progress: { source_id, batch_size, phases, processed: 0, errors: 0, total_processed: 0 },
      }).select().single();
      jobId = job?.id;
    } else {
      // Mark as running again
      await supabase.from('background_jobs').update({
        status: 'running',
        progress: { source_id, batch_size, phases, message: 'Continuing batch...' },
      }).eq('id', jobId);
    }

    // Fetch ALL pending URLs using pagination (no 1000 limit)
    const allUrls: any[] = [];
    let from = 0;
    const PAGE_SIZE = 500;
    while (true) {
      const { data: page, error: pageErr } = await supabase
        .from('historical_source_urls')
        .select('id, url, pipeline_status, last_fetched_at, last_parsed_at, last_resolved_at, last_promoted_at')
        .eq('source_id', source_id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (pageErr) throw pageErr;
      if (!page?.length) break;
      allUrls.push(...page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    if (!allUrls.length) {
      await supabase.from('background_jobs').update({
        status: 'completed', progress: { message: 'No URLs to process', total_urls: 0 },
      }).eq('id', jobId);
      return new Response(JSON.stringify({ success: true, processed: 0, message: 'Nenhuma URL para processar' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine which URLs need work based on their pipeline status
    const needsWork = allUrls.filter((u: any) => {
      if (phases.includes('fetch') && !u.last_fetched_at) return true;
      if (phases.includes('parse') && u.last_fetched_at && !u.last_parsed_at) return true;
      if (phases.includes('resolve') && u.last_parsed_at && !u.last_resolved_at) return true;
      if (phases.includes('promote') && u.last_resolved_at && !u.last_promoted_at) return true;
      if (u.pipeline_status === 'idle' || u.pipeline_status === 'fetched' || u.pipeline_status === 'parsed' || u.pipeline_status === 'resolved' || u.pipeline_status === 'conflicts') return true;
      return false;
    });

    const batch = needsWork.slice(0, batch_size);

    let processed = 0;
    let errors = 0;
    const results: any[] = [];

    for (const url of batch) {
      if (Date.now() - startTime > SAFETY_TIMEOUT_MS) {
        results.push({ url: url.url, status: 'timeout', message: 'Safety timeout reached' });
        break;
      }

      try {
        const urlResult: any = { url: url.url, phases: {} };

        // Phase 1: Fetch
        if (phases.includes('fetch') && !url.last_fetched_at) {
          const { data, error } = await supabase.functions.invoke('historical-fetch', {
            body: { source_url_id: url.id },
          });
          urlResult.phases.fetch = error ? { error: error.message } : { status: data?.status };
          if (error) { errors++; results.push(urlResult); continue; }
          await new Promise(r => setTimeout(r, 500));
        }

        // Phase 2: Parse
        if (phases.includes('parse') && (url.last_fetched_at || urlResult.phases.fetch)) {
          const { data, error } = await supabase.functions.invoke('historical-parse', {
            body: { source_url_id: url.id },
          });
          urlResult.phases.parse = error ? { error: error.message } : { matches: data?.matches_parsed };
          if (error) { errors++; results.push(urlResult); continue; }
        }

        // Phase 3: Resolve
        if (phases.includes('resolve') && (url.last_parsed_at || urlResult.phases.parse)) {
          const { data, error } = await supabase.functions.invoke('historical-resolve', {
            body: { source_url_id: url.id },
          });
          urlResult.phases.resolve = error ? { error: error.message } : { resolved: data?.resolved, conflicts: data?.conflicts };
          if (error) { errors++; results.push(urlResult); continue; }
        }

        // Phase 4: Promote
        if (phases.includes('promote') && (url.last_resolved_at || urlResult.phases.resolve)) {
          const { data, error } = await supabase.functions.invoke('historical-promote', {
            body: { source_url_id: url.id },
          });
          urlResult.phases.promote = error ? { error: error.message } : { promoted: data?.promoted, duplicates: data?.duplicates };
          if (error) { errors++; results.push(urlResult); continue; }
        }

        processed++;
        results.push(urlResult);

        await supabase.from('background_jobs').update({
          progress: { source_id, processed, errors, total: batch.length, needs_work_total: needsWork.length, current_url: url.url },
        }).eq('id', jobId);

      } catch (urlError: any) {
        errors++;
        results.push({ url: url.url, error: urlError.message });
      }
    }

    const durationMs = Date.now() - startTime;
    const remainingWork = needsWork.length - processed;

    // If there's still work to do, auto-schedule the next batch
    if (remainingWork > 0) {
      // Create a new background_jobs entry that process-queue will pick up
      // OR directly re-invoke ourselves
      await supabase.from('background_jobs').update({
        status: 'running',
        progress: {
          source_id,
          batch_size,
          phases,
          last_batch_processed: processed,
          last_batch_errors: errors,
          remaining: remainingWork,
          total_urls: allUrls.length,
          needs_work: needsWork.length,
          duration_ms: durationMs,
          auto_continue: true,
          message: `Processed ${processed}/${batch.length}, ${remainingWork} remaining. Auto-continuing...`,
        },
      }).eq('id', jobId);

      // Auto-invoke next batch after a small delay (non-blocking)
      const selfUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/historical-batch-pipeline`;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      // Use EdgeRuntime.waitUntil-style: fire and forget next batch
      fetch(selfUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ source_id, batch_size, phases, job_id: jobId }),
      }).catch(err => console.error('Auto-continue failed:', err));

    } else {
      // All done
      await supabase.from('background_jobs').update({
        status: 'completed',
        progress: {
          source_id,
          processed,
          errors,
          total_urls: allUrls.length,
          needs_work: needsWork.length,
          duration_ms: durationMs,
          message: `Pipeline complete! ${allUrls.length - needsWork.length + processed} URLs fully processed.`,
        },
      }).eq('id', jobId);
    }

    return new Response(JSON.stringify({
      success: true,
      job_id: jobId,
      total_urls: allUrls.length,
      needs_work: needsWork.length,
      remaining: remainingWork,
      processed,
      errors,
      duration_ms: durationMs,
      auto_continue: remainingWork > 0,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('historical-batch-pipeline error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
