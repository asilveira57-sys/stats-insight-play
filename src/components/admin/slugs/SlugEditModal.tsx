import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle, History, ExternalLink } from "lucide-react";
import {
  TeamWithSlugInfo,
  EntityType,
  normalizeSlug,
  validateSlugFormat,
  useCheckSlugUnique,
  useUpdateTeamSlug,
  useSlugAuditLogs,
} from "@/hooks/useSlugAdmin";
import { SlugStatusBadge } from "./SlugStatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SlugEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  team?: TeamWithSlugInfo | null;
}

export function SlugEditModal({
  open,
  onOpenChange,
  entityType,
  team,
}: SlugEditModalProps) {
  const [newSlug, setNewSlug] = useState("");
  const [reason, setReason] = useState("");
  const [activeTab, setActiveTab] = useState("edit");

  const updateSlug = useUpdateTeamSlug();
  const { data: auditLogs, isLoading: loadingLogs } = useSlugAuditLogs(
    entityType,
    team?.id || null
  );
  const { data: uniqueCheck, isLoading: checkingUnique } = useCheckSlugUnique(
    entityType,
    newSlug,
    team?.id || null
  );

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open && team) {
      setNewSlug(team.slug || "");
      setReason("");
      setActiveTab("edit");
    }
  }, [open, team]);

  if (!team) return null;

  const formatValidation = validateSlugFormat(newSlug);
  const isUnique = uniqueCheck?.unique ?? true;
  const canSave =
    formatValidation.valid &&
    isUnique &&
    reason.trim().length > 0 &&
    newSlug !== team.slug &&
    !team.slug_locked;

  const previewUrl =
    entityType === "team" ? `/times/${newSlug}` : `/partidas/${newSlug}`;

  const handleSave = async (lock: boolean) => {
    if (!canSave && !lock) return;

    await updateSlug.mutateAsync({
      teamId: team.id,
      newSlug,
      reason,
      lock,
    });

    onOpenChange(false);
  };

  const handleSlugChange = (value: string) => {
    // Auto-normalize on input
    const normalized = normalizeSlug(value);
    setNewSlug(normalized);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar Slug
            <SlugStatusBadge status={team.status} conflictCount={team.conflict_count} />
          </DialogTitle>
          <DialogDescription>
            {entityType === "team" ? "Time" : "Partida"}: <strong>{team.nome}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Editar</TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4 mt-4">
            {/* Informações do time */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Nome Original</Label>
                <p className="font-medium">{team.nome}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Nome Normalizado</Label>
                <p className="font-medium font-mono text-sm">
                  {team.name_normalized || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Slug Atual</Label>
                <p className="font-medium font-mono text-sm">{team.slug || "-"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">API ID</Label>
                <p className="font-medium">{team.api_id || "-"}</p>
              </div>
            </div>

            {/* External IDs */}
            {team.external_ids.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">IDs Externos</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {team.external_ids.map((ext, i) => (
                    <Badge key={i} variant="outline" className="font-mono text-xs">
                      {ext.source_name || ext.source_id}: {ext.external_id}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Alerta se travado */}
            {team.slug_locked && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Este slug está travado. Destrave-o primeiro para poder editar.
                </AlertDescription>
              </Alert>
            )}

            {/* Campo de novo slug */}
            <div className="space-y-2">
              <Label htmlFor="new-slug">Novo Slug</Label>
              <Input
                id="new-slug"
                value={newSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="digite-o-slug-aqui"
                disabled={team.slug_locked}
                className="font-mono"
              />
              
              {/* Validações em tempo real */}
              <div className="flex flex-col gap-1 text-sm">
                {!formatValidation.valid && newSlug && (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {formatValidation.error}
                  </span>
                )}
                {checkingUnique && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Verificando unicidade...
                  </span>
                )}
                {!checkingUnique && !isUnique && (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Slug já existe para outro registro
                  </span>
                )}
                {formatValidation.valid && isUnique && newSlug && (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Slug válido e único
                  </span>
                )}
              </div>
            </div>

            {/* Preview de URL */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Preview de URL</Label>
              <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                {previewUrl}
              </div>
            </div>

            {/* Campo de motivo */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Motivo da Alteração <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo da alteração do slug..."
                disabled={team.slug_locked}
                rows={3}
              />
              {reason.trim().length === 0 && (
                <span className="text-xs text-muted-foreground">
                  O motivo é obrigatório para auditoria
                </span>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {loadingLogs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : auditLogs && auditLogs.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {format(new Date(log.changed_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.field}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-mono">
                      <span className="text-muted-foreground line-through">
                        {log.old_value || "(vazio)"}
                      </span>
                      <span>→</span>
                      <span className="font-medium">{log.new_value || "(vazio)"}</span>
                    </div>
                    {log.reason && (
                      <p className="text-sm text-muted-foreground">{log.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum histórico de alteração encontrado.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleSave(false)}
            disabled={!canSave || updateSlug.isPending}
          >
            {updateSlug.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSave(true)}
            disabled={!canSave || updateSlug.isPending}
          >
            {updateSlug.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar e Travar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
