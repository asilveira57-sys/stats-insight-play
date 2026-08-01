import { Link, useLocation } from "react-router-dom";
import { Trophy, Calendar, Table2, Brain, Goal, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/brasileirao", label: "Visão geral", icon: Trophy },
  { href: "/brasileirao/jogos", label: "Jogos", icon: Calendar },
  { href: "/brasileirao/classificacao", label: "Classificação", icon: Table2 },
  { href: "/brasileirao/palpites-ia", label: "Palpites IA", icon: Brain },
  { href: "/brasileirao/artilharia", label: "Artilharia", icon: Goal },
  { href: "/brasileirao/times", label: "Times", icon: Users },
];

export function BrasileiraoNav() {
  const { pathname } = useLocation();
  return (
    <nav className="border-b border-border bg-card/40">
      <div className="container mx-auto px-4">
        <ul className="flex gap-1 overflow-x-auto py-2">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <li key={t.href}>
                <Link
                  to={t.href}
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
      </div>
    </nav>
  );
}
