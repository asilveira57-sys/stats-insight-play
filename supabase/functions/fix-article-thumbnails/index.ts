import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_UNSPLASH_PATTERN = 'unsplash.com/photo-1574629810360-7efbbe195018';

async function generateThumbnailForArticle(
  titulo: string,
  resumo: string,
  GEMINI_API_KEY: string
): Promise<string | null> {
  // Extract key info from title for a contextual prompt
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
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1 },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Image generation error:", response.status, errorText);
      if (response.status === 429) throw new Error("RATE_LIMIT");
      return null;
    }

    const data = await response.json();
    const base64Image =
      data?.predictions?.[0]?.bytesBase64Encoded ||
      data?.predictions?.[0]?.image?.bytesBase64Encoded ||
      null;

    if (!base64Image) {
      console.log("No image data in Gemini response");
      return null;
    }

    return base64Image;
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT") throw error;
    console.error("Error generating thumbnail:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let limit = 1;
    try {
      const body = await req.json();
      limit = Math.min(body?.limit || 1, 3);
    } catch {
      // defaults
    }

    // Count total pending articles
    const { count: totalPendingUnsplash } = await supabase
      .from("noticias")
      .select("*", { count: "exact", head: true })
      .like("imagem_url", `%${DEFAULT_UNSPLASH_PATTERN}%`);

    const { count: totalPendingNull } = await supabase
      .from("noticias")
      .select("*", { count: "exact", head: true })
      .is("imagem_url", null);

    const totalPending = (totalPendingUnsplash || 0) + (totalPendingNull || 0);

    // Fetch articles with placeholder image
    const { data: articles, error: fetchError } = await supabase
      .from("noticias")
      .select("id, titulo, resumo, slug, imagem_url")
      .or(`imagem_url.like.%${DEFAULT_UNSPLASH_PATTERN}%,imagem_url.is.null`)
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
          processed: 0,
          fixed: 0,
          errors: 0,
          pending: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { id: string; titulo: string; slug: string; success: boolean; error?: string }[] = [];

    for (const article of articles) {
      try {
        console.log(`Fixing thumbnail for: ${article.titulo} (${article.id})`);

        // Generate new image
        const base64Image = await generateThumbnailForArticle(
          article.titulo || "Análise Esportiva",
          article.resumo || "",
          GEMINI_API_KEY
        );

        if (!base64Image) {
          results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: "Image generation returned null" });
          continue;
        }

        // Upload to storage
        const imageBytes = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0));
        const fileName = `fix-${article.id}.png`;

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

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("news-thumbnails")
          .getPublicUrl(fileName);

        const publicUrl = urlData?.publicUrl;

        if (!publicUrl) {
          results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: "Failed to get public URL" });
          continue;
        }

        // Update article
        const { error: updateError } = await supabase
          .from("noticias")
          .update({ imagem_url: publicUrl })
          .eq("id", article.id);

        if (updateError) {
          results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: `Update failed: ${updateError.message}` });
          continue;
        }

        console.log(`✅ Fixed: ${article.titulo} -> ${publicUrl}`);
        results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: true });

        // Delay between requests
        if (articles.length > 1) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg === "RATE_LIMIT") {
          results.push({ id: article.id, titulo: article.titulo, slug: article.slug, success: false, error: "Rate limit - retry later" });
          break; // Stop processing on rate limit
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
        processed: results.length,
        fixed,
        errors,
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
