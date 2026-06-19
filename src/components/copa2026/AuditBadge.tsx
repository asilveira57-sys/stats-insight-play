import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAnalysisAudit } from "@/hooks/useAnalysisAudit";

export function AuditBadge({ matchId }: { matchId: string }) {
  const { data } = useAnalysisAudit(matchId);
  if (!data) return null;

  const map = {
    verified: { label: "Verificado", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", Icon: ShieldCheck },
    partial: { label: "Parcialmente verificado", className: "bg-amber-500/15 text-amber-500 border-amber-500/30", Icon: ShieldAlert },
    low: { label: "Baixa confiabilidade", className: "bg-destructive/15 text-destructive border-destructive/30", Icon: ShieldX },
  } as const;
  const cfg = map[data.badge] ?? map.partial;
  const Icon = cfg.Icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.className}`}>
            <Icon className="w-3 h-3" />
            {cfg.label} · {data.audit_grade}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          <div className="space-y-1">
            <div>Nota: <strong>{data.audit_grade}</strong> ({data.audit_score.toFixed(0)}/100)</div>
            <div>Fontes consultadas: {data.data_source_count}</div>
            <div>Fatos confirmados: {data.verified_claims}</div>
            <div>Não confirmados: {data.unverified_claims}</div>
            {data.inconsistent_claims > 0 && <div className="text-destructive">Inconsistências: {data.inconsistent_claims}</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
