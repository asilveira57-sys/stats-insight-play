import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function slugify(str: string): string {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/\s/g, '-')
    .replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
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
    const { source_url_id, batch_size = 100, dry_run = false } = body;

    if (!source_url_id) {
      return new Response(JSON.stringify({ error: 'source_url_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create job
    const { data: jobData } = await supabase.from('historical_import_jobs').insert({
      source_url_id,
      job_type: dry_run ? 'promote_dry' : 'promote',
      status: 'running',
      provider_name: 'system',
      started_at: new Date().toISOString(),
    }).select().single();
    const jobId = jobData?.id;

    // Get resolved staging matches
    const { data: staging, error: stErr } = await supabase
      .from('historical_staging_matches')
      .select('*')
      .eq('source_url_id', source_url_id)
      .eq('status', 'resolved')
      .limit(batch_size);

    if (stErr) throw stErr;
    if (!staging?.length) {
      await supabase.from('historical_import_jobs').update({
        status: 'completed', finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      }).eq('id', jobId);
      return new Response(JSON.stringify({ success: true, promoted: 0, skipped: 0, message: 'Nenhuma partida resolvida para promover' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('historical_import_logs').insert({
      job_id: jobId, level: 'info', stage: 'promote',
      message: `${dry_run ? '[DRY RUN] ' : ''}Promovendo ${staging.length} partidas...`,
    });

    let promoted = 0;
    let skipped = 0;
    let duplicates = 0;

    for (const sm of staging) {
      if (!sm.home_team_id || !sm.away_team_id || !sm.match_date) {
        skipped++;
        await supabase.from('historical_staging_matches').update({
          status: 'skipped',
          resolution_notes: (sm.resolution_notes || '') + '; Missing required fields for promotion',
        }).eq('id', sm.id);
        continue;
      }

      // Check for existing match (dedup by team pair + date)
      const { data: existing } = await supabase
        .from('partidas')
        .select('id')
        .eq('time_casa_id', sm.home_team_id)
        .eq('time_fora_id', sm.away_team_id)
        .eq('data', sm.match_date)
        .limit(1);

      if (existing?.length) {
        duplicates++;
        await supabase.from('historical_staging_matches').update({
          status: 'skipped',
          promoted_match_id: existing[0].id,
          resolution_notes: (sm.resolution_notes || '') + '; Partida já existe',
        }).eq('id', sm.id);
        continue;
      }

      if (dry_run) {
        promoted++;
        continue;
      }

      // Generate slug
      const { data: homeTeam } = await supabase.from('times').select('slug').eq('id', sm.home_team_id).single();
      const { data: awayTeam } = await supabase.from('times').select('slug').eq('id', sm.away_team_id).single();
      const matchSlug = `${homeTeam?.slug || 'home'}-vs-${awayTeam?.slug || 'away'}-${sm.match_date}`;

      // Insert into partidas
      const { data: newMatch, error: insertErr } = await supabase.from('partidas').insert({
        time_casa_id: sm.home_team_id,
        time_fora_id: sm.away_team_id,
        liga_id: sm.liga_id,
        data: sm.match_date,
        gols_casa: sm.score_home,
        gols_fora: sm.score_away,
        status: sm.score_home !== null ? 'finished' : 'scheduled',
        rodada: sm.round_raw ? parseInt(sm.round_raw) || null : null,
        slug: matchSlug,
      }).select('id').single();

      if (insertErr) {
        await supabase.from('historical_import_logs').insert({
          job_id: jobId, level: 'error', stage: 'promote',
          message: `Erro inserindo partida: ${insertErr.message}`,
          payload: { staging_id: sm.id, home: sm.home_team_raw, away: sm.away_team_raw },
        });
        skipped++;
        continue;
      }

      // Update staging record
      await supabase.from('historical_staging_matches').update({
        status: 'promoted',
        promoted_match_id: newMatch?.id,
      }).eq('id', sm.id);

      promoted++;
    }

    // Update URL record
    await supabase.from('historical_source_urls').update({
      pipeline_status: 'promoted',
      last_promoted_at: new Date().toISOString(),
      staging_promoted: promoted,
    }).eq('id', source_url_id);

    const durationMs = Date.now() - startTime;
    await supabase.from('historical_import_jobs').update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      total_promoted: promoted,
      total_ignored: skipped + duplicates,
    }).eq('id', jobId);

    await supabase.from('historical_import_logs').insert({
      job_id: jobId, level: 'info', stage: 'promote',
      message: `${dry_run ? '[DRY RUN] ' : ''}Promoção concluída: ${promoted} promovidas, ${duplicates} duplicatas, ${skipped} ignoradas`,
    });

    return new Response(JSON.stringify({
      success: true,
      job_id: jobId,
      promoted,
      duplicates,
      skipped,
      dry_run,
      duration_ms: durationMs,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('historical-promote error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
