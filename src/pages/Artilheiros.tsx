import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useArtilharia } from "@/hooks/useArtilharia";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Target, Trophy, TrendingUp, Goal, User, X } from "lucide-react";
import { TeamBadge } from "@/components/ui/TeamBadge";

export default function Artilheiros() {
  const [tipoFiltro, setTipoFiltro] = useState<'geral' | 'temporada' | 'campeonato'>('geral');
  const [selectedTemporada, setSelectedTemporada] = useState<string>("");
  const [selectedCompeticao, setSelectedCompeticao] = useState<string>("");

  const { artilheiros, temporadas, competicoes, isLoading } = useArtilharia({
    tipo: tipoFiltro,
    temporada: selectedTemporada || undefined,
    competicaoId: selectedCompeticao || undefined,
  });

  const hasActiveFilters = tipoFiltro !== 'geral' || selectedTemporada || selectedCompeticao;

  const clearFilters = () => {
    setTipoFiltro('geral');
    setSelectedTemporada("");
    setSelectedCompeticao("");
  };

  // Calculate stats
  const totalGols = artilheiros.reduce((sum, a) => sum + a.gols, 0);
  const totalJogadores = artilheiros.length;
  const topScorer = artilheiros[0];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold gradient-text mb-2">
            Artilheiros
          </h1>
          <p className="text-muted-foreground">
            Ranking de goleadores - filtros por Geral, Temporada e Campeonato
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3 flex-wrap">
          <Select value={tipoFiltro} onValueChange={(val) => setTipoFiltro(val as 'geral' | 'temporada' | 'campeonato')}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
              <SelectValue placeholder="Tipo de ranking" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="geral">Geral (Todos)</SelectItem>
              <SelectItem value="temporada">Por Temporada</SelectItem>
              <SelectItem value="campeonato">Por Campeonato</SelectItem>
            </SelectContent>
          </Select>

          {(tipoFiltro === 'temporada' || tipoFiltro === 'campeonato') && (
            <Select value={selectedTemporada || "all"} onValueChange={(val) => setSelectedTemporada(val === "all" ? "" : val)}>
              <SelectTrigger className="w-full sm:w-[140px] bg-card border-border">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
                {temporadas.map(year => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {tipoFiltro === 'campeonato' && (
            <Select value={selectedCompeticao || "all"} onValueChange={(val) => setSelectedCompeticao(val === "all" ? "" : val)}>
              <SelectTrigger className="w-full sm:w-[280px] bg-card border-border">
                <SelectValue placeholder="Campeonato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os campeonatos</SelectItem>
                {competicoes.map(comp => (
                  <SelectItem key={comp.id} value={comp.id}>
                    {comp.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
              className="flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Limpar filtros
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalJogadores}</p>
                      <p className="text-xs text-muted-foreground">Artilheiros</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary/20">
                      <Goal className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalGols}</p>
                      <p className="text-xs text-muted-foreground">Gols</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/20">
                      <Trophy className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{topScorer?.gols || 0}</p>
                      <p className="text-xs text-muted-foreground">Líder</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {totalJogadores > 0 ? (totalGols / totalJogadores).toFixed(1) : 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Média/Jogador</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top 5 Highlight */}
            {artilheiros.length > 0 && (
              <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30 mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Top 5 Artilheiros {tipoFiltro !== 'geral' && `(${tipoFiltro === 'temporada' ? selectedTemporada || 'Todas' : 'Campeonato'})`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {artilheiros.slice(0, 5).map((artilheiro, index) => {
                      const cores = artilheiro.time?.cores;
                      const primaryColor = cores?.primary || '#6B7280';
                      const secondaryColor = cores?.secondary || '#FFFFFF';
                      
                      return (
                        <div 
                          key={artilheiro.id}
                          className="flex items-center gap-4 p-3 rounded-lg bg-background/50"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                            index === 1 ? 'bg-gray-400/20 text-gray-400' :
                            index === 2 ? 'bg-amber-600/20 text-amber-600' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          
                          <TeamBadge 
                            name={artilheiro.time?.short_code || artilheiro.time?.nome || 'N/A'} 
                            primaryColor={primaryColor} 
                            secondaryColor={secondaryColor} 
                            size="md" 
                          />
                          
                          <div className="flex-1">
                            <p className="font-semibold">{artilheiro.jogador_nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {artilheiro.time?.nome || 'Time desconhecido'}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">{artilheiro.gols}</p>
                            <p className="text-xs text-muted-foreground">gols</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Full Ranking */}
            {artilheiros.length > 5 && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle>Ranking Completo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {artilheiros.slice(5).map((artilheiro, index) => {
                      const cores = artilheiro.time?.cores;
                      const primaryColor = cores?.primary || '#6B7280';
                      const secondaryColor = cores?.secondary || '#FFFFFF';
                      
                      return (
                        <div 
                          key={artilheiro.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <span className="w-6 text-center font-medium text-muted-foreground">
                            {index + 6}
                          </span>
                          
                          <TeamBadge 
                            name={artilheiro.time?.short_code || artilheiro.time?.nome || 'N/A'} 
                            primaryColor={primaryColor} 
                            secondaryColor={secondaryColor} 
                            size="sm" 
                          />
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{artilheiro.jogador_nome}</p>
                            <p className="text-xs text-muted-foreground truncate">{artilheiro.time?.nome || 'N/A'}</p>
                          </div>
                          
                          <span className="font-bold text-primary w-8 text-right">{artilheiro.gols}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {artilheiros.length === 0 && (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="py-12 text-center">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">
                    Nenhum dado de artilharia disponível para os filtros selecionados.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Execute a função "rebuild-artilharia" para popular os dados.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
