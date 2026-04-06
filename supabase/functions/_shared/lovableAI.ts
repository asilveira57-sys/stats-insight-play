// Shared Lovable AI Gateway helpers — zero cost, no external API keys needed

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TEXT_MODEL = "google/gemini-2.5-flash";
const IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";

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

export async function chatCompletion(apiKey: string, options: ChatOptions): Promise<any> {
  const { messages, model, temperature, max_tokens, tools, tool_choice } = options;

  const body: any = {
    model: model || TEXT_MODEL,
    messages,
  };
  if (temperature !== undefined) body.temperature = temperature;
  if (max_tokens !== undefined) body.max_tokens = max_tokens;
  if (tools) body.tools = tools;
  if (tool_choice) body.tool_choice = tool_choice;

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Lovable AI Gateway error:", response.status, errorText);
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("CREDITS_EXHAUSTED");
    throw new Error(`AI Gateway error ${response.status}: ${errorText}`);
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

export async function generateImage(apiKey: string, prompt: string): Promise<string | null> {
  try {
    const data = await chatCompletion(apiKey, {
      model: IMAGE_MODEL,
      messages: [{ role: "user", content: prompt }],
    });

    // Add modalities to the request body manually since chatCompletion doesn't support it
    // We need to call directly
    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Image generation error:", response.status, errorText);
      if (response.status === 429) throw new Error("RATE_LIMIT");
      if (response.status === 402) throw new Error("CREDITS_EXHAUSTED");
      return null;
    }

    const imgData = await response.json();
    const imageUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      console.log("No image in AI response");
      return null;
    }

    // Return raw base64 (without data URL prefix)
    return imageUrl.replace(/^data:image\/[a-z]+;base64,/, "");
  } catch (error) {
    if (error instanceof Error && (error.message === "RATE_LIMIT" || error.message === "CREDITS_EXHAUSTED")) {
      throw error;
    }
    console.error("Error generating image:", error);
    return null;
  }
}
