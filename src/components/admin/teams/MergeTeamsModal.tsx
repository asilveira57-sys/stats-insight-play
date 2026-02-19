import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  GitMerge,
  ArrowRight,
  Search,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useTeamsCanonical, useMergeTeams, useTeamMatchCounts } from "@/hooks/useTeamCanonical";
import { useMergeRequiresReport, useSaveMergeDecision } from "@/hooks/useMergeReport";
import { PreMergeReportModal } from "./PreMergeReportModal";

interface MergeTeamsModalProps {
  open: boolean;
  onClose: () => void;
  initialTarget: { id: string; name: string } | null;
  initialSource: { id: string; name: string } | null;
  onSuccess: () => void;
}

const DECISION_REASONS = [
  { value: "duplicidade_ligas_adversarios", label: "Duplicidade confirmada por ligas/adversários" },
  { value: "duplicidade_id_externo", label: "Duplicidade confirmada por ID externo" },
  { value: "duplicidade_verificacao_manual", label: "Duplicidade confirmada por verificação manual externa" },
  { value: "validacao_externa_automatica", label: "Validação externa automática (IA + busca)" },
  { value: "dados_insuficientes_assumir_risco", label: "Decisão com dados insuficientes (assumir risco)" },
];

export function MergeTeamsModal({
  open,
  onClose,
  initialTarget,
  initialSource,
  onSuccess,
}: MergeTeamsModalProps) {
  const [step, setStep] = useState<"select" | "confirm" | "success">("select");
  const [targetTeam, setTargetTeam] = useState(initialTarget);
  const [sourceTeam, setSourceTeam] = useState(initialSource);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectingFor, setSelectingFor] = useState<"target" | "source" | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportViewed, setReportViewed] = useState(false);
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionDetail, setDecisionDetail] = useState("");

  const { data: teamsData, isLoading: loadingTeams } = useTeamsCanonical(
    searchQuery,
    "active",
    0,
    10
  );

  const { data: targetMatchCounts } = useTeamMatchCounts(targetTeam?.id || null);
  const { data: sourceMatchCounts } = useTeamMatchCounts(sourceTeam?.id || null);
  const { data: requiresReport } = useMergeRequiresReport();

  const mergeTeams = useMergeTeams();
  const saveMergeDecision = useSaveMergeDecision();

  useEffect(() => {
    if (open) {
      setTargetTeam(initialTarget);
      setSourceTeam(initialSource);
      setStep(initialTarget && initialSource ? "confirm" : "select");
      setSearchQuery("");
      setSelectingFor(null);
      setReportViewed(false);
      setDecisionReason("");
      setDecisionDetail("");
    }
  }, [open, initialTarget, initialSource]);

  const handleSelectTeam = (team: { id: string; nome: string }) => {
    if (selectingFor === "target") {
      if (team.id === sourceTeam?.id) {
        toast.error("O time alvo não pode ser o mesmo que o time origem");
        return;
      }
      setTargetTeam({ id: team.id, name: team.nome });
    } else if (selectingFor === "source") {
      if (team.id === targetTeam?.id) {
        toast.error("O time origem não pode ser o mesmo que o time alvo");
        return;
      }
      setSourceTeam({ id: team.id, name: team.nome });
    }
    setSelectingFor(null);
    setSearchQuery("");
  };

  const handleConfirmMerge = async () => {
    if (!targetTeam || !sourceTeam) return;

    if (!decisionReason) {
      toast.error("Selecione o motivo da decisão de fusão");
      return;
    }

    try {
      // Save decision audit
      await saveMergeDecision.mutateAsync({
        keptTeamId: targetTeam.id,
        removedTeamId: sourceTeam.id,
        similarityScore: null,
        riskLevel: null,
        decisionReason,
        decisionReasonDetail: decisionDetail || undefined,
      });

      const result = await mergeTeams.mutateAsync({
        targetId: targetTeam.id,
        sourceId: sourceTeam.id,
      });

      setStep("success");
      toast.success(
        `Fusão concluída! ${result.matches_updated} partidas migradas.`
      );
    } catch (error: any) {
      toast.error(error.message || "Erro ao fundir times");
    }
  };

  const handleClose = () => {
    setStep("select");
    setTargetTeam(null);
    setSourceTeam(null);
    setSearchQuery("");
    setSelectingFor(null);
    setShowReport(false);
    setReportViewed(false);
    setDecisionReason("");
    setDecisionDetail("");
    onClose();
  };

  const handleSuccessClose = () => {
    handleClose();
    onSuccess();
  };

  const canProceed = targetTeam && sourceTeam && targetTeam.id !== sourceTeam.id;
  const canConfirm = decisionReason && (!requiresReport || reportViewed);

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5" />
              Fundir Times
            </DialogTitle>
            <DialogDescription>
              {step === "select" &&
                "Selecione o time que será mantido (alvo) e o time que será fundido (origem)."}
              {step === "confirm" &&
                "Revise os detalhes da fusão antes de confirmar."}
              {step === "success" && "Fusão realizada com sucesso!"}
            </DialogDescription>
          </DialogHeader>

          {step === "select" && (
            <div className="space-y-4">
              {/* Target Team */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Time Alvo (será mantido)
                </label>
                {targetTeam && selectingFor !== "target" ? (
                  <Card className="border-secondary">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{targetTeam.name}</p>
                        <Badge className="bg-secondary text-xs">Será mantido</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectingFor("target");
                          setSearchQuery("");
                        }}
                      >
                        Alterar
                      </Button>
                    </CardContent>
                  </Card>
                ) : selectingFor === "target" ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar time..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        autoFocus
                      />
                    </div>
                    {loadingTeams ? (
                      <div className="py-4 text-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : teamsData?.teams && teamsData.teams.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto border rounded-md">
                        {teamsData.teams.map((team) => (
                          <button
                            key={team.id}
                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                            onClick={() => handleSelectTeam(team)}
                          >
                            {team.nome}
                          </button>
                        ))}
                      </div>
                    ) : searchQuery ? (
                      <div className="py-4 text-center text-muted-foreground text-sm">
                        Nenhum time encontrado
                      </div>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectingFor(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectingFor("target")}
                  >
                    Selecionar time alvo
                  </Button>
                )}
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
              </div>

              {/* Source Team */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Time Origem (será fundido)
                </label>
                {sourceTeam && selectingFor !== "source" ? (
                  <Card className="border-destructive/50">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{sourceTeam.name}</p>
                        <Badge variant="destructive" className="text-xs">
                          Será removido
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectingFor("source");
                          setSearchQuery("");
                        }}
                      >
                        Alterar
                      </Button>
                    </CardContent>
                  </Card>
                ) : selectingFor === "source" ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar time..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        autoFocus
                      />
                    </div>
                    {loadingTeams ? (
                      <div className="py-4 text-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : teamsData?.teams && teamsData.teams.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto border rounded-md">
                        {teamsData.teams.map((team) => (
                          <button
                            key={team.id}
                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                            onClick={() => handleSelectTeam(team)}
                          >
                            {team.nome}
                          </button>
                        ))}
                      </div>
                    ) : searchQuery ? (
                      <div className="py-4 text-center text-muted-foreground text-sm">
                        Nenhum time encontrado
                      </div>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectingFor(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectingFor("source")}
                  >
                    Selecionar time origem
                  </Button>
                )}
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => setStep("confirm")}
                  disabled={!canProceed}
                >
                  Continuar
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "confirm" && targetTeam && sourceTeam && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Esta ação é irreversível. O time "{sourceTeam.name}" será marcado
                  como fundido e todas as suas referências serão migradas para "
                  {targetTeam.name}".
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <Card className="border-secondary">
                  <CardContent className="p-4">
                    <Badge className="bg-secondary mb-2">Alvo (mantido)</Badge>
                    <p className="font-medium">{targetTeam.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {targetMatchCounts?.total || 0} partidas
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-destructive/50">
                  <CardContent className="p-4">
                    <Badge variant="destructive" className="mb-2">
                      Origem (removido)
                    </Badge>
                    <p className="font-medium">{sourceTeam.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {sourceMatchCounts?.total || 0} partidas
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Report button */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowReport(true)}
              >
                <FileText className="h-4 w-4" />
                Relatório Pré-Fusão
                {reportViewed && (
                  <CheckCircle className="h-4 w-4 text-green-400 ml-auto" />
                )}
              </Button>

              {requiresReport && !reportViewed && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    É obrigatório visualizar o relatório pré-fusão antes de confirmar.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Motivo da decisão *
                  </label>
                  <Select value={decisionReason} onValueChange={setDecisionReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motivo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DECISION_REASONS.map(r => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Detalhes adicionais (opcional)
                  </label>
                  <Textarea
                    placeholder="Observações sobre a decisão..."
                    value={decisionDetail}
                    onChange={(e) => setDecisionDetail(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">O que será migrado:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Todas as partidas do time origem</li>
                  <li>• Todos os aliases do time origem</li>
                  <li>• Todos os IDs externos mapeados</li>
                  <li>• O nome canônico será adicionado como alias</li>
                </ul>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setStep("select")}>
                  Voltar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmMerge}
                  disabled={mergeTeams.isPending || saveMergeDecision.isPending || !canConfirm}
                >
                  {(mergeTeams.isPending || saveMergeDecision.isPending) ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <GitMerge className="h-4 w-4 mr-2" />
                  )}
                  Confirmar Fusão
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-6 space-y-4">
              <CheckCircle className="h-16 w-16 text-secondary mx-auto" />
              <div>
                <p className="text-lg font-medium">Fusão concluída!</p>
                <p className="text-muted-foreground">
                  O time foi fundido com sucesso.
                </p>
              </div>
              <Button onClick={handleSuccessClose}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pre-merge Report Modal */}
      <PreMergeReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        teamAId={targetTeam?.id || null}
        teamAName={targetTeam?.name || ""}
        teamBId={sourceTeam?.id || null}
        teamBName={sourceTeam?.name || ""}
        onReportLoaded={() => setReportViewed(true)}
      />
    </>
  );
}
