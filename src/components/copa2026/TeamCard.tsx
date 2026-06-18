import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { getCountryFlagUrl } from "@/lib/countryFlags";

interface TeamRef { name?: string; flag_url?: string | null; slug?: string }

function Initials({ name, dims }: { name?: string; dims: string }) {
  return (
    <div className={`${dims} rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground`}>
      {(name ?? "?").slice(0, 2).toUpperCase()}
    </div>
  );
}

export function TeamFlag({ team, size = "md" }: { team?: TeamRef | null; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "w-6 h-6" : size === "lg" ? "w-12 h-12" : "w-8 h-8";
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  if (!team) return <div className={`${dims} rounded bg-muted`} />;

  // Prefer flagcdn (country flag — reliable) over api-sports badge (which may be blocked).
  const cdn = team.name ? getCountryFlagUrl(team.name) : null;
  const primary = cdn || team.flag_url || null;
  const secondary = cdn && team.flag_url && cdn !== team.flag_url ? team.flag_url : null;

  const src = stage === 0 ? primary : stage === 1 ? secondary : null;
  if (!src) return <Initials name={team.name} dims={dims} />;
  return (
    <img
      src={src}
      alt={team.name ?? ""}
      loading="lazy"
      onError={() => setStage((s) => (s === 0 && secondary ? 1 : 2))}
      className={`${dims} rounded object-cover bg-muted`}
    />
  );
}

export function TeamCard({ team }: { team: any }) {
  const statusColor = team.status === "champion" ? "bg-amber-500/20 text-amber-500 border-amber-500/40"
    : team.status === "qualified" ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/40"
    : team.status === "eliminated" ? "bg-destructive/20 text-destructive border-destructive/40"
    : "bg-primary/10 text-primary border-primary/30";
  const statusLabel = team.status === "champion" ? "Campeão"
    : team.status === "qualified" ? "Classificada"
    : team.status === "eliminated" ? "Eliminada" : "Ativa";

  return (
    <Link to={`/copa-2026/selecoes/${team.slug}`}
      className="group block rounded-xl border border-border bg-card hover:border-primary/60 hover:shadow-lg transition-all p-4">
      <div className="flex items-center gap-3">
        <TeamFlag team={team} size="lg" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{team.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {team.group_letter && <Badge variant="outline" className="text-xs">Grupo {team.group_letter}</Badge>}
            <Badge className={`text-xs ${statusColor}`}>{statusLabel}</Badge>
          </div>
        </div>
      </div>
    </Link>
  );
}
