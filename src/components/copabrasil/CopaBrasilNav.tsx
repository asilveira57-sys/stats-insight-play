import { Link, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Trophy, Calendar, Brain, Goal, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCopaBrasilSeason, useCopaBrasilSeasons } from "@/hooks/useCopaBrasil";

const TABS = [
  { href: "/copa-do-brasil", label: "Visão geral", icon: Trophy },
  { href: "/copa-do-brasil/jogos", label: "Jogos", icon: Calendar },
  { href: "/copa-do-brasil/palpites-ia", label: "Palpites IA", icon: Brain },
  { href: "/copa-do-brasil/artilharia", label: "Artilharia", icon: Goal },
];

export function CopaBrasilNav() {
  const { pathname } = useLocation();
  const [season, setSeason] = useCopaBrasilSeason();
  const { data: seasons } = useCopaBrasilSeasons();
  const qc = useQueryClient();
  const suffix = season ? `?temporada=${season}` : "";

  return (
    <nav className="border-b border-border bg-card/40">
      <div className="container mx-auto px-4 flex flex-wrap items-center justify-between gap-2 py-2">
        <ul className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <li key={t.href}>
                <Link
                  to={`${t.href}${suffix}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <Select value={String(season)} onValueChange={(v) => setSeason(Number(v))}>
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue placeholder="Temporada" />
            </SelectTrigger>
            <SelectContent>
              {(seasons?.length ? seasons : [season]).map((y) => (
                <SelectItem key={y} value={String(y)}>
                  Temporada {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => qc.invalidateQueries({ queryKey: ["copa-brasil"] })}
            title="Atualizar dados da temporada"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Atualizar
          </Button>
        </div>
      </div>
    </nav>
  );
}
