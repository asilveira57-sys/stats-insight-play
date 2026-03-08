import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Users,
  RefreshCw,
  GitMerge,
  AlertTriangle,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  useTeamsCanonical,
  useSuggestedDuplicates,
  useMergeLogs,
  useConsolidateAliases,
  useDismissDuplicate,
} from "@/hooks/useTeamCanonical";
import { TeamsTable } from "@/components/admin/teams/TeamsTable";
import { DuplicatesTable } from "@/components/admin/teams/DuplicatesTable";
import { MergeLogsTable } from "@/components/admin/teams/MergeLogsTable";
import { TeamDetailModal } from "@/components/admin/teams/TeamDetailModal";
import { MergeTeamsModal } from "@/components/admin/teams/MergeTeamsModal";
import { toast } from "sonner";
import { useAutoResolveDuplicates } from "@/hooks/useAutoResolveDuplicates";
import { Progress } from "@/components/ui/progress";
import { Bot, Square, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

export default function AdminTeams() {
  const { isAdmin, isLoading: loadingAuth } = useAdminAccess();
  const [activeTab, setActiveTab] = useState("teams");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Modal states
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [mergeSource, setMergeSource] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Data hooks
  const {
    data: teamsData,
    isLoading: loadingTeams,
    refetch: refetchTeams,
  } = useTeamsCanonical(search, status, page, pageSize);

  const {
    data: duplicates,
    isLoading: loadingDuplicates,
    refetch: refetchDuplicates,
  } = useSuggestedDuplicates();

  const { data: mergeLogs, isLoading: loadingLogs } = useMergeLogs();

  const consolidateAliases = useConsolidateAliases();
  const dismissDuplicate = useDismissDuplicate();
  const autoResolve = useAutoResolveDuplicates();

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleRefresh = () => {
    refetchTeams();
    refetchDuplicates();
  };

  const handleConsolidate = async () => {
    try {
      await consolidateAliases.mutateAsync();
      toast.success("Aliases consolidados com sucesso!");
      refetchTeams();
    } catch (error) {
      toast.error("Erro ao consolidar aliases");
    }
  };

  const openMergeFromDuplicate = (
    teamA: { id: string; name: string },
    teamB: { id: string; name: string }
  ) => {
    setMergeTarget(teamA);
    setMergeSource(teamB);
    setMergeModalOpen(true);
  };

  const openMergeForTeam = (team: { id: string; name: string }) => {
    setMergeTarget(team);
    setMergeSource(null);
    setMergeModalOpen(true);
  };

  const totalPages = Math.ceil((teamsData?.total || 0) / pageSize);

  if (loadingAuth) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              Gerenciamento de Times
            </h1>
            <p className="text-muted-foreground mt-1">
              Sistema anti-duplicidade: Time Canônico + Aliases
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/control-center">← Voltar</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleConsolidate}
              disabled={consolidateAliases.isPending}
            >
              {consolidateAliases.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <GitMerge className="h-4 w-4 mr-2" />
              )}
              Consolidar Aliases
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Times Ativos</p>
                  <p className="text-2xl font-bold">
                    {teamsData?.total || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-70" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Duplicados Sugeridos
                  </p>
                  <p className="text-2xl font-bold text-amber-500">
                    {duplicates?.length || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-500 opacity-70" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Fusões Realizadas
                  </p>
                  <p className="text-2xl font-bold text-secondary">
                    {mergeLogs?.length || 0}
                  </p>
                </div>
                <GitMerge className="h-8 w-8 text-secondary opacity-70" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Última Fusão
                  </p>
                  <p className="text-sm font-medium">
                    {mergeLogs?.[0]
                      ? new Date(mergeLogs[0].created_at).toLocaleDateString(
                          "pt-BR"
                        )
                      : "Nenhuma"}
                  </p>
                </div>
                <History className="h-8 w-8 text-muted-foreground opacity-70" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Times ({teamsData?.total || 0})
            </TabsTrigger>
            <TabsTrigger value="duplicates" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Duplicados ({duplicates?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-4 mt-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome, slug ou alias..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={handleSearch}>Buscar</Button>
                  </div>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="merged">Fundidos</SelectItem>
                      <SelectItem value="disabled">Desativados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Teams Table */}
            <TeamsTable
              teams={teamsData?.teams || []}
              isLoading={loadingTeams}
              onViewDetails={(id) => setSelectedTeamId(id)}
              onMerge={(team) => openMergeForTeam(team)}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {page * pageSize + 1} -{" "}
                  {Math.min((page + 1) * pageSize, teamsData?.total || 0)} de{" "}
                  {teamsData?.total || 0}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Página {page + 1} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="duplicates" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Duplicados Sugeridos
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Times com alta similaridade detectados. Revise manualmente ou use a IA.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {autoResolve.isRunning ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={autoResolve.stop}
                      >
                        <Square className="h-4 w-4 mr-2" />
                        Parar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={autoResolve.start}
                        disabled={(duplicates?.length || 0) === 0}
                      >
                        <Bot className="h-4 w-4 mr-2" />
                        Resolver com IA
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Progress Panel */}
                {(autoResolve.isRunning || autoResolve.progress.processed > 0) && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          {autoResolve.isRunning ? "Resolvendo duplicados com IA..." : "Resolução concluída"}
                        </p>
                        {autoResolve.progress.total_pending > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {autoResolve.progress.processed} / {autoResolve.progress.total_pending}
                          </span>
                        )}
                      </div>
                      {autoResolve.progress.total_pending > 0 && (
                        <Progress
                          value={
                            (autoResolve.progress.processed / autoResolve.progress.total_pending) * 100
                          }
                          className="h-2"
                        />
                      )}
                      <div className="grid grid-cols-4 gap-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-lg font-bold">{autoResolve.progress.merged}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Fundidos</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1 text-blue-600">
                            <XCircle className="h-4 w-4" />
                            <span className="text-lg font-bold">{autoResolve.progress.dismissed}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Dispensados</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1 text-amber-600">
                            <HelpCircle className="h-4 w-4" />
                            <span className="text-lg font-bold">{autoResolve.progress.inconclusive}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Inconclusivos</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1 text-destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-lg font-bold">{autoResolve.progress.errors}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Erros</span>
                        </div>
                      </div>
                      {/* Recent activity log */}
                      {autoResolve.progress.details.length > 0 && (
                        <div className="max-h-32 overflow-y-auto text-xs space-y-1 border-t pt-2 mt-2">
                          {autoResolve.progress.details.slice(-10).reverse().map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                              {d.result === "merged" && <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />}
                              {d.result === "dismissed" && <XCircle className="h-3 w-3 text-blue-600 shrink-0" />}
                              {d.result === "inconclusive" && <HelpCircle className="h-3 w-3 text-amber-600 shrink-0" />}
                              {(d.result === "error" || d.result === "merge_failed" || d.result === "rate_limited") && (
                                <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                              )}
                              <span className="truncate">
                                {d.team_a} ↔ {d.team_b}
                                {d.confidence ? ` (${d.confidence}%)` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <DuplicatesTable
                  duplicates={duplicates || []}
                  isLoading={loadingDuplicates}
                  onMerge={openMergeFromDuplicate}
                  onViewTeam={(id) => setSelectedTeamId(id)}
                  onDismiss={(teamAId, teamBId) => {
                    dismissDuplicate.mutate(
                      { teamAId, teamBId },
                      {
                        onSuccess: () => toast.success("Par removido da lista de duplicados."),
                        onError: () => toast.error("Erro ao descartar duplicado."),
                      }
                    );
                  }}
                  isDismissing={dismissDuplicate.isPending}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Fusões
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Registro de todas as fusões de times realizadas.
                </p>
              </CardHeader>
              <CardContent>
                <MergeLogsTable logs={mergeLogs || []} isLoading={loadingLogs} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <TeamDetailModal
        teamId={selectedTeamId}
        open={!!selectedTeamId}
        onClose={() => setSelectedTeamId(null)}
        onMerge={(team) => {
          setSelectedTeamId(null);
          openMergeForTeam(team);
        }}
      />

      <MergeTeamsModal
        open={mergeModalOpen}
        onClose={() => {
          setMergeModalOpen(false);
          setMergeTarget(null);
          setMergeSource(null);
        }}
        initialTarget={mergeTarget}
        initialSource={mergeSource}
        onSuccess={() => {
          setMergeModalOpen(false);
          setMergeTarget(null);
          setMergeSource(null);
          refetchTeams();
          refetchDuplicates();
        }}
      />
    </AdminLayout>
  );
}
