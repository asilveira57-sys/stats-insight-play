import { useUserPalpites, useUserAccuracyStats, useSystemAccuracyStats } from '@/hooks/useUserPalpites';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Sparkles,
  Bot,
  User as UserIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function UserPalpitesHistory() {
  const { user } = useAuth();
  const { data: palpites, isLoading } = useUserPalpites();
  const { data: userStats, isLoading: loadingUserStats } = useUserAccuracyStats();
  const { data: systemStats, isLoading: loadingSystemStats } = useSystemAccuracyStats();

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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* User Stats */}
        <Card className="glass-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-secondary" />
              Sua Assertividade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-secondary">
                  {userStats?.percentualResultado.toFixed(1) || 0}%
                </span>
                <span className="text-xs text-muted-foreground">resultados</span>
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{userStats?.acertosResultado || 0} acertos</span>
                <span>{userStats?.totalPalpites || 0} total</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Placar exato: {userStats?.percentualPlacar.toFixed(1) || 0}%
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Stats */}
        <Card className="glass-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              IA do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">
                  {systemStats?.percentualResultado.toFixed(1) || 0}%
                </span>
                <span className="text-xs text-muted-foreground">resultados</span>
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{systemStats?.acertosResultado || 0} acertos</span>
                <span>{systemStats?.total || 0} total</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Placar exato: {systemStats?.percentualPlacar.toFixed(1) || 0}%
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
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {userStats?.percentualIA.toFixed(1) || 0}%
                </span>
                <span className="text-xs text-muted-foreground">acertos</span>
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{userStats?.acertosComIA || 0} de {userStats?.palpitesComIA || 0}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {userStats?.palpitesComIA || 0} palpites com sugestão da IA
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
        </h3>

        {!palpites || palpites.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Você ainda não fez nenhum palpite. Clique em um jogo acima para começar!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {palpites.map((palpite) => {
              const status = getResultStatus(palpite);
              const match = palpite.partida;

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
                    {/* Match Info */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {match.time_casa?.escudo_url && (
                          <img src={match.time_casa.escudo_url} alt="" className="w-6 h-6 object-contain" />
                        )}
                        <span className="font-medium text-sm">{match.time_casa?.nome || 'Casa'}</span>
                      </div>
                      <span className="text-muted-foreground">vs</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{match.time_fora?.nome || 'Fora'}</span>
                        {match.time_fora?.escudo_url && (
                          <img src={match.time_fora.escudo_url} alt="" className="w-6 h-6 object-contain" />
                        )}
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="flex items-center gap-4">
                      {/* User Prediction */}
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
                      </div>

                      {/* Official Result */}
                      {status !== 'pending' && (
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">Oficial</div>
                          <div className="font-bold text-foreground">
                            {match.gols_casa} x {match.gols_fora}
                          </div>
                        </div>
                      )}

                      {/* Status Badge */}
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
                         status === 'correct' ? 'Acertou' :
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
