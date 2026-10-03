import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { StatCard } from "@/components/cards/StatCard";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { LeagueLogo } from "@/components/ui/LeagueLogo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeamSeoStats, useTeamSeoContent } from "@/hooks/useTeamSeoStats";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Target, Shield, Activity, Home, Plane, TrendingUp, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const formColors: Record<string, string> = {
  V: "bg-emerald-500 text-white",
  E: "bg-amber-500 text-white",
  D: "bg-rose-500 text-white",
};

type ViewVariation = "geral" | "gols" | "mandante" | "visitante";

const VARIATION_META: Record<ViewVariation, { title: (t: string, s: number, l?: string) => string; desc: (t: string, s: number) => string }> = {
  geral: {
    title: (t, s, l) => `Estatísticas do ${t} ${s}${l ? ` – ${l}` : ""} | Aleball`,
    desc: (t, s) => `Estatísticas completas do ${t} na temporada ${s}: gols, médias, aproveitamento e desempenho.`,
  },
  gols: {
    title: (t, s) => `${t} ${s}: Gols Marcados, Sofridos e Médias | Aleball`,
    desc: (t, s) => `Análise de gols do ${t} em ${s}: marcados, sofridos, médias por jogo, Over 2.5 e BTTS.`,
  },
  mandante: {
    title: (t, s) => `${t} como Mandante ${s}: Desempenho em Casa | Aleball`,
    desc: (t, s) => `Estatísticas do ${t} como mandante em ${s}: vitórias em casa, gols e aproveitamento.`,
  },
  visitante: {
    title: (t, s) => `${t} como Visitante ${s}: Desempenho Fora de Casa | Aleball`,
    desc: (t, s) => `Estatísticas do ${t} como visitante em ${s}: vitórias fora, gols marcados e aproveitamento.`,
  },
};

export default function EstatisticasTeam() {
  const { liga, time, ano, view } = useParams<{ liga: string; time: string; ano?: string; view?: string }>();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);

  const variation: ViewVariation = (["gols", "mandante", "visitante"].includes(view || "")
    ? (view as ViewVariation)
    : "geral");

  const seasonParam = ano ? parseInt(ano, 10) : null;
  const { data, isLoading } = useTeamSeoStats(time ?? null, liga ?? null, seasonParam);
  const { data: seoContent, refetch: refetchContent } = useTeamSeoContent(
    data?.team.id ?? null,
    data?.league?.id ?? null,
    data?.season ?? null,
  );

  // Auto-generate AI content if missing and we have data
  useEffect(() => {
    if (!data || seoContent || generating) return;
    if (data.stats.jogos === 0) return;
    setGenerating(true);
    supabase.functions
      .invoke("generate-team-seo", {
        body: {
          team_id: data.team.id,
          league_id: data.league?.id ?? null,
          season: data.season,
          team_name: data.team.nome,
          league_name: data.league?.nome ?? null,
          stats: {
            jogos: data.stats.jogos,
            vitorias: data.stats.vitorias,
            empates: data.stats.empates,
            derrotas: data.stats.derrotas,
            golsMarcados: data.stats.golsMarcados,
            golsSofridos: data.stats.golsSofridos,
            mediaGolsMarcados: data.stats.mediaGolsMarcados,
            mediaGolsSofridos: data.stats.mediaGolsSofridos,
            saldo: data.stats.saldo,
            aproveitamento: data.stats.aproveitamento,
            over25: data.stats.over25,
            btts: data.stats.btts,
            cleanSheets: data.stats.cleanSheets,
            semMarcar: data.stats.semMarcar,
            casaJogos: data.stats.casaJogos,
            casaVitorias: data.stats.casaVitorias,
            foraJogos: data.stats.foraJogos,
            foraVitorias: data.stats.foraVitorias,
            forma: data.stats.forma,
          },
        },
      })
      .then((res) => {
        if (res.error) {
          // 402 (sem créditos) / 429 (rate limit) — segue com fallback estático, sem quebrar a página
          console.warn("generate-team-seo indisponível:", res.error.message);
          return;
        }
        return refetchContent();
      })
      .catch((err) => {
        console.warn("generate-team-seo falhou:", err);
      })
      .finally(() => setGenerating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.team.id, data?.season, data?.league?.id, seoContent]);

  // SEO meta
  const title = useMemo(() => {
    if (!data) return "Estatísticas | Aleball";
    const fallback = VARIATION_META[variation].title(data.team.nome, data.season, data.league?.nome);
    return variation === "geral" ? (seoContent?.meta_title || fallback) : fallback;
  }, [data, seoContent, variation]);

  const description = useMemo(() => {
    if (!data) return "Estatísticas detalhadas de futebol.";
    const fallback = VARIATION_META[variation].desc(data.team.nome, data.season);
    return variation === "geral" ? (seoContent?.meta_description || fallback) : fallback;
  }, [data, seoContent, variation]);

  useEffect(() => {
    document.title = title;
    const setMeta = (n: string, c: string, prop = false) => {
      const sel = prop ? `meta[property="${n}"]` : `meta[name="${n}"]`;
      let el = document.querySelector(sel) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        prop ? el.setAttribute("property", n) : el.setAttribute("name", n);
        document.head.appendChild(el);
      }
      el.content = c;
    };
    setMeta("description", description);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:type", "website", true);

    // canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}${window.location.pathname}`;

    // JSON-LD
    const old = document.querySelector("script[data-team-stats-jsonld]");
    if (old) old.remove();
    if (data) {
      const ld = {
        "@context": "https://schema.org",
        "@type": "SportsTeam",
        name: data.team.nome,
        sport: "Football",
        url: window.location.href,
        description,
      };
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.setAttribute("data-team-stats-jsonld", "true");
      s.textContent = JSON.stringify(ld);
      document.head.appendChild(s);
    }
  }, [title, description, data]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-32" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-2">Time não encontrado</h1>
          <Link to="/estatisticas" className="text-primary underline">
            Voltar às estatísticas
          </Link>
        </div>
      </Layout>
    );
  }

  const { team, league, stats, season, availableSeasons, availableLeagues } = data;
  const c = seoContent?.content as any | undefined;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground flex items-center flex-wrap gap-1">
          <Link to="/estatisticas" className="hover:text-foreground">Estatísticas</Link>
          {league && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link to={`/estatisticas/${league.slug}`} className="hover:text-foreground">{league.nome}</Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{team.nome}</span>
        </nav>

        {/* Hero */}
        <Card className="overflow-hidden">
          <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-center md:items-start">
            <TeamBadge name={team.nome} primaryColor={team.cores?.primary} secondaryColor={team.cores?.secondary} size="xl" />
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold">
                Estatísticas do {team.nome} {season}
              </h1>
              {league && (
                <p className="text-muted-foreground mt-1 flex items-center justify-center md:justify-start gap-2">
                  <LeagueLogo name={league.nome} size="sm" logoUrl={null} /> {league.nome}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <Badge variant="secondary">{stats.jogos} jogos</Badge>
                <Badge className="bg-emerald-500/20 text-emerald-500">{stats.vitorias}V</Badge>
                <Badge className="bg-amber-500/20 text-amber-500">{stats.empates}E</Badge>
                <Badge className="bg-rose-500/20 text-rose-500">{stats.derrotas}D</Badge>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <Select
                value={String(season)}
                onValueChange={(v) =>
                  navigate(
                    league
                      ? `/estatisticas/${league.slug}/${team.slug}/${v}`
                      : `/estatisticas/_/${team.slug}/${v}`,
                  )
                }
              >
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Temporada" />
                </SelectTrigger>
                <SelectContent>
                  {availableSeasons.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      Temporada {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableLeagues.length > 1 && (
                <Select
                  value={league?.slug ?? "_"}
                  onValueChange={(v) =>
                    navigate(`/estatisticas/${v}/${team.slug}/${season}`)
                  }
                >
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Liga" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLeagues.map((l) => (
                      <SelectItem key={l.id} value={l.slug}>
                        {l.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Variation tabs */}
        {league && (
          <div className="flex flex-wrap gap-2">
            {([
              { key: "geral", label: "Geral" },
              { key: "gols", label: "Gols" },
              { key: "mandante", label: "Mandante" },
              { key: "visitante", label: "Visitante" },
            ] as { key: ViewVariation; label: string }[]).map((v) => {
              const path = v.key === "geral"
                ? `/estatisticas/${league.slug}/${team.slug}/${season}`
                : `/estatisticas/${league.slug}/${team.slug}/${season}/${v.key}`;
              const active = v.key === variation;
              return (
                <Link
                  key={v.key}
                  to={path}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/70 text-muted-foreground",
                  )}
                >
                  {v.label}
                </Link>
              );
            })}
          </div>
        )}

        {stats.jogos === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Sem partidas finalizadas para {team.nome}{league ? ` no ${league.nome}` : ""} em {season}.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Cards principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Jogos" value={String(stats.jogos)} icon={Activity} />
              <StatCard label="Gols Marcados" value={String(stats.golsMarcados)} icon={Target} />
              <StatCard label="Gols Sofridos" value={String(stats.golsSofridos)} icon={Shield} />
              <StatCard label="Saldo" value={(stats.saldo > 0 ? "+" : "") + stats.saldo} icon={TrendingUp} />
              <StatCard label="Aproveitamento" value={`${stats.aproveitamento}%`} icon={Trophy} />
              <StatCard label="Média Marcados" value={stats.mediaGolsMarcados.toFixed(2)} icon={Target} />
              <StatCard label="Média Sofridos" value={stats.mediaGolsSofridos.toFixed(2)} icon={Shield} />
              <StatCard label="Clean Sheets" value={String(stats.cleanSheets)} icon={Shield} />
            </div>

            {/* Desempenho geral */}
            <Card>
              <CardHeader>
                <CardTitle>Desempenho Geral</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none text-muted-foreground">
                <p>
                  {c?.desempenho_geral ||
                    `O ${team.nome} disputou ${stats.jogos} partidas${league ? ` no ${league.nome}` : ""} na temporada ${season}, com ${stats.vitorias} vitórias, ${stats.empates} empates e ${stats.derrotas} derrotas, totalizando ${stats.aproveitamento}% de aproveitamento.`}
                </p>
              </CardContent>
            </Card>

            {/* Gols e média */}
            <Card>
              <CardHeader>
                <CardTitle>Gols e Média por Jogo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-muted-foreground">
                <p>
                  {c?.gols_e_media ||
                    `Foram ${stats.golsMarcados} gols marcados (média de ${stats.mediaGolsMarcados.toFixed(2)} por jogo) e ${stats.golsSofridos} gols sofridos (${stats.mediaGolsSofridos.toFixed(2)} por jogo).`}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-foreground">{stats.mediaGolsMarcados.toFixed(2)}</div>
                    <div className="text-xs">Marcados/jogo</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-foreground">{stats.mediaGolsSofridos.toFixed(2)}</div>
                    <div className="text-xs">Sofridos/jogo</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-foreground">
                      {((stats.golsMarcados + stats.golsSofridos) / Math.max(1, stats.jogos)).toFixed(2)}
                    </div>
                    <div className="text-xs">Total/jogo</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avançadas */}
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas Avançadas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-muted-foreground">
                <p>
                  {c?.estatisticas_avancadas ||
                    `${stats.over25}% dos jogos terminaram com mais de 2.5 gols, ${stats.btts}% tiveram ambas equipes marcando e o ${team.nome} fechou ${stats.cleanSheets} jogos sem sofrer gols.`}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-foreground">{stats.over25}%</div>
                    <div className="text-xs">Over 2.5</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-foreground">{stats.btts}%</div>
                    <div className="text-xs">Ambas marcam</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-foreground">{stats.cleanSheets}</div>
                    <div className="text-xs">Clean sheets</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-foreground">{stats.semMarcar}</div>
                    <div className="text-xs">Sem marcar</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Casa / Fora */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Home className="h-5 w-5" /> Em Casa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-muted-foreground">
                  <p>{c?.casa || `Como mandante, o ${team.nome} venceu ${stats.casaVitorias} de ${stats.casaJogos} partidas.`}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><div className="text-xl font-bold text-foreground">{stats.casaJogos}</div><div className="text-xs">Jogos</div></div>
                    <div><div className="text-xl font-bold text-emerald-500">{stats.casaVitorias}</div><div className="text-xs">Vitórias</div></div>
                    <div><div className="text-xl font-bold text-foreground">{stats.casaGolsMarcados}-{stats.casaGolsSofridos}</div><div className="text-xs">Gols</div></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Plane className="h-5 w-5" /> Fora de Casa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-muted-foreground">
                  <p>{c?.fora || `Como visitante, o ${team.nome} venceu ${stats.foraVitorias} de ${stats.foraJogos} partidas.`}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><div className="text-xl font-bold text-foreground">{stats.foraJogos}</div><div className="text-xs">Jogos</div></div>
                    <div><div className="text-xl font-bold text-emerald-500">{stats.foraVitorias}</div><div className="text-xs">Vitórias</div></div>
                    <div><div className="text-xl font-bold text-foreground">{stats.foraGolsMarcados}-{stats.foraGolsSofridos}</div><div className="text-xs">Gols</div></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Últimos jogos */}
            <Card>
              <CardHeader>
                <CardTitle>Últimos Jogos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1 mb-4">
                  {stats.forma.map((r, i) => (
                    <span key={i} className={cn("w-8 h-8 rounded flex items-center justify-center text-sm font-bold", formColors[r])}>{r}</span>
                  ))}
                </div>
                <p className="text-muted-foreground mb-3">
                  {c?.forma_recente || `Últimos resultados do ${team.nome}: ${stats.forma.join(", ")}.`}
                </p>
                <div className="space-y-2">
                  {stats.ultimosJogos.map((j) => (
                    <div key={j.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <span className="text-sm text-muted-foreground">{new Date(j.data).toLocaleDateString("pt-BR")}</span>
                      <span className="text-sm">{j.local === "casa" ? "vs" : "@"} {j.adversario}</span>
                      <span className="text-sm font-mono">{j.placar}</span>
                      <span className={cn("w-7 h-7 rounded text-xs font-bold flex items-center justify-center", formColors[j.resultado])}>{j.resultado}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Internal links */}
            <Card>
              <CardHeader>
                <CardTitle>Veja também</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Link to={`/times/${team.slug}`}>
                  <Button variant="outline" size="sm">Perfil do {team.nome}</Button>
                </Link>
                <Link to={`/times/${team.slug}/analises`}>
                  <Button variant="outline" size="sm">Análises do {team.nome}</Button>
                </Link>
                {league && (
                  <Link to={`/estatisticas/${league.slug}`}>
                    <Button variant="outline" size="sm">Outros times do {league.nome}</Button>
                  </Link>
                )}
                {availableSeasons.filter((s) => s !== season).slice(0, 4).map((s) => (
                  <Link key={s} to={league ? `/estatisticas/${league.slug}/${team.slug}/${s}` : `/estatisticas/_/${team.slug}/${s}`}>
                    <Button variant="ghost" size="sm">Temporada {s}</Button>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {generating && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-3 w-3 animate-pulse" /> Gerando descrição SEO com IA...
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
