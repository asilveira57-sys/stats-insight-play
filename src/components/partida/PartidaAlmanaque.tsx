import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { History, ListOrdered } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

/**
 * "Ficha de almanaque" da partida: histórico do confronto e campanha recente
 * de cada time ANTES deste jogo. Tudo calculado dos dados do banco, sem IA.
 */

type Team = { id: string; nome: string; slug?: string | null } | null | undefined;

type Row = {
  id: string;
  slug: string | null;
  data: string;
  gols_casa: number | null;
  gols_fora: number | null;
  time_casa_id: string;
  time_fora_id: string;
  liga: { nome: string | null } | null;
  casa: { nome: string | null } | null;
  fora: { nome: string | null } | null;
};

const SELECT =
  "id, slug, data, gols_casa, gols_fora, time_casa_id, time_fora_id, liga:ligas(nome), casa:times!partidas_time_casa_id_fkey(nome), fora:times!partidas_time_fora_id_fkey(nome)";

function fmt(d: string) {
  try {
    return new Date(d + "T12:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  } catch {
    return d;
  }
}

function resultFor(teamId: string, r: Row): "V" | "E" | "D" {
  const own = r.time_casa_id === teamId ? r.gols_casa! : r.gols_fora!;
  const opp = r.time_casa_id === teamId ? r.gols_fora! : r.gols_casa!;
  return own > opp ? "V" : own < opp ? "D" : "E";
}

function MatchLine({ r }: { r: Row }) {
  const text = (
    <>
      <span className="text-muted-foreground tabular-nums w-24 shrink-0">{fmt(r.data)}</span>
      <span className="flex-1 truncate">
        {r.casa?.nome} <strong className="tabular-nums">{r.gols_casa} x {r.gols_fora}</strong> {r.fora?.nome}
      </span>
      {r.liga?.nome && <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-[40%]">{r.liga.nome}</span>}
    </>
  );
  return (
    <li className="py-1.5 text-sm">
      {r.slug ? (
        <Link to={`/partida/${r.slug}`} className="flex items-center gap-3 hover:text-primary">{text}</Link>
      ) : (
        <div className="flex items-center gap-3">{text}</div>
      )}
    </li>
  );
}

function FormBadge({ res }: { res: "V" | "E" | "D" }) {
  const cls =
    res === "V" ? "bg-emerald-500/15 text-emerald-500" : res === "D" ? "bg-red-500/15 text-red-500" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-semibold ${cls}`}>{res}</span>;
}

export function PartidaAlmanaque({
  partidaId,
  data,
  casa,
  fora,
}: {
  partidaId: string;
  data: string;
  casa: Team;
  fora: Team;
}) {
  const a = casa?.id;
  const b = fora?.id;

  const { data: h2h } = useQuery({
    enabled: !!a && !!b && !!data,
    queryKey: ["partida-h2h", a, b, data],
    queryFn: async () => {
      const dir = (home: string, away: string) =>
        supabase
          .from("partidas")
          .select(SELECT)
          .eq("time_casa_id", home)
          .eq("time_fora_id", away)
          .lt("data", data)
          .not("gols_casa", "is", null)
          .not("gols_fora", "is", null)
          .neq("id", partidaId)
          .order("data", { ascending: false })
          .limit(500);
      const [ab, ba] = await Promise.all([dir(a!, b!), dir(b!, a!)]);
      const rows = [...((ab.data ?? []) as unknown as Row[]), ...((ba.data ?? []) as unknown as Row[])]
        .sort((x, y) => (x.data < y.data ? 1 : x.data > y.data ? -1 : 0))
        .slice(0, 500);
      return rows;
    },
  });

  const recent = (teamId?: string) => ({
    enabled: !!teamId && !!data,
    queryKey: ["partida-forma", teamId, data],
    queryFn: async () => {
      // Duas consultas simples (mandante e visitante) usam os índices por time+data
      // e são muito mais leves que um OR entre as duas colunas.
      const base = (col: "time_casa_id" | "time_fora_id") =>
        supabase
          .from("partidas")
          .select(SELECT)
          .eq(col, teamId!)
          .lt("data", data)
          .not("gols_casa", "is", null)
          .not("gols_fora", "is", null)
          .order("data", { ascending: false })
          .limit(5);
      const [home, away] = await Promise.all([base("time_casa_id"), base("time_fora_id")]);
      const rows = [...((home.data ?? []) as unknown as Row[]), ...((away.data ?? []) as unknown as Row[])];
      return rows.sort((x, y) => (x.data < y.data ? 1 : x.data > y.data ? -1 : 0)).slice(0, 5);
    },
  });
  const { data: formaCasa } = useQuery(recent(a));
  const { data: formaFora } = useQuery(recent(b));

  if (!a || !b) return null;

  const games = h2h ?? [];
  let winsA = 0, winsB = 0, draws = 0, goalsA = 0, goalsB = 0;
  for (const r of games) {
    const res = resultFor(a, r);
    if (res === "V") winsA++; else if (res === "D") winsB++; else draws++;
    goalsA += r.time_casa_id === a ? r.gols_casa! : r.gols_fora!;
    goalsB += r.time_casa_id === b ? r.gols_casa! : r.gols_fora!;
  }
  const first = games.length ? games[games.length - 1] : null;
  const last = games.length ? games[0] : null;

  return (
    <>
      <section aria-labelledby="confronto" className="space-y-3">
        <h2 id="confronto" className="text-xl font-display font-semibold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Histórico do confronto
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            {games.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Não há jogos anteriores entre {casa?.nome} e {fora?.nome} registrados no acervo do Aleball até esta data.
              </p>
            ) : (
              <>
                <p className="text-base leading-relaxed">
                  Até {fmt(data)}, {casa?.nome} e {fora?.nome} tinham se enfrentado <strong>{games.length}</strong>{" "}
                  {games.length === 1 ? "vez" : "vezes"} segundo o acervo do Aleball: <strong>{winsA}</strong>{" "}
                  {winsA === 1 ? "vitória" : "vitórias"} do {casa?.nome}, <strong>{draws}</strong>{" "}
                  {draws === 1 ? "empate" : "empates"} e <strong>{winsB}</strong> {winsB === 1 ? "vitória" : "vitórias"} do {fora?.nome}, com{" "}
                  {goalsA} gols do {casa?.nome} e {goalsB} do {fora?.nome}.
                  {first && games.length > 1 ? <> O primeiro registro é de {fmt(first.data)}{first.liga?.nome ? `, pelo ${first.liga.nome}` : ""}.</> : null}
                  {last ? <> O encontro anterior terminou {last.casa?.nome} {last.gols_casa} x {last.gols_fora} {last.fora?.nome}.</> : null}
                </p>
                <ul className="divide-y divide-border">
                  {games.slice(0, 10).map((r) => <MatchLine key={r.id} r={r} />)}
                </ul>
                {games.length > 10 && (
                  <p className="text-xs text-muted-foreground">Mostrando os 10 jogos mais recentes de {games.length}.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="forma" className="space-y-3">
        <h2 id="forma" className="text-xl font-display font-semibold flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-primary" /> Últimos jogos antes desta partida
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{ team: casa, rows: formaCasa }, { team: fora, rows: formaFora }].map(({ team, rows }) => (
            <Card key={team!.id}>
              <CardContent className="pt-5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{team!.nome}</h3>
                  <div className="flex gap-1">
                    {(rows ?? []).slice().reverse().map((r) => <FormBadge key={r.id} res={resultFor(team!.id, r)} />)}
                  </div>
                </div>
                {(rows ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem jogos anteriores registrados no acervo.</p>
                ) : (
                  <ul className="divide-y divide-border">{rows!.map((r) => <MatchLine key={r.id} r={r} />)}</ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
