import { useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeamRankings, RANKING_LABELS, RankingMetric } from "@/hooks/useTeamRankings";
import { ChevronRight, Trophy } from "lucide-react";

const VALID: RankingMetric[] = [
  "pontos",
  "melhores-ataques",
  "melhores-defesas",
  "mais-gols",
  "mais-vitorias",
  "aproveitamento",
];

export default function EstatisticasRanking() {
  const { metrica, ano } = useParams<{ metrica: string; ano?: string }>();
  const navigate = useNavigate();

  const metric = (VALID.includes(metrica as RankingMetric) ? metrica : "pontos") as RankingMetric;
  const season = ano ? parseInt(ano, 10) : new Date().getFullYear();

  const { data, isLoading } = useTeamRankings(metric, season, null, 50);

  const label = RANKING_LABELS[metric];
  const title = `Ranking: ${label} ${season} | Aleball`;
  const description = `Top 50 times do futebol em ${label.toLowerCase()} na temporada ${season}. Estatísticas atualizadas e ordenadas.`;

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
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}/estatisticas/rankings/${metric}/${season}`;
  }, [title, description, metric, season]);

  const seasonOptions = useMemo(() => {
    const cur = new Date().getFullYear();
    return [cur, cur - 1, cur - 2, cur - 3, cur - 4];
  }, []);

  const valueColumn = (r: any) => {
    switch (metric) {
      case "melhores-ataques":
        return `${r.media_gols_marcados.toFixed(2)} g/j`;
      case "melhores-defesas":
        return `${r.media_gols_sofridos.toFixed(2)} g/j`;
      case "mais-gols":
        return `${r.gols_marcados} gols`;
      case "mais-vitorias":
        return `${r.vitorias} V`;
      case "aproveitamento":
        return `${r.aproveitamento}%`;
      default:
        return `${r.pontos} pts`;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <nav className="text-sm text-muted-foreground flex items-center gap-1">
          <Link to="/estatisticas" className="hover:text-foreground">Estatísticas</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Rankings</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{label}</span>
        </nav>

        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-primary" /> {label} – {season}
            </h1>
            <p className="text-muted-foreground mt-1">
              Top 50 times do futebol em {label.toLowerCase()} na temporada {season}.
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={metric} onValueChange={(v) => navigate(`/estatisticas/rankings/${v}/${season}`)}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VALID.map((m) => (
                  <SelectItem key={m} value={m}>{RANKING_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(season)} onValueChange={(v) => navigate(`/estatisticas/rankings/${metric}/${v}`)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {seasonOptions.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : !data || data.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Sem dados suficientes para gerar ranking em {season}.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.map((r, idx) => (
                  <Link
                    key={r.team_id}
                    to={r.league_slug
                      ? `/estatisticas/${r.league_slug}/${r.team_slug}/${season}`
                      : `/times/${r.team_slug}`}
                    className="flex items-center gap-3 p-3 hover:bg-muted/40 transition"
                  >
                    <span className="w-8 text-center font-bold text-muted-foreground">{idx + 1}</span>
                    <TeamBadge name={r.team_nome} primaryColor={r.team_cores?.primary} secondaryColor={r.team_cores?.secondary} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{r.team_nome}</div>
                      {r.league_nome && (
                        <div className="text-xs text-muted-foreground truncate">{r.league_nome}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{valueColumn(r)}</div>
                      <div className="text-xs text-muted-foreground">{r.jogos} jogos</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-3">Outros rankings</h2>
            <div className="flex flex-wrap gap-2">
              {VALID.filter((m) => m !== metric).map((m) => (
                <Link
                  key={m}
                  to={`/estatisticas/rankings/${m}/${season}`}
                  className="text-sm px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70 transition"
                >
                  {RANKING_LABELS[m]}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
