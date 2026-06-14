// Shared AI helpers — now using OpenAI API directly (user's own key)
// API pública mantida para compatibilidade com edge functions existentes.
// O nome do arquivo permanece `lovableAI.ts` por compatibilidade de imports,
// mas internamente usa OpenAI (chat.completions + DALL·E 3).

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";

const TEXT_MODEL = "gpt-4o-mini";
const IMAGE_MODEL = "gpt-image-1";

// Mapeamento de modelos antigos (Lovable Gateway) -> OpenAI
function mapModel(model?: string): string {
  if (!model) return TEXT_MODEL;
  // Se já é um modelo OpenAI direto, usa como veio
  if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3")) {
    return model;
  }
  // Mapas de gateway -> openai
  const map: Record<string, string> = {
    "google/gemini-2.5-flash": "gpt-4o-mini",
    "google/gemini-2.5-flash-lite": "gpt-4o-mini",
    "google/gemini-3-flash-preview": "gpt-4o-mini",
    "google/gemini-2.5-pro": "gpt-4o",
    "google/gemini-3.1-pro-preview": "gpt-4o",
    "openai/gpt-5": "gpt-4o",
    "openai/gpt-5-mini": "gpt-4o-mini",
    "openai/gpt-5-nano": "gpt-4o-mini",
    "openai/gpt-5.2": "gpt-4o",
  };
  return map[model] ?? TEXT_MODEL;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface ChatOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: any[];
  tool_choice?: any;
}

/**
 * Texto via OpenAI Chat Completions.
 * O parâmetro `apiKey` é mantido na assinatura por compatibilidade,
 * mas a chave usada é sempre OPENAI_API_KEY do ambiente (mais seguro).
 */
export async function chatCompletion(_apiKey: string, options: ChatOptions): Promise<any> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY não configurada");
  }

  const { messages, model, temperature, max_tokens, tools, tool_choice } = options;

  const body: any = {
    model: mapModel(model),
    messages,
  };
  if (temperature !== undefined) body.temperature = temperature;
  if (max_tokens !== undefined) body.max_tokens = max_tokens;
  if (tools) body.tools = tools;
  if (tool_choice) body.tool_choice = tool_choice;

  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI Chat error:", response.status, errorText);
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402 || response.status === 401) throw new Error("CREDITS_EXHAUSTED");
    if (response.status === 400 && errorText.includes("insufficient_quota")) throw new Error("CREDITS_EXHAUSTED");
    throw new Error(`OpenAI error ${response.status}: ${errorText}`);
  }

  return response.json();
}

export function getTextContent(data: any): string {
  return data.choices?.[0]?.message?.content || "";
}

// Deterministic scene variation based on a hash string
const SCENE_VARIANTS = [
  "Vista aérea panorâmica do estádio com torcida ao fundo e iluminação dourada",
  "Perspectiva do nível do gramado com foco no centro do campo e linhas laterais",
  "Ângulo da arquibancada principal com close na torcida e bandeiras coloridas",
  "Vista noturna cinemática com holofotes e neblina atmosférica sobre o campo",
  "Visão lateral do banco de reservas com o campo iluminado ao fundo",
  "Ângulo dramático de trás do gol com a rede em primeiro plano",
  "Vista do alto com padrões geométricos do gramado e sombras longas",
  "Perspectiva do túnel de acesso ao campo com luz no final",
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getSceneVariant(seed: string): string {
  return SCENE_VARIANTS[hashCode(seed) % SCENE_VARIANTS.length];
}

export function buildUniqueImagePrompt(params: {
  timeCasa: string;
  timeFora: string;
  corCasa?: string;
  corFora?: string;
  liga?: string;
  data?: string;
  seed: string;
  type?: "preview" | "validation" | "weekly" | "internal";
}): string {
  const scene = getSceneVariant(params.seed);
  const corCasa = params.corCasa || "#1a365d";
  const corFora = params.corFora || "#742a2a";
  const type = params.type || "preview";

  const typeContext: Record<string, string> = {
    preview: "Match preview atmosphere — anticipation, rivalry, pre-game energy",
    validation: "Post-match analysis mood — scoreboard, data validation, results comparison",
    weekly: "Weekly report dashboard — analytical, data-heavy, modern infographic style",
    internal: "Tactical analysis visual — field overlay, heat map aesthetic, data visualization",
  };

  return `Create a UNIQUE professional sports photograph for a football article.

MANDATORY SCENE: ${scene}

VISUAL REQUIREMENTS:
- Photorealistic stadium photograph, NOT illustration or cartoon
- ${typeContext[type]}
- Dominant colors from the two teams: ${corCasa} (home) and ${corFora} (away)
- These colors should appear in lighting, banners, or atmospheric tints
- Match context: ${params.timeCasa} vs ${params.timeFora}${params.liga ? ` — ${params.liga}` : ""}${params.data ? ` on ${params.data}` : ""}
- Professional broadcast/cinematic quality with dramatic lighting
- 16:9 aspect ratio, ultra high resolution

CRITICAL RULES:
- Do NOT include any team logos, crests, badges, or shields
- Do NOT include any text, typography, or written words in the image
- Do NOT include any recognizable player faces
- This image MUST be visually unique — different from any other stadium photo
- Use the specific camera angle described in MANDATORY SCENE above`;
}

/**
 * Geração de imagem via DALL·E 3.
 * Retorna a imagem como base64 puro (sem o prefixo `data:image/...`).
 * `apiKey` é mantido na assinatura por compatibilidade; usa OPENAI_API_KEY do ambiente.
 *
 * Custo aproximado: $0.04/imagem 1024x1024 standard.
 */
export async function generateImage(_apiKey: string, prompt: string): Promise<string | null> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    console.error("OPENAI_API_KEY não configurada — pulando geração de imagem");
    return null;
  }

  try {
    const response = await fetch(OPENAI_IMAGE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        n: 1,
        size: "1792x1024",
        quality: "standard",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DALL·E error:", response.status, errorText);
      if (response.status === 429) throw new Error("RATE_LIMIT");
      if (response.status === 402 || response.status === 401) throw new Error("CREDITS_EXHAUSTED");
      if (response.status === 400 && errorText.includes("insufficient_quota")) throw new Error("CREDITS_EXHAUSTED");
      return null;
    }

    const imgData = await response.json();
    const item = imgData.data?.[0];
    if (item?.b64_json) return item.b64_json;
    const url = item?.url;
    if (!url) {
      console.log("DALL·E retornou sem b64_json nem url");
      return null;
    }
    // Faz fetch da URL e converte em b64
    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      console.error("Falha ao baixar imagem da URL DALL·E:", imgRes.status);
      return null;
    }
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    return btoa(binary);
  } catch (error) {
    if (error instanceof Error && (error.message === "RATE_LIMIT" || error.message === "CREDITS_EXHAUSTED")) {
      throw error;
    }
    console.error("Erro ao gerar imagem:", error);
    return null;
  }
}
