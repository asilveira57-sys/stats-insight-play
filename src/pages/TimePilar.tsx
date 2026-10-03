import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useTeamBySlug, useTeamRelatedNews, useTeamCurriculum, TeamTitle } from "@/hooks/useTeamPillar";
import { TeamPillarSEO } from "@/components/team/TeamPillarSEO";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { AdSlot } from "@/components/ads/AdSlot";
import { PremiumCTA } from "@/components/news/PremiumCTA";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Loader2, Home, ChevronRight, TrendingUp, Target, AlertTriangle,
  Calendar, MapPin, Trophy, Users, ArrowRight, Newspaper, Award, Building2
} from "lucide-react";

function FormaBadge({ resultado }: { resultado: string }) {
  const colors = {
    V: "bg-green-500/20 text-green-400 border-green-500/30",
    E: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    D: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold border ${colors[resultado as keyof typeof colors] || ""}`}>
      {resultado}
    </span>
  );
}

function StatBox({ label, value, sublabel }: { label: string; value: string | number; sublabel?: string }) {
  return (
    <div className="text-center p-4 bg-muted/30 rounded-lg">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {sublabel && <div className="text-xs text-muted-foreground/70">{sublabel}</div>}
    </div>
  );
}

const TIER_LABEL: Record<TeamTitle["competition_tier"], string> = {
  mundial: "Mundial",
  continental: "Continental",
  nacional: "Nacional",
  regional: "Regional",
  estadual: "Estadual",
  amistoso: "Amistoso",
  outro: "Outro",
};
const TIER_ORDER: TeamTitle["competition_tier"][] = [
  "mundial", "continental", "nacional", "regional", "estadual", "outro", "amistoso",
];

// Normaliza nome do time conforme convenção (remove sufixos "- UF")
function cleanTeamName(nome: string): string {
  return nome.replace(/\s*-\s*[A-Z]{2}\s*$/, "").trim();
}

export default function TimePilar() {
  const { slug } = useParams<{ slug: string }>();
  const { data: result, isLoading, isError, refetch, isFetching } = useTeamBySlug(slug || null);

  const team = result?.status === "found" ? result.team : null;
  const { data: relatedNews } = useTeamRelatedNews(team?.nome || null);
  const { data: curriculum } = useTeamCurriculum(team?.id || null);

  const titlesByTier = useMemo(() => {
    const groups: Record<string, TeamTitle[]> = {};
    (curriculum?.titles || []).forEach((t) => {
      if (t.position?.toLowerCase().includes("camp")) {
        (groups[t.competition_tier] ||= []).push(t);
      }
    });
    return groups;
  }, [curriculum]);

  const titlesTotal = Object.values(titlesByTier).reduce((s, arr) => s + arr.length, 0);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Erro de rede (não "0 linhas") — oferecer retry, NÃO mostrar "não encontrado"
  if (isError || result?.status === "error") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h1 className="text-2xl font-display font-bold mb-2">Erro ao carregar este time</h1>
          <p className="text-muted-foreground mb-6">
            Tivemos um problema temporário ao buscar as informações. Tente novamente em instantes.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Tentar novamente
            </Button>
            <Button asChild variant="outline">
              <Link to="/times">Voltar para Times</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!team || result?.status === "not_found") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h1 className="text-2xl font-display font-bold mb-2">Time não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            O time que você está procurando não existe ou foi removido.
          </p>
          <Button asChild>
            <Link to="/times">Ver todos os times</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const displayName = cleanTeamName(team.nome);
  const pageUrl = `${window.location.origin}/times/${slug}`;
  const { stats } = team;
  const profile = curriculum?.profile;

  return (
    <Layout>
      <TeamPillarSEO
        teamName={displayName}
        leagueName={team.liga?.nome}
        url={pageUrl}
      />

      <article className="min-h-screen">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 py-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="flex items-center gap-1">
                    <Home className="w-3.5 h-3.5" />
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator><ChevronRight className="w-4 h-4" /></BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/times">Times</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator><ChevronRight className="w-4 h-4" /></BreadcrumbSeparator>
              <BreadcrumbItem><BreadcrumbPage>{displayName}</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Hero */}
        <section className="py-12 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <TeamBadge
                name={displayName}
                primaryColor={team.cores?.primary}
                secondaryColor={team.cores?.secondary}
                size="xl"
              />
              <div className="text-center md:text-left flex-1">
                <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">{displayName}</h1>
                {profile?.nickname && (
                  <p className="text-lg text-primary mb-2 italic">"{profile.nickname}"</p>
                )}
                {team.liga && (
                  <p className="text-lg text-muted-foreground mb-4">
                    Análise estatística completa na {team.liga.nome}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                  {team.pais && (
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{team.pais}</span>
                  )}
                  {profile?.founded_year && (
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Fundado em {profile.founded_year}</span>
                  )}
                  {profile?.stadium_name && (
                    <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{profile.stadium_name}{profile.stadium_capacity ? ` (${profile.stadium_capacity.toLocaleString("pt-BR")} lugares)` : ""}</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StatBox label="Jogos" value={stats.jogos} />
                <StatBox label="Aproveitamento" value={`${stats.aproveitamento}%`} />
                <StatBox label="Vitórias" value={stats.vitorias} />
                <StatBox label="Saldo de Gols" value={stats.golsMarcados - stats.golsSofridos} />
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">

            {/* Currículo / Títulos */}
            <section className="mb-12">
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-primary" />
                Currículo do {displayName}
                {titlesTotal > 0 && (
                  <Badge variant="secondary" className="ml-2">{titlesTotal} {titlesTotal === 1 ? "título" : "títulos"}</Badge>
                )}
              </h2>

              {titlesTotal > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {TIER_ORDER.filter((tier) => titlesByTier[tier]?.length).map((tier) => {
                    const items = titlesByTier[tier];
                    return (
                      <Card key={tier}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span>{TIER_LABEL[tier]}</span>
                            <Badge>{items.length}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2 text-sm">
                            {items.slice(0, 6).map((t) => (
                              <li key={t.id} className="flex items-start justify-between gap-2">
                                <span className="text-foreground">{t.competition_name}</span>
                                {t.edition_year && (
                                  <span className="text-muted-foreground tabular-nums">{t.edition_year}</span>
                                )}
                              </li>
                            ))}
                            {items.length > 6 && (
                              <li className="text-xs text-muted-foreground pt-1">+ {items.length - 6} edições</li>
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    <Trophy className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    Currículo em construção. Em breve listaremos aqui os títulos estaduais,
                    nacionais, continentais e mundiais conquistados pelo {displayName}.
                  </CardContent>
                </Card>
              )}

              {(curriculum?.participations?.length || 0) > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                    Participações em campeonatos
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {curriculum!.participations.map((p) => (
                      <Badge key={p.id} variant="outline" className="text-xs">
                        {p.competition_name}
                        {p.total_editions ? ` · ${p.total_editions}×` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <AdSlot position="article-intro" className="my-8" />

            {/* Visão Geral */}
            <section className="mb-12">
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                Visão Geral
              </h2>
              <div className="prose prose-lg prose-invert max-w-none">
                {team.pillar_content?.visao_geral ? (
                  <div dangerouslySetInnerHTML={{ __html: team.pillar_content.visao_geral }} />
                ) : (
                  <p className="text-muted-foreground">
                    O {displayName} é um dos clubes que disputam {team.liga?.nome ? `a ${team.liga.nome}` : "competições de futebol"}.
                    Acompanhe abaixo uma análise estatística detalhada do desempenho recente da equipe.
                  </p>
                )}
              </div>
            </section>

            {/* Estilo de Jogo */}
            <section className="mb-12">
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                Estilo de Jogo
              </h2>
              <div className="prose prose-lg prose-invert max-w-none">
                {team.pillar_content?.estilo_jogo ? (
                  <div dangerouslySetInnerHTML={{ __html: team.pillar_content.estilo_jogo }} />
                ) : (
                  <>
                    <p className="text-muted-foreground mb-4">
                      Perfil
                      {stats.golsMarcados > stats.golsSofridos ? " ofensivo" : stats.golsMarcados < stats.golsSofridos ? " defensivo" : " equilibrado"}
                      , com média de {(stats.golsMarcados / Math.max(1, stats.jogos)).toFixed(2)} gols marcados por partida.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 not-prose">
                      <Card><CardContent className="pt-4"><div className="text-center">
                        <div className="text-3xl font-bold text-green-400">{stats.vitoriasCasa}</div>
                        <div className="text-sm text-muted-foreground">Vitórias em casa ({stats.jogosCasa} jogos)</div>
                      </div></CardContent></Card>
                      <Card><CardContent className="pt-4"><div className="text-center">
                        <div className="text-3xl font-bold text-blue-400">{stats.vitoriasFora}</div>
                        <div className="text-sm text-muted-foreground">Vitórias fora ({stats.jogosFora} jogos)</div>
                      </div></CardContent></Card>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Desempenho */}
            <section className="mb-12">
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-primary" />
                Desempenho na Temporada Atual
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatBox label="Vitórias" value={stats.vitorias} sublabel={`${Math.round(stats.vitorias / Math.max(1, stats.jogos) * 100)}%`} />
                <StatBox label="Empates" value={stats.empates} sublabel={`${Math.round(stats.empates / Math.max(1, stats.jogos) * 100)}%`} />
                <StatBox label="Derrotas" value={stats.derrotas} sublabel={`${Math.round(stats.derrotas / Math.max(1, stats.jogos) * 100)}%`} />
                <StatBox label="Gols" value={`${stats.golsMarcados}:${stats.golsSofridos}`} sublabel="Marcados : Sofridos" />
              </div>
              <Card className="mb-6">
                <CardHeader><CardTitle className="text-lg">Forma Recente (Últimos 5 jogos)</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {stats.forma.map((r, i) => <FormaBadge key={i} resultado={r} />)}
                    {stats.forma.length === 0 && <span className="text-muted-foreground">Sem jogos recentes</span>}
                  </div>
                </CardContent>
              </Card>
            </section>

            <PremiumCTA variant="inline" />

            {/* Próximos Jogos */}
            {team.upcomingMatches.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-primary" />
                  Próximos Jogos
                </h2>
                <div className="space-y-3">
                  {team.upcomingMatches.map((m) => (
                    <Card key={m.id}><CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={m.local === "casa" ? "default" : "secondary"}>{m.local === "casa" ? "Casa" : "Fora"}</Badge>
                        <span className="font-medium">{cleanTeamName(m.adversario)}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{new Date(m.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                    </CardContent></Card>
                  ))}
                </div>
              </section>
            )}

            {/* Resultados */}
            <section className="mb-12">
              <h2 className="text-2xl font-display font-bold mb-4">Resultados Recentes</h2>
              <div className="space-y-2">
                {team.recentMatches.slice(0, 5).map((m) => (
                  <Card key={m.id}><CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FormaBadge resultado={m.resultado} />
                      <Badge variant={m.local === "casa" ? "outline" : "secondary"} className="text-xs">{m.local === "casa" ? "C" : "F"}</Badge>
                      <span>{cleanTeamName(m.adversario)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold">{m.placar}</span>
                      <span className="text-sm text-muted-foreground">{new Date(m.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            </section>

            {/* História / Estádio / Rivalidades */}
            {(profile?.history_text || profile?.stadium_text || profile?.rivalries_text || profile?.legacy_text) && (
              <section className="mb-12 space-y-8">
                {profile.history_text && (
                  <div>
                    <h2 className="text-2xl font-display font-bold mb-3">História</h2>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{profile.history_text}</p>
                  </div>
                )}
                {profile.stadium_text && (
                  <div>
                    <h2 className="text-2xl font-display font-bold mb-3">Estádio</h2>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{profile.stadium_text}</p>
                  </div>
                )}
                {profile.rivalries_text && (
                  <div>
                    <h2 className="text-2xl font-display font-bold mb-3">Rivalidades</h2>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{profile.rivalries_text}</p>
                  </div>
                )}
                {profile.legacy_text && (
                  <div>
                    <h2 className="text-2xl font-display font-bold mb-3">Legado</h2>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{profile.legacy_text}</p>
                  </div>
                )}
              </section>
            )}

            <AdSlot position="article-end" className="my-8" />

            {/* Notícias */}
            <section className="mb-12">
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                <Newspaper className="w-6 h-6 text-primary" />
                Análises do {displayName}
              </h2>
              {relatedNews && relatedNews.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {relatedNews.slice(0, 10).map((news) => (
                      <Link key={news.id} to={`/noticias/${news.slug}`}
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                        {news.imagem_url && (
                          <img src={news.imagem_url} alt="" className="w-20 h-14 object-cover rounded" />
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium group-hover:text-primary transition-colors line-clamp-2">{news.titulo}</h3>
                          <span className="text-xs text-muted-foreground">
                            {news.data_publicacao && new Date(news.data_publicacao).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    ))}
                  </div>
                  {relatedNews.length > 10 && (
                    <div className="mt-4">
                      <Button variant="default" asChild>
                        <Link to={`/times/${slug}/analises`}>
                          Ver todas as análises do {displayName}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Ainda não há análises publicadas sobre o {displayName}.
                </p>
              )}
            </section>

            <PremiumCTA variant="footer" />

            <div className="mt-8 p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
              <p>
                <strong>Aviso:</strong> O Aleball é uma plataforma de análise estatística de futebol.
                Este conteúdo tem caráter informativo e não constitui recomendação de apostas.
              </p>
            </div>
          </div>
        </div>
      </article>
    </Layout>
  );
}
