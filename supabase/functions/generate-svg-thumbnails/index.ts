import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a deterministic hash from a string for color/pattern variation
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// Generate a unique SVG thumbnail based on team colors and article metadata
function generateSvgThumbnail(
  titulo: string,
  primaryA: string,
  secondaryA: string,
  primaryB: string,
  secondaryB: string,
  articleId: string
): string {
  const seed = hashCode(articleId + titulo);
  
  // Generate varied geometric patterns based on seed
  const patternType = seed % 6;
  const rotation = (seed % 360);
  const offsetX = (seed % 100);
  const offsetY = ((seed >> 8) % 100);
  const scale = 0.8 + (seed % 40) / 100;
  
  // Create gradient stops with team colors
  const gradAngle = rotation % 180;
  
  // Generate geometric shapes
  let shapes = '';
  const shapeCount = 5 + (seed % 8);
  
  for (let i = 0; i < shapeCount; i++) {
    const ix = ((seed * (i + 1) * 7) % 1200);
    const iy = ((seed * (i + 1) * 13) % 675);
    const size = 30 + ((seed * (i + 1)) % 120);
    const opacity = 0.05 + ((seed * (i + 1)) % 20) / 100;
    const color = i % 2 === 0 ? primaryA : primaryB;
    
    switch (patternType) {
      case 0: // Circles
        shapes += `<circle cx="${ix}" cy="${iy}" r="${size}" fill="${color}" opacity="${opacity}"/>`;
        break;
      case 1: // Rectangles
        shapes += `<rect x="${ix}" y="${iy}" width="${size * 2}" height="${size}" rx="8" fill="${color}" opacity="${opacity}" transform="rotate(${(i * 15) % 90} ${ix} ${iy})"/>`;
        break;
      case 2: // Triangles
        shapes += `<polygon points="${ix},${iy - size} ${ix - size},${iy + size} ${ix + size},${iy + size}" fill="${color}" opacity="${opacity}"/>`;
        break;
      case 3: // Diamonds
        shapes += `<rect x="${ix}" y="${iy}" width="${size}" height="${size}" fill="${color}" opacity="${opacity}" transform="rotate(45 ${ix} ${iy})"/>`;
        break;
      case 4: // Lines
        shapes += `<line x1="${ix}" y1="0" x2="${ix + size}" y2="675" stroke="${color}" stroke-width="${2 + (i % 4)}" opacity="${opacity * 1.5}"/>`;
        break;
      case 5: // Mixed
        if (i % 3 === 0) {
          shapes += `<circle cx="${ix}" cy="${iy}" r="${size / 2}" fill="none" stroke="${color}" stroke-width="3" opacity="${opacity * 2}"/>`;
        } else {
          shapes += `<rect x="${ix}" y="${iy}" width="${size}" height="${size * 0.6}" rx="4" fill="${color}" opacity="${opacity}"/>`;
        }
        break;
    }
  }
  
  // Dynamic wave pattern
  const wave1Y = 300 + (seed % 150);
  const wave2Y = 400 + ((seed >> 4) % 150);
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primaryA};stop-opacity:0.9"/>
      <stop offset="50%" style="stop-color:#1a1a2e;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:${primaryB};stop-opacity:0.9"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${secondaryA};stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:${secondaryB};stop-opacity:0.3"/>
    </linearGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="40"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="675" fill="url(#bg)"/>
  
  <!-- Blurred color blobs for depth -->
  <circle cx="${200 + offsetX}" cy="${150 + offsetY}" r="200" fill="${primaryA}" opacity="0.15" filter="url(#blur)"/>
  <circle cx="${900 - offsetX}" cy="${500 - offsetY}" r="250" fill="${primaryB}" opacity="0.15" filter="url(#blur)"/>
  
  <!-- Geometric shapes -->
  ${shapes}
  
  <!-- Wave patterns -->
  <path d="M0,${wave1Y} Q300,${wave1Y - 60} 600,${wave1Y} Q900,${wave1Y + 60} 1200,${wave1Y}" fill="none" stroke="${secondaryA}" stroke-width="2" opacity="0.2"/>
  <path d="M0,${wave2Y} Q300,${wave2Y + 50} 600,${wave2Y} Q900,${wave2Y - 50} 1200,${wave2Y}" fill="none" stroke="${secondaryB}" stroke-width="2" opacity="0.2"/>
  
  <!-- Diagonal accent stripe -->
  <rect x="-100" y="${250 + (seed % 100)}" width="1400" height="80" fill="url(#accent)" transform="rotate(${-5 + (seed % 10)} 600 337)"/>
  
  <!-- Grid overlay for texture -->
  <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" stroke-width="0.3" opacity="0.05"/>
  </pattern>
  <rect width="1200" height="675" fill="url(#grid)"/>
  
  <!-- Bottom gradient for text readability -->
  <rect y="400" width="1200" height="275" fill="url(#textbg)" opacity="0.6">
    <linearGradient id="textbg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:transparent"/>
      <stop offset="100%" style="stop-color:#000"/>
    </linearGradient>
  </rect>
  <defs>
    <linearGradient id="textbg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:transparent"/>
      <stop offset="100%" style="stop-color:#000"/>
    </linearGradient>
  </defs>
  <rect y="400" width="1200" height="275" fill="url(#textbg)"/>
  
  <!-- Statball branding -->
  <text x="1160" y="640" font-family="Arial, sans-serif" font-size="14" fill="white" opacity="0.4" text-anchor="end">STATBALL</text>
</svg>`;

  return svg;
}

// Extract team names from article title
function extractTeamNames(titulo: string): { homeTeam: string; awayTeam: string } | null {
  // Common patterns: "X vs Y", "X x Y", "X contra Y"
  const patterns = [
    /(.+?)\s+vs\.?\s+(.+?)(?:\s*[-–—:]|$)/i,
    /(.+?)\s+x\s+(.+?)(?:\s*[-–—:]|$)/i,
    /(.+?)\s+contra\s+(.+?)(?:\s*[-–—:]|$)/i,
  ];
  
  for (const pattern of patterns) {
    const match = titulo.match(pattern);
    if (match) {
      return { homeTeam: match[1].trim(), awayTeam: match[2].trim() };
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let batchSize = 20;
    let mode = "null_images"; // "null_images" | "similar_storage" | "unsplash"
    try {
      const body = await req.json();
      batchSize = Math.min(body?.batch_size || 20, 50);
      mode = body?.mode || "null_images";
    } catch { /* defaults */ }

    // Count totals for progress tracking
    const { count: totalNull } = await supabase
      .from("noticias")
      .select("*", { count: "exact", head: true })
      .eq("publicada", true)
      .is("imagem_url", null);

    const { count: totalUnsplash } = await supabase
      .from("noticias")
      .select("*", { count: "exact", head: true })
      .eq("publicada", true)
      .like("imagem_url", "%unsplash.com%");

    // Select articles based on mode
    let query = supabase
      .from("noticias")
      .select("id, titulo, resumo, slug, imagem_url")
      .eq("publicada", true)
      .order("data_publicacao", { ascending: false })
      .limit(batchSize);

    if (mode === "null_images") {
      query = query.is("imagem_url", null);
    } else if (mode === "unsplash") {
      query = query.like("imagem_url", "%unsplash.com%");
    } else if (mode === "similar_storage") {
      // Target storage images that were generated with generic prompts
      query = query.like("imagem_url", "%news-thumbnails%").like("imagem_url", "%fix-%");
    }

    const { data: articles, error: fetchError } = await query;
    if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);

    if (!articles || articles.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "Nenhum artigo pendente neste modo",
        processed: 0, fixed: 0, errors: 0,
        pending_null: totalNull || 0,
        pending_unsplash: totalUnsplash || 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pre-fetch team colors for efficiency
    const { data: allTeams } = await supabase
      .from("times")
      .select("id, nome, cores, slug")
      .eq("status", "active");

    const teamsByName: Record<string, { cores: any; nome: string }> = {};
    if (allTeams) {
      for (const t of allTeams) {
        const normalized = t.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        teamsByName[normalized] = { cores: t.cores, nome: t.nome };
        // Also index by slug
        if (t.slug) teamsByName[t.slug] = { cores: t.cores, nome: t.nome };
      }
    }

    function findTeamColors(teamName: string): { primary: string; secondary: string } {
      const normalized = teamName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      
      // Try exact match
      const exact = teamsByName[normalized];
      if (exact?.cores) {
        const cores = typeof exact.cores === 'string' ? JSON.parse(exact.cores) : exact.cores;
        return { primary: cores.primary || '#0066B3', secondary: cores.secondary || '#FFFFFF' };
      }
      
      // Try partial match
      for (const [key, val] of Object.entries(teamsByName)) {
        if (key.includes(normalized) || normalized.includes(key)) {
          if (val.cores) {
            const cores = typeof val.cores === 'string' ? JSON.parse(val.cores) : val.cores;
            return { primary: cores.primary || '#0066B3', secondary: cores.secondary || '#FFFFFF' };
          }
        }
      }
      
      // Generate deterministic color from name
      const hash = hashCode(teamName);
      const hues = ['#CC0000', '#0066B3', '#006633', '#FFD700', '#6633CC', '#FF5500', '#004170', '#CC0066'];
      return { primary: hues[hash % hues.length], secondary: '#FFFFFF' };
    }

    const results: { id: string; titulo: string; success: boolean; error?: string }[] = [];

    for (const article of articles) {
      try {
        const teams = extractTeamNames(article.titulo || "");
        
        let colorsA = { primary: '#0066B3', secondary: '#FFFFFF' };
        let colorsB = { primary: '#CC0000', secondary: '#FFFFFF' };
        
        if (teams) {
          colorsA = findTeamColors(teams.homeTeam);
          colorsB = findTeamColors(teams.awayTeam);
        } else {
          // Use article ID hash for variety
          const hash = hashCode(article.id);
          const hues = ['#CC0000', '#0066B3', '#006633', '#FFD700', '#6633CC', '#FF5500'];
          colorsA = { primary: hues[hash % hues.length], secondary: '#FFFFFF' };
          colorsB = { primary: hues[(hash + 3) % hues.length], secondary: '#FFFFFF' };
        }

        const svgContent = generateSvgThumbnail(
          article.titulo || "Análise Esportiva",
          colorsA.primary, colorsA.secondary,
          colorsB.primary, colorsB.secondary,
          article.id
        );

        // Convert SVG to PNG-like format (upload as SVG, browsers render it fine)
        const svgBytes = new TextEncoder().encode(svgContent);
        const fileName = `svg-${article.slug || article.id}.svg`;

        const { error: uploadError } = await supabase.storage
          .from("news-thumbnails")
          .upload(fileName, svgBytes, {
            contentType: "image/svg+xml",
            upsert: true,
          });

        if (uploadError) {
          results.push({ id: article.id, titulo: article.titulo, success: false, error: `Upload: ${uploadError.message}` });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("news-thumbnails")
          .getPublicUrl(fileName);

        if (!urlData?.publicUrl) {
          results.push({ id: article.id, titulo: article.titulo, success: false, error: "No public URL" });
          continue;
        }

        const { error: updateError } = await supabase
          .from("noticias")
          .update({ imagem_url: urlData.publicUrl })
          .eq("id", article.id);

        if (updateError) {
          results.push({ id: article.id, titulo: article.titulo, success: false, error: `Update: ${updateError.message}` });
          continue;
        }

        results.push({ id: article.id, titulo: article.titulo, success: true });
      } catch (err) {
        results.push({ id: article.id, titulo: article.titulo, success: false, error: String(err) });
      }
    }

    const fixed = results.filter(r => r.success).length;
    const errors = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      success: true,
      message: `${fixed} thumbnails SVG gerados, ${errors} erros`,
      processed: results.length,
      fixed,
      errors,
      pending_null: Math.max((totalNull || 0) - fixed, 0),
      pending_unsplash: totalUnsplash || 0,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error in generate-svg-thumbnails:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
