// Regenera thumbnails delegando 100% ao gerador SVG (zero custo de IA de imagem).
// Mantém a assinatura {limit, target_ids, mode} para compatibilidade com a UI atual.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isContentGenerationEnabled, disabledResponse } from "../_shared/killswitch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // === KILL-SWITCH: cost control ===
  if (!(await isContentGenerationEnabled())) {
    return disabledResponse(corsHeaders, "regenerate-article-images");
  }


  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let limit = 5;
    let targetIds: string[] | null = null;
    let mode: "preview" | "execute" = "execute";
    try {
      const body = await req.json();
      limit = Math.max(1, Math.min(body?.limit || 5, 25));
      targetIds = Array.isArray(body?.target_ids) ? body.target_ids : null;
      mode = body?.mode === "preview" ? "preview" : "execute";
    } catch {}

    // Pré-seleciona alvos para resetar image_regenerated_at e forçar a passagem pelo SVG.
    let q = supabase
      .from("noticias")
      .select("id, titulo, slug, imagem_url, partida_id")
      .eq("publicada", true);

    if (targetIds && targetIds.length) {
      q = q.in("id", targetIds);
    } else {
      q = q.or("imagem_url.is.null,imagem_url.like.%.svg,imagem_url.like.%unsplash%,imagem_url.like.%fix-%,imagem_url.like.%regen-%,imagem_url.like.%replaced-%");
    }

    const { data: rawArticles, error: fetchErr } = await q
      .order("data_publicacao", { ascending: false })
      .limit(limit);
    if (fetchErr) throw new Error(`Fetch error: ${fetchErr.message}`);
    const articles = rawArticles || [];

    const { count: pending } = await supabase
      .from("noticias")
      .select("*", { count: "exact", head: true })
      .eq("publicada", true)
      .or("imagem_url.is.null,imagem_url.like.%unsplash%");

    if (mode === "preview") {
      return new Response(
        JSON.stringify({ success: true, mode, pending: pending || 0, articles }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!articles.length) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, fixed: 0, errors: 0, pending: 0, results: [], message: "Nenhum artigo pendente" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Zera image_regenerated_at para garantir que o gerador SVG aceite reprocessar
    // (a função generate-article-card-svg respeita article_ids explícitos).
    const ids = articles.map((a) => a.id);

    const { data: svgResp, error: svgErr } = await supabase.functions.invoke(
      "generate-article-card-svg",
      { body: { article_ids: ids, limit: ids.length, mode: "execute" } },
    );
    if (svgErr) throw new Error(`SVG invoke: ${svgErr.message}`);

    const svgResults: any[] = svgResp?.results || [];
    const byId = new Map(svgResults.map((r) => [r.id, r]));

    const results = articles.map((a) => {
      const r = byId.get(a.id);
      return {
        id: a.id,
        titulo: a.titulo,
        success: !!r?.success,
        imagem_url: r?.imagem_url,
        error: r?.error,
      };
    });

    const fixed = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        fixed,
        errors: results.length - fixed,
        pending: Math.max((pending || 0) - fixed, 0),
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("regenerate-article-images error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
