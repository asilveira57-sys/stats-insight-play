import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SmartSearchBar } from "@/components/search/SmartSearchBar";
import { TrendingCards } from "@/components/search/TrendingCards";
import { AIAnswerCard } from "@/components/search/AIAnswerCard";
import { EntityResultCard } from "@/components/search/EntityResultCard";
import { UserSearchHistory } from "@/components/search/UserSearchHistory";
import { TopScorersTable } from "@/components/search/TopScorersTable";
import { DisambiguationChips } from "@/components/search/DisambiguationChips";
import { useIntelligentSearch } from "@/hooks/useIntelligentSearch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Search as SearchIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

const FILTERS = [
  { key: "all", label: "Tudo" },
  { key: "team", label: "Times" },
  { key: "league", label: "Campeonatos" },
  { key: "player", label: "Jogadores" },
] as const;

export default function Pesquisa() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [filter, setFilter] = useState<string>("all");
  const { user } = useAuth();
  const mut = useIntelligentSearch();

  useEffect(() => {
    if (initialQ) mut.mutate({ query: initialQ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  const data = mut.data;
  const filtered = useMemo(() => {
    if (!data) return [];
    return filter === "all"
      ? data.results
      : data.results.filter((r) => r.entity_type === filter);
  }, [data, filter]);

  const submit = (q: string) => {
    setParams({ q });
    mut.mutate({ query: q });
  };

  const pickLeague = (leagueId: string) => {
    if (!data) return;
    mut.mutate({ query: data.query, liga_id: leagueId });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            Pesquisa Inteligente Statball
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
            Times, jogadores, campeonatos, estatísticas e perguntas em linguagem natural — tudo num só lugar.
          </p>
        </div>

        <SmartSearchBar autoFocus initialValue={initialQ} onSubmit={submit} loading={mut.isPending} />

        {mut.isPending && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {data?.ai_answer && (
              <AIAnswerCard answer={data.ai_answer} sources={data.entities} />
            )}

            {data && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <SearchIcon className="h-4 w-4 text-primary" />
                      Resultados ({filtered.length})
                      <Badge variant="secondary" className="ml-2 text-[10px] uppercase">{data.type}</Badge>
                    </CardTitle>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                      {FILTERS.map((f) => (
                        <Button
                          key={f.key}
                          size="sm"
                          variant={filter === f.key ? "default" : "outline"}
                          onClick={() => setFilter(f.key)}
                          className="h-7 text-xs"
                        >
                          {f.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Nenhum resultado direto. Tente refinar a busca ou pergunte para a IA.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filtered.map((r) => (
                        <EntityResultCard key={`${r.entity_type}-${r.entity_id}`} result={r} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!data && !mut.isPending && (
              <div className="space-y-6">
                <TrendingCards />
              </div>
            )}
          </div>

          <div className="space-y-4">
            {user && <UserSearchHistory />}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Como funciona</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>• A IA Statball responde com base apenas em dados do nosso banco.</p>
                <p>• Quando faltam dados, ela avisa em vez de inventar.</p>
                <p>• Cada busca alimenta tendências públicas.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
