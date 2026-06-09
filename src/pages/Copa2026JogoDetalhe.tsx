import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { useWC2026Match } from "@/hooks/useCopa2026";
import { TeamFlag } from "@/components/copa2026/TeamCard";
import { AIAnalysisBlock } from "@/components/copa2026/AIAnalysisBlock";
import { WC2026PalpiteButton } from "@/components/copa2026/WC2026PalpiteButton";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";

export default function Copa2026JogoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useWC2026Match(id);

  if (isLoading) return <Layout><div className="container mx-auto px-4 py-8">Carregando...</div></Layout>;
  if (!data) return <Layout><div className="container mx-auto px-4 py-8">Partida não encontrada.</div></Layout>;
  const { match, lineups, events, analyses } = data;

  const d = match.match_date ? new Date(match.match_date) : null;
  const dateStr = d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "short" }) : "";
  const probable = lineups.filter(l => !l.is_official);
  const official = lineups.filter(l => l.is_official);

  return (
    <Layout>
      <Helmet><title>{match.home?.name} x {match.away?.name} — Copa 2026 | Statball</title></Helmet>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <header className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 flex-wrap gap-2">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dateStr}</span>
            {match.stadium && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{match.stadium} · {match.city}</span>}
            <Badge variant="outline">{match.stage} {match.group_letter ? `· Grupo ${match.group_letter}` : ""}</Badge>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center gap-2 flex-1"><TeamFlag team={match.home} size="lg" /><span className="font-semibold text-center">{match.home?.name}</span></div>
            <div className="text-4xl sm:text-5xl font-bold tabular-nums">{match.status === "scheduled" ? "vs" : `${match.home_score ?? 0} - ${match.away_score ?? 0}`}</div>
            <div className="flex flex-col items-center gap-2 flex-1"><TeamFlag team={match.away} size="lg" /><span className="font-semibold text-center">{match.away?.name}</span></div>
          </div>
          <div className="mt-5 flex justify-center">
            <WC2026PalpiteButton match={match} />
          </div>
        </header>

        {analyses.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Análises por IA</h2>
            {analyses.map(a => <AIAnalysisBlock key={a.id} analysis={a} />)}
          </section>
        )}

        {events.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-3">Eventos da partida</h2>
            <ol className="relative border-l border-border pl-5 space-y-3">
              {events.map(ev => (
                <li key={ev.id} className="text-sm">
                  <span className="absolute -left-1.5 w-3 h-3 bg-primary rounded-full" />
                  <strong className="text-primary mr-2">{ev.minute}'</strong>
                  <span className="uppercase text-xs text-muted-foreground mr-2">{ev.event_type}</span>
                  {ev.player?.name && <span>{ev.player.name}</span>}
                  {ev.description && <span className="text-muted-foreground"> — {ev.description}</span>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {(probable.length > 0 || official.length > 0) && (
          <section>
            <h2 className="text-xl font-bold mb-3">Escalação {official.length ? "oficial" : "provável"}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(official.length ? official : probable).map(l => (
                <div key={l.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">#{l.player?.shirt_number ?? "—"} · {l.position ?? "—"}</div>
                  <div className="font-medium truncate">{l.player?.name ?? "—"}</div>
                </div>
              ))}
            </div>
            {!official.length && <p className="text-xs text-muted-foreground mt-2 italic">Escalação provável — aguardando confirmação oficial pela API.</p>}
          </section>
        )}
      </div>
    </Layout>
  );
}
