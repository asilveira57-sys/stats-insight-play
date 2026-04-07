import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_UNSPLASH_PATTERN = 'unsplash.com/photo-1574629810360-7efbbe195018';

async function generateThumbnailViaGateway(
  titulo: string,
  resumo: string,
  LOVABLE_API_KEY: string
): Promise<string | null> {
  const prompt = `Create a professional sports journalism thumbnail image:
- Background: Modern football stadium at night with dramatic lighting
- Dark semi-transparent overlay for readability
- Abstract geometric shapes and dynamic light effects
- Professional broadcast quality design with cinematic feel
- Color palette: Deep blues, vibrant accents, dramatic shadows
- Context from article: "${titulo}"
- 16:9 aspect ratio, ultra high resolution
- CRITICAL: Do NOT include any team logos, crests, badges, or shields
- CRITICAL: Do NOT include any text or typography in the image
- Use only abstract geometric shapes, stadium architecture, and atmospheric effects`;

  try {
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", response.status, errorText);
      if (response.status === 429) throw new Error("RATE_LIMIT");
      if (response.status === 402) throw new Error("CREDITS_EXHAUSTED");
      return null;
    }

    const data = await response.json();
    const images = data.choices?.[0]?.message?.images;
    if (!images || images.length === 0) {
      console.log("No image in Lovable AI response");
      return null;
    }

    // Extract base64 from data URL
    const imageUrl = images[0]?.image_url?.url;
    if (!imageUrl) return null;

    // Remove data:image/png;base64, prefix if present
    const base64Image = imageUrl.replace(/^data:image\/[a-z]+;base64,/, '');
    return base64Image;
  } catch (error) {
    if (error instanceof Error && (error.message === "RATE_LIMIT" || error.message === "CREDITS_EXHAUSTED")) {
      throw error;
    }
    console.error("Error generating thumbnail via gateway:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let limit = 1;
    let mode = "unsplash"; // "unsplash" | "svg_replace"
    let targetId: string | null = null;
    try {
      const body = await req.json();
      limit = Math.min(body?.limit || 1, 3);
      mode = body?.mode || "unsplash";
      targetId = body?.target_id || null;
    } catch {
      // defaults
    }

    // Mode: svg_replace — find articles with SVG geometric thumbnails
    if (mode === "svg_replace") {
      let svgQuery = supabase
        .from("noticias")
        .select("id, titulo, resumo, slug, imagem_url, partida_id");

      if (targetId) {
        svgQuery = svgQuery.eq("id", targetId);
      } else {
        svgQuery = svgQuery.like("imagem_url", "%.svg");
      }

      const { data: svgArticles, error: svgErr } = await svgQuery
        .order("data_publicacao", { ascending: false })
        .limit(limit);

      if (svgErr) throw new Error(`Failed to fetch SVG articles: ${svgErr.message}`);

      const { count: totalSvg } = await supabase
        .from("noticias")
        .select("*", { count: "exact", head: true })
        .like("imagem_url", "%.svg");

      if (!svgArticles || svgArticles.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "Nenhum artigo com SVG pendente", processed: 0, fixed: 0, errors: 0, pending: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results: any[] = [];

      for (const article of svgArticles) {
        try {
          console.log(`Replacing SVG for: ${article.titulo} (${article.id})`);

          const base64Image = await generateThumbnailViaGateway(
            article.titulo || "Análise Esportiva",
            article.resumo || "",
            LOVABLE_API_KEY
          );

          if (!base64Image) {
            results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: "Image generation returned null" });
            continue;
          }

          const imageBytes = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0));
          const fileName = `replaced-${article.slug || article.id}.png`;

          const { error: uploadError } = await supabase.storage
            .from("news-thumbnails")
            .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

          if (uploadError) {
            results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: `Upload: ${uploadError.message}` });
            continue;
          }

          const { data: urlData } = supabase.storage.from("news-thumbnails").getPublicUrl(fileName);

          if (!urlData?.publicUrl) {
            results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: "No public URL" });
            continue;
          }

          const { error: updateError } = await supabase
            .from("noticias")
            .update({ imagem_url: urlData.publicUrl })
            .eq("id", article.id);

          if (updateError) {
            results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: `Update: ${updateError.message}` });
            continue;
          }

          console.log(`✅ SVG replaced: ${article.titulo} -> ${urlData.publicUrl}`);
          results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: true, imagem_url: urlData.publicUrl });

          if (svgArticles.length > 1) await new Promise((r) => setTimeout(r, 3000));
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          if (errMsg === "RATE_LIMIT" || errMsg === "CREDITS_EXHAUSTED") {
            results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: errMsg });
            break;
          }
          results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: errMsg });
        }
      }

      const fixed = results.filter((r) => r.success).length;
      return new Response(
        JSON.stringify({
          success: true,
          mode: "svg_replace",
          message: `${fixed} SVGs substituídos`,
          processed: results.length,
          fixed,
          errors: results.filter((r) => !r.success).length,
          pending: Math.max((totalSvg || 0) - fixed, 0),
          results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Original mode: unsplash placeholder replacement
    const { count: totalPendingUnsplash } = await supabase
      .from("noticias")
      .select("*", { count: "exact", head: true })
      .like("imagem_url", `%${DEFAULT_UNSPLASH_PATTERN}%`);

    const totalPending = totalPendingUnsplash || 0;

    const { data: articles, error: fetchError } = await supabase
      .from("noticias")
      .select("id, titulo, resumo, slug, imagem_url")
      .like("imagem_url", `%${DEFAULT_UNSPLASH_PATTERN}%`)
      .order("data_publicacao", { ascending: false })
      .limit(limit);

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum artigo pendente de correção",
          processed: 0, fixed: 0, errors: 0, pending: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { id: string; titulo: string; slug: string; success: boolean; error?: string }[] = [];

    for (const article of articles) {
      try {
        console.log(`Fixing thumbnail for: ${article.titulo} (${article.id})`);

        const base64Image = await generateThumbnailViaGateway(
          article.titulo || "Análise Esportiva",
          article.resumo || "",
          LOVABLE_API_KEY
        );

        if (!base64Image) {
          results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: "Image generation returned null" });
          continue;
        }

        const imageBytes = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0));
        const fileName = `fix-${article.slug || article.id}.png`;

        const { error: uploadError } = await supabase.storage
          .from("news-thumbnails")
          .upload(fileName, imageBytes, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) {
          results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: `Upload failed: ${uploadError.message}` });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("news-thumbnails")
          .getPublicUrl(fileName);

        if (!urlData?.publicUrl) {
          results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: "Failed to get public URL" });
          continue;
        }

        const { error: updateError } = await supabase
          .from("noticias")
          .update({ imagem_url: urlData.publicUrl })
          .eq("id", article.id);

        if (updateError) {
          results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: `Update failed: ${updateError.message}` });
          continue;
        }

        console.log(`✅ Fixed: ${article.titulo} -> ${urlData.publicUrl}`);
        results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: true });

        if (articles.length > 1) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg === "RATE_LIMIT" || errMsg === "CREDITS_EXHAUSTED") {
          results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: errMsg === "RATE_LIMIT" ? "Rate limit - retry later" : "Credits exhausted - add funds" });
          break;
        }
        results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: errMsg });
      }
    }

    const fixed = results.filter((r) => r.success).length;
    const errors = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `${fixed} imagens corrigidas, ${errors} erros`,
        processed: results.length, fixed, errors,
        pending: Math.max(totalPending - fixed, 0),
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in fix-article-thumbnails:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
