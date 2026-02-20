import { useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Target, CheckCircle, Trophy, Loader2, Shield } from "lucide-react";

export default function PerfilPublico() {
  const { username } = useParams<{ username: string }>();
  const cleanUsername = username?.replace('@', '') || '';

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['public-profile', cleanUsername],
    queryFn: async () => {
      if (!cleanUsername) return null;

      // Find public profile by nickname
      const { data: pubProfile, error: pubErr } = await supabase
        .from('user_public_profiles')
        .select('*')
        .eq('nickname_normalized', cleanUsername.toLowerCase())
        .single();

      if (pubErr || !pubProfile) throw new Error('Perfil não encontrado');

      // Check if public
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('public_profile, favorite_team_id')
        .eq('user_id', pubProfile.user_id)
        .single();

      if (!prefs?.public_profile) throw new Error('Perfil privado');

      // Get basic profile info
      const { data: basicProfile } = await supabase
        .from('profiles')
        .select('nome, country, state, city')
        .eq('user_id', pubProfile.user_id)
        .single();

      // Get gamification stats
      const { data: stats } = await supabase
        .from('user_gamification_stats')
        .select('*')
        .eq('user_id', pubProfile.user_id)
        .single();

      // Get favorite team
      let favoriteTeam = null;
      if (prefs?.favorite_team_id) {
        const { data: team } = await supabase
          .from('times')
          .select('nome, escudo_url, slug')
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
                    {profile.favoriteTeam.escudo_url && (
                      <img src={profile.favoriteTeam.escudo_url} alt="" className="w-4 h-4" />
                    )}
                    {profile.favoriteTeam.nome}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {profile.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <Target className="w-5 h-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{profile.stats.total_palpites}</p>
                <p className="text-xs text-muted-foreground">Palpites</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <CheckCircle className="w-5 h-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{profile.stats.total_acertos}</p>
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
                <Target className="w-5 h-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{profile.stats.maior_sequencia}</p>
                <p className="text-xs text-muted-foreground">Maior Sequência</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
