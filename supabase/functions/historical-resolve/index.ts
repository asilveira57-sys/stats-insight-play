import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeName(str: string): string {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function slugify(str: string): string {
  if (!str) return '';
  let slug = normalizeName(str);
  slug = slug.replace(/\s/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return slug;
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
    const { source_url_id, batch_size = 100 } = body;

    if (!source_url_id) {
      return new Response(JSON.stringify({ error: 'source_url_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create job
    const { data: jobData } = await supabase.from('historical_import_jobs').insert({
      source_url_id,
      job_type: 'resolve',
      status: 'running',
      provider_name: 'system',
      started_at: new Date().toISOString(),
    }).select().single();
    const jobId = jobData?.id;

    // Get unresolved staging matches
    const { data: staging, error: stErr } = await supabase
      .from('historical_staging_matches')
      .select('*')
      .eq('source_url_id', source_url_id)
      .eq('status', 'parsed')
      .limit(batch_size);

    if (stErr) throw stErr;
    if (!staging?.length) {
      await supabase.from('historical_import_jobs').update({
        status: 'completed', finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      }).eq('id', jobId);
      return new Response(JSON.stringify({ success: true, resolved: 0, message: 'Nenhuma partida pendente' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('historical_import_logs').insert({
      job_id: jobId, level: 'info', stage: 'resolve',
      message: `Resolvendo ${staging.length} partidas...`,
    });

    // Load all teams and aliases for matching
    const { data: allTeams } = await supabase.from('times').select('id, nome, slug').eq('ativo', true);
    const { data: allAliases } = await supabase.from('team_aliases').select('team_id, alias, normalized_alias');
    const { data: allLeagues } = await supabase.from('ligas').select('id, nome, slug');
    const { data: compAliases } = await supabase.from('competition_aliases').select('league_id, alias, normalized_alias');

    // Build lookup maps
    const teamBySlug = new Map<string, any>();
    const teamByNorm = new Map<string, any>();
    for (const t of (allTeams || [])) {
      teamBySlug.set(t.slug, t);
      teamByNorm.set(normalizeName(t.nome), t);
    }
    for (const a of (allAliases || [])) {
      if (a.normalized_alias) {
        teamByNorm.set(a.normalized_alias, { id: a.team_id });
      }
    }

    const leagueBySlug = new Map<string, any>();
    const leagueByNorm = new Map<string, any>();
    for (const l of (allLeagues || [])) {
      if (l.slug) leagueBySlug.set(l.slug, l);
      leagueByNorm.set(normalizeName(l.nome), l);
    }
    for (const ca of (compAliases || [])) {
      if (ca.normalized_alias) {
        leagueByNorm.set(ca.normalized_alias, { id: ca.league_id });
      }
    }

    function resolveTeam(raw: string): { id: string | null; confidence: string } {
      const norm = normalizeName(raw);
      const slug = slugify(raw);

      // 1. Exact slug match
      const bySlug = teamBySlug.get(slug);
      if (bySlug) return { id: bySlug.id, confidence: 'exact' };

      // 2. Normalized name match
      const byNorm = teamByNorm.get(norm);
      if (byNorm) return { id: byNorm.id, confidence: 'high' };

      // 3. Fuzzy: check if norm is contained in any team name or vice versa
      for (const [key, team] of teamByNorm) {
        if (key.includes(norm) || norm.includes(key)) {
          if (Math.abs(key.length - norm.length) < 5) {
            return { id: team.id, confidence: 'medium' };
          }
        }
      }

      return { id: null, confidence: 'unresolved' };
    }

    function resolveLeague(raw: string): { id: string | null; confidence: string } {
      if (!raw) return { id: null, confidence: 'pending' };
      const norm = normalizeName(raw);
      const slug = slugify(raw);

      const bySlug = leagueBySlug.get(slug);
      if (bySlug) return { id: bySlug.id, confidence: 'exact' };

      const byNorm = leagueByNorm.get(norm);
      if (byNorm) return { id: byNorm.id, confidence: 'high' };

      for (const [key, league] of leagueByNorm) {
        if (key.includes(norm) || norm.includes(key)) {
          return { id: league.id, confidence: 'medium' };
        }
      }

      return { id: null, confidence: 'unresolved' };
    }

    // Resolve each staging match
    let resolved = 0;
    let conflicts = 0;

    for (const sm of staging) {
      const home = resolveTeam(sm.home_team_raw);
      const away = resolveTeam(sm.away_team_raw);
      const league = resolveLeague(sm.competition_raw || '');

      const allResolved = home.id && away.id;
      const newStatus = allResolved ? 'resolved' : 'conflict';
      if (allResolved) resolved++; else conflicts++;

      const notes: string[] = [];
      if (!home.id) notes.push(`Home '${sm.home_team_raw}' não encontrado`);
      if (!away.id) notes.push(`Away '${sm.away_team_raw}' não encontrado`);
      if (!league.id && sm.competition_raw) notes.push(`Liga '${sm.competition_raw}' não encontrada`);

      await supabase.from('historical_staging_matches').update({
        home_team_id: home.id,
        away_team_id: away.id,
        liga_id: league.id,
        home_team_confidence: home.confidence,
        away_team_confidence: away.confidence,
        liga_confidence: league.confidence,
        status: newStatus,
        resolution_notes: notes.length ? notes.join('; ') : null,
        updated_at: new Date().toISOString(),
      }).eq('id', sm.id);
    }

    // Update URL record
    await supabase.from('historical_source_urls').update({
      pipeline_status: conflicts > 0 ? 'conflicts' : 'resolved',
      last_resolved_at: new Date().toISOString(),
      staging_resolved: resolved,
    }).eq('id', source_url_id);

    const durationMs = Date.now() - startTime;
    await supabase.from('historical_import_jobs').update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      total_promoted: resolved,
      total_conflicts: conflicts,
    }).eq('id', jobId);

    await supabase.from('historical_import_logs').insert({
      job_id: jobId, level: 'info', stage: 'resolve',
      message: `Resolução concluída: ${resolved} resolvidas, ${conflicts} conflitos em ${durationMs}ms`,
    });

    return new Response(JSON.stringify({
      success: true,
      job_id: jobId,
      resolved,
      conflicts,
      total: staging.length,
      duration_ms: durationMs,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('historical-resolve error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
