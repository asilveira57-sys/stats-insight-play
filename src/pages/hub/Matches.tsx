import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  ChevronLeft, 
  Search, 
  Calendar as CalendarIcon,
  Filter,
  Download,
  RefreshCw,
  Play,
  Clock,
  CheckCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TeamBadge } from "@/components/ui/TeamBadge";

export default function HubMatches() {
  const [search, setSearch] = useState("");
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Fetch leagues for filter
  const { data: leagues } = useQuery({
    queryKey: ['leagues-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ligas')
        .select('id, nome, codigo_api')
        .eq('ativa', true)
        .order('nome');
      if (error) throw error;
      return data;
    }
  });

  // Fetch matches with filters
  const { data: matchesData, isLoading, refetch } = useQuery({
    queryKey: ['hub-matches', selectedLeague, selectedStatus, dateRange, page, search],
    queryFn: async () => {
      let query = supabase
        .from('partidas')
        .select(`
          *,
          time_casa:times!partidas_time_casa_id_fkey(id, nome, escudo_url, cores),
          time_fora:times!partidas_time_fora_id_fkey(id, nome, escudo_url, cores),
          liga:ligas!partidas_liga_id_fkey(id, nome, codigo_api)
        `, { count: 'exact' })
        .order('data', { ascending: false })
        .order('hora', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (selectedLeague !== 'all') {
        query = query.eq('liga_id', selectedLeague);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus as any);
      }

      if (dateRange.from) {
        query = query.gte('data', format(dateRange.from, 'yyyy-MM-dd'));
      }

      if (dateRange.to) {
        query = query.lte('data', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { matches: data, total: count || 0 };
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return (
          <Badge className="live-indicator">
            Ao Vivo
          </Badge>
        );
      case 'finished':
        return (
          <Badge className="bg-secondary/20 text-secondary border-secondary/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Finalizado
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge className="bg-muted text-muted-foreground">
            <Clock className="w-3 h-3 mr-1" />
            Agendado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">{status}</Badge>
        );
    }
  };

  const totalPages = Math.ceil((matchesData?.total || 0) / pageSize);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/hub">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">Explorar Partidas</h1>
            <p className="text-muted-foreground text-sm">
              {matchesData?.total || 0} partidas encontradas
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Filters */}
        <Card className="glass-card mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar time..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-muted/50 border-border"
                />
              </div>

              {/* League Filter */}
              <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                <SelectTrigger className="bg-muted/50 border-border">
                  <SelectValue placeholder="Competição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {leagues?.map((league) => (
                    <SelectItem key={league.id} value={league.id}>
                      {league.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="bg-muted/50 border-border">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="scheduled">Agendados</SelectItem>
                  <SelectItem value="live">Ao Vivo</SelectItem>
                  <SelectItem value="finished">Finalizados</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start bg-muted/50 border-border">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM")} - {format(dateRange.to, "dd/MM")}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy")
                      )
                    ) : (
                      "Selecionar datas"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    locale={ptBR}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Matches List */}
        <div className="space-y-3">
          {matchesData?.matches?.map((match) => (
            <Card key={match.id} className="glass-card hover-glow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Date/Time */}
                  <div className="w-20 text-center">
                    <div className="text-sm font-medium">
                      {format(new Date(match.data), "dd/MM", { locale: ptBR })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {match.hora?.slice(0, 5) || '--:--'}
                    </div>
                  </div>

                  {/* Teams */}
                  <div className="flex-1 grid grid-cols-3 items-center gap-4">
                    {/* Home Team */}
                    <div className="flex items-center gap-2 justify-end">
                      <span className="font-medium text-right truncate">
                        {match.time_casa?.nome || 'TBD'}
                      </span>
                      <TeamBadge
                        name={match.time_casa?.nome || '?'}
                        primaryColor={(match.time_casa?.cores as any)?.primary}
                        secondaryColor={(match.time_casa?.cores as any)?.secondary}
                        size="sm"
                      />
                    </div>

                    {/* Score */}
                    <div className="flex items-center justify-center gap-2">
                      {match.status === 'finished' || match.status === 'live' ? (
                        <div className="flex items-center gap-2 font-display font-bold text-xl">
                          <span>{match.gols_casa ?? 0}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{match.gols_fora ?? 0}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">vs</span>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center gap-2">
                      <TeamBadge
                        name={match.time_fora?.nome || '?'}
                        primaryColor={(match.time_fora?.cores as any)?.primary}
                        secondaryColor={(match.time_fora?.cores as any)?.secondary}
                        size="sm"
                      />
                      <span className="font-medium truncate">
                        {match.time_fora?.nome || 'TBD'}
                      </span>
                    </div>
                  </div>

                  {/* League & Status */}
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {match.liga?.codigo_api || match.liga?.nome}
                    </Badge>
                    {getStatusBadge(match.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!matchesData?.matches || matchesData.matches.length === 0) && (
          <Card className="glass-card p-12 text-center">
            <Play className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma partida encontrada</h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros de busca
            </p>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground px-4">
              Página {page + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
