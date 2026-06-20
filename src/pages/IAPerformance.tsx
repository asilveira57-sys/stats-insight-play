import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIAPerformance } from "@/hooks/useIAPerformance";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { Trophy, Target, TrendingUp, ShieldCheck, Activity } from "lucide-react";
import { Link } from "react-router-dom";

const bandLabel = (b: string) =>
  b === "high" ? "Alta" : b === "medium" ? "Média" : b === "low" ? "Baixa" : b;

export default function IAPerformance() {
  const { data, isLoading } = useIAPerformance();

  return (
    <Layout>
      <Helmet>
        <title>Performance da IA Statball | Auditoria pública de previsões</title>
        <meta
          name="description"
          content="Painel público com a taxa de acerto da IA Statball: vencedor, tendência, diferença de gols e placar exato, com evolução temporal."
        />
        <link rel="canonical" href="https://www.statball.com.br/ia-performance" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-8">
        <header className="space-y-2">
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Auditoria pública
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold">Performance da IA Statball</h1>
          <p className="text-muted-foreground max-w-3xl">
            Toda previsão é registrada com data e hora e comparada com o resultado real.
            Medimos 4 níveis de acerto: vencedor, tendência, diferença de gols e placar exato.
            <Link to="/transparencia-ia" className="ml-1 underline">
              Saiba como funciona
            </Link>
            .
          </p>
        </header>

        {isLoading ? (
          <div className="grid md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : !data || data.kpis.total === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Ainda não há previsões auditadas. Os números aparecem aqui automaticamente
              à medida que as partidas terminam.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPIs */}
            <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <KpiCard
                icon={<Activity className="h-4 w-4" />}
                label="Previsões auditadas"
                value={data.kpis.total.toLocaleString("pt-BR")}
              />
              <KpiCard
                icon={<Trophy className="h-4 w-4" />}
                label="Acerto do vencedor"
                value={`${data.kpis.accuracyWinner}%`}
              />
              <KpiCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Tendência do jogo"
                value={`${data.kpis.accuracyTrend}%`}
              />
              <KpiCard
                icon={<Target className="h-4 w-4" />}
                label="Diferença de gols"
                value={`${data.kpis.accuracyDiff}%`}
              />
              <KpiCard
                icon={<Target className="h-4 w-4" />}
                label="Placar exato"
                value={`${data.kpis.accuracyExact}%`}
              />
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Score médio por previsão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{data.kpis.avgScore}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Escala 0–100. Placar exato = 100, diferença = 80, tendência/vencedor = 60.
                </p>
              </CardContent>
            </Card>

            {/* Evolution */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução ao longo do tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.evolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="winner"
                        name="Vencedor (%)"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="exact"
                        name="Placar exato (%)"
                        stroke="hsl(var(--accent))"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="cumulative_avg_score"
                        name="Score médio acumulado"
                        stroke="hsl(var(--destructive))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="confidence" className="space-y-4">
              <TabsList>
                <TabsTrigger value="confidence">Por confiança</TabsTrigger>
                <TabsTrigger value="competition">Por competição</TabsTrigger>
                <TabsTrigger value="stage">Por fase</TabsTrigger>
              </TabsList>

              <TabsContent value="confidence">
                <Card>
                  <CardHeader>
                    <CardTitle>Acerto por nível de confiança</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.byConfidence.map((b) => ({
                            ...b,
                            band: bandLabel(b.band),
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="band" stroke="hsl(var(--muted-foreground))" />
                          <YAxis stroke="hsl(var(--muted-foreground))" />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                            }}
                          />
                          <Legend />
                          <Bar dataKey="accuracy_winner" name="Vencedor %" fill="hsl(var(--primary))" />
                          <Bar dataKey="accuracy_exact" name="Placar exato %" fill="hsl(var(--accent))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="competition">
                <Card>
                  <CardHeader>
                    <CardTitle>Acerto por competição</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground border-b">
                          <tr>
                            <th className="py-2">Competição</th>
                            <th className="py-2">Previsões</th>
                            <th className="py-2">Vencedor</th>
                            <th className="py-2">Placar exato</th>
                            <th className="py-2">Score médio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.byCompetition.map((c) => (
                            <tr key={c.competition} className="border-b">
                              <td className="py-2 font-medium">{c.competition}</td>
                              <td className="py-2">{c.total}</td>
                              <td className="py-2">{c.winner}%</td>
                              <td className="py-2">{c.exact}%</td>
                              <td className="py-2">{c.avg_score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stage">
                <Card>
                  <CardHeader>
                    <CardTitle>Acerto por fase</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground border-b">
                          <tr>
                            <th className="py-2">Fase</th>
                            <th className="py-2">Previsões</th>
                            <th className="py-2">Vencedor</th>
                            <th className="py-2">Score médio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.byStage.map((s) => (
                            <tr key={s.stage} className="border-b">
                              <td className="py-2 font-medium">{s.stage}</td>
                              <td className="py-2">{s.total}</td>
                              <td className="py-2">{s.winner}%</td>
                              <td className="py-2">{s.avg_score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </Layout>
  );
}

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          {icon} {label}
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
