import { Layout } from "@/components/layout/Layout";
import { useParams, Link } from "react-router-dom";
import { useWC2026Team } from "@/hooks/useCopa2026";
import { TeamFlag } from "@/components/copa2026/TeamCard";
import { MatchCard } from "@/components/copa2026/MatchCard";
import { Badge } from "@/components/ui/badge";
import { Copa2026SelecaoSEO } from "@/components/copa2026/Copa2026SelecaoSEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useMemo } from "react";

const POSITION_GROUPS: Array<{ key: string; label: string; match: (p: string) => boolean }> = [
  { key: "GK", label: "Goleiros", match: p => /goalk|gole|gk/i.test(p) },
  { key: "DF", label: "Defensores", match: p => /def|zag|lat|back/i.test(p) },
  { key: "MF", label: "Meio-campistas", match: p => /mid|mei|vol/i.test(p) },
  { key: "FW", label: "Atacantes", match: p => /forw|att|ata|striker|wing/i.test(p) },
];

export default function Copa2026SelecaoDetalhe() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useWC2026Team(slug);

  const url = `https://www.statball.com.br/copa-2026/selecoes/${slug}`;

  const faqs = useMemo(() => {
    if (!data) return [];
    const faqAnalysis = (data as any).analyses?.find?.((a: any) => a.analysis_type === "team_faq");
    if (!faqAnalysis?.content) return [];
    try { return JSON.parse(faqAnalysis.content) as Array<{ q: string; a: string }>; }
    catch { return []; }
  }, [data]);

  const playersGrouped = useMemo(() => {
    if (!data?.players?.length) return [];
    const buckets = POSITION_GROUPS.map(g => ({ ...g, items: [] as any[] }));
    const others: any[] = [];
    for (const p of data.players) {
      const grp = buckets.find(g => p.position && g.match(p.position));
      (grp ? grp.items : others).push(p);
    }
    if (others.length) buckets.push({ key: "OTH", label: "Outros", items: others, match: () => false });
    return buckets.filter(b => b.items.length);
  }, [data]);

  if (isLoading) return <Layout><div className="container mx-auto px-4 py-12">Carregando...</div></Layout>;
  if (!data) return <Layout><div className="container mx-auto px-4 py-12">Seleção não encontrada.</div></Layout>;

  const { team, history, matches } = data;
  const orderedHistory = [...history].sort((a: any, b: any) => b.year - a.year);

  return (
    <Layout>
      <Copa2026SelecaoSEO team={team} history={orderedHistory} players={data.players} faqs={faqs} url={url} />

      <article className="container mx-auto px-4 py-8 space-y-10">
        {/* HERO */}
        <header className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <nav aria-label="breadcrumb" className="text-xs text-muted-foreground mb-3 flex flex-wrap gap-1">
            <Link to="/copa-2026" className="hover:text-primary">Copa 2026</Link>
            <span>›</span>
            <Link to="/copa-2026/selecoes" className="hover:text-primary">Seleções</Link>
            <span>›</span>
            <span className="text-foreground">{team.name}</span>
          </nav>
          <div className="flex items-center gap-4 flex-wrap">
            <TeamFlag team={team} size="lg" />
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                {team.name} <span className="text-muted-foreground font-normal text-2xl">na Copa do Mundo 2026</span>
              </h1>
              {team.nickname && <p className="text-muted-foreground mt-1">{team.nickname}</p>}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {team.group_letter && <Badge variant="outline">Grupo {team.group_letter}</Badge>}
                {team.confederation_full && <Badge variant="secondary">{team.confederation_full}</Badge>}
                {team.titles_count != null && team.titles_count > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/40">{team.titles_count}x campeã mundial</Badge>
                )}
                {team.participations_count != null && (
                  <Badge variant="outline">{team.participations_count} participações</Badge>
                )}
                {team.first_participation_year && (
                  <Badge variant="outline">Desde {team.first_participation_year}</Badge>
                )}
              </div>
              {team.coach_name && (
                <p className="text-sm text-muted-foreground mt-3">
                  Técnico atual: <strong className="text-foreground">{team.coach_name}</strong>
                  {team.coach_nationality && <span> ({team.coach_nationality})</span>}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* RESUMO HISTÓRICO */}
        {team.historical_summary && (
          <section>
            <h2 className="text-2xl font-bold mb-3">Histórico em Copas do Mundo</h2>
            <div className="prose prose-invert max-w-none text-muted-foreground whitespace-pre-line leading-relaxed">
              {team.historical_summary}
            </div>
            {team.best_campaign && (
              <p className="mt-4 text-sm"><span className="text-muted-foreground">Melhor campanha:</span> <strong>{team.best_campaign}</strong></p>
            )}
          </section>
        )}

        {/* TABELA CRONOLÓGICA */}
        {orderedHistory.length > 0 ? (
          <section>
            <h2 className="text-2xl font-bold mb-3">Todas as participações</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Ano</th>
                    <th className="text-left">Sede</th>
                    <th className="text-left">Fase alcançada</th>
                    <th className="text-left">Posição</th>
                    <th className="text-left">Técnico</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedHistory.map((h: any) => (
                    <tr key={h.id} className="border-t border-border">
                      <td className="px-3 py-2 font-semibold">{h.year}</td>
                      <td>{h.host_country ?? "—"}</td>
                      <td>{h.stage_reached ?? "—"}</td>
                      <td>{h.final_position ?? "—"}</td>
                      <td className="text-muted-foreground">{h.coach_name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Fonte: FIFA / curadoria editorial Statball.</p>
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Histórico em curadoria. Será publicado em breve.
          </section>
        )}

        {/* ELENCO */}
        {playersGrouped.length > 0 ? (
          <section>
            {(() => {
              const anyOfficial = (data.players ?? []).some((p: any) => p.is_called_up);
              return (
                <>
                  <h2 className="text-2xl font-bold mb-1">
                    {anyOfficial ? `Convocação oficial — ${team.name} na Copa 2026` : `Elenco-base atual — ${team.name}`}
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    {anyOfficial
                      ? "Convocação oficial publicada pela federação."
                      : "Elenco-base atual segundo a API-Football. A convocação oficial será divulgada pelas federações a partir de maio de 2026."}
                  </p>
                </>
              );
            })()}
            <div className="space-y-5">
              {playersGrouped.map(group => (
                <div key={group.key}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.label}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {group.items.map(p => (
                      <div key={p.id} className="rounded-lg border border-border bg-card p-3">
                        <div className="text-xs text-muted-foreground">#{p.shirt_number ?? "—"}</div>
                        <div className="font-medium truncate">{p.name}</div>
                        {p.club && <div className="text-xs text-muted-foreground truncate">{p.club}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Elenco em sincronização. O elenco-base é atualizado via API-Football; a convocação oficial será publicada pelas federações a partir de maio de 2026.
          </section>
        )}

        {/* CALENDÁRIO */}
        {matches.length > 0 ? (
          <section>
            <h2 className="text-2xl font-bold mb-3">Jogos da {team.name} na Copa 2026</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((m: any) => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Calendário de jogos será atualizado após a definição completa dos confrontos pela FIFA.
          </section>
        )}

        {/* FAQ */}
        {faqs.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-3">Perguntas frequentes</h2>
            <Accordion type="single" collapsible className="rounded-xl border border-border bg-card">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="px-4">
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}

        {/* LINKS INTERNOS */}
        <section className="border-t border-border pt-6 text-sm">
          <p className="text-muted-foreground">
            Veja também: <Link className="text-primary hover:underline" to="/copa-2026">central da Copa 2026</Link> ·{" "}
            <Link className="text-primary hover:underline" to="/copa-2026/selecoes">todas as seleções</Link> ·{" "}
            <Link className="text-primary hover:underline" to="/copa-2026/jogos">calendário completo</Link>
            {team.group_letter && (
              <> · <Link className="text-primary hover:underline" to={`/copa-2026/selecoes?grupo=${team.group_letter}`}>Grupo {team.group_letter}</Link></>
            )}
          </p>
        </section>
      </article>
    </Layout>
  );
}
