import { useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { xpProgress } from "@/hooks/useGamification";
import { MapPin, Target, CheckCircle, Trophy, Loader2, Shield, Flame, Zap, Star, Eye, Sparkles, Medal, Crown } from "lucide-react";

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

export default function PerfilPublico() {
  const { username } = useParams<{ username: string }>();
  const cleanUsername = username?.replace('@', '') || '';

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['public-profile', cleanUsername],
    queryFn: async () => {
      if (!cleanUsername) return null;

      const { data: pubProfile, error: pubErr } = await supabase
        .from('user_public_profiles')
        .select('*')
        .eq('nickname_normalized', cleanUsername.toLowerCase())
        .single();

      if (pubErr || !pubProfile) throw new Error('Perfil não encontrado');

      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('public_profile, favorite_team_id')
        .eq('user_id', pubProfile.user_id)
        .single();

      if (!prefs?.public_profile) throw new Error('Perfil privado');

      const { data: basicProfile } = await supabase
        .from('profiles')
        .select('nome, country, state, city')
        .eq('user_id', pubProfile.user_id)
        .single();

      const { data: stats } = await supabase
        .from('user_gamification_stats')
        .select('*')
        .eq('user_id', pubProfile.user_id)
        .single();

      const { data: xpData } = await supabase
        .from('user_xp')
        .select('*')
        .eq('user_id', pubProfile.user_id)
        .single();

      const { data: userBadges } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .eq('user_id', pubProfile.user_id)
        .order('earned_at', { ascending: false });

      let favoriteTeam = null;
      if (prefs?.favorite_team_id) {
        const { data: team } = await supabase
          .from('times')
          .select('nome, slug')
          .eq('id', prefs.favorite_team_id)
          .single();
        favoriteTeam = team;
      }

      return {
        ...pubProfile,
        nome: basicProfile?.nome,
        country: (basicProfile as any)?.country,
        city: (basicProfile as any)?.city,
        state: (basicProfile as any)?.state,
        stats,
        xp: xpData,
        badges: userBadges || [],
        favoriteTeam,
      };
    },
    enabled: !!cleanUsername,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Perfil não encontrado</h1>
          <p className="text-muted-foreground">Este perfil não existe ou é privado.</p>
        </div>
      </Layout>
    );
  }

  const accuracy = profile.stats?.total_palpites
    ? Math.round((profile.stats.total_acertos / profile.stats.total_palpites) * 100)
    : 0;

  const xp = profile.xp || { total_xp: 0, level: 1, current_streak_days: 0, best_streak_days: 0 };
  const progress = xpProgress(xp.total_xp, xp.level);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-8 pb-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                {profile.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.nickname || 'User'} />
                ) : null}
                <AvatarFallback className="text-2xl">
                  {(profile.nickname || profile.nome || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <h1 className="text-2xl font-bold">{profile.nome || profile.nickname}</h1>
              {profile.nickname && (
                <p className="text-muted-foreground">@{profile.nickname}</p>
              )}

              {/* Level badge */}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="gap-1">
                  <Zap className="w-3 h-3" /> Nv. {xp.level}
                </Badge>
                <Badge variant="secondary">{xp.total_xp} XP</Badge>
              </div>

              {/* XP progress bar */}
              <div className="w-full max-w-xs mt-3">
                <Progress value={progress.percent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{progress.current}/{progress.needed} para Nv. {xp.level + 1}</p>
              </div>

              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-3 max-w-md">{profile.bio}</p>
              )}

              <div className="flex items-center gap-4 mt-4 flex-wrap justify-center">
                {(profile.city || profile.state || profile.country) && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}
                  </div>
                )}
                {profile.favoriteTeam && (
                  <Badge variant="secondary" className="gap-1">
                    {profile.favoriteTeam.nome}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Target className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{profile.stats?.total_palpites || 0}</p>
              <p className="text-xs text-muted-foreground">Palpites</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <CheckCircle className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{profile.stats?.total_acertos || 0}</p>
              <p className="text-xs text-muted-foreground">Acertos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Trophy className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{accuracy}%</p>
              <p className="text-xs text-muted-foreground">Precisão</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Flame className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{xp.current_streak_days}</p>
              <p className="text-xs text-muted-foreground">Streak Atual</p>
            </CardContent>
          </Card>
        </div>

        {/* Badges */}
        {profile.badges && profile.badges.length > 0 && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5" /> Conquistas ({profile.badges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.badges.map((ub: any) => {
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
    </Layout>
  );
}
