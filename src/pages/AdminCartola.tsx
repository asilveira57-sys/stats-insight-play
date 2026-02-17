import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Download, RefreshCw, Link, Database, Users, Trophy, Calendar, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCartolaStatus, useCartolaImportHistory, useCartolaSyncSeason, useCartolaSyncRound, useCartolaMapClube } from "@/hooks/useCartola";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminCartola() {
  const { isAdmin, isLoading: authLoading } = useAdminAccess();
  const { toast } = useToast();
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useCartolaStatus();
  const importHistory = useCartolaImportHistory();
  const syncSeason = useCartolaSyncSeason();
  const syncRound = useCartolaSyncRound();
  const mapClube = useCartolaMapClube();

  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
  const [syncYear, setSyncYear] = useState(new Date().getFullYear());
  const [roundSeason, setRoundSeason] = useState(new Date().getFullYear());
  const [roundNumber, setRoundNumber] = useState(1);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [selectedClubeForMapping, setSelectedClubeForMapping] = useState<any>(null);
  const [teamSearch, setTeamSearch] = useState("");

  // Fetch Statball teams for manual mapping
  const { data: statballTeams } = useQuery({
    queryKey: ["statball-teams-mapping", teamSearch],
    queryFn: async () => {
      let query = supabase.from("times").select("id, nome, slug").order("nome");
      if (teamSearch) query = query.ilike("nome", `%${teamSearch}%`);
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
    enabled: mappingModalOpen,
  });

  const toggleSeason = (year: number) => {
    setSelectedSeasons(prev =>
      prev.includes(year) ? prev.filter(s => s !== year) : [...prev, year]
    );
  };

  const handleImportHistory = async () => {
    if (selectedSeasons.length === 0) {
      toast({ title: "Selecione ao menos uma temporada", variant: "destructive" });
      return;
    }
    try {
      const result = await importHistory.mutateAsync(selectedSeasons);
      toast({
        title: "Importação concluída",
        description: `Inseridos: ${result.inserted}, Atualizados: ${result.updated}, Falhas: ${result.failed}`,
      });
      refetchStatus();
    } catch (e: any) {
      toast({ title: "Erro na importação", description: e.message, variant: "destructive" });
    }
  };

  const handleSyncSeason = async () => {
    try {
      const result = await syncSeason.mutateAsync(syncYear);
      toast({
        title: "Sincronização concluída",
        description: `Inseridos: ${result.inserted}, Atualizados: ${result.updated}`,
      });
    } catch (e: any) {
      toast({ title: "Erro na sincronização", description: e.message, variant: "destructive" });
    }
  };

  const handleSyncRound = async () => {
    try {
      const result = await syncRound.mutateAsync({ season: roundSeason, rodada: roundNumber });
      toast({
        title: `Rodada ${roundNumber} sincronizada`,
        description: `Inseridos: ${result.inserted}, Atualizados: ${result.updated}`,
      });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleMapClube = async (teamId: string) => {
    if (!selectedClubeForMapping) return;
    try {
      await mapClube.mutateAsync({
        cartolaId: selectedClubeForMapping.cartola_clube_id,
        statballTeamId: teamId,
        nome: selectedClubeForMapping.nome,
      });
      toast({ title: `${selectedClubeForMapping.nome} mapeado com sucesso!` });
      setMappingModalOpen(false);
      setSelectedClubeForMapping(null);
      refetchStatus();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (authLoading) {
    return <AdminLayout><div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }
  if (!isAdmin) return null;

  const availableSeasons = [2014, 2015, 2016, 2017, 2018, 2019, 2020];
  const isAnyLoading = importHistory.isPending || syncSeason.isPending || syncRound.isPending;

  return (
    <>
      <Helmet>
        <title>Integração Cartola | Admin Statball</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AdminLayout>
        <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" /> Integração Cartola FC
          </h1>

          {/* Status Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{statusLoading ? "..." : status?.clubes || 0}</p>
                    <p className="text-xs text-muted-foreground">Clubes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{statusLoading ? "..." : status?.atletas || 0}</p>
                    <p className="text-xs text-muted-foreground">Atletas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{statusLoading ? "..." : status?.partidas || 0}</p>
                    <p className="text-xs text-muted-foreground">Partidas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{statusLoading ? "..." : status?.temporadas || 0}</p>
                    <p className="text-xs text-muted-foreground">Temporadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="import">
            <TabsList>
              <TabsTrigger value="import" className="flex items-center gap-1"><Download className="w-4 h-4" /> Importar Histórico</TabsTrigger>
              <TabsTrigger value="sync" className="flex items-center gap-1"><RefreshCw className="w-4 h-4" /> Sincronizar</TabsTrigger>
              <TabsTrigger value="mapping" className="flex items-center gap-1"><Link className="w-4 h-4" /> Mapeamento</TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-1"><Clock className="w-4 h-4" /> Logs</TabsTrigger>
            </TabsList>

            {/* Import History Tab */}
            <TabsContent value="import" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Importar Histórico (GitHub)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Importa dados de clubes, atletas, partidas e scouts dos repositórios caRtola (2014-2020) e CartolaFCDados (2014-2017). Para temporadas 2021+, use a sincronização via API.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableSeasons.map(year => (
                      <Button
                        key={year}
                        size="sm"
                        variant={selectedSeasons.includes(year) ? "default" : "outline"}
                        onClick={() => toggleSeason(year)}
                        disabled={isAnyLoading}
                        className="text-xs"
                      >
                        {year}
                        {year <= 2017 && <span className="ml-1 text-[10px] opacity-60">(2 fontes)</span>}
                      </Button>
                    ))}
                  </div>
                  {selectedSeasons.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Selecionadas: {selectedSeasons.sort().join(", ")}
                    </p>
                  )}
                  <Button onClick={handleImportHistory} disabled={isAnyLoading || selectedSeasons.length === 0}>
                    {importHistory.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importando...</> : "Iniciar Importação"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sync Tab */}
            <TabsContent value="sync" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sincronizar Temporada Atual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Puxa clubes, rodadas e partidas da API pública do Cartola FC.
                  </p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      value={syncYear}
                      onChange={e => setSyncYear(parseInt(e.target.value))}
                      className="w-24"
                      min={2014}
                      max={2030}
                    />
                    <Button onClick={handleSyncSeason} disabled={isAnyLoading}>
                      {syncSeason.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sincronizando...</> : "Sincronizar Temporada"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sincronizar Rodada Específica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      value={roundSeason}
                      onChange={e => setRoundSeason(parseInt(e.target.value))}
                      className="w-24"
                      placeholder="Ano"
                    />
                    <Input
                      type="number"
                      value={roundNumber}
                      onChange={e => setRoundNumber(parseInt(e.target.value))}
                      className="w-20"
                      placeholder="Rodada"
                      min={1}
                      max={38}
                    />
                    <Button onClick={handleSyncRound} disabled={isAnyLoading}>
                      {syncRound.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sincronizando...</> : "Sincronizar Rodada"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mapping Tab */}
            <TabsContent value="mapping" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    Clubes Não Mapeados ({status?.unmapped_clubes?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!status?.unmapped_clubes?.length ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" /> Todos os clubes estão mapeados!
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">ID Cartola</TableHead>
                            <TableHead className="text-xs">Nome</TableHead>
                            <TableHead className="text-xs">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {status.unmapped_clubes.map((clube: any) => (
                            <TableRow key={clube.cartola_clube_id}>
                              <TableCell className="text-xs">{clube.cartola_clube_id}</TableCell>
                              <TableCell className="text-xs font-medium">{clube.nome}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedClubeForMapping(clube);
                                    setTeamSearch(clube.nome);
                                    setMappingModalOpen(true);
                                  }}
                                >
                                  <Link className="w-3 h-3 mr-1" /> Vincular
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Últimas Sincronizações</CardTitle>
                </CardHeader>
                <CardContent>
                  {!status?.recent_logs?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sincronização realizada</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs">Tipo</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Criados</TableHead>
                            <TableHead className="text-xs">Atualizados</TableHead>
                            <TableHead className="text-xs">Falhas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {status.recent_logs.map((log: any) => (
                            <TableRow key={log.id}>
                              <TableCell className="text-xs">
                                {log.started_at ? format(new Date(log.started_at), "dd/MM/yy HH:mm", { locale: ptBR }) : "-"}
                              </TableCell>
                              <TableCell className="text-xs">
                                <Badge variant="outline" className="text-[10px]">
                                  {log.entity_type?.replace("cartola_", "")}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  log.status === "completed" ? "bg-green-500/20 text-green-500" :
                                  log.status === "failed" ? "bg-red-500/20 text-red-500" :
                                  log.status === "running" ? "bg-blue-500/20 text-blue-500" :
                                  "bg-yellow-500/20 text-yellow-500"
                                }>
                                  {log.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-green-500">{log.items_created || 0}</TableCell>
                              <TableCell className="text-xs text-blue-500">{log.items_updated || 0}</TableCell>
                              <TableCell className="text-xs text-destructive">{log.items_failed || 0}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>

      {/* Manual Mapping Modal */}
      <Dialog open={mappingModalOpen} onOpenChange={setMappingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular {selectedClubeForMapping?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Buscar time no Statball..."
              value={teamSearch}
              onChange={e => setTeamSearch(e.target.value)}
            />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {statballTeams?.map((team: any) => (
                <Button
                  key={team.id}
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  onClick={() => handleMapClube(team.id)}
                  disabled={mapClube.isPending}
                >
                  {team.nome}
                  <span className="ml-auto text-xs text-muted-foreground">{team.slug}</span>
                </Button>
              ))}
              {statballTeams?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum time encontrado</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
