import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  TableRow 
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
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LineChart, 
  Line, 
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
  Cell
} from "recharts";

interface MatchComparison {
  id: string;
  partida_id: string;
  placar_oficial_casa: number | null;
  placar_oficial_fora: number | null;
  resultado_oficial: string | null;
  sistema_placar_casa: number | null;
  sistema_placar_fora: number | null;
  sistema_resultado_previsto: string | null;
  sistema_acertou_resultado: boolean | null;
  sistema_acertou_placar: boolean | null;
  sistema_prob_resultado: number | null;
  partidas: {
    data: string;
    rodada: number | null;
    time_casa: { nome: string; escudo_url: string | null } | null;
    time_fora: { nome: string; escudo_url: string | null } | null;
  } | null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getResultLabel(result: string | null): string {
  if (result === 'casa') return 'Vitória Casa';
  if (result === 'fora') return 'Vitória Fora';
  if (result === 'empate') return 'Empate';
  return '-';
}

function getSeasonFromDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.getFullYear().toString();
}

export default function Retrospectiva() {
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const [selectedRodada, setSelectedRodada] = useState<string>("all");

  const { data: matches, isLoading } = useQuery({
    queryKey: ['brasileirao-retrospective-details'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comparativo_resultados')
        .select(`
          id,
          partida_id,
          placar_oficial_casa,
          placar_oficial_fora,
          resultado_oficial,
          sistema_placar_casa,
          sistema_placar_fora,
          sistema_resultado_previsto,
          sistema_acertou_resultado,
          sistema_acertou_placar,
          sistema_prob_resultado,
          partidas!inner(
            data,
            rodada,
            liga_id,
            time_casa:times!partidas_time_casa_id_fkey(nome, escudo_url),
            time_fora:times!partidas_time_fora_id_fkey(nome, escudo_url),
            ligas!inner(codigo_api)
          )
        `)
        .eq('partidas.ligas.codigo_api', 'BSA')
        .order('partidas(data)', { ascending: false });

      if (error) throw error;
      return data as unknown as MatchComparison[];
    }
  });

  // Extract available seasons and rodadas
  const { seasons, rodadas } = useMemo(() => {
    if (!matches) return { seasons: [], rodadas: [] };
    
    const seasonsSet = new Set<string>();
    const rodadasSet = new Set<number>();
    
    matches.forEach(m => {
      if (m.partidas?.data) {
        seasonsSet.add(getSeasonFromDate(m.partidas.data));
      }
      if (m.partidas?.rodada) {
        rodadasSet.add(m.partidas.rodada);
      }
    });
    
    return {
      seasons: Array.from(seasonsSet).sort((a, b) => b.localeCompare(a)),
      rodadas: Array.from(rodadasSet).sort((a, b) => a - b)
    };
  }, [matches]);

  // Filter matches based on selection
  const filteredMatches = useMemo(() => {
    if (!matches) return [];
    
    return matches.filter(m => {
      const matchSeason = m.partidas?.data ? getSeasonFromDate(m.partidas.data) : null;
      const matchRodada = m.partidas?.rodada;
      
      if (selectedSeason !== "all" && matchSeason !== selectedSeason) {
        return false;
      }
      if (selectedRodada !== "all" && matchRodada !== parseInt(selectedRodada)) {
        return false;
      }
      return true;
    });
  }, [matches, selectedSeason, selectedRodada]);

  // Calculate stats based on filtered matches
  const stats = filteredMatches.length > 0 ? {
    total: filteredMatches.length,
    acertosResultado: filteredMatches.filter(m => m.sistema_acertou_resultado).length,
    acertosPlacar: filteredMatches.filter(m => m.sistema_acertou_placar).length,
    probMedia: filteredMatches.reduce((acc, m) => acc + (m.sistema_prob_resultado || 0), 0) / filteredMatches.length
  } : null;

  // Calculate accuracy per round for chart
  const chartData = useMemo(() => {
    if (!matches) return [];
    
    // Group matches by season and round
    const matchesBySeason = selectedSeason !== "all" 
      ? filteredMatches 
      : matches;
    
    const roundStats: Record<number, { total: number; acertos: number; placares: number }> = {};
    
    matchesBySeason.forEach(m => {
      const rodada = m.partidas?.rodada;
      if (!rodada) return;
      
      if (!roundStats[rodada]) {
        roundStats[rodada] = { total: 0, acertos: 0, placares: 0 };
      }
      
      roundStats[rodada].total++;
      if (m.sistema_acertou_resultado) roundStats[rodada].acertos++;
      if (m.sistema_acertou_placar) roundStats[rodada].placares++;
    });
    
    return Object.entries(roundStats)
      .map(([rodada, stats]) => ({
        rodada: parseInt(rodada),
        taxaResultado: stats.total > 0 ? Math.round((stats.acertos / stats.total) * 100) : 0,
        taxaPlacar: stats.total > 0 ? Math.round((stats.placares / stats.total) * 100) : 0,
        partidas: stats.total
      }))
      .sort((a, b) => a.rodada - b.rodada);
  }, [matches, filteredMatches, selectedSeason]);

  // Calculate accuracy per season for comparison chart
  const seasonComparisonData = useMemo(() => {
    if (!matches) return [];
    
    const seasonStats: Record<string, { total: number; acertos: number; placares: number }> = {};
    
    matches.forEach(m => {
      const season = m.partidas?.data ? getSeasonFromDate(m.partidas.data) : null;
      if (!season) return;
      
      if (!seasonStats[season]) {
        seasonStats[season] = { total: 0, acertos: 0, placares: 0 };
      }
      
      seasonStats[season].total++;
      if (m.sistema_acertou_resultado) seasonStats[season].acertos++;
      if (m.sistema_acertou_placar) seasonStats[season].placares++;
    });
    
    return Object.entries(seasonStats)
      .map(([season, stats]) => ({
        temporada: season,
        taxaResultado: stats.total > 0 ? Math.round((stats.acertos / stats.total) * 100) : 0,
        taxaPlacar: stats.total > 0 ? Math.round((stats.placares / stats.total) * 100) : 0,
        partidas: stats.total,
        acertos: stats.acertos,
        placares: stats.placares
      }))
      .sort((a, b) => a.temporada.localeCompare(b.temporada));
  }, [matches]);

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
                Análise completa de {filteredMatches.length > 0 ? filteredMatches.length : 'todas as'} partidas com palpites do sistema
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
                    {seasons.map(season => (
                      <SelectItem key={season} value={season}>{season}</SelectItem>
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
                    {rodadas.map(rodada => (
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
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : stats && (
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
              value={stats.acertosResultado.toString()}
              sublabel={`${((stats.acertosResultado / stats.total) * 100).toFixed(1)}% de precisão`}
              highlight={stats.acertosResultado / stats.total >= 0.4}
            />
            <StatCard
              icon={<Award className="h-5 w-5" />}
              label="Placares Exatos"
              value={stats.acertosPlacar.toString()}
              sublabel={`${((stats.acertosPlacar / stats.total) * 100).toFixed(1)}% de precisão`}
              highlight={stats.acertosPlacar > 0}
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Confiança Média"
              value={`${stats.probMedia.toFixed(0)}%`}
              sublabel="nas previsões"
            />
          </div>
        )}

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
                    <XAxis 
                      dataKey="temporada" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `${value}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      formatter={(value: number, name: string, props: any) => {
                        const entry = props.payload;
                        if (name === 'taxaResultado') {
                          return [`${value}% (${entry.acertos}/${entry.partidas})`, 'Acertos de Resultado'];
                        }
                        return [`${value}% (${entry.placares}/${entry.partidas})`, 'Placares Exatos'];
                      }}
                      labelFormatter={(label) => `Temporada ${label}`}
                    />
                    <Legend 
                      formatter={(value) => value === 'taxaResultado' ? 'Acertos de Resultado' : 'Placares Exatos'}
                    />
                    <Bar 
                      dataKey="taxaResultado" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="taxaResultado"
                    />
                    <Bar 
                      dataKey="taxaPlacar" 
                      fill="hsl(142, 76%, 36%)" 
                      radius={[4, 4, 0, 0]}
                      name="taxaPlacar"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Comparando {seasonComparisonData.length} temporadas • Total de {seasonComparisonData.reduce((acc, s) => acc + s.partidas, 0)} partidas analisadas
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
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPlacar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
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
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      formatter={(value: number, name: string) => [
                        `${value}%`, 
                        name === 'taxaResultado' ? 'Taxa de Resultado' : 'Taxa de Placar'
                      ]}
                      labelFormatter={(label) => `Rodada ${label}`}
                    />
                    <Legend 
                      formatter={(value) => value === 'taxaResultado' ? 'Acertos de Resultado' : 'Placares Exatos'}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="taxaResultado" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1}
                      fill="url(#colorResultado)"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="taxaPlacar" 
                      stroke="hsl(142, 76%, 36%)" 
                      fillOpacity={1}
                      fill="url(#colorPlacar)"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(142, 76%, 36%)', strokeWidth: 2, r: 3 }}
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

        {/* Matches Table */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Detalhes por Partida</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredMatches.length > 0 ? (
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
                    {filteredMatches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell className="text-muted-foreground">
                          {match.partidas?.rodada || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {match.partidas?.data ? formatDate(match.partidas.data) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {match.partidas?.time_casa?.escudo_url && (
                              <img 
                                src={match.partidas.time_casa.escudo_url} 
                                alt="" 
                                className="h-5 w-5 object-contain"
                              />
                            )}
                            <span className="text-sm">
                              {match.partidas?.time_casa?.nome || 'Casa'}
                            </span>
                            <span className="text-muted-foreground mx-1">x</span>
                            {match.partidas?.time_fora?.escudo_url && (
                              <img 
                                src={match.partidas.time_fora.escudo_url} 
                                alt="" 
                                className="h-5 w-5 object-contain"
                              />
                            )}
                            <span className="text-sm">
                              {match.partidas?.time_fora?.nome || 'Fora'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {match.placar_oficial_casa ?? '-'} x {match.placar_oficial_fora ?? '-'}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {match.sistema_placar_casa ?? '-'} x {match.sistema_placar_fora ?? '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {match.sistema_prob_resultado?.toFixed(0) || '-'}%
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
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma partida analisada encontrada.
              </p>
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
  highlight = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  sublabel: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`
      transition-colors
      ${highlight 
        ? 'bg-primary/10 border-primary/30' 
        : 'bg-card/50 border-border/50'
      }
    `}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${highlight ? 'text-primary' : 'text-foreground'}`}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </CardContent>
    </Card>
  );
}
