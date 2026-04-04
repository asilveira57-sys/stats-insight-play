import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { useArtilharia } from "@/hooks/useArtilharia";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Trophy, TrendingUp, Goal, User, X, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { TeamBadge } from "@/components/ui/TeamBadge";

type SortField = 'posicao' | 'jogador_nome' | 'time' | 'gols';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 30;

export default function Artilheiros() {
  const [tipoFiltro, setTipoFiltro] = useState<'geral' | 'temporada' | 'campeonato'>('geral');
  const [selectedTemporada, setSelectedTemporada] = useState<string>("");
  const [selectedCompeticao, setSelectedCompeticao] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>('gols');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);

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
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Filter & sort the full list
  const filteredSorted = useMemo(() => {
    let list = [...artilheiros];

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a =>
        a.jogador_nome.toLowerCase().includes(q) ||
        (a.time?.nome || '').toLowerCase().includes(q) ||
        (a.time?.short_code || '').toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'jogador_nome':
          cmp = a.jogador_nome.localeCompare(b.jogador_nome, 'pt-BR');
          break;
        case 'time':
          cmp = (a.time?.nome || '').localeCompare(b.time?.nome || '', 'pt-BR');
          break;
        case 'gols':
          cmp = a.gols - b.gols;
          break;
        case 'posicao':
        default:
          cmp = a.gols - b.gols; // position is inverse of goals
          return sortDir === 'asc' ? -(cmp) : cmp; // default desc = most goals first
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [artilheiros, searchQuery, sortField, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedList = filteredSorted.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;

  // Reset page when filters change
  const handleSearchChange = (val: string) => { setSearchQuery(val); setCurrentPage(1); };
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'gols' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  // Stats
  const totalGols = artilheiros.reduce((sum, a) => sum + a.gols, 0);
  const totalJogadores = artilheiros.length;
  const topScorer = artilheiros[0];

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/50" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-primary" />
      : <ArrowDown className="w-3.5 h-3.5 text-primary" />;
  };

  // Generate page numbers to show
  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, safeCurrentPage - 1); i <= Math.min(totalPages - 1, safeCurrentPage + 1); i++) {
        pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold gradient-text mb-2">
            Artilheiros
          </h1>
          <p className="text-muted-foreground">
            Ranking de goleadores — filtros por Geral, Temporada e Campeonato
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3 flex-wrap">
          <Select value={tipoFiltro} onValueChange={(val) => { setTipoFiltro(val as any); setCurrentPage(1); }}>
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
            <Select value={selectedTemporada || "all"} onValueChange={(val) => { setSelectedTemporada(val === "all" ? "" : val); setCurrentPage(1); }}>
              <SelectTrigger className="w-full sm:w-[140px] bg-card border-border">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
                {temporadas.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {tipoFiltro === 'campeonato' && (
            <Select value={selectedCompeticao || "all"} onValueChange={(val) => { setSelectedCompeticao(val === "all" ? "" : val); setCurrentPage(1); }}>
              <SelectTrigger className="w-full sm:w-[280px] bg-card border-border">
                <SelectValue placeholder="Campeonato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os campeonatos</SelectItem>
                {competicoes.map(comp => (
                  <SelectItem key={comp.id} value={comp.id}>{comp.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="flex items-center gap-1">
              <X className="w-4 h-4" /> Limpar filtros
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20"><User className="w-5 h-5 text-primary" /></div>
                    <div><p className="text-2xl font-bold">{totalJogadores}</p><p className="text-xs text-muted-foreground">Artilheiros</p></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary/20"><Goal className="w-5 h-5 text-secondary" /></div>
                    <div><p className="text-2xl font-bold">{totalGols}</p><p className="text-xs text-muted-foreground">Gols</p></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/20"><Trophy className="w-5 h-5 text-accent" /></div>
                    <div><p className="text-2xl font-bold">{topScorer?.gols || 0}</p><p className="text-xs text-muted-foreground">Líder</p></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20"><TrendingUp className="w-5 h-5 text-primary" /></div>
                    <div>
                      <p className="text-2xl font-bold">{totalJogadores > 0 ? (totalGols / totalJogadores).toFixed(1) : 0}</p>
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
                        <div key={artilheiro.id} className="flex items-center gap-4 p-3 rounded-lg bg-background/50">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                            index === 1 ? 'bg-gray-400/20 text-gray-400' :
                            index === 2 ? 'bg-amber-600/20 text-amber-600' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <TeamBadge name={artilheiro.time?.short_code || artilheiro.time?.nome || 'N/A'} primaryColor={primaryColor} secondaryColor={secondaryColor} size="md" />
                          <div className="flex-1">
                            <p className="font-semibold">{artilheiro.jogador_nome}</p>
                            <p className="text-xs text-muted-foreground">{artilheiro.time?.nome || 'Time desconhecido'}</p>
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

            {/* Full Ranking with Search, Sort & Pagination */}
            {artilheiros.length > 0 && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle>Ranking Completo</CardTitle>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar jogador ou time..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9 bg-background border-border"
                      />
                    </div>
                  </div>
                  {searchQuery && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {filteredSorted.length} resultado{filteredSorted.length !== 1 ? 's' : ''} encontrado{filteredSorted.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {/* Column headers */}
                  <div className="hidden sm:flex items-center gap-3 px-2 py-2 mb-1 text-xs font-medium text-muted-foreground border-b border-border/50 select-none">
                    <button onClick={() => handleSort('posicao')} className="w-8 text-center flex items-center gap-1 hover:text-foreground transition-colors">
                      # <SortIcon field="posicao" />
                    </button>
                    <span className="w-9" /> {/* badge space */}
                    <button onClick={() => handleSort('jogador_nome')} className="flex-1 flex items-center gap-1 hover:text-foreground transition-colors">
                      Jogador <SortIcon field="jogador_nome" />
                    </button>
                    <button onClick={() => handleSort('time')} className="w-32 flex items-center gap-1 hover:text-foreground transition-colors">
                      Time <SortIcon field="time" />
                    </button>
                    <button onClick={() => handleSort('gols')} className="w-12 text-right flex items-center justify-end gap-1 hover:text-foreground transition-colors">
                      Gols <SortIcon field="gols" />
                    </button>
                  </div>

                  {/* Rows */}
                  <div className="space-y-1">
                    {paginatedList.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>Nenhum artilheiro encontrado para "{searchQuery}"</p>
                      </div>
                    ) : (
                      paginatedList.map((artilheiro, idx) => {
                        const cores = artilheiro.time?.cores;
                        const primaryColor = cores?.primary || '#6B7280';
                        const secondaryColor = cores?.secondary || '#FFFFFF';
                        const globalIndex = startIndex + idx + 1;

                        return (
                          <div key={artilheiro.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <span className="w-8 text-center font-medium text-muted-foreground text-sm">
                              {globalIndex}
                            </span>
                            <TeamBadge
                              name={artilheiro.time?.short_code || artilheiro.time?.nome || 'N/A'}
                              primaryColor={primaryColor}
                              secondaryColor={secondaryColor}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{artilheiro.jogador_nome}</p>
                              <p className="text-xs text-muted-foreground truncate sm:hidden">{artilheiro.time?.nome || 'N/A'}</p>
                            </div>
                            <span className="hidden sm:block w-32 text-sm text-muted-foreground truncate">
                              {artilheiro.time?.nome || 'N/A'}
                            </span>
                            <span className="font-bold text-primary w-12 text-right">{artilheiro.gols}</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                      <p className="text-sm text-muted-foreground">
                        {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredSorted.length)} de {filteredSorted.length}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={safeCurrentPage <= 1}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>

                        {pageNumbers.map((p, i) =>
                          p === 'ellipsis' ? (
                            <span key={`e-${i}`} className="px-1 text-muted-foreground">…</span>
                          ) : (
                            <Button
                              key={p}
                              variant={p === safeCurrentPage ? "default" : "outline"}
                              size="icon"
                              className="h-8 w-8 text-xs"
                              onClick={() => setCurrentPage(p)}
                            >
                              {p}
                            </Button>
                          )
                        )}

                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={safeCurrentPage >= totalPages}
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {artilheiros.length === 0 && (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="py-12 text-center">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">Nenhum dado de artilharia disponível para os filtros selecionados.</p>
                  <p className="text-sm text-muted-foreground">Execute a função "rebuild-artilharia" para popular os dados.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
