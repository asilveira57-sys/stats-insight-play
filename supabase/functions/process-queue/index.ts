import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const SAFETY_TIMEOUT = 120_000; // 120s safety (platform limit is 150s)
  const startTime = Date.now();

  // Get all running jobs
  const { data: jobs, error: jobsError } = await supabase
    .from('background_jobs')
    .select('*')
    .eq('status', 'running');

  if (jobsError || !jobs?.length) {
    return new Response(JSON.stringify({ message: 'No running jobs' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: any[] = [];

  // Process items round-robin across running jobs until safety timer
  let madeProgress = true;
  while (madeProgress && (Date.now() - startTime) < SAFETY_TIMEOUT) {
    madeProgress = false;

    // Re-check which jobs are still running (could be stopped mid-execution)
    const { data: currentJobs } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'running');

    if (!currentJobs?.length) break;

    for (const job of currentJobs) {
      if ((Date.now() - startTime) > SAFETY_TIMEOUT) break;

      try {
        const result = await processJobItem(job, SUPABASE_URL, SERVICE_ROLE_KEY, supabase);
        results.push({ job_type: job.job_type, ...result });
        if (!result.isDone) madeProgress = true;

        // Delay between calls to respect rate limits
        const delayMs = job.job_type === 'image_fix' ? 8000 : 3000;
        if ((Date.now() - startTime + delayMs) < SAFETY_TIMEOUT) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      } catch (e) {
        const progress = job.progress || {};
        const consecutiveErrors = (progress.consecutive_errors || 0) + 1;
        const errMsg = String(e).slice(0, 200);

        if (consecutiveErrors >= 10) {
          await supabase.from('background_jobs').update({
            status: 'failed',
            progress: { ...progress, consecutive_errors: consecutiveErrors, last_error: errMsg, last_log: `❌ Parado após ${consecutiveErrors} erros: ${errMsg}` },
            updated_at: new Date().toISOString(),
          }).eq('id', job.id);
        } else {
          await supabase.from('background_jobs').update({
            progress: { ...progress, consecutive_errors: consecutiveErrors, last_error: errMsg, last_log: `⚠️ Erro (${consecutiveErrors}/10): ${errMsg}` },
            updated_at: new Date().toISOString(),
          }).eq('id', job.id);
          madeProgress = true; // retry next round
        }

        results.push({ job_type: job.job_type, error: errMsg });

        // Backoff on error
        const backoff = Math.min(5000 * consecutiveErrors, 30000);
        if ((Date.now() - startTime + backoff) < SAFETY_TIMEOUT) {
          await new Promise(r => setTimeout(r, backoff));
        }
      }
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

async function processJobItem(job: any, supabaseUrl: string, serviceKey: string, supabase: any) {
  const functionMap: Record<string, { fn: string; body: any }> = {
    predictions: { fn: 'generate-predictions', body: {} },
    retro_predictions: { fn: 'generate-retroactive-predictions', body: { limit: 100 } },
    analyses: { fn: 'generate-match-analysis', body: { limit: 1 } },
    retro_articles: { fn: 'generate-retroactive-articles', body: { limit: 1 } },
    validations: { fn: 'generate-validation-article', body: { limit: 3, skip_images: true } },
    image_fix: { fn: 'fix-article-thumbnails', body: { limit: 1 } },
  };

  const config = functionMap[job.job_type];
  if (!config) throw new Error(`Unknown job type: ${job.job_type}`);

  const res = await fetch(`${supabaseUrl}/functions/v1/${config.fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(config.body),
  });

  if (!res.ok) {
    const text = await res.text();
    // Check for rate limit
    if (res.status === 429) {
      throw new Error(`429 Rate limit: ${text.slice(0, 100)}`);
    }
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const progress = job.progress || {};
  let updated: any;
  let isDone = false;

  switch (job.job_type) {
    case 'predictions': {
      const gen = data?.generated || 0;
      const fail = data?.failed || 0;
      const newGenerated = (progress.generated || 0) + gen;
      const newFailed = (progress.failed || 0) + fail;
      isDone = gen === 0 && fail === 0;
      updated = {
        generated: newGenerated, failed: newFailed,
        total: data?.totalScheduled || progress.total || 0,
        consecutive_errors: 0,
        last_log: isDone
          ? `🏁 Concluído! ${newGenerated} palpites gerados.`
          : `✅ +${gen} gerados (total: ${newGenerated})`
      };
      break;
    }
    case 'retro_predictions': {
      const gen = data?.generated || 0;
      const fail = data?.failed || 0;
      const newGenerated = (progress.generated || 0) + gen;
      const newFailed = (progress.failed || 0) + fail;
      isDone = gen === 0 && fail === 0;
      updated = {
        generated: newGenerated, failed: newFailed,
        total: data?.totalFinished || progress.total || 0,
        consecutive_errors: 0,
        last_log: isDone
          ? `🏁 Concluído! ${newGenerated} palpites retroativos.`
          : `✅ +${gen} gerados (total: ${newGenerated})`
      };
      break;
    }
    case 'analyses': {
      const results = data?.results || {};
      const gen = results.created || 0;
      const fail = results.errors?.length || 0;
      const skipped = results.skipped || 0;
      const pending = results.stats?.actionableWithoutAnalysis ?? results.stats?.withoutAnalysis ?? 0;
      const newGenerated = (progress.generated || 0) + gen;
      const newFailed = (progress.failed || 0) + fail;
      isDone = pending === 0 || (gen === 0 && fail === 0 && skipped === 0);
      updated = {
        generated: newGenerated, failed: newFailed,
        pending, total: (results.stats?.actionableWithoutAnalysis ?? results.stats?.totalInWindow ?? progress.total ?? 0),
        consecutive_errors: 0,
        last_log: isDone
          ? `🏁 Concluído! ${newGenerated} análises geradas.`
          : skipped > 0
            ? `⏭️ ${skipped} puladas (pendentes: ${pending})`
            : `✅ +${gen} análise (pendentes: ${pending})`
      };
      break;
    }
    case 'retro_articles': {
      const gen = data?.created || 0;
      const fail = data?.failed || 0;
      const pending = data?.progress?.remaining ?? 0;
      const total = data?.progress?.total ?? progress.total ?? 0;
      const newGenerated = (progress.generated || 0) + gen;
      const newFailed = (progress.failed || 0) + fail;
      isDone = pending === 0;
      const newArticles = (data?.processed || []).filter((a: any) => a.success).map((a: any) => ({
        slug: a.slug, titulo: `${a.time_casa} x ${a.time_fora}`, data: a.data,
      }));
      const existingArticles = progress.last_articles || [];
      updated = {
        generated: newGenerated, failed: newFailed,
        pending, total,
        consecutive_errors: 0,
        last_articles: [...newArticles, ...existingArticles].slice(0, 10),
        last_log: isDone
          ? `🏁 Concluído! ${newGenerated} artigos retroativos gerados.`
          : gen > 0
            ? `✅ +${gen} artigo (pendentes: ${pending})`
            : `⏭️ Nenhum novo (pendentes: ${pending})`
      };
      break;
    }
    case 'validations': {
      const results = data?.results || {};
      const gen = results.created || 0;
      const fail = results.errors?.length || 0;
      const pending = results.stats?.pending || 0;
      const newGenerated = (progress.generated || 0) + gen;
      const newFailed = (progress.failed || 0) + fail;
      isDone = (gen === 0 && fail === 0 && (results.skipped || 0) === 0) || pending === 0;
      const articles = results.articles || [];
      // Merge new articles with existing ones (keep last 10)
      const existingArticles = progress.last_articles || [];
      updated = {
        generated: newGenerated, failed: newFailed,
        pending, total: results.stats?.totalWithComparativo || progress.total || 0,
        consecutive_errors: 0,
        last_articles: [...articles, ...existingArticles].slice(0, 10),
        last_log: isDone
          ? `🏁 Concluído! ${newGenerated} artigos de validação.`
          : gen > 0
            ? `✅ +${gen} artigo (pendentes: ${pending})`
            : `⏭️ ${results.skipped || 0} pulados (pendentes: ${pending})`
      };
      break;
    }
    case 'image_fix': {
      const fixed = data?.fixed || 0;
      const errors = data?.errors || 0;
      const pending = data?.pending || 0;
      const newFixed = (progress.fixed || 0) + fixed;
      const newFailed = (progress.failed || 0) + errors;
      isDone = pending === 0 || (fixed === 0 && errors === 0);
      const newResults = data?.results || [];
      const existingResults = progress.last_results || [];
      updated = {
        fixed: newFixed, failed: newFailed, pending,
        consecutive_errors: 0,
        last_results: [...newResults, ...existingResults].slice(0, 10),
        last_log: isDone
          ? `🏁 Concluído! ${newFixed} imagens corrigidas.`
          : fixed > 0
            ? `✅ +${fixed} imagem (pendentes: ${pending})`
            : `❌ Erro na imagem (pendentes: ${pending})`
      };
      break;
    }
    default:
      throw new Error(`Unhandled job type: ${job.job_type}`);
  }

  await supabase.from('background_jobs').update({
    status: isDone ? 'completed' : 'running',
    progress: updated,
    updated_at: new Date().toISOString(),
  }).eq('id', job.id);

  return { isDone, ...updated };
}
