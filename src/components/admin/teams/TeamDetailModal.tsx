import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tag,
  Plus,
  Trash2,
  GitMerge,
  Calendar,
  Edit,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useTeamDetails,
  useTeamAliases,
  useTeamMatchCounts,
  useAddAlias,
  useDeleteAlias,
  useUpdateAlias,
} from "@/hooks/useTeamCanonical";

interface TeamDetailModalProps {
  teamId: string | null;
  open: boolean;
  onClose: () => void;
  onMerge: (team: { id: string; name: string }) => void;
}

export function TeamDetailModal({
  teamId,
  open,
  onClose,
  onMerge,
}: TeamDetailModalProps) {
  const { data: team, isLoading: loadingTeam } = useTeamDetails(teamId);
  const { data: aliases, isLoading: loadingAliases } = useTeamAliases(teamId);
  const { data: matchCounts } = useTeamMatchCounts(teamId);

  const [showAddAlias, setShowAddAlias] = useState(false);
  const [newAliasName, setNewAliasName] = useState("");
  const [newAliasSource, setNewAliasSource] = useState("manual");
  const [editingAliasId, setEditingAliasId] = useState<string | null>(null);
  const [editingAliasValue, setEditingAliasValue] = useState("");

  const addAlias = useAddAlias();
  const deleteAlias = useDeleteAlias();
  const updateAlias = useUpdateAlias();

  const handleAddAlias = async () => {
    if (!teamId || !newAliasName.trim()) return;

    try {
      await addAlias.mutateAsync({
        teamId,
        alias: newAliasName.trim(),
        source: newAliasSource,
      });
      toast.success("Alias adicionado com sucesso!");
      setNewAliasName("");
      setShowAddAlias(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar alias");
    }
  };

  const handleDeleteAlias = async (aliasId: string) => {
    if (!teamId) return;

    try {
      await deleteAlias.mutateAsync({ aliasId, teamId });
      toast.success("Alias removido com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover alias");
    }
  };

  const handleStartEdit = (aliasId: string, currentValue: string) => {
    setEditingAliasId(aliasId);
    setEditingAliasValue(currentValue);
  };

  const handleSaveEdit = async () => {
    if (!teamId || !editingAliasId || !editingAliasValue.trim()) return;

    try {
      await updateAlias.mutateAsync({
        aliasId: editingAliasId,
        teamId,
        updates: { alias: editingAliasValue.trim() },
      });
      toast.success("Alias atualizado com sucesso!");
      setEditingAliasId(null);
      setEditingAliasValue("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar alias");
    }
  };

  const handleCancelEdit = () => {
    setEditingAliasId(null);
    setEditingAliasValue("");
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {loadingTeam ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <>
                <span>{team?.nome}</span>
                {team?.status === "active" ? (
                  <Badge className="bg-secondary">Ativo</Badge>
                ) : team?.status === "merged" ? (
                  <Badge variant="secondary">Fundido</Badge>
                ) : (
                  <Badge variant="outline">Desativado</Badge>
                )}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {loadingTeam ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : team ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Slug</p>
                <code className="text-sm bg-muted px-2 py-0.5 rounded">
                  {team.slug}
                </code>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">País</p>
                <p className="text-sm font-medium">{team.pais || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Partidas (Casa)</p>
                <p className="text-sm font-medium">{matchCounts?.home || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Partidas (Fora)</p>
                <p className="text-sm font-medium">{matchCounts?.away || 0}</p>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="aliases">
              <TabsList>
                <TabsTrigger value="aliases" className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  Aliases ({aliases?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Relacionamentos
                </TabsTrigger>
              </TabsList>

              {/* Aliases Tab */}
              <TabsContent value="aliases" className="mt-4 space-y-4">
                {/* Add Alias Button/Form */}
                {team.status === "active" && (
                  <div>
                    {showAddAlias ? (
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground">
                            Nome do Alias
                          </label>
                          <Input
                            value={newAliasName}
                            onChange={(e) => setNewAliasName(e.target.value)}
                            placeholder="Ex: CR Flamengo"
                          />
                        </div>
                        <div className="w-32">
                          <label className="text-xs text-muted-foreground">
                            Fonte
                          </label>
                          <Select
                            value={newAliasSource}
                            onValueChange={setNewAliasSource}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">Manual</SelectItem>
                              <SelectItem value="api-football">
                                API-Football
                              </SelectItem>
                              <SelectItem value="football-data">
                                Football-Data
                              </SelectItem>
                              <SelectItem value="openfootball">
                                OpenFootball
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleAddAlias}
                          disabled={addAlias.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowAddAlias(false);
                            setNewAliasName("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAddAlias(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Alias
                      </Button>
                    )}
                  </div>
                )}

                {/* Aliases Table */}
                {loadingAliases ? (
                  <Skeleton className="h-40 w-full" />
                ) : aliases && aliases.length > 0 ? (
                  <div className="rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Alias</TableHead>
                          <TableHead>Normalizado</TableHead>
                          <TableHead>Fonte</TableHead>
                          <TableHead className="text-center">
                            Confiança
                          </TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aliases.map((alias) => (
                          <TableRow key={alias.id}>
                            <TableCell>
                              {editingAliasId === alias.id ? (
                                <Input
                                  value={editingAliasValue}
                                  onChange={(e) =>
                                    setEditingAliasValue(e.target.value)
                                  }
                                  className="h-8"
                                />
                              ) : (
                                <span className="font-medium">{alias.alias}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs text-muted-foreground">
                                {alias.normalized_alias}
                              </code>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {alias.source || "interno"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  alias.confidence >= 90
                                    ? "default"
                                    : alias.confidence >= 70
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {alias.confidence}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {team.status === "active" && (
                                <div className="flex items-center justify-end gap-1">
                                  {editingAliasId === alias.id ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleSaveEdit}
                                        disabled={updateAlias.isPending}
                                      >
                                        <Check className="h-4 w-4 text-secondary" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelEdit}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleStartEdit(alias.id, alias.alias)
                                        }
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleDeleteAlias(alias.id)
                                        }
                                        disabled={deleteAlias.isPending}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum alias cadastrado.
                  </div>
                )}
              </TabsContent>

              {/* Stats Tab */}
              <TabsContent value="stats" className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground">
                      Total de Partidas
                    </p>
                    <p className="text-2xl font-bold">
                      {matchCounts?.total || 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground">
                      Partidas em Casa
                    </p>
                    <p className="text-2xl font-bold">
                      {matchCounts?.home || 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground">
                      Partidas Fora
                    </p>
                    <p className="text-2xl font-bold">
                      {matchCounts?.away || 0}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            {team.status === "active" && (
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button
                  variant="secondary"
                  onClick={() => onMerge({ id: team.id, name: team.nome })}
                >
                  <GitMerge className="h-4 w-4 mr-2" />
                  Fundir outro time neste
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Time não encontrado.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
