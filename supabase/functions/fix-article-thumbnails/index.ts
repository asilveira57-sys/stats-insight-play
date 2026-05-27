// Corrige thumbnails delegando 100% ao gerador SVG (zero custo de IA de imagem).
// Mantém os modos {unsplash, svg_replace} e a assinatura {limit, target_id} para a UI atual.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isContentGenerationEnabled, disabledResponse } from "../_shared/killswitch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_UNSPLASH_PATTERN = "unsplash.com/photo-1574629810360-7efbbe195018";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // === KILL-SWITCH: cost control ===
  if (!(await isContentGenerationEnabled())) {
    return disabledResponse(corsHeaders, "fix-article-thumbnails");
  }


  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let limit = 1;
    let mode: "unsplash" | "svg_replace" = "unsplash";
    let targetId: string | null = null;
    try {
      const body = await req.json();
      limit = Math.min(Math.max(1, body?.limit || 1), 10);
      mode = body?.mode === "svg_replace" ? "svg_replace" : "unsplash";
      targetId = body?.target_id || null;
    } catch {}

    // Selecionar artigos a corrigir
    let q = supabase
      .from("noticias")
      .select("id, titulo, resumo, slug, imagem_url, partida_id");

    if (targetId) {
      q = q.eq("id", targetId);
    } else if (mode === "svg_replace") {
      q = q.like("imagem_url", "%.svg");
    } else {
      q = q.like("imagem_url", `%${DEFAULT_UNSPLASH_PATTERN}%`);
    }

    const { data: articles, error: fetchErr } = await q
      .order("data_publicacao", { ascending: false })
      .limit(limit);
    if (fetchErr) throw new Error(`Fetch error: ${fetchErr.message}`);

    // Pendentes do modo
    const pendingQ = supabase.from("noticias").select("*", { count: "exact", head: true });
    const { count: totalPending } =
      mode === "svg_replace"
        ? await pendingQ.like("imagem_url", "%.svg")
        : await pendingQ.like("imagem_url", `%${DEFAULT_UNSPLASH_PATTERN}%`);

    if (!articles || !articles.length) {
      return new Response(
        JSON.stringify({
          success: true,
          mode,
          message: "Nenhum artigo pendente",
          processed: 0, fixed: 0, errors: 0, pending: totalPending || 0, results: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
        slug: a.slug,
        success: !!r?.success,
        imagem_url: r?.imagem_url,
        error: r?.error,
      };
    });

    const fixed = results.filter((r) => r.success).length;
    const errors = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        message: `${fixed} thumbnails atualizadas via SVG, ${errors} erros`,
        processed: results.length,
        fixed,
        errors,
        pending: Math.max((totalPending || 0) - fixed, 0),
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("fix-article-thumbnails error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
