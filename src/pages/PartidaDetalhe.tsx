import { useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Loader2, CalendarDays, Trophy, Goal as GoalIcon, Square, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartidaOdds } from "@/hooks/usePartidaOdds";
import { PartidaOddsBlock } from "@/components/odds/PartidaOddsBlock";


const BASE = "https://www.statball.com.br";

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d + "T12:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
  } catch { return d; }
}

export default function PartidaDetalhe() {
  const { slug } = useParams<{ slug: string }>();

  const { data: partida, isLoading } = useQuery({
    enabled: !!slug,
    queryKey: ["partida-detail", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("partidas")
        .select(`
          id, slug, data, hora, rodada, status, gols_casa, gols_fora,
          liga:ligas(id, nome, slug, logo_url),
          casa:times!partidas_time_casa_id_fkey(id, nome, slug, cores),
          fora:times!partidas_time_fora_id_fkey(id, nome, slug, cores)
        `)
        .eq("slug", slug!)
        .maybeSingle();
      return data as any;
    },
  });

  const { data: gols } = useQuery({
    enabled: !!partida?.id,
    queryKey: ["partida-gols", partida?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("gols_partida")
        .select("id, minuto, acrescimo, tipo, jogador_nome, assistente_nome, time_id, placar_casa, placar_fora")
        .eq("partida_id", partida!.id)
        .order("minuto", { ascending: true });
      return data ?? [];
    },
  });

  const { data: cartoes } = useQuery({
    enabled: !!partida?.id,
    queryKey: ["partida-cartoes", partida?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("cartoes_partida")
        .select("id, minuto, tipo, jogador_nome, time_id")
        .eq("partida_id", partida!.id)
        .order("minuto", { ascending: true });
      return data ?? [];
    },
  });

  const { data: odds } = usePartidaOdds(partida?.id);



  const title = useMemo(() => {
    if (!partida) return "Partida";
    const casa = partida.casa?.nome ?? "?";
    const fora = partida.fora?.nome ?? "?";
    const gc = partida.gols_casa ?? "-";
    const gf = partida.gols_fora ?? "-";
    return `${casa} ${gc}x${gf} ${fora}`;
  }, [partida]);

  const dateLabel = partida ? formatDate(partida.data) : "";
  const ligaName = partida?.liga?.nome;
  const metaTitle = partida ? `${title} — ${ligaName ?? ""} ${partida.data ? new Date(partida.data).getFullYear() : ""} | Statball` : "Partida | Statball";
  const metaDesc = partida
    ? `Resumo completo do jogo ${title} pelo ${ligaName ?? "campeonato"} em ${dateLabel}. Gols, cartões, minutos e ficha técnica oficial.`
    : "";
  const canonical = `${BASE}/partida/${slug}`;

  if (isLoading) {
    return (
      <Layout><div className="container mx-auto px-4 py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></Layout>
    );
  }
  if (!partida) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center space-y-3">
          <h1 className="text-2xl font-bold">Partida não encontrada</h1>
          <Link to="/resultados" className="text-primary hover:underline">Ver resultados</Link>
        </div>
      </Layout>
    );
  }

  const golsCasa = (gols ?? []).filter((g: any) => g.time_id === partida.casa?.id);
  const golsFora = (gols ?? []).filter((g: any) => g.time_id === partida.fora?.id);
  const cartoesCasa = (cartoes ?? []).filter((c: any) => c.time_id === partida.casa?.id);
  const cartoesFora = (cartoes ?? []).filter((c: any) => c.time_id === partida.fora?.id);

  const jsonLd: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      name: title,
      startDate: partida.data,
      sport: "Soccer",
      url: canonical,
      ...(ligaName ? { superEvent: { "@type": "SportsEvent", name: ligaName } } : {}),
      homeTeam: { "@type": "SportsTeam", name: partida.casa?.nome },
      awayTeam: { "@type": "SportsTeam", name: partida.fora?.nome },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${BASE}/` },
        { "@type": "ListItem", position: 2, name: "Resultados", item: `${BASE}/resultados` },
        { "@type": "ListItem", position: 3, name: title, item: canonical },
      ],
    },
  ];

  const GolItem = ({ g }: { g: any }) => (
    <li className="flex items-center gap-2 text-sm py-1">
      <Badge variant="outline" className="tabular-nums text-[10px] w-12 justify-center">{g.minuto}'{g.acrescimo ? `+${g.acrescimo}` : ""}</Badge>
      <GoalIcon className="h-4 w-4 text-primary shrink-0" />
      <span className="truncate"><strong>{g.jogador_nome}</strong>{g.assistente_nome ? <span className="text-muted-foreground"> (assist. {g.assistente_nome})</span> : null}{g.tipo && g.tipo !== "normal" ? <span className="text-muted-foreground"> · {g.tipo}</span> : null}</span>
    </li>
  );
  const CartaoItem = ({ c }: { c: any }) => (
    <li className="flex items-center gap-2 text-sm py-1">
      <Badge variant="outline" className="tabular-nums text-[10px] w-12 justify-center">{c.minuto}'</Badge>
      <Square className={`h-4 w-4 shrink-0 ${c.tipo === "vermelho" || c.tipo === "red" ? "text-red-500 fill-red-500" : "text-yellow-500 fill-yellow-500"}`} />
      <span className="truncate">{c.jogador_nome}</span>
    </li>
  );

  return (
    <Layout>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        {jsonLd.map((s, i) => <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>)}
      </Helmet>

      <article className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
          <Link to="/" className="hover:text-primary">Início</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/resultados" className="hover:text-primary">Resultados</Link>
          {partida.liga?.slug && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link to={`/campeonatos/${partida.liga.slug}`} className="hover:text-primary">{ligaName}</Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground/70">{title}</span>
        </nav>

        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight">
            {partida.casa?.slug ? <Link to={`/times/${partida.casa.slug}`} className="hover:underline">{partida.casa.nome}</Link> : partida.casa?.nome}
            <span className="mx-3 tabular-nums">{partida.gols_casa ?? "-"}<span className="text-muted-foreground">x</span>{partida.gols_fora ?? "-"}</span>
            {partida.fora?.slug ? <Link to={`/times/${partida.fora.slug}`} className="hover:underline">{partida.fora.nome}</Link> : partida.fora?.nome}
          </h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {dateLabel}{partida.hora ? ` · ${String(partida.hora).slice(0,5)}` : ""}</span>
            {ligaName && (
              <span className="inline-flex items-center gap-1"><Trophy className="h-3 w-3" /> {partida.liga?.slug ? <Link to={`/campeonatos/${partida.liga.slug}`} className="hover:text-primary">{ligaName}</Link> : ligaName}</span>
            )}
            {partida.rodada && <span>Rodada {partida.rodada}</span>}
            <Badge variant="outline" className="text-[10px] uppercase">{partida.status}</Badge>
          </div>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Ficha técnica completa do jogo entre <strong className="text-foreground/90">{partida.casa?.nome}</strong> e <strong className="text-foreground/90">{partida.fora?.nome}</strong>{ligaName ? <> pelo <strong className="text-foreground/90">{ligaName}</strong></> : null}, disputado em {dateLabel}. Veja abaixo o resumo do placar, os gols marcados, os cartões aplicados e as estatísticas oficiais — tudo extraído da base de dados Statball, sem invenções.
          </p>
        </header>

        <section aria-labelledby="resumo" className="space-y-3">
          <h2 id="resumo" className="text-xl font-display font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Resumo da partida</h2>
          <Card className="border-primary/30">
            <CardContent className="pt-6">
              <p className="text-base leading-relaxed">
                {partida.casa?.nome} {(partida.gols_casa ?? 0) > (partida.gols_fora ?? 0) ? "venceu" : (partida.gols_casa ?? 0) < (partida.gols_fora ?? 0) ? "perdeu para" : "empatou com"} {partida.fora?.nome} por <strong>{partida.gols_casa ?? 0} a {partida.gols_fora ?? 0}</strong>{ligaName ? <> em partida válida pelo <strong>{ligaName}</strong></> : null}{partida.rodada ? <>, na rodada {partida.rodada}</> : null}. Foram <strong>{(gols ?? []).length}</strong> gols marcados e <strong>{(cartoes ?? []).length}</strong> cartões registrados ao longo do jogo.
              </p>
            </CardContent>
          </Card>
        </section>
        {odds && (
          <section aria-labelledby="odds" className="space-y-3">
            <h2 id="odds" className="text-xl font-display font-semibold">Odds do jogo</h2>
            <PartidaOddsBlock odds={odds} homeName={partida.casa?.nome} awayName={partida.fora?.nome} />
          </section>
        )}

        <section aria-labelledby="gols" className="space-y-3">

          <h2 id="gols" className="text-xl font-display font-semibold flex items-center gap-2"><GoalIcon className="h-5 w-5 text-primary" /> Gols</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardContent className="pt-5">
              <h3 className="text-sm font-semibold mb-2">{partida.casa?.nome} ({partida.gols_casa ?? 0})</h3>
              {golsCasa.length === 0 ? <p className="text-xs text-muted-foreground">Sem gols registrados na base.</p> : <ul className="divide-y divide-border">{golsCasa.map((g: any) => <GolItem key={g.id} g={g} />)}</ul>}
            </CardContent></Card>
            <Card><CardContent className="pt-5">
              <h3 className="text-sm font-semibold mb-2">{partida.fora?.nome} ({partida.gols_fora ?? 0})</h3>
              {golsFora.length === 0 ? <p className="text-xs text-muted-foreground">Sem gols registrados na base.</p> : <ul className="divide-y divide-border">{golsFora.map((g: any) => <GolItem key={g.id} g={g} />)}</ul>}
            </CardContent></Card>
          </div>
        </section>

        <section aria-labelledby="cartoes" className="space-y-3">
          <h2 id="cartoes" className="text-xl font-display font-semibold flex items-center gap-2"><Square className="h-5 w-5 text-primary" /> Cartões</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardContent className="pt-5">
              <h3 className="text-sm font-semibold mb-2">{partida.casa?.nome}</h3>
              {cartoesCasa.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum cartão registrado.</p> : <ul className="divide-y divide-border">{cartoesCasa.map((c: any) => <CartaoItem key={c.id} c={c} />)}</ul>}
            </CardContent></Card>
            <Card><CardContent className="pt-5">
              <h3 className="text-sm font-semibold mb-2">{partida.fora?.nome}</h3>
              {cartoesFora.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum cartão registrado.</p> : <ul className="divide-y divide-border">{cartoesFora.map((c: any) => <CartaoItem key={c.id} c={c} />)}</ul>}
            </CardContent></Card>
          </div>
        </section>

        <section className="text-center py-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">Quer ver mais estatísticas?</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {partida.casa?.slug && <Link to={`/times/${partida.casa.slug}`} className="px-3 py-1.5 text-sm rounded-md border border-border hover:border-primary/50">{partida.casa.nome}</Link>}
            {partida.liga?.slug && <Link to={`/campeonatos/${partida.liga.slug}`} className="px-3 py-1.5 text-sm rounded-md border border-border hover:border-primary/50">{ligaName}</Link>}
            {partida.fora?.slug && <Link to={`/times/${partida.fora.slug}`} className="px-3 py-1.5 text-sm rounded-md border border-border hover:border-primary/50">{partida.fora.nome}</Link>}
          </div>
        </section>
      </article>
    </Layout>
  );
}
