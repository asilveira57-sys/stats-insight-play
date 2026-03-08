import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const SAFETY_TIMEOUT = 100_000; // 100s safety
  const startTime = Date.now();

  try {
    let limit = 50;
    let dryRun = true;
    try {
      const body = await req.json();
      if (body.limit) limit = Math.min(body.limit, 200);
      if (body.dry_run === false) dryRun = false;
    } catch { /* defaults */ }

    // Step 1: Find exact duplicate groups (same time_casa_id + time_fora_id + data)
    const { data: dupsRaw, error: dupsErr } = await supabase.rpc('get_duplicate_match_groups', { p_limit: limit });

    type DupGroup = {
      time_casa_id: string;
      time_fora_id: string;
      data: string;
      liga_id: string;
      ids: string[];
    };

    let dupGroups: DupGroup[] = [];

    // Prefer RPC output when available
    if (!dupsErr && Array.isArray(dupsRaw)) {
      dupGroups = dupsRaw
        .filter((g: any) => g?.time_casa_id && g?.time_fora_id && g?.data && Array.isArray(g?.ids))
        .map((g: any) => ({
          time_casa_id: g.time_casa_id,
          time_fora_id: g.time_fora_id,
          data: g.data,
          liga_id: g.liga_id,
          ids: g.ids,
        }));
    }

    // If RPC doesn't exist or failed, fall back to manual detection
    if (dupsErr) {
      console.log('RPC not found/failed, using manual detection');
      // Fetch matches grouped by potential duplicates
      // We'll query matches ordered by data and look for same-day same-team combos
      const { data: matches, error: mErr } = await supabase
        .from('partidas')
        .select('id, time_casa_id, time_fora_id, data, liga_id, gols_casa, gols_fora, api_id, status, rodada, hora, created_at')
        .order('data', { ascending: true });

      if (mErr) throw mErr;

      // Group by (time_casa_id, time_fora_id, data)
      const groupMap = new Map<string, any[]>();
      for (const m of matches || []) {
        const key = `${m.time_casa_id}|${m.time_fora_id}|${m.data}`;
        const arr = groupMap.get(key) || [];
        arr.push(m);
        groupMap.set(key, arr);
      }

      // Filter groups with more than 1 match
      for (const [_key, group] of groupMap) {
        if (group.length > 1) {
          dupGroups.push({
            time_casa_id: group[0].time_casa_id,
            time_fora_id: group[0].time_fora_id,
            data: group[0].data,
            liga_id: group[0].liga_id,
            ids: group.map(m => m.id),
          });
        }
      }

      // Sort by group size descending, limit
      dupGroups.sort((a, b) => b.ids.length - a.ids.length);
      dupGroups = dupGroups.slice(0, limit);
    }

    console.log(`Found ${dupGroups.length} duplicate groups to process`);

    if (dryRun) {
      // Count total excess
      const totalExcess = dupGroups.reduce((s, g) => s + g.ids.length - 1, 0);
      return new Response(JSON.stringify({
        dry_run: true,
        groups_found: dupGroups.length,
        total_excess: totalExcess,
        sample: dupGroups.slice(0, 10).map(g => ({
          data: g.data,
          liga_id: g.liga_id,
          count: g.ids.length,
        })),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Process each group
    let merged = 0;
    let deleted = 0;
    let errors = 0;

    for (const group of dupGroups) {
      if ((Date.now() - startTime) > SAFETY_TIMEOUT) break;

      try {
        // Fetch full details for all matches in group
        const { data: groupMatches } = await supabase
          .from('partidas')
          .select('id, time_casa_id, time_fora_id, data, liga_id, gols_casa, gols_fora, api_id, status, rodada, hora, slug, created_at')
          .in('id', group.ids)
          .order('created_at', { ascending: true });

        if (!groupMatches || groupMatches.length < 2) continue;

        // Choose the \"best\" record to keep: prefer one with api_id, finished status, scores
        const scored = groupMatches.map(m => ({
          ...m,
          score: (m.api_id ? 10 : 0) +
                 (m.status === 'finished' ? 5 : 0) +
                 (m.gols_casa !== null ? 3 : 0) +
                 (m.rodada ? 2 : 0) +
                 (m.hora ? 1 : 0),
        }));
        scored.sort((a, b) => b.score - a.score);

        const keeper = scored[0];
        const toRemove = scored.slice(1);

        // Enrich keeper with data from duplicates
        const updates: any = {};
        for (const dup of toRemove) {
          if (!keeper.gols_casa && dup.gols_casa !== null) {
            updates.gols_casa = dup.gols_casa;
            updates.gols_fora = dup.gols_fora;
          }
          if (!keeper.api_id && dup.api_id) updates.api_id = dup.api_id;
          if (!keeper.rodada && dup.rodada) updates.rodada = dup.rodada;
          if (!keeper.hora && dup.hora) updates.hora = dup.hora;
          if (keeper.status !== 'finished' && dup.status === 'finished') updates.status = 'finished';
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from('partidas').update(updates).eq('id', keeper.id);
        }

        const removeIds = toRemove.map(d => d.id);

        // Migrate foreign key references to keeper
        // palpites
        await supabase.from('palpites')
          .update({ partida_id: keeper.id })
          .in('partida_id', removeIds);

        // palpites_usuarios
        await supabase.from('palpites_usuarios')
          .update({ partida_id: keeper.id })
          .in('partida_id', removeIds);

        // comparativo_resultados
        await supabase.from('comparativo_resultados')
          .update({ partida_id: keeper.id })
          .in('partida_id', removeIds);

        // gols_partida
        await supabase.from('gols_partida')
          .update({ partida_id: keeper.id })
          .in('partida_id', removeIds);

        // noticias
        await supabase.from('noticias')
          .update({ partida_id: keeper.id })
          .in('partida_id', removeIds);

        // estatisticas
        await supabase.from('estatisticas')
          .update({ partida_id: keeper.id })
          .in('partida_id', removeIds);

        // escalacoes
        await supabase.from('escalacoes')
          .update({ partida_id: keeper.id })
          .in('partida_id', removeIds);

        // cartoes_partida
        await supabase.from('cartoes_partida')
          .update({ partida_id: keeper.id })
          .in('partida_id', removeIds);

        // highlights
        await supabase.from('highlights')
          .update({ match_id: keeper.id })
          .in('match_id', removeIds);

        // match_events
        await supabase.from('match_events')
          .update({ match_id: keeper.id })
          .in('match_id', removeIds);

        // cartola_partidas
        await supabase.from('cartola_partidas')
          .update({ partida_statball_id: keeper.id })
          .in('partida_statball_id', removeIds);

        // kaggle_staging_matches
        await supabase.from('kaggle_staging_matches' as any)
          .update({ matched_match_id: keeper.id })
          .in('matched_match_id', removeIds);

        // kaggle_match_links
        await supabase.from('kaggle_match_links' as any)
          .update({ partida_id: keeper.id })
          .in('partida_id', removeIds);

        // historical_staging_matches
        await supabase.from('historical_staging_matches' as any)
          .update({ matched_match_id: keeper.id })
          .in('matched_match_id', removeIds);

        // tecnico_partida
        await supabase.from('tecnico_partida' as any)
          .update({ partida_id: keeper.id })
          .in('partida_id', removeIds);

        // xp_events
        await supabase.from('xp_events' as any)
          .update({ match_id: keeper.id })
          .in('match_id', removeIds);

        // Delete duplicates
        const { error: delErr } = await supabase
          .from('partidas')
          .delete()
          .in('id', removeIds);

        if (delErr) {
          console.error(`Delete error for group ${keeper.id}:`, delErr);
          errors++;
          continue;
        }

        merged++;
        deleted += removeIds.length;
        console.log(`Merged group: kept ${keeper.id}, deleted ${removeIds.length}`);

      } catch (e) {
        console.error('Error processing group:', e);
        errors++;
      }
    }

    // Count remaining dups accurately (without the default row cap)
    let remainingDups = 0;
    const { data: remainingRpc, error: remainingErr } = await supabase.rpc('count_duplicate_matches');

    if (!remainingErr && Array.isArray(remainingRpc) && remainingRpc[0]) {
      remainingDups = Number(remainingRpc[0].dup_records || 0);
    } else {
      console.warn('count_duplicate_matches RPC unavailable, using paginated fallback');
      const pageSize = 1000;
      const remainGroupMap = new Map<string, number>();
      let from = 0;

      while (true) {
        const { data: chunk, error: chunkErr } = await supabase
          .from('partidas')
          .select('time_casa_id, time_fora_id, data')
          .range(from, from + pageSize - 1);

        if (chunkErr) throw chunkErr;
        if (!chunk || chunk.length === 0) break;

        for (const m of chunk) {
          const key = `${m.time_casa_id}|${m.time_fora_id}|${m.data}`;
          remainGroupMap.set(key, (remainGroupMap.get(key) || 0) + 1);
        }

        if (chunk.length < pageSize) break;
        from += pageSize;
      }

      for (const count of remainGroupMap.values()) {
        if (count > 1) remainingDups += count - 1;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      groups_processed: merged,
      records_deleted: deleted,
      errors,
      remaining_duplicates: remainingDups,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
