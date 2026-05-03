import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 8 ângulos de cena distintos — nunca repete pra mesmo seed
const SCENES = [
  "Vista aérea panorâmica do estádio lotado, iluminação dourada do final da tarde",
  "Perspectiva do nível do gramado, foco no círculo central, holofotes acesos",
  "Ângulo da arquibancada principal, torcida ao fundo com bandeiras coloridas",
  "Vista noturna cinematográfica, neblina sobre o campo, refletores cortando o ar",
  "Visão lateral do banco de reservas, campo iluminado em segundo plano",
  "Ângulo dramático atrás do gol, rede em primeiro plano, arquibancada desfocada",
  "Vista do alto mostrando o padrão do gramado recém-cortado, sombras longas",
  "Perspectiva do túnel de acesso, luz forte no fim do corredor, expectativa",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildPrompt(args: {
  timeCasa?: string;
  timeFora?: string;
  corCasa?: string;
  corFora?: string;
  liga?: string;
  titulo: string;
  seed: string;
}): string {
  const scene = SCENES[hashStr(args.seed) % SCENES.length];
  const corCasa = args.corCasa || "#1e3a8a";
  const corFora = args.corFora || "#7f1d1d";
  const matchup =
    args.timeCasa && args.timeFora
      ? `${args.timeCasa} vs ${args.timeFora}`
      : args.titulo;

  return `Professional photorealistic football stadium photograph, 16:9 cinematic widescreen.

MANDATORY UNIQUE SCENE: ${scene}

CONTEXT: ${matchup}${args.liga ? ` — ${args.liga}` : ""}
DOMINANT COLORS (in lighting, banners, atmospheric tints): ${corCasa} and ${corFora}
MOOD: Pre-match anticipation, broadcast quality, dramatic lighting

STRICT RULES — DO NOT VIOLATE:
- NO team logos, crests, badges, shields or any club identification
- NO text, words, numbers, typography, or signs of any kind
- NO recognizable player faces or jerseys with identifiable team names
- The image MUST be visually unique — different camera angle, different mood
- Pure stadium photography only`;
}

async function generateNanoBanana(prompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("Nano Banana error:", res.status, txt);
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 402) throw new Error("CREDITS_EXHAUSTED");
    return null;
  }

  const data = await res.json();
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) return null;
  return url.replace(/^data:image\/[a-z]+;base64,/, "");
}

interface ArticleRow {
  id: string;
  titulo: string;
  slug: string | null;
  imagem_url: string | null;
  partida_id: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let limit = 5;
    let targetIds: string[] | null = null;
    let mode: "preview" | "execute" = "execute";
    try {
      const body = await req.json();
      limit = Math.max(1, Math.min(body?.limit || 5, 10));
      targetIds = Array.isArray(body?.target_ids) ? body.target_ids : null;
      mode = body?.mode === "preview" ? "preview" : "execute";
    } catch {}

    // Build query: artigos publicados, ainda não regenerados, com imagem ruim ou sem imagem
    let q = supabase
      .from("noticias")
      .select("id, titulo, slug, imagem_url, partida_id")
      .eq("publicada", true)
      .is("image_regenerated_at", null);

    if (targetIds && targetIds.length) {
      q = q.in("id", targetIds);
    } else {
      // sem imagem OU svg OU genérica antiga (fix-/replaced- patterns também entram pq image_regenerated_at é null)
      q = q.or("imagem_url.is.null,imagem_url.like.%.svg,imagem_url.like.%unsplash%");
    }

    const { data: rawArticles, error: fetchErr } = await q
      .order("data_publicacao", { ascending: false })
      .limit(limit);

    if (fetchErr) throw new Error(`Fetch error: ${fetchErr.message}`);
    const articles = (rawArticles || []) as ArticleRow[];

    // Count pendentes
    const { count: pending } = await supabase
      .from("noticias")
      .select("*", { count: "exact", head: true })
      .eq("publicada", true)
      .is("image_regenerated_at", null)
      .or("imagem_url.is.null,imagem_url.like.%.svg,imagem_url.like.%unsplash%");

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

    // Pré-carrega dados das partidas
    const partidaIds = articles.map(a => a.partida_id).filter(Boolean) as string[];
    const matchInfo = new Map<string, any>();
    if (partidaIds.length) {
      const { data: partidas } = await supabase
        .from("partidas")
        .select("id, time_casa:time_casa_id(nome, cores), time_fora:time_fora_id(nome, cores), liga:liga_id(nome)")
        .in("id", partidaIds);
      (partidas || []).forEach((p: any) => matchInfo.set(p.id, p));
    }

    const results: any[] = [];

    for (const article of articles) {
      try {
        const m = article.partida_id ? matchInfo.get(article.partida_id) : null;
        const corCasa = m?.time_casa?.cores?.primary || m?.time_casa?.cores?.principal;
        const corFora = m?.time_fora?.cores?.primary || m?.time_fora?.cores?.principal;

        const prompt = buildPrompt({
          timeCasa: m?.time_casa?.nome,
          timeFora: m?.time_fora?.nome,
          corCasa,
          corFora,
          liga: m?.liga?.nome,
          titulo: article.titulo,
          seed: article.id, // ID = unicidade absoluta
        });

        const b64 = await generateNanoBanana(prompt, LOVABLE_API_KEY);
        if (!b64) {
          results.push({ id: article.id, titulo: article.titulo, success: false, error: "Imagem retornou null" });
          continue;
        }

        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const fileName = `regen-${article.id}.png`;

        const { error: upErr } = await supabase.storage
          .from("news-thumbnails")
          .upload(fileName, bytes, { contentType: "image/png", upsert: true });
        if (upErr) {
          results.push({ id: article.id, titulo: article.titulo, success: false, error: `Upload: ${upErr.message}` });
          continue;
        }

        const { data: urlData } = supabase.storage.from("news-thumbnails").getPublicUrl(fileName);
        const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

        const { error: updErr } = await supabase
          .from("noticias")
          .update({
            imagem_url: publicUrl,
            image_regenerated_at: new Date().toISOString(),
          })
          .eq("id", article.id);
        if (updErr) {
          results.push({ id: article.id, titulo: article.titulo, success: false, error: `Update: ${updErr.message}` });
          continue;
        }

        results.push({
          id: article.id,
          titulo: article.titulo,
          success: true,
          imagem_url: publicUrl,
          matchup: m ? `${m.time_casa?.nome} vs ${m.time_fora?.nome}` : null,
        });

        // Pequeno delay entre chamadas
        await new Promise(r => setTimeout(r, 1500));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ id: article.id, titulo: article.titulo, success: false, error: msg });
        if (msg === "RATE_LIMIT" || msg === "CREDITS_EXHAUSTED") {
          // Circuit breaker: para tudo
          break;
        }
      }
    }

    const fixed = results.filter(r => r.success).length;

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
