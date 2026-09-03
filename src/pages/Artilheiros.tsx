import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { useArtilharia, regiaoDaLiga, type RegiaoFiltro } from "@/hooks/useArtilharia";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, TrendingUp, Goal, User, X, Search, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Info,
} from "lucide-react";
import { TeamBadge } from "@/components/ui/TeamBadge";

type SortField = "posicao" | "jogador_nome" | "time" | "gols";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 30;

const REGIOES: { value: RegiaoFiltro; label: string }[] = [
  { value: "todos", label: "Todos os campeonatos" },
  { value: "brasil", label: "Nacionais (Brasil)" },
  { value: "america-do-sul", label: "América do Sul" },
  { value: "europa", label: "Europeus" },
  { value: "outros", label: "Outras regiões" },
];

interface ScorerRow {
  key: string;
  jogador_nome: string;
  gols: number;
  partidas_com_gol: number;
  timeNome: string;
  timeShort: string | null;
  primaryColor: string;
  secondaryColor: string;
  competicoes: string[];
}

export default function Artilheiros() {
  const { rows, competicoes, temporadas, isLoading } = useArtilharia();

  const [regiao, setRegiao] = useState<RegiaoFiltro>("brasil");
  const [temporada, setTemporada] = useState<string>("");
  const [competicaoId, setCompeticaoId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("gols");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Default to the most recent season available (includes 2026)
  useEffect(() => {
    if (!temporada && temporadas.length > 0) setTemporada(temporadas[0]);
  }, [temporadas, temporada]);

  // Competitions available for the current region + season
  const competicoesDisponiveis = useMemo(() => {
    return competicoes.filter((c) => {
      if (regiao !== "todos" && regiaoDaLiga(c.pais) !== regiao) return false;
      if (temporada && !c.temporadas.includes(temporada)) return false;
      return true;
    });
  }, [competicoes, regiao, temporada]);

  // Drop the competition filter when it leaves the available set
  useEffect(() => {
    if (competicaoId && !competicoesDisponiveis.some((c) => c.id === competicaoId)) {
      setCompeticaoId("");
    }
  }, [competicoesDisponiveis, competicaoId]);

  const selectedCompeticao = competicoes.find((c) => c.id === competicaoId);

  // Aggregate scorers according to the active filters
  const scorers = useMemo<ScorerRow[]>(() => {
    const filtered = rows.filter((r) => {
      if (temporada && r.temporada !== temporada) return false;
      if (competicaoId) return r.competicao_id === competicaoId;
      if (regiao !== "todos" && regiaoDaLiga(r.ligas?.pais) !== regiao) return false;
      return true;
    });

    const byPlayer = new Map<string, ScorerRow>();
    for (const r of filtered) {
      const key = `${r.jogador_slug || r.jogador_nome.toLowerCase()}|${r.time_id ?? "sem-time"}`;
      const cores = r.time?.cores as { primary?: string; secondary?: string } | null;
      const existing = byPlayer.get(key);
      const compNome = r.ligas?.nome;
      if (existing) {
        existing.gols += r.gols;
        existing.partidas_com_gol += r.partidas_com_gol ?? 0;
        if (compNome && !existing.competicoes.includes(compNome)) existing.competicoes.push(compNome);
      } else {
        byPlayer.set(key, {
          key,
          jogador_nome: r.jogador_nome,
          gols: r.gols,
          partidas_com_gol: r.partidas_com_gol ?? 0,
          timeNome: r.time?.nome ?? "Time não identificado",
          timeShort: r.time?.short_code ?? null,
          primaryColor: cores?.primary || "#6B7280",
          secondaryColor: cores?.secondary || "#FFFFFF",
          competicoes: compNome ? [compNome] : [],
        });
      }
    }

    return [...byPlayer.values()].sort((a, b) => b.gols - a.gols);
  }, [rows, temporada, competicaoId, regiao]);

  const filteredSorted = useMemo(() => {
    let list = [...scorers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.jogador_nome.toLowerCase().includes(q) ||
          a.timeNome.toLowerCase().includes(q) ||
          (a.timeShort ?? "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "jogador_nome":
          cmp = a.jogador_nome.localeCompare(b.jogador_nome, "pt-BR");
          break;
        case "time":
          cmp = a.timeNome.localeCompare(b.timeNome, "pt-BR");
          break;
        case "gols":
          cmp = a.gols - b.gols;
          break;
        case "posicao":
        default:
          cmp = a.gols - b.gols;
          return sortDir === "asc" ? -cmp : cmp;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [scorers, searchQuery, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedList = filteredSorted.slice(startIndex, startIndex + PAGE_SIZE);

  const totalGols = scorers.reduce((sum, a) => sum + a.gols, 0);
  const totalJogadores = scorers.length;
  const topScorer = scorers[0];

  const hasActiveFilters = regiao !== "brasil" || !!competicaoId || (!!temporada && temporada !== temporadas[0]);

  const clearFilters = () => {
    setRegiao("brasil");
    setCompeticaoId("");
    setTemporada(temporadas[0] ?? "");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir(field === "gols" ? "desc" : "asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/50" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 text-primary" />
      : <ArrowDown className="w-3.5 h-3.5 text-primary" />;
  };

  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, safeCurrentPage - 1); i <= Math.min(totalPages - 1, safeCurrentPage + 1); i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  const escopoLabel = selectedCompeticao
    ? selectedCompeticao.nome
    : REGIOES.find((r) => r.value === regiao)?.label ?? "Todos";

  return (
    <Layout>
      <Helmet>
        <title>Artilheiros {temporada || ""} — Ranking de Goleadores | Statball</title>
        <meta
          name="description"
          content={`Ranking de artilheiros ${temporada || ""} com filtros por temporada, região e campeonato: gols, times e líderes de cada competição.`}
        />
        <link rel="canonical" href="https://www.statball.com.br/artilheiros" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-display font-bold gradient-text mb-2">Artilheiros</h1>
          <p className="text-muted-foreground">
            Escolha a temporada, a região e o campeonato para ver o ranking de goleadores.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3 flex-wrap">
          <Select value={temporada || "all"} onValueChange={(v) => { setTemporada(v === "all" ? "" : v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[160px] bg-card border-border">
              <SelectValue placeholder="Temporada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as temporadas</SelectItem>
              {temporadas.map((year) => (
                <SelectItem key={year} value={year}>Temporada {year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={regiao} onValueChange={(v) => { setRegiao(v as RegiaoFiltro); setCompeticaoId(""); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[220px] bg-card border-border">
              <SelectValue placeholder="Região" />
            </SelectTrigger>
            <SelectContent>
              {REGIOES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={competicaoId || "all"} onValueChange={(v) => { setCompeticaoId(v === "all" ? "" : v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[300px] bg-card border-border">
              <SelectValue placeholder="Campeonato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {competicoesDisponiveis.length > 0
                  ? `Todos (${competicoesDisponiveis.length} campeonatos)`
                  : "Nenhum campeonato com dados"}
              </SelectItem>
              {competicoesDisponiveis.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}{c.pais ? ` · ${c.pais}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar jogador ou time..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-9 bg-card border-border"
            />
          </div>

          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="flex items-center gap-1">
              <X className="w-4 h-4" /> Limpar filtros
            </Button>
          )}
        </div>

        <div className="mb-6 flex items-center gap-2 flex-wrap text-xs">
          <Badge variant="secondary">{escopoLabel}</Badge>
          <Badge variant="outline">{temporada ? `Temporada ${temporada}` : "Todas as temporadas"}</Badge>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <>
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

            {scorers.length === 0 ? (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="py-10 text-center text-muted-foreground space-y-2">
                  <Info className="w-6 h-6 mx-auto opacity-60" />
                  <p className="font-medium text-foreground">
                    Sem eventos de gols registrados para {escopoLabel}
                    {temporada ? ` na temporada ${temporada}` : ""}.
                  </p>
                  <p className="text-sm">
                    O ranking é montado só com gols confirmados na base — quando a competição ainda não
                    tem eventos de gol importados, a lista aparece vazia. Tente outra temporada ou
                    escolha "Todos os campeonatos".
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30 mb-8">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Trophy className="w-5 h-5 text-primary" />
                      Top 5 — {escopoLabel}{temporada ? ` (${temporada})` : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {scorers.slice(0, 5).map((a, index) => (
                        <div key={a.key} className="flex items-center gap-4 p-3 rounded-lg bg-background/50">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? "bg-yellow-500/20 text-yellow-500"
                              : index === 1 ? "bg-gray-400/20 text-gray-400"
                              : index === 2 ? "bg-amber-600/20 text-amber-600"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {index + 1}
                          </div>
                          <TeamBadge name={a.timeShort || a.timeNome} primaryColor={a.primaryColor} secondaryColor={a.secondaryColor} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{a.jogador_nome}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {a.timeNome}
                              {!competicaoId && a.competicoes.length > 0 ? ` · ${a.competicoes.join(", ")}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">{a.gols}</p>
                            <p className="text-xs text-muted-foreground">gols</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                  <CardHeader className="pb-4">
                    <CardTitle>Ranking Completo</CardTitle>
                    {searchQuery && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {filteredSorted.length} resultado{filteredSorted.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="hidden sm:flex items-center gap-3 px-2 py-2 mb-1 text-xs font-medium text-muted-foreground border-b border-border/50 select-none">
                      <button onClick={() => handleSort("posicao")} className="w-8 text-center flex items-center gap-1 hover:text-foreground transition-colors">
                        # <SortIcon field="posicao" />
                      </button>
                      <span className="w-9" />
                      <button onClick={() => handleSort("jogador_nome")} className="flex-1 flex items-center gap-1 hover:text-foreground transition-colors">
                        Jogador <SortIcon field="jogador_nome" />
                      </button>
                      <button onClick={() => handleSort("time")} className="w-32 flex items-center gap-1 hover:text-foreground transition-colors">
                        Time <SortIcon field="time" />
                      </button>
                      <button onClick={() => handleSort("gols")} className="w-12 text-right flex items-center justify-end gap-1 hover:text-foreground transition-colors">
                        Gols <SortIcon field="gols" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      {paginatedList.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p>Nenhum artilheiro encontrado para "{searchQuery}"</p>
                        </div>
                      ) : (
                        paginatedList.map((a, idx) => (
                          <div key={a.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <span className="w-8 text-center font-medium text-muted-foreground text-sm">{startIndex + idx + 1}</span>
                            <TeamBadge name={a.timeShort || a.timeNome} primaryColor={a.primaryColor} secondaryColor={a.secondaryColor} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{a.jogador_nome}</p>
                              <p className="text-xs text-muted-foreground truncate sm:hidden">{a.timeNome}</p>
                            </div>
                            <span className="hidden sm:block w-32 text-sm text-muted-foreground truncate">{a.timeNome}</span>
                            <span className="font-bold text-primary w-12 text-right">{a.gols}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                        <p className="text-sm text-muted-foreground">
                          {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredSorted.length)} de {filteredSorted.length}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" disabled={safeCurrentPage <= 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          {pageNumbers.map((p, i) =>
                            p === "ellipsis" ? (
                              <span key={`e-${i}`} className="px-2 text-muted-foreground">…</span>
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
                          <Button variant="outline" size="icon" className="h-8 w-8" disabled={safeCurrentPage >= totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
