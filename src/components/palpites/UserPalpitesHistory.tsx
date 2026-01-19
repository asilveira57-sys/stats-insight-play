import { useState } from 'react';
import { useUserPalpites, useUserAccuracyStats, useSystemAccuracyStats } from '@/hooks/useUserPalpites';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Sparkles,
  Bot,
  User as UserIcon,
  Goal,
  Calendar,
  Filter
} from 'lucide-react';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { cn } from '@/lib/utils';
import { format, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function UserPalpitesHistory() {
  const { user } = useAuth();
  
  // Date filter state - default to last 30 days
  const [startDate, setStartDate] = useState<string>(() => 
    format(subMonths(new Date(), 1), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(() => 
    format(new Date(), 'yyyy-MM-dd')
  );
  
  const { data: palpites, isLoading } = useUserPalpites();
  const { data: userStats, isLoading: loadingUserStats } = useUserAccuracyStats(startDate, endDate);
  const { data: systemStats, isLoading: loadingSystemStats } = useSystemAccuracyStats(startDate, endDate);

  // Quick date presets
  const setDatePreset = (preset: 'week' | 'month' | '3months' | 'year' | 'all') => {
    const today = new Date();
    setEndDate(format(today, 'yyyy-MM-dd'));
    
    switch (preset) {
      case 'week':
        setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(subMonths(today, 1), 'yyyy-MM-dd'));
        break;
      case '3months':
        setStartDate(format(subMonths(today, 3), 'yyyy-MM-dd'));
        break;
      case 'year':
        setStartDate(format(subMonths(today, 12), 'yyyy-MM-dd'));
        break;
      case 'all':
        setStartDate('2020-01-01');
        break;
    }
  };

  // Filter palpites by date
  const filteredPalpites = palpites?.filter(p => {
    const matchDate = p.partida?.data;
    if (!matchDate) return true;
    if (startDate && matchDate < startDate) return false;
    if (endDate && matchDate > endDate) return false;
    return true;
  });

  if (!user) {
    return (
      <div className="glass-card p-8 text-center">
        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Faça login para ver seus palpites</h3>
        <p className="text-muted-foreground mb-4">
          Crie uma conta gratuita para acompanhar seu histórico e assertividade.
        </p>
        <Link to="/auth">
          <Button>Entrar / Criar Conta</Button>
        </Link>
      </div>
    );
  }

  if (isLoading || loadingUserStats || loadingSystemStats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const getResultStatus = (palpite: any) => {
    const match = palpite.partida;
    if (match.status !== 'finished' || match.gols_casa === null) {
      return 'pending';
    }

    const userResult = palpite.placar_casa > palpite.placar_fora ? 'casa'
      : palpite.placar_casa < palpite.placar_fora ? 'fora' : 'empate';
    
    const officialResult = match.gols_casa > match.gols_fora ? 'casa'
      : match.gols_casa < match.gols_fora ? 'fora' : 'empate';

    const exactScore = palpite.placar_casa === match.gols_casa && 
                       palpite.placar_fora === match.gols_fora;

    if (exactScore) return 'exact';
    if (userResult === officialResult) return 'correct';
    return 'wrong';
  };

  const getResultLabel = (result: string) => {
    switch (result) {
      case 'casa': return 'Vitória Casa';
      case 'fora': return 'Vitória Fora';
      case 'empate': return 'Empate';
      default: return result;
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Filtrar por Período</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setDatePreset('week')}
              className="text-xs"
            >
              7 dias
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setDatePreset('month')}
              className="text-xs"
            >
              30 dias
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setDatePreset('3months')}
              className="text-xs"
            >
              3 meses
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setDatePreset('year')}
              className="text-xs"
            >
              1 ano
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setDatePreset('all')}
              className="text-xs"
            >
              Tudo
            </Button>
          </div>

          <div className="h-6 w-px bg-border hidden md:block" />

          {/* Custom Date Range */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="startDate" className="text-xs text-muted-foreground">De:</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="endDate" className="text-xs text-muted-foreground">Até:</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* User Stats - Result Focused */}
        <Card className="glass-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-secondary" />
              Sua Assertividade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Acertos de Resultado
                  </span>
                  <span className="text-xs text-secondary font-medium">
                    {userStats?.acertosResultado || 0}/{userStats?.totalPalpites || 0}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-secondary">
                    {userStats?.percentualResultado.toFixed(1) || 0}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Goal className="w-3 h-3" />
                  Placar Exato
                </span>
                <div className="text-right">
                  <span className="font-semibold">{userStats?.percentualPlacar.toFixed(1) || 0}%</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({userStats?.acertosPlacar || 0})
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Stats - Result Focused */}
        <Card className="glass-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              IA do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Acertos de Resultado
                  </span>
                  <span className="text-xs text-primary font-medium">
                    {systemStats?.acertosResultado || 0}/{systemStats?.total || 0}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {systemStats?.percentualResultado.toFixed(1) || 0}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Goal className="w-3 h-3" />
                  Placar Exato
                </span>
                <div className="text-right">
                  <span className="font-semibold">{systemStats?.percentualPlacar.toFixed(1) || 0}%</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({systemStats?.acertosPlacar || 0})
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison */}
        <Card className="glass-card border-0 bg-gradient-to-br from-primary/10 to-secondary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Quando Seguiu a IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Acertos de Resultado
                  </span>
                  <span className="text-xs font-medium">
                    {userStats?.acertosComIA || 0}/{userStats?.palpitesComIA || 0}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {userStats?.percentualIA.toFixed(1) || 0}%
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {userStats?.palpitesComIA || 0} palpites seguindo sugestão da IA
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Histórico de Palpites
          {filteredPalpites && filteredPalpites.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredPalpites.length} palpites)
            </span>
          )}
        </h3>

        {!filteredPalpites || filteredPalpites.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {palpites && palpites.length > 0 
                ? 'Nenhum palpite encontrado no período selecionado.'
                : 'Você ainda não fez nenhum palpite. Clique em um jogo acima para começar!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPalpites.map((palpite) => {
              const status = getResultStatus(palpite);
              const match = palpite.partida;

              const userResult = palpite.placar_casa > palpite.placar_fora ? 'casa'
                : palpite.placar_casa < palpite.placar_fora ? 'fora' : 'empate';
              
              const officialResult = match.status === 'finished' && match.gols_casa !== null
                ? (match.gols_casa > match.gols_fora ? 'casa'
                  : match.gols_casa < match.gols_fora ? 'fora' : 'empate')
                : null;

              return (
                <div
                  key={palpite.id}
                  className={cn(
                    'p-4 rounded-xl border transition-all',
                    status === 'exact' && 'bg-green-500/10 border-green-500/30',
                    status === 'correct' && 'bg-primary/10 border-primary/30',
                    status === 'wrong' && 'bg-destructive/10 border-destructive/30',
                    status === 'pending' && 'bg-muted/50 border-border'
                  )}
                >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <TeamBadge name={match.time_casa?.nome || 'Casa'} primaryColor={match.time_casa?.cores?.primary} secondaryColor={match.time_casa?.cores?.secondary} size="sm" />
                        <span className="font-medium text-sm">{match.time_casa?.nome || 'Casa'}</span>
                      </div>
                      <span className="text-muted-foreground">vs</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{match.time_fora?.nome || 'Fora'}</span>
                        <TeamBadge name={match.time_fora?.nome || 'Fora'} primaryColor={match.time_fora?.cores?.primary} secondaryColor={match.time_fora?.cores?.secondary} size="sm" />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          {palpite.aceitou_sugestao ? (
                            <>
                              <Sparkles className="w-3 h-3" />
                              IA
                            </>
                          ) : (
                            'Seu'
                          )}
                        </div>
                        <div className="font-bold">
                          {palpite.placar_casa} x {palpite.placar_fora}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {getResultLabel(userResult)}
                        </div>
                      </div>

                      {status !== 'pending' && (
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">Oficial</div>
                          <div className="font-bold text-foreground">
                            {match.gols_casa} x {match.gols_fora}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {officialResult && getResultLabel(officialResult)}
                          </div>
                        </div>
                      )}

                      <Badge
                        variant={
                          status === 'exact' ? 'default' :
                          status === 'correct' ? 'secondary' :
                          status === 'wrong' ? 'destructive' : 'outline'
                        }
                        className={cn(
                          'ml-2',
                          status === 'exact' && 'bg-green-500'
                        )}
                      >
                        {status === 'exact' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {status === 'correct' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {status === 'wrong' && <XCircle className="w-3 h-3 mr-1" />}
                        {status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                        {status === 'exact' ? 'Placar Exato!' :
                         status === 'correct' ? 'Resultado Certo' :
                         status === 'wrong' ? 'Errou' : 'Aguardando'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    {match.liga?.logo_url && (
                      <img src={match.liga.logo_url} alt="" className="w-4 h-4 object-contain" />
                    )}
                    <span>{match.liga?.nome}</span>
                    <span>•</span>
                    <span>
                      {format(new Date(match.data), "dd 'de' MMM", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
