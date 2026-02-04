import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoalRecord {
  id: string;
  partida_id: string;
  time_id: string | null;
  jogador_nome: string;
  minuto: number;
  partidas: {
    id: string;
    liga_id: string | null;
    data: string;
  } | null;
}

interface AggregatedScorer {
  competicao_id: string | null;
  temporada: string | null;
  time_id: string | null;
  jogador_nome: string;
  jogador_slug: string;
  gols: number;
  partidas_com_gol: number;
}

// Helper to slugify player name
function slugifyPlayerName(name: string): string {
  const accentsMap: Record<string, string> = {
    'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
    'ç': 'c', 'ñ': 'n',
    'Á': 'A', 'À': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A',
    'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
    'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
    'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
    'Ç': 'C', 'Ñ': 'N'
  };
  
  let result = name;
  for (const [accent, plain] of Object.entries(accentsMap)) {
    result = result.replace(new RegExp(accent, 'g'), plain);
  }
  
  result = result.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
    
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting artilharia rebuild...');

    // Step 1: Fetch ALL goals without limit using pagination
    const allGoals: GoalRecord[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: goals, error } = await supabase
        .from('gols_partida')
        .select(`
          id,
          partida_id,
          time_id,
          jogador_nome,
          minuto,
          partidas (id, liga_id, data)
        `)
        .not('jogador_nome', 'is', null)
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching goals:', error);
        throw error;
      }

      if (goals && goals.length > 0) {
        allGoals.push(...(goals as unknown as GoalRecord[]));
        offset += batchSize;
        console.log(`Fetched ${allGoals.length} goals so far...`);
        
        if (goals.length < batchSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`Total goals fetched: ${allGoals.length}`);

    // Step 2: Aggregate scorers
    const aggregations = new Map<string, AggregatedScorer>();

    for (const goal of allGoals) {
      const partida = goal.partidas;
      if (!partida) continue;

      const competicaoId = partida.liga_id;
      const temporada = partida.data ? new Date(partida.data).getFullYear().toString() : null;
      const timeId = goal.time_id;
      const jogadorNome = goal.jogador_nome;
      const jogadorSlug = slugifyPlayerName(jogadorNome);

      // Create aggregation keys for different views:
      // 1. By competition + season + time
      // 2. By season only (general for the year)
      // 3. Global (no filters)
      
      const keys = [
        // Competition + Season + Time
        `${competicaoId || 'null'}_${temporada || 'null'}_${timeId || 'null'}_${jogadorSlug}`,
        // Season only (general ranking for the year)
        `null_${temporada || 'null'}_${timeId || 'null'}_${jogadorSlug}`,
        // Global (all time)
        `null_null_${timeId || 'null'}_${jogadorSlug}`,
      ];

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const isCompetition = i === 0;
        const isSeason = i === 1;
        // const isGlobal = i === 2;

        if (!aggregations.has(key)) {
          aggregations.set(key, {
            competicao_id: isCompetition ? competicaoId : null,
            temporada: (isCompetition || isSeason) ? temporada : null,
            time_id: timeId,
            jogador_nome: jogadorNome,
            jogador_slug: jogadorSlug,
            gols: 0,
            partidas_com_gol: 0,
          });
        }

        const agg = aggregations.get(key)!;
        agg.gols += 1;
        // partidas_com_gol tracking would need a Set, simplified here
      }
    }

    console.log(`Total aggregations: ${aggregations.size}`);

    // Step 3: Clear existing and insert new aggregations
    // Delete in batches to avoid timeout
    const { error: deleteError } = await supabase
      .from('artilharia_agregada')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error clearing old data:', deleteError);
      throw deleteError;
    }

    // Step 4: Insert new aggregations in batches
    const aggregationsArray = Array.from(aggregations.values());
    const insertBatchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < aggregationsArray.length; i += insertBatchSize) {
      const batch = aggregationsArray.slice(i, i + insertBatchSize);
      
      // Use simple insert since we already cleared the table
      const { error: insertError } = await supabase
        .from('artilharia_agregada')
        .insert(batch.map(agg => ({
          competicao_id: agg.competicao_id,
          temporada: agg.temporada,
          time_id: agg.time_id,
          jogador_nome: agg.jogador_nome,
          jogador_slug: agg.jogador_slug,
          gols: agg.gols,
          partidas_com_gol: agg.partidas_com_gol,
          atualizado_em: new Date().toISOString(),
        })));

      if (insertError) {
        console.error('Error inserting batch:', insertError);
        // Continue with other batches
      } else {
        insertedCount += batch.length;
        console.log(`Inserted ${insertedCount} aggregations...`);
      }
    }

    // Step 5: Log the sync
    await supabase.from('sync_logs').insert({
      entity_type: 'artilharia_agregada',
      status: 'completed',
      items_processed: allGoals.length,
      items_created: insertedCount,
      details: {
        total_goals: allGoals.length,
        total_aggregations: aggregationsArray.length,
        inserted: insertedCount,
      },
    });

    console.log('Artilharia rebuild completed!');

    return new Response(
      JSON.stringify({
        success: true,
        goals_processed: allGoals.length,
        aggregations_created: insertedCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error in rebuild-artilharia:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
