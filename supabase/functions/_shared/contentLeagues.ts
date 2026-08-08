// Whitelist de campeonatos habilitados para geração automática de conteúdo.
// Fonte: public.content_automation_leagues (gerenciada no Admin > Campeonatos Automáticos).
//
// Regra de negócio: só gastamos crédito de IA com campeonatos principais/nacionais
// explicitamente habilitados. Nada de futebol europeu ou competições pequenas por padrão.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface AutomationLeague {
  liga_id: string;
  enabled: boolean;
  pre_game_enabled: boolean;
  post_game_enabled: boolean;
  days_ahead: number;
  max_per_run: number;
}

let _cache: { rows: AutomationLeague[]; at: number } | null = null;
const TTL_MS = 30_000;

export async function getAutomationLeagues(): Promise<AutomationLeague[]> {
  if (_cache && Date.now() - _cache.at < TTL_MS) return _cache.rows;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("content_automation_leagues")
    .select("liga_id, enabled, pre_game_enabled, post_game_enabled, days_ahead, max_per_run")
    .eq("enabled", true);

  if (error) {
    console.warn("contentLeagues: falha ao ler content_automation_leagues", error.message);
    return _cache?.rows ?? [];
  }
  _cache = { rows: (data || []) as AutomationLeague[], at: Date.now() };
  return _cache.rows;
}

/** IDs de ligas liberadas para o tipo de conteúdo pedido. Vazio = não gerar nada. */
export async function getAllowedLeagueIds(kind: "pre" | "post"): Promise<string[]> {
  const rows = await getAutomationLeagues();
  return rows
    .filter((r) => (kind === "pre" ? r.pre_game_enabled : r.post_game_enabled))
    .map((r) => r.liga_id);
}

export async function getLeagueConfig(ligaId: string): Promise<AutomationLeague | null> {
  const rows = await getAutomationLeagues();
  return rows.find((r) => r.liga_id === ligaId) ?? null;
}

export function noAllowedLeaguesResponse(corsHeaders: Record<string, string>, fnName: string) {
  console.log(`[${fnName}] nenhum campeonato habilitado para automação — nada a fazer`);
  return new Response(
    JSON.stringify({
      success: true,
      skipped: true,
      reason: "no_automation_leagues",
      message:
        "Nenhum campeonato está habilitado para geração automática. Configure em Admin > Campeonatos Automáticos.",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
