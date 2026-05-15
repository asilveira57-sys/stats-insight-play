import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Selection = {
  league_id: number;
  league_name?: string;
  seasons: number[];
  depths: ('fixtures' | 'events' | 'lineups' | 'stats')[];
  priority?: number;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const selections: Selection[] = body.selections ?? [];
    if (!Array.isArray(selections) || selections.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'no selections' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows: any[] = [];
    for (const sel of selections) {
      for (const season of sel.seasons) {
        for (const depth of sel.depths) {
          rows.push({
            league_id: sel.league_id,
            league_name: sel.league_name ?? null,
            season,
            depth,
            status: 'queued',
            priority: sel.priority ?? 100,
            requests_estimated: depth === 'fixtures' ? 1 : 380, // estimativa grosseira; refinada quando fixtures rodar
          });
        }
      }
    }

    const chunk = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk);
      const { error, data } = await supabase
        .from('api_football_import_jobs')
        .upsert(slice, { onConflict: 'league_id,season,depth', ignoreDuplicates: true })
        .select('id');
      if (error) throw error;
      inserted += data?.length ?? 0;
    }

    return new Response(JSON.stringify({ ok: true, enqueued: inserted, total_requested: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
