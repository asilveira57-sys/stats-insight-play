import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Database, Lock, Eye, Scale, GitBranch } from "lucide-react";
import { Link } from "react-router-dom";

export default function TransparenciaIA() {
  return (
    <Layout>
      <Helmet>
        <title>Transparência da IA Aleball | Como prevemos e auditamos</title>
        <meta
          name="description"
          content="Como a IA Aleball gera, registra e audita suas previsões. Metodologia, fontes, níveis de acerto e detecção de alucinações."
        />
        <link rel="canonical" href="https://www.aleball.com/transparencia-ia" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <header className="space-y-3">
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Página institucional
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold">Transparência da IA Aleball</h1>
          <p className="text-muted-foreground text-lg">
            Toda previsão publicada é registrada, datada e comparada ao resultado real.
            Você pode auditar, contestar e acompanhar a evolução da nossa precisão em tempo real.
          </p>
          <div className="flex gap-2 pt-2">
            <Link to="/ia-performance" className="text-primary underline">
              Ver painel de performance →
            </Link>
          </div>
        </header>

        <Section
          icon={<Lock className="h-5 w-5" />}
          title="Previsões imutáveis"
        >
          Cada previsão recebe um carimbo <code>frozen_at</code> com data e hora exatas.
          Depois disso, o registro <strong>não pode ser alterado nem apagado</strong> — nem por
          administradores. Isso garante que ninguém possa "ajustar" o histórico depois do jogo.
        </Section>

        <Section
          icon={<Scale className="h-5 w-5" />}
          title="4 níveis de acerto"
        >
          <p>Não medimos só placar exato. Cada previsão é avaliada em 4 níveis:</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Badge className="mr-2">100 pts</Badge>
              <strong>Placar exato</strong> — previu 2x1, terminou 2x1.
            </li>
            <li>
              <Badge className="mr-2" variant="secondary">80 pts</Badge>
              <strong>Diferença de gols</strong> — previu 2x1, terminou 3x2.
            </li>
            <li>
              <Badge className="mr-2" variant="secondary">60 pts</Badge>
              <strong>Tendência / Vencedor</strong> — previu mandante vence, mandante venceu.
            </li>
            <li>
              <Badge className="mr-2" variant="outline">0 pts</Badge>
              <strong>Errou</strong> — vencedor diferente do previsto.
            </li>
          </ul>
        </Section>

        <Section
          icon={<Database className="h-5 w-5" />}
          title="Fontes de dados"
        >
          <ul className="space-y-1 list-disc list-inside">
            <li>Ranking FIFA oficial</li>
            <li>Ranking Elo internacional</li>
            <li>Histórico de confrontos diretos</li>
            <li>Forma recente (últimos jogos)</li>
            <li>Gols marcados e sofridos</li>
            <li>Mando de campo / sede</li>
            <li>Desfalques e suspensões quando disponíveis</li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Cada previsão guarda os pesos exatos usados em <em>prediction_explanations</em>,
            visíveis no modal "Por que essa previsão?".
          </p>
        </Section>

        <Section
          icon={<Eye className="h-5 w-5" />}
          title="Detecção de alucinações"
        >
          A função <code>audit-analysis</code> cruza cada afirmação da IA (ex: "Brasil está em 3º no
          ranking FIFA") com os valores reais da nossa base. Cada análise recebe uma nota A–E:
          <ul className="mt-3 space-y-1">
            <li><Badge>A</Badge> 95–100% verificada</li>
            <li><Badge variant="secondary">B</Badge> 80–94% verificada</li>
            <li><Badge variant="secondary">C</Badge> 60–79% verificada</li>
            <li><Badge variant="outline">D</Badge> 40–59% verificada</li>
            <li><Badge variant="destructive">E</Badge> abaixo de 40% — sinal de alucinação</li>
          </ul>
        </Section>

        <Section
          icon={<GitBranch className="h-5 w-5" />}
          title="Versionamento de modelo"
        >
          Toda previsão guarda o <code>model_version</code> que a gerou. Quando o modelo evolui,
          conseguimos comparar gerações lado a lado e mostrar se realmente melhorou.
        </Section>

        <Section
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Compromissos públicos"
        >
          <ul className="space-y-2 list-disc list-inside">
            <li>Nunca apagamos uma previsão errada para esconder o erro.</li>
            <li>Nunca alteramos previsões depois que o jogo começou.</li>
            <li>A taxa de acerto é calculada automaticamente, sem intervenção humana.</li>
            <li>Aleball é uma ferramenta de análise estatística — não é casa de apostas.</li>
          </ul>
        </Section>

        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-3">
              Quer ver os números agora?
            </p>
            <Link
              to="/ia-performance"
              className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium"
            >
              Abrir painel de performance
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm md:text-base text-muted-foreground space-y-2">
        {children}
      </CardContent>
    </Card>
  );
}
