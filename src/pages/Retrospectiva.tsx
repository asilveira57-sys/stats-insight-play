import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  Award,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Filter,
  BarChart3,
  TrophyIcon,
  AlertTriangle,
} from "lucide-react";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  BarChart,
  Bar,
} from "recharts";

interface TeamCores {
  primary?: string;
  secondary?: string;
}

interface MatchRow {
  id: string;
  partida_id: string;
  placar_oficial_casa: number | null;
  placar_oficial_fora: number | null;
  sistema_placar_casa: number | null;
  sistema_placar_fora: number | null;
  sistema_prob_resultado: number | null;
  sistema_acertou_resultado: boolean | null;
  sistema_acertou_placar: boolean | null;
  data: string;
  rodada: number | null;
  time_casa_nome: string | null;
  time_casa_cores: TeamCores | null;
  time_fora_nome: string | null;
  time_fora_cores: TeamCores | null;
}

interface TeamRankRow {
  nome: string;
  cores: TeamCores | null;
  total: number;
  acertos: number;
  placares: number;
  taxa_resultado: number;
  taxa_placar: number;
}

interface RetroResponse {
  summary: { total: number; acertos_resultado: number; acertos_placar: number; prob_media: number } | null;
  season_comparison: { temporada: string; partidas: number; acertos: number; placares: number }[];
  round_stats: { rodada: number; partidas: number; acertos: number; placares: number }[];
  team_top: TeamRankRow[];
  team_bottom: TeamRankRow[];
  seasons: string[];
  rodadas: number[];
  matches_total: number;
  matches: MatchRow[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const PAGE_SIZE = 50;

export default function Retrospectiva() {
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const [selectedRodada, setSelectedRodada] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSeason, selectedRodada]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["brasileirao-retrospectiva-rpc", selectedSeason, selectedRodada, currentPage],
    queryFn: async (): Promise<RetroResponse> => {
      const { data, error } = await supabase.rpc("get_brasileirao_retrospectiva", {
        p_season: selectedSeason,
        p_rodada: selectedRodada === "all" ? null : parseInt(selectedRodada),
        p_page: currentPage,
        p_page_size: PAGE_SIZE,
      });
      if (error) throw error;
      return data as unknown as RetroResponse;
    },
    staleTime: 1000 * 60 * 10,
    placeholderData: keepPreviousData,
  });

  const stats = data?.summary ?? null;
  const seasons = data?.seasons ?? [];
  const rodadas = data?.rodadas ?? [];
  const paginatedMatches = data?.matches ?? [];
  const matchesTotal = data?.matches_total ?? 0;
  const totalPages = Math.max(1, Math.ceil(matchesTotal / PAGE_SIZE));

  const seasonComparisonData = (data?.season_comparison ?? []).map((s) => ({
    temporada: s.temporada,
    partidas: s.partidas,
    acertos: s.acertos,
    placares: s.placares,
    taxaResultado: s.partidas > 0 ? Math.round((s.acertos / s.partidas) * 100) : 0,
    taxaPlacar: s.partidas > 0 ? Math.round((s.placares / s.partidas) * 100) : 0,
  }));

  const chartData = (data?.round_stats ?? []).map((r) => ({
    rodada: r.rodada,
    partidas: r.partidas,
    taxaResultado: r.partidas > 0 ? Math.round((r.acertos / r.partidas) * 100) : 0,
    taxaPlacar: r.partidas > 0 ? Math.round((r.placares / r.partidas) * 100) : 0,
  }));

  const teamRankingData = { top: data?.team_top ?? [], bottom: data?.team_bottom ?? [] };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/palpites">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Palpites
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">
                Retrospectiva Brasileirão {selectedSeason !== "all" ? selectedSeason : ""}
              </h1>
              <p className="text-muted-foreground">
                Análise completa de {matchesTotal || "todas as"} partidas com palpites do sistema
                {selectedRodada !== "all" && ` • Rodada ${selectedRodada}`}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-card/50 border-border/50 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Temporada:</span>
                <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                  <SelectTrigger className="w-[120px] bg-background">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="all">Todas</SelectItem>
                    {seasons.map((season) => (
                      <SelectItem key={season} value={season}>
                        {season}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rodada:</span>
                <Select value={selectedRodada} onValueChange={setSelectedRodada}>
                  <SelectTrigger className="w-[120px] bg-background">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border max-h-[300px]">
                    <SelectItem value="all">Todas</SelectItem>
                    {rodadas.map((rodada) => (
                      <SelectItem key={rodada} value={rodada.toString()}>
                        Rodada {rodada}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(selectedSeason !== "all" || selectedRodada !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedSeason("all");
                    setSelectedRodada("all");
                  }}
                >
                  Limpar filtros
                </Button>
              )}

              {isFetching && !isLoading && (
                <span className="text-xs text-muted-foreground ml-auto">Atualizando…</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : stats && stats.total > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={<Calendar className="h-5 w-5" />}
              label="Partidas Analisadas"
              value={stats.total.toString()}
              sublabel="jogos com palpite"
            />
            <StatCard
              icon={<Target className="h-5 w-5" />}
              label="Acertos de Resultado"
              value={stats.acertos_resultado.toString()}
              sublabel={`${((stats.acertos_resultado / stats.total) * 100).toFixed(1)}% de precisão`}
              highlight={stats.acertos_resultado / stats.total >= 0.4}
            />
            <StatCard
              icon={<Award className="h-5 w-5" />}
              label="Placares Exatos"
              value={stats.acertos_placar.toString()}
              sublabel={`${((stats.acertos_placar / stats.total) * 100).toFixed(1)}% de precisão`}
              highlight={stats.acertos_placar > 0}
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Confiança Média"
              value={`${Number(stats.prob_media).toFixed(0)}%`}
              sublabel="nas previsões"
            />
          </div>
        ) : null}

        {/* Season Comparison Chart */}
        {!isLoading && seasonComparisonData.length > 1 && (
          <Card className="bg-card/50 border-border/50 mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Comparativo de Precisão entre Temporadas</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seasonComparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="temporada" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `${value}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value: number, name: string, props: any) => {
                        const entry = props.payload;
                        if (name === "taxaResultado") {
                          return [`${value}% (${entry.acertos}/${entry.partidas})`, "Acertos de Resultado"];
                        }
                        return [`${value}% (${entry.placares}/${entry.partidas})`, "Placares Exatos"];
                      }}
                      labelFormatter={(label) => `Temporada ${label}`}
                    />
                    <Legend formatter={(value) => (value === "taxaResultado" ? "Acertos de Resultado" : "Placares Exatos")} />
                    <Bar dataKey="taxaResultado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="taxaResultado" />
                    <Bar dataKey="taxaPlacar" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="taxaPlacar" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Comparando {seasonComparisonData.length} temporadas • Total de{" "}
                {seasonComparisonData.reduce((acc, s) => acc + s.partidas, 0)} partidas analisadas
              </p>
            </CardContent>
          </Card>
        )}

        {/* Accuracy Evolution Chart */}
        {!isLoading && chartData.length > 0 && (
          <Card className="bg-card/50 border-border/50 mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Evolução da Precisão por Rodada</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorResultado" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPlacar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="rodada"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `R${value}`}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `${value}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value: number, name: string) => [
                        `${value}%`,
                        name === "taxaResultado" ? "Taxa de Resultado" : "Taxa de Placar",
                      ]}
                      labelFormatter={(label) => `Rodada ${label}`}
                    />
                    <Legend formatter={(value) => (value === "taxaResultado" ? "Acertos de Resultado" : "Placares Exatos")} />
                    <Area
                      type="monotone"
                      dataKey="taxaResultado"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorResultado)"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="taxaPlacar"
                      stroke="hsl(142, 76%, 36%)"
                      fillOpacity={1}
                      fill="url(#colorPlacar)"
                      strokeWidth={2}
                      dot={{ fill: "hsl(142, 76%, 36%)", strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Mostrando {chartData.length} rodadas • Passe o mouse para ver detalhes
              </p>
            </CardContent>
          </Card>
        )}

        {/* Team Ranking */}
        {!isLoading && (teamRankingData.top.length > 0 || teamRankingData.bottom.length > 0) && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {teamRankingData.top.length > 0 && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <TrophyIcon className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-lg">Mais Fáceis de Prever</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">Times com maior taxa de acerto nas previsões</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {teamRankingData.top.map((team, index) => (
                    <div key={team.nome} className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${
                          index === 0
                            ? "bg-yellow-500/20 text-yellow-500"
                            : index === 1
                            ? "bg-gray-400/20 text-gray-400"
                            : index === 2
                            ? "bg-orange-600/20 text-orange-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <TeamBadge
                        name={team.nome}
                        primaryColor={team.cores?.primary}
                        secondaryColor={team.cores?.secondary}
                        size="sm"
                      />
                      <span className="flex-1 text-sm font-medium truncate">{team.nome}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                          {team.taxa_resultado}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({team.acertos}/{team.total})
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {teamRankingData.bottom.length > 0 && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <CardTitle className="text-lg">Mais Difíceis de Prever</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">Times com menor taxa de acerto nas previsões</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {teamRankingData.bottom.map((team, index) => (
                    <div key={team.nome} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
                        {teamRankingData.top.length + teamRankingData.bottom.length - index}
                      </span>
                      <TeamBadge
                        name={team.nome}
                        primaryColor={team.cores?.primary}
                        secondaryColor={team.cores?.secondary}
                        size="sm"
                      />
                      <span className="flex-1 text-sm font-medium truncate">{team.nome}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                          {team.taxa_resultado}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({team.acertos}/{team.total})
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Matches Table */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Detalhes por Partida</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : paginatedMatches.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Rod.</TableHead>
                        <TableHead className="w-[80px]">Data</TableHead>
                        <TableHead>Partida</TableHead>
                        <TableHead className="text-center">Placar Real</TableHead>
                        <TableHead className="text-center">Palpite Sistema</TableHead>
                        <TableHead className="text-center">Confiança</TableHead>
                        <TableHead className="text-center">Resultado</TableHead>
                        <TableHead className="text-center">Placar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMatches.map((match) => (
                        <TableRow key={match.id}>
                          <TableCell className="text-muted-foreground">{match.rodada || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{match.data ? formatDate(match.data) : "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TeamBadge
                                name={match.time_casa_nome || "Casa"}
                                primaryColor={match.time_casa_cores?.primary}
                                secondaryColor={match.time_casa_cores?.secondary}
                                size="sm"
                              />
                              <span className="text-sm">{match.time_casa_nome || "Casa"}</span>
                              <span className="text-muted-foreground mx-1">x</span>
                              <TeamBadge
                                name={match.time_fora_nome || "Fora"}
                                primaryColor={match.time_fora_cores?.primary}
                                secondaryColor={match.time_fora_cores?.secondary}
                                size="sm"
                              />
                              <span className="text-sm">{match.time_fora_nome || "Fora"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {match.placar_oficial_casa ?? "-"} x {match.placar_oficial_fora ?? "-"}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {match.sistema_placar_casa ?? "-"} x {match.sistema_placar_fora ?? "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {match.sistema_prob_resultado?.toFixed(0) || "-"}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {match.sistema_acertou_resultado ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {match.sistema_acertou_placar ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                    <span className="text-sm text-muted-foreground">
                      Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
                      {Math.min(currentPage * PAGE_SIZE, matchesTotal)} de {matchesTotal}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                      >
                        Próximo
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma partida analisada encontrada.</p>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Acertou</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span>Errou resultado</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-muted-foreground/50" />
            <span>Não acertou placar exato</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`
      transition-colors
      ${highlight ? "bg-primary/10 border-primary/30" : "bg-card/50 border-border/50"}
    `}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </CardContent>
    </Card>
  );
}
