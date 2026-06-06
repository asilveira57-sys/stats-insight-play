import { Helmet } from "react-helmet-async";

interface Edition {
  year: number;
  host_country?: string | null;
  stage_reached?: string | null;
  final_position?: string | null;
  coach_name?: string | null;
}
interface Faq { q: string; a: string }

interface Props {
  team: any;
  history: Edition[];
  players: any[];
  faqs?: Faq[];
  url: string;
}

export function Copa2026SelecaoSEO({ team, history, players, faqs = [], url }: Props) {
  const titleBase = `${team.name} na Copa do Mundo 2026`;
  const title = `${titleBase} — Histórico, Elenco e Jogos | Statball`;
  const description = (team.meta_description as string | null)
    ?? `${titleBase}: ${team.participations_count ?? history.length} participações em Copas, ${team.titles_count ?? 0} título(s) mundial(is)${team.coach_name ? `, técnico ${team.coach_name}` : ""}. Histórico completo, elenco convocado e calendário.`;
  const trimmed = description.length > 158 ? description.slice(0, 155) + "..." : description;

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Statball", item: "https://www.statball.com.br/" },
      { "@type": "ListItem", position: 2, name: "Copa 2026", item: "https://www.statball.com.br/copa-2026" },
      { "@type": "ListItem", position: 3, name: "Seleções", item: "https://www.statball.com.br/copa-2026/selecoes" },
      { "@type": "ListItem", position: 4, name: team.name, item: url },
    ],
  };

  const teamLd: any = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: team.name,
    alternateName: team.nickname ?? undefined,
    sport: "Football",
    url,
    description: trimmed,
  };
  if (team.coach_name) teamLd.coach = { "@type": "Person", name: team.coach_name, nationality: team.coach_nationality ?? undefined };
  if (players.length) teamLd.athlete = players.slice(0, 26).map(p => ({
    "@type": "Person", name: p.name, jobTitle: p.position ?? undefined,
  }));

  const itemListLd = history.length ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${team.name} em Copas do Mundo`,
    itemListElement: history.map((h, i) => ({
      "@type": "ListItem", position: i + 1,
      name: `Copa ${h.year}${h.host_country ? ` (${h.host_country})` : ""}`,
      description: `${h.stage_reached ?? ""}${h.final_position ? ` — ${h.final_position}` : ""}${h.coach_name ? ` (técnico: ${h.coach_name})` : ""}`.trim(),
    })),
  } : null;

  const faqLd = faqs.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={trimmed} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={titleBase} />
      <meta property="og:description" content={trimmed} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="article" />
      {team.flag_url && <meta property="og:image" content={team.flag_url} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={titleBase} />
      <meta name="twitter:description" content={trimmed} />
      {Array.isArray(team.seo_keywords) && team.seo_keywords.length > 0 && (
        <meta name="keywords" content={team.seo_keywords.join(", ")} />
      )}
      <script type="application/ld+json">{JSON.stringify(breadcrumbsLd)}</script>
      <script type="application/ld+json">{JSON.stringify(teamLd)}</script>
      {itemListLd && <script type="application/ld+json">{JSON.stringify(itemListLd)}</script>}
      {faqLd && <script type="application/ld+json">{JSON.stringify(faqLd)}</script>}
    </Helmet>
  );
}
