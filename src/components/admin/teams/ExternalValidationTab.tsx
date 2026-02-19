import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Globe,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Zap,
  Shield,
  Bot,
  MapPin,
} from "lucide-react";
import {
  useRunExternalValidation,
  useLatestValidationRun,
  type ValidationRunResult,
  type ValidationEvidence,
} from "@/hooks/useExternalValidation";
import { toast } from "sonner";

interface ExternalValidationTabProps {
  teamAId: string | null;
  teamAName: string;
  teamBId: string | null;
  teamBName: string;
  onAutoMergeComplete?: () => void;
}

export function ExternalValidationTab({
  teamAId,
  teamAName,
  teamBId,
  teamBName,
  onAutoMergeComplete,
}: ExternalValidationTabProps) {
  const [autoMerge, setAutoMerge] = useState(false);
  const [strictMode, setStrictMode] = useState(false);

  const { data: existingRun, isLoading: loadingExisting } = useLatestValidationRun(teamAId, teamBId);
  const runValidation = useRunExternalValidation();

  const handleRunValidation = async (forceRefresh = false) => {
    if (!teamAId || !teamBId) return;

    try {
      const result = await runValidation.mutateAsync({
        keptTeamId: teamAId,
        removedTeamId: teamBId,
        forceRefresh,
        autoMergeMode: autoMerge,
        strictMode,
      });

      if (result.merge_result && !result.merge_result.error) {
        toast.success("Auto-fusão realizada com sucesso!");
        onAutoMergeComplete?.();
      } else if (result.merge_result?.error) {
        toast.error(`Erro na auto-fusão: ${result.merge_result.error}`);
      }
    } catch (e: any) {
      toast.error(e.message || "Erro na validação externa");
    }
  };

  const result = runValidation.data || existingRun;
  const isRunning = runValidation.isPending;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={autoMerge} onCheckedChange={setAutoMerge} id="auto-merge" />
            <label htmlFor="auto-merge" className="text-sm flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" />
              Auto-fusão
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={strictMode} onCheckedChange={setStrictMode} id="strict-mode" />
            <label htmlFor="strict-mode" className="text-sm flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              Modo estrito
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {result && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRunValidation(true)}
              disabled={isRunning}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Revalidar
            </Button>
          )}
          {!result && (
            <Button onClick={() => handleRunValidation(false)} disabled={isRunning}>
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Globe className="h-4 w-4 mr-2" />
              )}
              {isRunning ? "Validando..." : "Iniciar Validação Externa"}
            </Button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {(isRunning || loadingExisting) && !result && (
        <div className="space-y-4 py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>
              {isRunning
                ? "Buscando evidências externas e analisando com IA..."
                : "Carregando última validação..."}
            </span>
          </div>
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      )}

      {/* Results */}
      {result && <ValidationResults result={result} />}

      {/* No results yet */}
      {!result && !isRunning && !loadingExisting && (
        <Alert>
          <Bot className="h-4 w-4" />
          <AlertDescription>
            A validação externa busca provas na internet (via Firecrawl) e analisa com IA para
            determinar se "{teamAName}" e "{teamBName}" são o mesmo clube. Clique em "Iniciar
            Validação Externa" para começar.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function ValidationResults({ result }: { result: ValidationRunResult }) {
  const getDecisionConfig = (decision: string | null) => {
    switch (decision) {
      case "SAME_TEAM":
        return {
          icon: <CheckCircle className="h-6 w-6 text-green-400" />,
          label: "Mesmo Time",
          color: "bg-green-500/20 text-green-400 border-green-500/30",
        };
      case "DIFFERENT_TEAM":
        return {
          icon: <XCircle className="h-6 w-6 text-red-400" />,
          label: "Times Diferentes",
          color: "bg-red-500/20 text-red-400 border-red-500/30",
        };
      default:
        return {
          icon: <HelpCircle className="h-6 w-6 text-amber-400" />,
          label: "Inconclusivo",
          color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        };
    }
  };

  const actionConfig: Record<string, { label: string; color: string }> = {
    auto_merge: { label: "Auto-Fusão Aprovada", color: "bg-green-500/20 text-green-400" },
    manual_review: { label: "Revisão Manual Necessária", color: "bg-amber-500/20 text-amber-400" },
    block: { label: "Fusão Bloqueada", color: "bg-red-500/20 text-red-400" },
  };

  const dc = getDecisionConfig(result.decision);
  const action = result.slug_suggestion?.recommended_action || result.recommended_action;
  const ac = actionConfig[action] || actionConfig.manual_review;

  const evidence = (result.evidence_json || []) as ValidationEvidence[];
  const identityA = result.slug_suggestion?.team_a_identity;
  const identityB = result.slug_suggestion?.team_b_identity;

  return (
    <div className="space-y-4">
      {/* Decision Header */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {dc.icon}
              <div>
                <div className="flex items-center gap-2">
                  <Badge className={dc.color}>{dc.label}</Badge>
                  <span className="text-2xl font-bold">{result.confidence_score ?? "?"}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>
                <Badge className={`mt-1 ${ac.color}`}>{ac.label}</Badge>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>IA: {result.ai_model_used || "?"}</p>
              <p>Busca: {result.search_provider_used || "?"}</p>
              {result.finished_at && (
                <p>{new Date(result.finished_at).toLocaleString("pt-BR")}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-merge result */}
      {result.merge_result && !result.merge_result.error && (
        <Alert className="border-green-500/30 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            Fusão automática realizada! {result.merge_result.matches_updated || 0} partidas migradas.
          </AlertDescription>
        </Alert>
      )}

      {/* Reasons */}
      {result.reasons_json && result.reasons_json.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.reasons_json.map((reason, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {reason}
            </Badge>
          ))}
        </div>
      )}

      {/* Identity Cards */}
      {(identityA || identityB) && (
        <div className="grid grid-cols-2 gap-4">
          {identityA && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Identidade Time A
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{identityA.most_common_name}</p>
                {identityA.city && <p className="text-muted-foreground">{identityA.city}</p>}
                {identityA.state && <p className="text-muted-foreground">{identityA.state}</p>}
                {identityA.country && <p className="text-muted-foreground">{identityA.country}</p>}
                <Badge variant="outline" className="text-xs mt-1">
                  Confiança: {identityA.confidence}
                </Badge>
              </CardContent>
            </Card>
          )}
          {identityB && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Identidade Time B
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{identityB.most_common_name}</p>
                {identityB.city && <p className="text-muted-foreground">{identityB.city}</p>}
                {identityB.state && <p className="text-muted-foreground">{identityB.state}</p>}
                {identityB.country && <p className="text-muted-foreground">{identityB.country}</p>}
                <Badge variant="outline" className="text-xs mt-1">
                  Confiança: {identityB.confidence}
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Evidence List */}
      {evidence.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Evidências por Jogo ({evidence.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {evidence.map((ev, i) => (
              <EvidenceItem key={i} evidence={ev} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Slug suggestion */}
      {result.slug_suggestion && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sugestão de Slug</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Slug canônico:{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                {result.slug_suggestion.canonical_slug}
              </code>
            </p>
            {result.slug_suggestion.aliases?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-muted-foreground">Aliases:</span>
                {result.slug_suggestion.aliases.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {a}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EvidenceItem({ evidence }: { evidence: ValidationEvidence }) {
  const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    verified_strong: {
      icon: <CheckCircle className="h-4 w-4 text-green-400" />,
      label: "Verificado (forte)",
      color: "text-green-400",
    },
    verified_medium: {
      icon: <CheckCircle className="h-4 w-4 text-amber-400" />,
      label: "Verificado (médio)",
      color: "text-amber-400",
    },
    not_verified: {
      icon: <HelpCircle className="h-4 w-4 text-muted-foreground" />,
      label: "Não verificado",
      color: "text-muted-foreground",
    },
    conflict: {
      icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
      label: "Conflito",
      color: "text-red-400",
    },
  };

  const sc = statusConfig[evidence.status] || statusConfig.not_verified;
  const game = evidence.game;

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {sc.icon}
          <span className="text-sm font-medium">
            {game.mandante} vs {game.visitante}
          </span>
          {game.gols_casa !== null && (
            <span className="text-xs font-mono text-muted-foreground">
              {game.gols_casa}-{game.gols_fora}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {game.context}
          </Badge>
          <span className={`text-xs ${sc.color}`}>{sc.label}</span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {game.data} • {game.liga_nome || "Liga desconhecida"}
      </div>

      {evidence.links.length > 0 && (
        <div className="space-y-1">
          {evidence.links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline truncate"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              {link.title || link.url}
            </a>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{evidence.summary}</p>
    </div>
  );
}
