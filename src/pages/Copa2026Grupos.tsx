import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { TeamFlag } from "@/components/copa2026/TeamCard";
import { Link } from "react-router-dom";

type Team = { id: string; name: string; slug: string; flag_url: string | null; group_letter: string | null };
type Match = {
  id: string; match_date: string | null; status: string; match_round: number | null;
  home_score: number | null; away_score: number | null;
  home_team_id: string; away_team_id: string;
};
type Standing = {
  id: string; team_id: string; group_letter: string;
  played: number; wins: number; draws: number; losses: number;
  goals_for: number; goals_against: number; goal_difference: number; points: number; position: number;
};

const LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

export default function Copa2026Grupos() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [t, m, s] = await Promise.all([
        supabase.from("world_cup_2026_teams").select("id,name,slug,flag_url,group_letter").eq("is_active", true),
        supabase.from("world_cup_2026_matches").select("id,match_date,status,match_round,home_score,away_score,home_team_id,away_team_id,group_letter").eq("stage","group").order("match_date"),
        supabase.from("world_cup_2026_standings").select("*"),
      ]);
      setTeams((t.data ?? []) as any);
      setMatches((m.data ?? []) as any);
      setStandings((s.data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const teamById = new Map(teams.map(t => [t.id, t]));

  return (
    <Layout>
      <Helmet>
        <title>Grupos da Copa do Mundo 2026 — Tabela ao vivo | Aleball</title>
        <meta name="description" content="Tabela completa dos 12 grupos da Copa do Mundo 2026: classificação, jogos e datas de Grupo A a L. Atualizado em tempo real." />
        <link rel="canonical" href="https://www.aleball.com/copa-2026/grupos" />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Grupos da Copa 2026</h1>
        <p className="text-muted-foreground mb-6">12 grupos (A–L) · 4 seleções cada · 2 melhores + 8 melhores 3ºs avançam ao mata-mata.</p>

        {loading && <div className="text-muted-foreground">Carregando…</div>}

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {LETTERS.map(letter => {
              const groupTeams = teams.filter(t => t.group_letter === letter);
              const groupMatches = matches.filter(m => groupTeams.some(t => t.id === m.home_team_id));
              const groupStandings = standings.filter(s => s.group_letter === letter)
                .sort((a,b) => (b.points - a.points) || (b.goal_difference - a.goal_difference) || (b.goals_for - a.goals_for));
              return (
                <article key={letter} className="rounded-xl border border-border bg-card overflow-hidden">
                  <header className="px-4 py-2 bg-primary/10 border-b border-border font-bold text-sm flex items-center justify-between">
                    <span>Grupo {letter}</span>
                    <span className="text-xs text-muted-foreground">{groupTeams.length} seleções</span>
                  </header>
                  <div className="p-3">
                    <table className="w-full text-sm">
                      <thead className="text-[10px] uppercase text-muted-foreground">
                        <tr>
                          <th className="text-left font-normal">#</th>
                          <th className="text-left font-normal">Seleção</th>
                          <th className="text-center font-normal">P</th>
                          <th className="text-center font-normal">J</th>
                          <th className="text-center font-normal">V</th>
                          <th className="text-center font-normal">E</th>
                          <th className="text-center font-normal">D</th>
                          <th className="text-center font-normal">SG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(groupStandings.length ? groupStandings : groupTeams.map(t => ({ team_id: t.id, played:0,wins:0,draws:0,losses:0,goal_difference:0,points:0 } as any))).map((s, i) => {
                          const team = teamById.get(s.team_id);
                          if (!team) return null;
                          return (
                            <tr key={team.id} className="border-t border-border/40">
                              <td className="py-1 text-muted-foreground">{i+1}</td>
                              <td className="py-1">
                                <Link to={`/copa-2026/selecoes/${team.slug}`} className="flex items-center gap-2 hover:text-primary">
                                  <TeamFlag team={team} size="sm" />
                                  <span className="truncate">{team.name}</span>
                                </Link>
                              </td>
                              <td className="text-center font-semibold">{s.points}</td>
                              <td className="text-center text-muted-foreground">{s.played}</td>
                              <td className="text-center text-muted-foreground">{s.wins}</td>
                              <td className="text-center text-muted-foreground">{s.draws}</td>
                              <td className="text-center text-muted-foreground">{s.losses}</td>
                              <td className="text-center text-muted-foreground">{s.goal_difference}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {groupMatches.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
                        {groupMatches.map(m => {
                          const home = teamById.get(m.home_team_id);
                          const away = teamById.get(m.away_team_id);
                          const d = m.match_date ? new Date(m.match_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }) : "—";
                          return (
                            <Link key={m.id} to={`/copa-2026/jogos/${m.id}`} className="flex items-center gap-2 text-xs hover:text-primary">
                              <span className="text-muted-foreground tabular-nums w-20">{d}</span>
                              <TeamFlag team={home} size="sm" />
                              <span className="truncate flex-1">{home?.name}</span>
                              <span className="font-bold tabular-nums">{m.status==="finished" ? `${m.home_score}-${m.away_score}` : "vs"}</span>
                              <span className="truncate flex-1 text-right">{away?.name}</span>
                              <TeamFlag team={away} size="sm" />
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
