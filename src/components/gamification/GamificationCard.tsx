import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useUserXP, useXPEvents, useUserBadges, xpProgress, xpForLevel } from "@/hooks/useGamification";
import { Flame, Zap, Trophy, Star, Target, Eye, Sparkles, Medal, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const BADGE_ICONS: Record<string, any> = {
  target: Target, eye: Eye, sparkles: Sparkles, flame: Flame,
  zap: Zap, medal: Medal, crown: Crown, trophy: Trophy, star: Star,
};

const RARITY_STYLES: Record<string, string> = {
  common: 'bg-muted text-muted-foreground',
  rare: 'bg-blue-500/10 text-blue-400',
  epic: 'bg-purple-500/10 text-purple-400',
  legendary: 'bg-amber-500/10 text-amber-400',
};

export function GamificationCard() {
  const { data: xp } = useUserXP();
  const { data: events } = useXPEvents(5);
  const { data: badges } = useUserBadges();

  if (!xp) return null;

  const progress = xpProgress(xp.total_xp, xp.level);

  return (
    <div className="space-y-4">
      {/* Level & XP */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> Seu Nível</span>
            <Badge variant="outline">Nv. {xp.level}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">{xp.total_xp} XP total</span>
              <span className="text-muted-foreground">{progress.current}/{progress.needed} para Nv. {xp.level + 1}</span>
            </div>
            <Progress value={progress.percent} className="h-3" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Flame className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-lg font-bold">{xp.current_streak_days}</p>
                <p className="text-xs text-muted-foreground">Streak atual</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Trophy className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-lg font-bold">{xp.best_streak_days}</p>
                <p className="text-xs text-muted-foreground">Melhor streak</p>
              </div>
            </div>
          </div>

          <Link to="/ranking" className="text-sm text-primary hover:underline block text-center">
            Ver Ranking Completo →
          </Link>
        </CardContent>
      </Card>

      {/* Recent XP */}
      {events && events.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Últimos XP Ganhos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate flex-1">{ev.description || ev.rule_key}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">+{ev.xp_delta} XP</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Badges */}
      {badges && badges.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4" /> Conquistas ({badges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {badges.map((ub) => {
                const badge = ub.badges;
                if (!badge) return null;
                const Icon = BADGE_ICONS[badge.icon] || Trophy;
                return (
                  <div key={ub.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${RARITY_STYLES[badge.rarity]}`} title={badge.description || ''}>
                    <Icon className="w-3.5 h-3.5" />
                    {badge.name}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
