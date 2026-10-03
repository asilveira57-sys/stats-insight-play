import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { source_id, index_url } = await req.json();
    if (!source_id || !index_url) {
      return new Response(JSON.stringify({ error: 'source_id and index_url required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the index page
    const response = await fetch(index_url, {
      headers: { 'User-Agent': 'AleballBot/1.0 (historical data research)', 'Accept': 'text/html, text/plain, */*' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    // Extract all .htm links from the page
    const linkRegex = /href=["']([^"']+\.htm[l]?)["']/gi;
    const allLinks = new Set<string>();
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      let href = match[1];
      // Resolve relative URLs
      if (!href.startsWith('http')) {
        const base = new URL(index_url);
        href = new URL(href, base).toString();
      }
      allLinks.add(href);
    }

    // Filter: only keep links that look like season/results pages (contain year patterns or tables paths)
    // Exclude: index pages, misc, links, livros, etc.
    const excludePatterns = [
      /misc\.htm$/i, /livros\.htm$/i, /links\.htm$/i,
      /rsssf\.com\/?$/i,
    ];

    const resultLinks: { url: string; season_label: string; url_type: string; country: string }[] = [];
    
    for (const link of allLinks) {
      // Skip excluded patterns
      if (excludePatterns.some(p => p.test(link))) continue;
      // Must be from same domain or known RSSSF domains
      if (!link.includes('rsssfbrasil.com') && !link.includes('rsssf.com') && !link.includes('rsssf.org')) continue;

      // Extract season label from URL
      const filename = link.split('/').pop()?.replace('.htm', '') || '';
      let seasonLabel = '';
      let urlType = 'results';
      let country = 'Brasil';

      // Detect year in filename (e.g., br2012, br1971l2)
      const yearMatch = filename.match(/(\d{4})/);
      if (yearMatch) {
        seasonLabel = yearMatch[1];
      }

      // Detect level/type
      if (filename.includes('camp') || filename.includes('hist')) {
        urlType = 'standings';
      } else if (filename.includes('tops') || filename.includes('scorer')) {
        urlType = 'scorers';
      } else if (filename.includes('rank')) {
        urlType = 'standings';
      } else if (filename.includes('cup') || filename.includes('copa')) {
        urlType = 'results';
      }

      // Detect competition from filename
      let competition = '';
      if (filename.startsWith('br') && !filename.includes('cup')) {
        competition = 'Brasileirão';
        if (filename.includes('l2')) competition += ' Série B';
        else if (filename.includes('l3')) competition += ' Série C';
        else if (filename.includes('l4')) competition += ' Série D';
        else if (filename.includes('w')) competition += ' Feminino';
        else if (filename.includes('jr')) competition += ' Sub-20';
        else competition += ' Série A';
      } else if (filename.includes('cup') || filename.includes('copa')) {
        competition = 'Copa do Brasil';
      }

      if (seasonLabel && competition) {
        seasonLabel = `${competition} ${seasonLabel}`;
      } else if (competition) {
        seasonLabel = competition;
      }

      resultLinks.push({ url: link, season_label: seasonLabel, url_type: urlType, country });
    }

    // Get ALL existing URLs for this source to avoid duplicates (paginated to bypass 1000 limit)
    const existingSet = new Set<string>();
    let offset = 0;
    const batchSize = 1000;
    while (true) {
      const { data: batch } = await supabase
        .from('historical_source_urls')
        .select('url')
        .eq('source_id', source_id)
        .range(offset, offset + batchSize - 1);
      if (!batch || batch.length === 0) break;
      for (const u of batch) existingSet.add(u.url);
      if (batch.length < batchSize) break;
      offset += batchSize;
    }

    // Filter out already-registered URLs
    const newLinks = resultLinks.filter(l => !existingSet.has(l.url));

    // Insert new URLs in batches
    let inserted = 0;
    for (let i = 0; i < newLinks.length; i += 50) {
      const batch = newLinks.slice(i, i + 50).map(l => ({
        source_id,
        url: l.url,
        url_type: l.url_type,
        season_label: l.season_label,
        country: l.country,
        language: 'pt',
        is_active: true,
      }));
      const { error } = await supabase.from('historical_source_urls').insert(batch);
      if (!error) inserted += batch.length;
    }

    return new Response(JSON.stringify({
      success: true,
      total_links_found: allLinks.size,
      filtered_links: resultLinks.length,
      already_registered: resultLinks.length - newLinks.length,
      inserted,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('historical-autodiscover error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
