// Shared kill-switch helper for content/image generation functions.
// Reads `content_generation_enabled` from public.app_settings.
// When false, edge functions should return early with HTTP 200 + { disabled: true }.
//
// Per-feature whitelist:
// `content_generation_whitelist` (jsonb object, e.g. { "pre_game_br_only": true }) lets
// specific flows run even when the global flag is off. Use `isFeatureAllowed("pre_game_br_only")`.
//
// Usage (global gate):
//   import { isContentGenerationEnabled, disabledResponse } from "../_shared/killswitch.ts";
//   if (!(await isContentGenerationEnabled())) return disabledResponse(corsHeaders, "my-fn");
//
// Usage (feature gate — bypasses global kill-switch when whitelisted):
//   if (!(await isFeatureAllowed("pre_game_br_only"))) return disabledResponse(corsHeaders, "my-fn");

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

let _cache: { enabled: boolean; whitelist: Record<string, boolean>; at: number } | null = null;
const TTL_MS = 30_000; // 30s cache to avoid hammering DB

async function loadSettings() {
  if (_cache && Date.now() - _cache.at < TTL_MS) return _cache;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["content_generation_enabled", "content_generation_whitelist"]);

    const map = new Map((data || []).map((r: any) => [r.key, r.value]));
    const rawEnabled = map.get("content_generation_enabled");
    const enabled = rawEnabled === true || rawEnabled === "true";
    const rawWl = map.get("content_generation_whitelist");
    const whitelist =
      rawWl && typeof rawWl === "object" && !Array.isArray(rawWl)
        ? (rawWl as Record<string, boolean>)
        : {};
    _cache = { enabled, whitelist, at: Date.now() };
    return _cache;
  } catch (err) {
    console.warn("killswitch: failed to read app_settings, defaulting to DISABLED", err);
    _cache = { enabled: false, whitelist: {}, at: Date.now() };
    return _cache;
  }
}

export async function isContentGenerationEnabled(): Promise<boolean> {
  return (await loadSettings()).enabled;
}

export async function isFeatureAllowed(featureKey: string): Promise<boolean> {
  const s = await loadSettings();
  if (s.enabled) return true; // global ON → everything allowed
  return s.whitelist?.[featureKey] === true;
}

export function disabledResponse(
  corsHeaders: Record<string, string>,
  fnName: string,
) {
  return new Response(
    JSON.stringify({
      success: true,
      disabled: true,
      skipped: true,
      reason: "content_generation_killswitch",
      function: fnName,
      message:
        "Geração de conteúdo pausada pelo administrador (modo economia). Reative em app_settings.content_generation_enabled ou adicione ao content_generation_whitelist.",
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
