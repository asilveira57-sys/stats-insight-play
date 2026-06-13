import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWC2026Match } from "@/hooks/useCopa2026";
import { TeamFlag } from "@/components/copa2026/TeamCard";
import { AIAnalysisBlock } from "@/components/copa2026/AIAnalysisBlock";
import { WC2026PalpiteButton } from "@/components/copa2026/WC2026PalpiteButton";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Newspaper, Radio } from "lucide-react";

export default function Copa2026JogoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useWC2026Match(id);

  // Auto-refresh every 30s for live matches
  const isLive = data?.match?.status === "live";
  const { data: liveData } = useQuery({
    enabled: isLive,
    queryKey: ["wc2026", "match-live", id],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data: m } = await supabase.from("world_cup_2026_matches")
        .select("status, home_score, away_score").eq("id", id!).maybeSingle();
      return m;
    },
  });

  const { data: relatedNews } = useQuery({
    enabled: !!id,
    queryKey: ["wc2026", "match-news", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("noticias")
        .select("id, titulo, slug, resumo, data_publicacao, imagem_url")
        .eq("world_cup_2026_match_id", id!)
        .eq("publicada", true)
        .order("data_publicacao", { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) return <Layout><div className="container mx-auto px-4 py-8">Carregando...</div></Layout>;
  if (!data) return <Layout><div className="container mx-auto px-4 py-8">Partida não encontrada.</div></Layout>;
  const { match, lineups, events, analyses } = data;
  const status = liveData?.status ?? match.status;
  const homeScore = liveData?.home_score ?? match.home_score;
  const awayScore = liveData?.away_score ?? match.away_score;

  const d = match.match_date ? new Date(match.match_date) : null;
  const dateStr = d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "short" }) : "";
  const probable = lineups.filter((l: any) => !l.is_official);
  const official = lineups.filter((l: any) => l.is_official);

  const pregame = analyses.find((a: any) => a.analysis_type === "pregame" || a.analysis_type === "match_preview" || a.analysis_type === "preview");
  const postgame = analyses.find((a: any) => a.analysis_type === "postgame");
  const otherAnalyses = analyses.filter((a: any) => a !== pregame && a !== postgame);

  return (
    <Layout>
      <Helmet><title>{match.home?.name} x {match.away?.name} — Copa 2026 | Statball</title></Helmet>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <header className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 flex-wrap gap-2">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dateStr}</span>
            {match.stadium && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{match.stadium} · {match.city}</span>}
            <Badge variant="outline">{match.stage} {match.group_letter ? `· Grupo ${match.group_letter}` : ""}</Badge>
            {status === "live" && <Badge variant="destructive" className="animate-pulse"><Radio className="w-3 h-3 mr-1" />AO VIVO</Badge>}
            {status === "finished" && <Badge variant="secondary">Encerrado</Badge>}
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center gap-2 flex-1"><TeamFlag team={match.home} size="lg" /><span className="font-semibold text-center">{match.home?.name}</span></div>
            <div className={`text-4xl sm:text-5xl font-bold tabular-nums ${status === "live" ? "text-destructive" : ""}`}>
              {status === "scheduled" ? "vs" : `${homeScore ?? 0} - ${awayScore ?? 0}`}
            </div>
            <div className="flex flex-col items-center gap-2 flex-1"><TeamFlag team={match.away} size="lg" /><span className="font-semibold text-center">{match.away?.name}</span></div>
          </div>
          {status === "scheduled" && (
            <div className="mt-5 flex justify-center">
              <WC2026PalpiteButton match={match} />
            </div>
          )}
          {status === "live" && (
            <p className="text-center text-xs text-muted-foreground mt-4">Atualizando automaticamente a cada 30 segundos.</p>
          )}
        </header>

        {/* PÓS-JOGO em destaque quando encerrado */}
        {status === "finished" && postgame && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2"><Newspaper className="w-6 h-6 text-primary" /> Crônica pós-jogo</h2>
            <AIAnalysisBlock analysis={postgame} />
          </section>
        )}

        {status === "finished" && !postgame && (
          <section className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Crônica pós-jogo sendo gerada pela IA Statball. Atualize em alguns minutos.
          </section>
        )}

        {/* PRÉ-JOGO quando não começou */}
        {status === "scheduled" && pregame && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Análise pré-jogo</h2>
            <AIAnalysisBlock analysis={pregame} />
          </section>
        )}

        {/* Análises adicionais */}
        {otherAnalyses.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Outras análises</h2>
            {otherAnalyses.map((a: any) => <AIAnalysisBlock key={a.id} analysis={a} />)}
          </section>
        )}

        {/* Eventos (ao vivo ou pós-jogo) */}
        {events.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-3">Eventos da partida</h2>
            <ol className="relative border-l border-border pl-5 space-y-3">
              {events.map((ev: any) => (
                <li key={ev.id} className="text-sm">
                  <span className="absolute -left-1.5 w-3 h-3 bg-primary rounded-full" />
                  <strong className="text-primary mr-2">{ev.minute}'{ev.extra_minute ? `+${ev.extra_minute}` : ""}</strong>
                  <span className="uppercase text-xs text-muted-foreground mr-2">{ev.event_type}</span>
                  {ev.description && <span>{ev.description}</span>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {(probable.length > 0 || official.length > 0) && (
          <section>
            <h2 className="text-xl font-bold mb-3">Escalação {official.length ? "oficial" : "provável"}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(official.length ? official : probable).map((l: any) => (
                <div key={l.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">#{l.player?.shirt_number ?? "—"} · {l.position ?? "—"}</div>
                  <div className="font-medium truncate">{l.player?.name ?? "—"}</div>
                </div>
              ))}
            </div>
            {!official.length && <p className="text-xs text-muted-foreground mt-2 italic">Escalação provável — aguardando confirmação oficial pela API.</p>}
          </section>
        )}

        {relatedNews && relatedNews.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2"><Newspaper className="w-5 h-5" /> Conteúdo relacionado</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedNews.map((n: any) => (
                <Link key={n.id} to={`/noticias/${n.slug ?? n.id}`} className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors">
                  <h3 className="font-semibold mb-1 line-clamp-2">{n.titulo}</h3>
                  {n.resumo && <p className="text-sm text-muted-foreground line-clamp-2">{n.resumo}</p>}
                  {n.data_publicacao && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(n.data_publicacao).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
