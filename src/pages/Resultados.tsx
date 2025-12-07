import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { MatchCard } from "@/components/cards/MatchCard";
import { Button } from "@/components/ui/button";
import { Calendar, Filter, ChevronLeft, ChevronRight, Trophy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeagues, useMatchesFromDB } from "@/hooks/useMatchesDB";
import { Skeleton } from "@/components/ui/skeleton";

export default function Resultados() {
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [dateOffset, setDateOffset] = useState(0);

  // Calculate date based on offset
  const selectedDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + dateOffset);
    return date.toISOString().split('T')[0];
  }, [dateOffset]);

  const dateLabel = useMemo(() => {
    if (dateOffset === -1) return "Ontem";
    if (dateOffset === 0) return "Hoje";
    if (dateOffset === 1) return "Amanhã";
    const date = new Date();
    date.setDate(date.getDate() + dateOffset);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }, [dateOffset]);

  // Fetch leagues from database
  const { data: leagues, isLoading: leaguesLoading } = useLeagues();

  // Fetch matches from database
  const { data: matches, isLoading: matchesLoading } = useMatchesFromDB({
    leagueCode: selectedLeague || undefined,
    dateFrom: selectedDate,
    dateTo: selectedDate,
  });

  const dates = [
    { offset: -1, label: "Ontem" },
    { offset: 0, label: "Hoje" },
    { offset: 1, label: "Amanhã" },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            <span className="gradient-text">Resultados</span>
          </h1>
          <p className="text-muted-foreground">
            Acompanhe os resultados das principais ligas do mundo
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* League Filter */}
          <div className="flex-1">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Liga</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {leaguesLoading ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-24" />
                    ))}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedLeague(null)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        selectedLeague === null
                          ? "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      )}
                    >
                      Todas
                    </button>
                    {leagues?.map((league) => (
                      <button
                        key={league.id}
                        onClick={() => setSelectedLeague(league.codigo_api)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          selectedLeague === league.codigo_api
                            ? "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        )}
                      >
                        {league.logo_url && (
                          <img
                            src={league.logo_url}
                            alt={league.nome}
                            className="w-5 h-5 object-contain"
                          />
                        )}
                        <span className="hidden sm:inline">{league.nome}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Date Filter */}
          <div className="lg:w-auto">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Data</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9"
                  onClick={() => setDateOffset(prev => prev - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex gap-1">
                  {dates.map((date) => (
                    <button
                      key={date.offset}
                      onClick={() => setDateOffset(date.offset)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        dateOffset === date.offset
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      )}
                    >
                      {date.label}
                    </button>
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9"
                  onClick={() => setDateOffset(prev => prev + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              {dateOffset < -1 || dateOffset > 1 ? (
                <div className="text-center text-xs text-muted-foreground mt-2">
                  {dateLabel}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Matches */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-bold">
              Jogos - {dateLabel}
              {matches && matches.length > 0 && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  ({matches.length} jogos)
                </span>
              )}
            </h2>
            <Button variant="ghost" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>

          {matchesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : matches && matches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map((match) => (
                <MatchCard key={match.id} {...match} />
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground">
                Nenhum jogo encontrado para {dateLabel.toLowerCase()}.
              </p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                Tente selecionar outra data ou liga.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
