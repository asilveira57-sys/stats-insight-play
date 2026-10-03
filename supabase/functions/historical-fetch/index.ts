import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function cleanHtml(html: string): string {
  // Remove scripts and styles
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // Replace <br>, <p>, <div>, <tr>, <li> with newlines
  text = text.replace(/<(br|p|div|tr|li)[^>]*\/?>/gi, '\n');
  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode common entities
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  text = text.replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '');
  // Collapse whitespace per line, remove excessive blank lines
  text = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l.length > 0).join('\n');
  return text;
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
    const { source_url_id, job_id } = body;

    if (!source_url_id) {
      return new Response(JSON.stringify({ error: 'source_url_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get URL record
    const { data: urlRecord, error: urlError } = await supabase
      .from('historical_source_urls')
      .select('*, source:historical_sources(*)')
      .eq('id', source_url_id)
      .single();

    if (urlError || !urlRecord) {
      return new Response(JSON.stringify({ error: 'URL not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create or use existing job
    let currentJobId = job_id;
    if (!currentJobId) {
      const { data: newJob } = await supabase.from('historical_import_jobs').insert({
        source_id: urlRecord.source_id,
        source_url_id: source_url_id,
        provider_name: urlRecord.source?.provider_name || 'rsssf',
        job_type: 'fetch',
        status: 'running',
        started_at: new Date().toISOString(),
      }).select().single();
      currentJobId = newJob?.id;
    } else {
      await supabase.from('historical_import_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', currentJobId);
    }

    // Log start
    await supabase.from('historical_import_logs').insert({
      job_id: currentJobId,
      level: 'info',
      stage: 'fetch',
      message: `Iniciando coleta de ${urlRecord.url}`,
      payload: { url: urlRecord.url, source_url_id },
    });

    // Fetch the page
    let rawHtml = '';
    let httpStatus = 0;
    let contentType = '';

    try {
      const response = await fetch(urlRecord.url, {
        headers: {
          'User-Agent': 'AleballBot/1.0 (historical data research)',
          'Accept': 'text/html, text/plain, */*',
        },
      });
      httpStatus = response.status;
      contentType = response.headers.get('content-type') || '';
      rawHtml = await response.text();
    } catch (fetchErr: any) {
      // Log fetch error
      await supabase.from('historical_import_logs').insert({
        job_id: currentJobId,
        level: 'error',
        stage: 'fetch',
        message: `Erro ao buscar URL: ${fetchErr.message}`,
        payload: { url: urlRecord.url, error: fetchErr.message },
      });

      await supabase.from('historical_import_jobs').update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        error_summary: fetchErr.message,
      }).eq('id', currentJobId);

      await supabase.from('historical_source_urls').update({
        last_fetched_at: new Date().toISOString(),
        last_status: 'error',
        last_error: fetchErr.message,
      }).eq('id', source_url_id);

      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hash the content
    const documentHash = await hashText(rawHtml);

    // Check if same hash already exists (skip re-processing)
    if (urlRecord.last_hash === documentHash) {
      await supabase.from('historical_import_logs').insert({
        job_id: currentJobId,
        level: 'info',
        stage: 'fetch',
        message: 'Hash idêntico ao último fetch — conteúdo não mudou',
        payload: { hash: documentHash },
      });

      await supabase.from('historical_import_jobs').update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      }).eq('id', currentJobId);

      await supabase.from('historical_source_urls').update({
        last_fetched_at: new Date().toISOString(),
        last_status: 'unchanged',
      }).eq('id', source_url_id);

      return new Response(JSON.stringify({
        success: true,
        status: 'unchanged',
        hash: documentHash,
        job_id: currentJobId,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Clean the HTML
    const cleanedText = cleanHtml(rawHtml);

    // Store raw document
    await supabase.from('historical_raw_documents').insert({
      job_id: currentJobId,
      source_url_id: source_url_id,
      source_url: urlRecord.url,
      http_status: httpStatus,
      content_type: contentType,
      raw_html: rawHtml,
      cleaned_text: cleanedText,
      document_hash: documentHash,
    });

    // Update URL record
    await supabase.from('historical_source_urls').update({
      last_fetched_at: new Date().toISOString(),
      last_status: httpStatus >= 200 && httpStatus < 300 ? 'success' : `http_${httpStatus}`,
      last_hash: documentHash,
      last_error: null,
    }).eq('id', source_url_id);

    // Update job
    const durationMs = Date.now() - startTime;
    await supabase.from('historical_import_jobs').update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
    }).eq('id', currentJobId);

    // Log success
    await supabase.from('historical_import_logs').insert({
      job_id: currentJobId,
      level: 'info',
      stage: 'fetch',
      message: `Coleta concluída: ${rawHtml.length} bytes, hash ${documentHash.slice(0, 12)}...`,
      payload: {
        http_status: httpStatus,
        content_length: rawHtml.length,
        cleaned_length: cleanedText.length,
        hash: documentHash,
        duration_ms: durationMs,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      status: 'fetched',
      job_id: currentJobId,
      hash: documentHash,
      http_status: httpStatus,
      raw_length: rawHtml.length,
      cleaned_length: cleanedText.length,
      duration_ms: durationMs,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('historical-fetch error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
