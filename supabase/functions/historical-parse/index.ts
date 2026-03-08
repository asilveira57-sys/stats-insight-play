import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { source_url_id, document_id, job_id } = body;

    if (!source_url_id && !document_id) {
      return new Response(JSON.stringify({ error: 'source_url_id or document_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the most recent document for this URL
    let docQuery = supabase.from('historical_raw_documents').select('*, source_url:historical_source_urls(*, source:historical_sources(*))');
    if (document_id) {
      docQuery = docQuery.eq('id', document_id);
    } else {
      docQuery = docQuery.eq('source_url_id', source_url_id).order('collected_at', { ascending: false }).limit(1);
    }
    const { data: docs, error: docErr } = await docQuery;
    if (docErr || !docs?.length) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const doc = docs[0];
    const cleanedText = doc.cleaned_text || '';
    if (!cleanedText || cleanedText.length < 50) {
      return new Response(JSON.stringify({ error: 'Document too short to parse' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create job
    let currentJobId = job_id;
    if (!currentJobId) {
      const { data: newJob } = await supabase.from('historical_import_jobs').insert({
        source_id: (doc.source_url as any)?.source_id,
        source_url_id: doc.source_url_id,
        provider_name: (doc.source_url as any)?.source?.provider_name || 'rsssf',
        job_type: 'parse',
        status: 'running',
        started_at: new Date().toISOString(),
      }).select().single();
      currentJobId = newJob?.id;
    } else {
      await supabase.from('historical_import_jobs').update({
        status: 'running', started_at: new Date().toISOString(),
      }).eq('id', currentJobId);
    }

    await supabase.from('historical_import_logs').insert({
      job_id: currentJobId, level: 'info', stage: 'parse',
      message: `Iniciando parsing com IA — ${cleanedText.length} chars`,
    });

    // Get season/competition context from the URL record
    const urlRecord = doc.source_url as any;
    const seasonLabel = urlRecord?.season_label || '';
    const country = urlRecord?.country || urlRecord?.source?.country || '';

    // Use Lovable AI to parse the text
    const aiPrompt = `You are a football/soccer data parser. Extract ALL match results from this historical football document.

Context:
- Season: ${seasonLabel}
- Country: ${country}
- Source: RSSSF-style historical football results page

Rules:
1. Extract EVERY match result you can find
2. For each match return: home_team, away_team, score_home, score_away, match_date (YYYY-MM-DD if available), round (round/stage name), competition (competition name if mentioned)
3. Scores like "2-1" or "2 x 1" or "2:1" are home-away
4. aet = after extra time, pen = penalties (include in extra_info)
5. If date is partial (only year or month), return what you have
6. For aggregate scores or two-leg ties, extract each leg as a separate match
7. Return valid JSON array only, no markdown

Return JSON array:
[{"home_team":"Team A","away_team":"Team B","score_home":2,"score_away":1,"match_date":"2012-05-20","round":"Final","competition":"Copa do Brasil","extra_info":""}]

Document text (first 15000 chars):
${cleanedText.slice(0, 15000)}`;

    // Call Lovable AI via the gateway
    const aiResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: aiPrompt }],
        temperature: 0.1,
      }),
    });

    let parsedMatches: any[] = [];
    
    if (!aiResponse.ok) {
      // Fallback: use regex-based parser for RSSSF-style documents
      await supabase.from('historical_import_logs').insert({
        job_id: currentJobId, level: 'warn', stage: 'parse',
        message: `AI não disponível (${aiResponse.status}), usando parser regex`,
      });
      parsedMatches = parseRsssfText(cleanedText, seasonLabel);
    } else {
      const aiData = await aiResponse.json();
      const content = aiData?.choices?.[0]?.message?.content || aiData?.content || '';
      
      // Extract JSON from response
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedMatches = JSON.parse(jsonMatch[0]);
        }
      } catch (parseErr: any) {
        await supabase.from('historical_import_logs').insert({
          job_id: currentJobId, level: 'warn', stage: 'parse',
          message: `Erro parsing JSON da IA: ${parseErr.message}, usando fallback regex`,
        });
        parsedMatches = parseRsssfText(cleanedText, seasonLabel);
      }
    }

    if (!parsedMatches.length) {
      // Final fallback
      parsedMatches = parseRsssfText(cleanedText, seasonLabel);
    }

    await supabase.from('historical_import_logs').insert({
      job_id: currentJobId, level: 'info', stage: 'parse',
      message: `Extraídas ${parsedMatches.length} partidas`,
    });

    // Insert staging matches
    if (parsedMatches.length > 0) {
      // Delete old staging for this source_url_id to allow re-parsing
      if (doc.source_url_id) {
        await supabase.from('historical_staging_matches')
          .delete()
          .eq('source_url_id', doc.source_url_id)
          .in('status', ['parsed']);
      }

      const stagingRows = parsedMatches.map((m: any) => ({
        job_id: currentJobId,
        source_url_id: doc.source_url_id,
        document_id: doc.id,
        home_team_raw: m.home_team || 'Unknown',
        away_team_raw: m.away_team || 'Unknown',
        score_home: typeof m.score_home === 'number' ? m.score_home : null,
        score_away: typeof m.score_away === 'number' ? m.score_away : null,
        match_date: m.match_date || null,
        match_date_raw: m.match_date || m.date || null,
        round_raw: m.round || null,
        competition_raw: m.competition || seasonLabel || null,
        season_raw: seasonLabel || null,
        extra_data: m.extra_info ? { extra_info: m.extra_info } : {},
        status: 'parsed',
      }));

      // Insert in batches of 200
      for (let i = 0; i < stagingRows.length; i += 200) {
        const batch = stagingRows.slice(i, i + 200);
        const { error: insertErr } = await supabase.from('historical_staging_matches').insert(batch);
        if (insertErr) {
          await supabase.from('historical_import_logs').insert({
            job_id: currentJobId, level: 'error', stage: 'parse',
            message: `Erro inserindo batch ${i}: ${insertErr.message}`,
          });
        }
      }
    }

    // Update URL record
    await supabase.from('historical_source_urls').update({
      pipeline_status: 'parsed',
      last_parsed_at: new Date().toISOString(),
      staging_total: parsedMatches.length,
    }).eq('id', doc.source_url_id);

    // Update job
    const durationMs = Date.now() - startTime;
    await supabase.from('historical_import_jobs').update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      total_matches_detected: parsedMatches.length,
    }).eq('id', currentJobId);

    await supabase.from('historical_import_logs').insert({
      job_id: currentJobId, level: 'info', stage: 'parse',
      message: `Parse concluído: ${parsedMatches.length} partidas em ${durationMs}ms`,
    });

    return new Response(JSON.stringify({
      success: true,
      job_id: currentJobId,
      matches_parsed: parsedMatches.length,
      duration_ms: durationMs,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('historical-parse error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── Regex Fallback Parser for RSSSF-style text ───
function parseRsssfText(text: string, seasonLabel: string): any[] {
  const matches: any[] = [];
  const lines = text.split('\n');
  
  // Common RSSSF patterns:
  // "Team A  2-1  Team B"
  // "Team A  2 x 1  Team B"  
  // "[May 20] Team A 2-1 Team B"
  const scorePatterns = [
    // "Team A  2-1  Team B" or "Team A  2 x 1  Team B"
    /^(.+?)\s+(\d+)\s*[-x:]\s*(\d+)\s+(.+?)$/i,
    // With date prefix "[May 20]" or "[20/05]"
    /^\[([^\]]+)\]\s*(.+?)\s+(\d+)\s*[-x:]\s*(\d+)\s+(.+?)$/i,
  ];

  let currentRound = '';
  let currentDate = '';
  let currentCompetition = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect round headers (e.g., "Round 1", "Quarter-finals", "Rodada 1")
    if (/^(round|rodada|fase|quarter|semi|final|grupo|group|oitavas|quartas)/i.test(trimmed) && trimmed.length < 60) {
      currentRound = trimmed;
      continue;
    }

    // Detect date lines
    const dateMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (dateMatch && trimmed.length < 20) {
      const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
      currentDate = `${year}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
      continue;
    }

    // Try score patterns
    for (const pattern of scorePatterns) {
      const m = trimmed.match(pattern);
      if (m) {
        if (m.length === 5) {
          // No date prefix
          matches.push({
            home_team: m[1].trim(),
            away_team: m[4].trim(),
            score_home: parseInt(m[2]),
            score_away: parseInt(m[3]),
            match_date: currentDate || null,
            round: currentRound || null,
            competition: currentCompetition || seasonLabel || null,
          });
        } else if (m.length === 6) {
          // With date prefix
          matches.push({
            home_team: m[2].trim(),
            away_team: m[5].trim(),
            score_home: parseInt(m[3]),
            score_away: parseInt(m[4]),
            match_date: currentDate || null,
            round: currentRound || null,
            competition: currentCompetition || seasonLabel || null,
            extra_info: `date_prefix: ${m[1]}`,
          });
        }
        break;
      }
    }
  }

  return matches;
}
