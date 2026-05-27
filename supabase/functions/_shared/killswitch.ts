// Shared kill-switch helper for content/image generation functions.
// Reads `content_generation_enabled` from public.app_settings.
// When false, edge functions should return early with HTTP 200 + { disabled: true }.
//
// Usage:
//   import { isContentGenerationEnabled, disabledResponse } from "../_shared/killswitch.ts";
//   if (!(await isContentGenerationEnabled())) return disabledResponse(corsHeaders, "my-fn");

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

let _cache: { value: boolean; at: number } | null = null;
const TTL_MS = 30_000; // 30s cache to avoid hammering DB

export async function isContentGenerationEnabled(): Promise<boolean> {
  if (_cache && Date.now() - _cache.at < TTL_MS) return _cache.value;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "content_generation_enabled")
      .maybeSingle();
    // value is JSONB boolean; supabase-js returns native boolean
    const enabled = data?.value === true || (data?.value as any) === "true";
    _cache = { value: enabled, at: Date.now() };
    return enabled;
  } catch (err) {
    console.warn("killswitch: failed to read app_settings, defaulting to DISABLED", err);
    return false;
  }
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
        "Geração de conteúdo pausada pelo administrador (modo economia). Reative em app_settings.content_generation_enabled.",
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
