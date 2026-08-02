import { Target } from "lucide-react";
import type { AuditMetrics } from "@/lib/auditMetrics";

type Props = {
  metrics: AuditMetrics;
  title?: string;
  subtitle?: string;
};

function Card({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "warn" | "bad" | "primary";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500"
      : tone === "warn"
      ? "border-amber-500/30 bg-amber-500/5 text-amber-500"
      : tone === "bad"
      ? "border-destructive/30 bg-destructive/5 text-destructive"
      : tone === "primary"
      ? "border-primary/30 bg-primary/5 text-primary"
      : "border-border bg-card";
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

export function AuditDashboard({ metrics: m, title, subtitle }: Props) {
  const seg = (n: number) => (m.total ? (n / m.total) * 100 : 0);

  return (
    <section className="space-y-4">
      {(title || subtitle) && (
        <div>
          {title && <h2 className="text-xl font-bold">{title}</h2>}
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card label="Jogos auditados" value={String(m.total)} />
        <Card
          label="Acerto de resultado"
          value={`${m.accResult.toFixed(1)}%`}
          hint={`${m.hitResult} de ${m.total}`}
          tone="primary"
        />
        <Card
          label="Cobertura dupla chance"
          value={`${m.accDoubleChance.toFixed(1)}%`}
          hint={`${m.hitDoubleChance} de ${m.total}`}
          tone="good"
        />
        <Card
          label="Erro real"
          value={`${m.accWrong.toFixed(1)}%`}
          hint={`${m.wrong} de ${m.total}`}
          tone="bad"
        />
        <Card
          label="Placar exato"
          value={`${m.accExact.toFixed(1)}%`}
          hint={`${m.hitExact} de ${m.total}`}
          tone="warn"
        />
      </div>

      {m.total > 0 && (
        <div>
          <div className="flex h-3 w-full overflow-hidden rounded-full border border-border">
            <div className="bg-primary" style={{ width: `${seg(m.hitResult)}%` }} title="Resultado exato da tendência" />
            <div
              className="bg-emerald-500/60"
              style={{ width: `${seg(m.hitDoubleChance - m.hitResult)}%` }}
              title="Salvo pela dupla chance"
            />
            <div className="bg-destructive/70" style={{ width: `${seg(m.wrong)}%` }} title="Erro real" />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-primary inline-block" /> Resultado certo
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-emerald-500/60 inline-block" /> Coberto pela dupla chance
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-destructive/70 inline-block" /> Erro real
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground flex items-start gap-2">
        <Target className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Dupla chance é uma métrica estatística de cobertura: considera acerto quando o resultado oficial está entre as duas
        opções mais prováveis da IA. Não é recomendação de aposta.
      </p>
    </section>
  );
}
