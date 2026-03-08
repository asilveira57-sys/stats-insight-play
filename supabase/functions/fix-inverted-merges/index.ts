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

  try {
    let dryRun = true;
    try {
      const body = await req.json();
      if (body.dry_run === false) dryRun = false;
    } catch { /* default dry_run=true */ }

    // Find teams with slug ending in -1 that are active, whose canonical (without -1) is merged
    const { data: allTeams, error: teamsErr } = await supabase
      .from('times')
      .select('id, nome, slug, status')
      .order('slug');

    if (teamsErr) throw teamsErr;

    const teamsBySlug = new Map<string, any[]>();
    for (const t of allTeams || []) {
      if (!t.slug) continue;
      const arr = teamsBySlug.get(t.slug) || [];
      arr.push(t);
      teamsBySlug.set(t.slug, arr);
    }

    // Find inverted merges: slug-1 is active, slug (canonical) is merged
    const invertedPairs: { dup: any; canonical: any }[] = [];

    for (const t of allTeams || []) {
      if (!t.slug || !t.slug.endsWith('-1') || t.status !== 'active') continue;
      const canonicalSlug = t.slug.replace(/-1$/, '');
      const candidates = teamsBySlug.get(canonicalSlug);
      if (!candidates) continue;
      const merged = candidates.find(c => c.status === 'merged');
      if (merged) {
        invertedPairs.push({ dup: t, canonical: merged });
      }
    }

    console.log(`Found ${invertedPairs.length} inverted merge pairs`);

    if (dryRun) {
      const preview = invertedPairs.map(p => ({
        dup_id: p.dup.id,
        dup_slug: p.dup.slug,
        dup_name: p.dup.nome,
        canonical_id: p.canonical.id,
        canonical_slug: p.canonical.slug,
        canonical_name: p.canonical.nome,
      }));

      return new Response(JSON.stringify({
        dry_run: true,
        pairs_found: invertedPairs.length,
        pairs: preview,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Execute fixes
    const results: any[] = [];
    for (const { dup, canonical } of invertedPairs) {
      try {
        // 1. Restore canonical as active
        await supabase.from('times').update({ status: 'active' }).eq('id', canonical.id);

        // 2. Migrate matches from dup → canonical
        const { count: homeCount } = await supabase.from('partidas')
          .update({ time_casa_id: canonical.id, updated_at: new Date().toISOString() })
          .eq('time_casa_id', dup.id)
          .select('id', { count: 'exact', head: true });

        const { count: awayCount } = await supabase.from('partidas')
          .update({ time_fora_id: canonical.id, updated_at: new Date().toISOString() })
          .eq('time_fora_id', dup.id)
          .select('id', { count: 'exact', head: true });

        // 3. Migrate gols_partida
        await supabase.from('gols_partida')
          .update({ time_id: canonical.id })
          .eq('time_id', dup.id);

        // 4. Migrate estatisticas
        await supabase.from('estatisticas')
          .update({ time_id: canonical.id })
          .eq('time_id', dup.id);

        // 5. Migrate escalacoes
        await supabase.from('escalacoes')
          .update({ time_id: canonical.id })
          .eq('time_id', dup.id);

        // 6. Migrate cartoes_partida
        await supabase.from('cartoes_partida')
          .update({ time_id: canonical.id })
          .eq('time_id', dup.id);

        // 7. Migrate artilharia_agregada
        await supabase.from('artilharia_agregada')
          .update({ time_id: canonical.id })
          .eq('time_id', dup.id);

        // 8. Migrate team_aliases
        await supabase.from('team_aliases')
          .update({ team_id: canonical.id })
          .eq('team_id', dup.id);

        // 9. Migrate external_id_map
        await supabase.from('external_id_map')
          .update({ internal_id: canonical.id })
          .eq('entity_type', 'team')
          .eq('internal_id', dup.id);

        // 10. Create alias for dup name
        await supabase.from('team_aliases').upsert({
          team_id: canonical.id,
          alias: dup.nome,
          normalized_alias: dup.nome.toLowerCase().trim(),
          source: 'inverted-merge-fix',
          confidence: 100,
        }, { onConflict: 'team_id,normalized_alias' });

        // 11. Mark dup as merged
        await supabase.from('times').update({ status: 'merged' }).eq('id', dup.id);

        // 12. Log the merge
        await supabase.from('team_merge_logs').insert({
          team_target_id: canonical.id,
          team_source_id: dup.id,
          source_canonical_name: dup.nome,
          source_canonical_slug: dup.slug,
          summary: {
            matches_home: homeCount || 0,
            matches_away: awayCount || 0,
            matches_updated: (homeCount || 0) + (awayCount || 0),
            fix_type: 'inverted-merge',
          },
        });

        results.push({
          success: true,
          dup_slug: dup.slug,
          canonical_slug: canonical.slug,
          matches_migrated: (homeCount || 0) + (awayCount || 0),
        });

        console.log(`Fixed: ${dup.slug} → ${canonical.slug} (${(homeCount || 0) + (awayCount || 0)} matches)`);
      } catch (e) {
        results.push({
          success: false,
          dup_slug: dup.slug,
          canonical_slug: canonical.slug,
          error: String(e).slice(0, 200),
        });
      }
    }

    const fixed = results.filter(r => r.success).length;
    const totalMatches = results.reduce((s, r) => s + (r.matches_migrated || 0), 0);

    return new Response(JSON.stringify({
      dry_run: false,
      total_pairs: invertedPairs.length,
      fixed,
      failed: invertedPairs.length - fixed,
      total_matches_migrated: totalMatches,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
