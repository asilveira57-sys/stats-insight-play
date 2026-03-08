import { useState } from "react";
import { ArrowLeft, AlertTriangle, Users, Copy, GitMerge, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useTeamsWithoutMatches,
  useDuplicateAliases,
  useSimilarTeams,
  type TeamWithoutMatches,
} from "@/hooks/useDataQuality";

function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

export default function AdminDataQuality() {
  const { isAdmin, isLoading: authLoading } = useAdminAccess();
  const { data: teamsWithoutMatches, isLoading: loadingTeams } = useTeamsWithoutMatches();
  const { data: duplicateAliases, isLoading: loadingAliases } = useDuplicateAliases();
  const { data: similarTeams, isLoading: loadingSimilar } = useSimilarTeams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cleanupPreview, setCleanupPreview] = useState<TeamWithoutMatches[] | null>(null);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Teams safe to disable (no aliases, no external IDs)
  const safeToDisable = teamsWithoutMatches?.filter(t => !t.has_aliases && !t.has_external_ids) || [];

  const handlePreviewCleanup = async () => {
    setIsLoadingPreview(true);
    try {
      const { data, error } = await supabase.functions.invoke("cleanup-orphan-teams", {
        body: { dry_run: true },
      });
      if (error) throw error;
      setCleanupPreview(data.teams || []);
      setShowCleanupModal(true);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleExecuteCleanup = async () => {
    setIsCleaningUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("cleanup-orphan-teams", {
        body: { dry_run: false },
      });
      if (error) throw error;
      toast({
        title: "Limpeza concluída",
        description: `${data.disabled_count} times desativados com sucesso.`,
      });
      setShowCleanupModal(false);
      setCleanupPreview(null);
      queryClient.invalidateQueries({ queryKey: ["data-quality"] });
    } catch (err: any) {
      toast({ title: "Erro na limpeza", description: err.message, variant: "destructive" });
    } finally {
      setIsCleaningUp(false);
    }
  };

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              Qualidade de Dados
            </h1>
            <p className="text-muted-foreground">Diagnóstico de inconsistências no banco de dados</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Times sem Partidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingTeams ? <Skeleton className="h-8 w-16" /> : teamsWithoutMatches?.length || 0}
              </div>
              {!loadingTeams && safeToDisable.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {safeToDisable.length} podem ser desativados
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Aliases Duplicados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingAliases ? <Skeleton className="h-8 w-16" /> : duplicateAliases?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <GitMerge className="h-4 w-4" />
                Duplicados Sugeridos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingSimilar ? <Skeleton className="h-8 w-16" /> : similarTeams?.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 1: Teams without matches */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Times sem Partidas
                </CardTitle>
                <CardDescription>
                  Times ativos que não possuem nenhuma partida vinculada
                </CardDescription>
              </div>
              {safeToDisable.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handlePreviewCleanup}
                  disabled={isLoadingPreview}
                >
                  {isLoadingPreview ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Desativar Órfãos ({safeToDisable.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Time</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-center">Aliases</TableHead>
                  <TableHead className="text-center">IDs Externos</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTeams ? (
                  <LoadingSkeleton rows={5} />
                ) : !teamsWithoutMatches?.length ? (
                  <EmptyState message="Nenhum time sem partidas encontrado ✓" />
                ) : (
                  teamsWithoutMatches.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.nome}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{team.slug}</TableCell>
                      <TableCell className="text-center">
                        {team.has_aliases ? (
                          <Badge variant="outline">Sim</Badge>
                        ) : (
                          <Badge variant="secondary">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {team.has_external_ids ? (
                          <Badge variant="outline">Sim</Badge>
                        ) : (
                          <Badge variant="secondary">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {!team.has_aliases && !team.has_external_ids ? (
                          <Badge variant="destructive">Órfão</Badge>
                        ) : (
                          <Badge variant="outline">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Protegido
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 2: Duplicate aliases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Aliases Duplicados
            </CardTitle>
            <CardDescription>
              Aliases que estão associados a mais de um time, indicando possível duplicidade de cadastro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alias</TableHead>
                  <TableHead className="text-center">Qtd. Times</TableHead>
                  <TableHead>Nomes dos Times</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAliases ? (
                  <LoadingSkeleton rows={5} />
                ) : !duplicateAliases?.length ? (
                  <EmptyState message="Nenhum alias duplicado encontrado ✓" />
                ) : (
                  duplicateAliases.map((alias, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{alias.alias}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({alias.normalized_alias})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive">{alias.team_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {alias.team_names.map((name, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{name}</Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 3: Similar team names (from server-side RPC) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5" />
              Duplicados Sugeridos
            </CardTitle>
            <CardDescription>
              Pares de times com nomes muito parecidos detectados pelo servidor, que podem indicar duplicidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time A</TableHead>
                  <TableHead>Time B</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingSimilar ? (
                  <LoadingSkeleton rows={5} />
                ) : !similarTeams?.length ? (
                  <EmptyState message="Nenhum par de times similares encontrado ✓" />
                ) : (
                  similarTeams.map((pair, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{pair.team_a_name}</TableCell>
                      <TableCell className="font-medium">{pair.team_b_name}</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{pair.reason}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={pair.similarity_score >= 90 ? "destructive" : "secondary"}>
                          {pair.similarity_score}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Cleanup Confirmation Modal */}
      <Dialog open={showCleanupModal} onOpenChange={setShowCleanupModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Confirmar Desativação de Times Órfãos
            </DialogTitle>
            <DialogDescription>
              Os seguintes {cleanupPreview?.length || 0} times serão marcados como <strong>disabled</strong> (soft delete). 
              Nenhum dado será excluído permanentemente.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-64">
            <div className="space-y-1 pr-4">
              {cleanupPreview?.map((team) => (
                <div key={team.id} className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-sm font-medium">{team.nome}</span>
                  <span className="text-xs text-muted-foreground font-mono">{team.slug}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCleanupModal(false)} disabled={isCleaningUp}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExecuteCleanup} disabled={isCleaningUp}>
              {isCleaningUp ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Desativar {cleanupPreview?.length || 0} Times
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
