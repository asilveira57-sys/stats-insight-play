import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { MatchCard } from "@/components/cards/MatchCard";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Filter, ChevronLeft, ChevronRight, Trophy, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeagues, useMatchesFromDB, useLatestMatchDateByLeague } from "@/hooks/useMatchesDB";
import { LeagueLogo } from "@/components/ui/LeagueLogo";
import { useRealtimeMatches } from "@/hooks/useRealtimeMatches";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { MatchDetailsModal } from "@/components/match/MatchDetailsModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SelectedMatch {
  id: string;
  homeTeam: { id: string; name: string; score?: number; primaryColor?: string; secondaryColor?: string };
  awayTeam: { id: string; name: string; score?: number; primaryColor?: string; secondaryColor?: string };
  date: string;
  league: string;
}

export default function Resultados() {
  const [selectedMatch, setSelectedMatch] = useState<SelectedMatch | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [dateOffset, setDateOffset] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualDateSet, setManualDateSet] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the latest match date for the selected league
  const { data: latestMatchDate } = useLatestMatchDateByLeague(selectedLeague);

  // Auto-navigate to the latest match date when a league is selected
  useEffect(() => {
    if (selectedLeague && latestMatchDate && !manualDateSet) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const matchDate = new Date(latestMatchDate + 'T00:00:00');
      matchDate.setHours(0, 0, 0, 0);
      
      // Calculate the offset from today
      const diffTime = matchDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      setDateOffset(diffDays);
    }
  }, [selectedLeague, latestMatchDate, manualDateSet]);

  // Reset manual date flag when league changes
  useEffect(() => {
    setManualDateSet(false);
  }, [selectedLeague]);

  // Subscribe to real-time updates for matches
  useRealtimeMatches();

  const handleRefreshScores = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-live-scores');
      
      if (error) throw error;
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['db-matches'] });
      queryClient.invalidateQueries({ queryKey: ['db-live-matches'] });
      
      toast({
        title: "Placares atualizados",
        description: `${data.matchesUpdated || 0} partidas atualizadas`,
      });
    } catch (error) {
      console.error('Error refreshing scores:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os placares",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle manual date changes
  const handleDateChange = (newOffset: number) => {
    setManualDateSet(true);
    setDateOffset(newOffset);
  };

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
                      onClick={() => {
                        setSelectedLeague(null);
                        setManualDateSet(false);
                        setDateOffset(0);
                      }}
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
                        <LeagueLogo
                          logoUrl={league.logo_url}
                          name={league.nome}
                          country={league.pais}
                          size="md"
                        />
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
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Data</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9"
                  onClick={() => handleDateChange(dateOffset - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex gap-1">
                  {dates.map((date) => (
                    <button
                      key={date.offset}
                      onClick={() => handleDateChange(date.offset)}
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
                  onClick={() => handleDateChange(dateOffset + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                
                {/* Month/Year Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "ml-2 gap-2",
                        (dateOffset < -1 || dateOffset > 1) && "border-primary text-primary"
                      )}
                    >
                      <CalendarIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {format(new Date(selectedDate), "MMM yyyy", { locale: ptBR })}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={new Date(selectedDate + 'T12:00:00')}
                      onSelect={(date) => {
                        if (date) {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          date.setHours(0, 0, 0, 0);
                          const diffTime = date.getTime() - today.getTime();
                          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                          handleDateChange(diffDays);
                        }
                      }}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
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
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefreshScores}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
                Atualizar
              </Button>
              <Button variant="ghost" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>

          {matchesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : matches && matches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map((match) => (
                <MatchCard 
                  key={match.id} 
                  {...match} 
                  onClick={() => setSelectedMatch({
                    id: match.id,
                    homeTeam: { 
                      id: match.homeTeamId || '', 
                      name: match.homeTeam.name, 
                      score: match.homeTeam.score,
                      primaryColor: match.homeTeam.primaryColor,
                      secondaryColor: match.homeTeam.secondaryColor,
                    },
                    awayTeam: { 
                      id: match.awayTeamId || '', 
                      name: match.awayTeam.name, 
                      score: match.awayTeam.score,
                      primaryColor: match.awayTeam.primaryColor,
                      secondaryColor: match.awayTeam.secondaryColor,
                    },
                    date: match.date,
                    league: match.league,
                  })}
                />
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

      {/* Match Details Modal */}
      <MatchDetailsModal
        open={!!selectedMatch}
        onOpenChange={(open) => !open && setSelectedMatch(null)}
        matchId={selectedMatch?.id || null}
        homeTeam={selectedMatch?.homeTeam || { id: '', name: '', logo: '' }}
        awayTeam={selectedMatch?.awayTeam || { id: '', name: '', logo: '' }}
        date={selectedMatch?.date || ''}
        league={selectedMatch?.league || ''}
      />
    </Layout>
  );
}
