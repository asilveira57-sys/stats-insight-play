import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRecords } from "@/lib/supabaseHelpers";
import type { Json } from "@/integrations/supabase/types";

export interface TeamColors {
  primary: string;
  secondary: string;
}

export interface Time {
  id: string;
  nome: string;
  escudo_url: string | null;
  pais: string | null;
  api_id: number | null;
  cores: TeamColors | null;
}

export interface TeamStats {
  id: string;
  nome: string;
  escudo_url: string | null;
  pais: string | null;
  cores: TeamColors | null;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsMarcados: number;
  golsSofridos: number;
  jogosCasa: number;
  vitoriasCasa: number;
  empatesCasa: number;
  derrotasCasa: number;
  golsMarcadosCasa: number;
  golsSofridosCasa: number;
  jogosFora: number;
  vitoriasFora: number;
  empatesFora: number;
  derrotasFora: number;
  golsMarcadosFora: number;
  golsSofridosFora: number;
  forma: string[];
  liga?: string;
  ligaLogo?: string;
}

// Helper to safely parse team colors from Json
function parseTeamColors(cores: Json | null): TeamColors | null {
  if (!cores || typeof cores !== 'object' || Array.isArray(cores)) return null;
  const obj = cores as Record<string, unknown>;
  if (typeof obj.primary === 'string' && typeof obj.secondary === 'string') {
    return { primary: obj.primary, secondary: obj.secondary };
  }
  return null;
}

// Helper to map DB row to Time interface
function mapToTime(row: any): Time {
  return {
    id: row.id,
    nome: row.nome,
    escudo_url: row.escudo_url,
    pais: row.pais,
    api_id: row.api_id,
    cores: parseTeamColors(row.cores),
  };
}

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const data = await fetchAllRecords<any>(
        'times', '*', undefined, { column: 'nome', ascending: true }
      );
      return data.map(mapToTime);
    },
  });
}

export function useTeamStats(teamId: string | null) {
  return useQuery({
    queryKey: ['team-stats', teamId],
    queryFn: async () => {
      if (!teamId) return null;

      // Buscar dados do time
      const { data: team, error: teamError } = await supabase
        .from('times')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;

      // Buscar partidas do time (casa e fora) finalizadas - sem limite
      const homeMatches = await fetchAllRecords<any>(
        'partidas',
        '*, liga:ligas(nome, logo_url)',
        (q) => q.eq('time_casa_id', teamId).eq('status', 'finished'),
        { column: 'data', ascending: false }
      );

      const awayMatches = await fetchAllRecords<any>(
        'partidas',
        '*, liga:ligas(nome, logo_url)',
        (q) => q.eq('time_fora_id', teamId).eq('status', 'finished'),
        { column: 'data', ascending: false }
      );

      // Calcular estatísticas em casa
      let vitoriasCasa = 0, empatesCasa = 0, derrotasCasa = 0;
      let golsMarcadosCasa = 0, golsSofridosCasa = 0;

      homeMatches.forEach(match => {
        const golsCasa = match.gols_casa ?? 0;
        const golsFora = match.gols_fora ?? 0;
        golsMarcadosCasa += golsCasa;
        golsSofridosCasa += golsFora;
        
        if (golsCasa > golsFora) vitoriasCasa++;
        else if (golsCasa === golsFora) empatesCasa++;
        else derrotasCasa++;
      });

      // Calcular estatísticas fora
      let vitoriasFora = 0, empatesFora = 0, derrotasFora = 0;
      let golsMarcadosFora = 0, golsSofridosFora = 0;

      awayMatches.forEach(match => {
        const golsCasa = match.gols_casa ?? 0;
        const golsFora = match.gols_fora ?? 0;
        golsMarcadosFora += golsFora;
        golsSofridosFora += golsCasa;
        
        if (golsFora > golsCasa) vitoriasFora++;
        else if (golsFora === golsCasa) empatesFora++;
        else derrotasFora++;
      });

      // Combinar todas as partidas e ordenar por data para pegar as últimas 5
      const allMatches = [...homeMatches, ...awayMatches]
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      // Calcular forma (últimas 5 partidas)
      const forma = allMatches.slice(0, 5).map(match => {
        const isHome = match.time_casa_id === teamId;
        const golsCasa = match.gols_casa ?? 0;
        const golsFora = match.gols_fora ?? 0;
        
      if (isHome) {
        if (golsCasa > golsFora) return 'V';
        if (golsCasa === golsFora) return 'E';
        return 'D';
      } else {
        if (golsFora > golsCasa) return 'V';
        if (golsFora === golsCasa) return 'E';
        return 'D';
      }
      });

      // Pegar liga da última partida
      const lastMatch = allMatches[0];
      const liga = lastMatch?.liga?.nome || '';
      const ligaLogo = lastMatch?.liga?.logo_url || '';

      const stats: TeamStats = {
        id: team.id,
        nome: team.nome,
        escudo_url: team.escudo_url,
        pais: team.pais,
        cores: team.cores as { primary: string; secondary: string } | null,
        jogos: homeMatches.length + awayMatches.length,
        vitorias: vitoriasCasa + vitoriasFora,
        empates: empatesCasa + empatesFora,
        derrotas: derrotasCasa + derrotasFora,
        golsMarcados: golsMarcadosCasa + golsMarcadosFora,
        golsSofridos: golsSofridosCasa + golsSofridosFora,
        jogosCasa: homeMatches.length,
        vitoriasCasa,
        empatesCasa,
        derrotasCasa,
        golsMarcadosCasa,
        golsSofridosCasa,
        jogosFora: awayMatches.length,
        vitoriasFora,
        empatesFora,
        derrotasFora,
        golsMarcadosFora,
        golsSofridosFora,
        forma,
        liga,
        ligaLogo,
      };

      return stats;
    },
    enabled: !!teamId,
  });
}

export function useTeamSearch(searchTerm: string, leagueId?: string | null) {
  return useQuery({
    queryKey: ['team-search', searchTerm, leagueId],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      // Se tem filtro de liga, buscar times que jogaram nessa liga
      if (leagueId) {
        const matchTeams = await fetchAllRecords<{ time_casa_id: string | null; time_fora_id: string | null }>(
          'partidas',
          'time_casa_id, time_fora_id',
          (q) => q.eq('liga_id', leagueId)
        );
        
        const teamIds = new Set<string>();
        matchTeams.forEach(m => {
          if (m.time_casa_id) teamIds.add(m.time_casa_id);
          if (m.time_fora_id) teamIds.add(m.time_fora_id);
        });
        
        if (teamIds.size === 0) return [];
        
        const { data, error } = await supabase
          .from('times')
          .select('*')
          .in('id', Array.from(teamIds))
           .ilike('nome', `%${searchTerm}%`);
        
        if (error) throw error;
        return (data || []).map(mapToTime);
      }
      
      const { data, error } = await supabase
        .from('times')
        .select('*')
        .ilike('nome', `%${searchTerm}%`);
      
      if (error) throw error;
      return (data || []).map(mapToTime);
    },
    enabled: searchTerm.length >= 2,
  });
}

export interface Liga {
  id: string;
  nome: string;
  logo_url: string | null;
  pais: string | null;
}

export function useLeagues() {
  return useQuery({
    queryKey: ['leagues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ligas')
        .select('*')
        .eq('ativa', true)
        .order('nome');
      
      if (error) throw error;
      return data as Liga[];
    },
  });
}

export function useTeamsByLeague(leagueId: string | null) {
  return useQuery({
    queryKey: ['teams-by-league', leagueId],
    queryFn: async () => {
      if (!leagueId) return [];
      
      // Buscar times que participaram de partidas nessa liga - sem limite
      const matches = await fetchAllRecords<{ time_casa_id: string | null; time_fora_id: string | null }>(
        'partidas',
        'time_casa_id, time_fora_id',
        (q) => q.eq('liga_id', leagueId)
      );
      
      const teamIds = new Set<string>();
      matches.forEach(m => {
        if (m.time_casa_id) teamIds.add(m.time_casa_id);
        if (m.time_fora_id) teamIds.add(m.time_fora_id);
      });
      
      if (teamIds.size === 0) return [];
      
      const teamsData = await fetchAllRecords<any>(
        'times',
        '*',
        (q) => q.in('id', Array.from(teamIds)),
        { column: 'nome', ascending: true }
      );
      
      return teamsData.map(mapToTime);
    },
    enabled: !!leagueId,
  });
}

export interface HeadToHead {
  totalJogos: number;
  vitoriasTime1: number;
  vitoriasTime2: number;
  empates: number;
  golsTime1: number;
  golsTime2: number;
  ultimosJogos: {
    data: string;
    golsCasa: number;
    golsFora: number;
    time1EmCasa: boolean;
  }[];
}

export function useHeadToHead(team1Id: string | null, team2Id: string | null) {
  return useQuery({
    queryKey: ['head-to-head', team1Id, team2Id],
    queryFn: async () => {
      if (!team1Id || !team2Id) return null;
      
      // Buscar partidas onde os dois times se enfrentaram - sem limite
      const matches = await fetchAllRecords<any>(
        'partidas',
        '*',
        (q) => q.eq('status', 'finished')
          .or(`and(time_casa_id.eq.${team1Id},time_fora_id.eq.${team2Id}),and(time_casa_id.eq.${team2Id},time_fora_id.eq.${team1Id})`),
        { column: 'data', ascending: false }
      );
      
      let vitoriasTime1 = 0;
      let vitoriasTime2 = 0;
      let empates = 0;
      let golsTime1 = 0;
      let golsTime2 = 0;
      
      const ultimosJogos = matches.slice(0, 5).map(match => {
        const time1EmCasa = match.time_casa_id === team1Id;
        const golsCasa = match.gols_casa ?? 0;
        const golsFora = match.gols_fora ?? 0;
        
        // Calcular gols por time
        if (time1EmCasa) {
          golsTime1 += golsCasa;
          golsTime2 += golsFora;
          if (golsCasa > golsFora) vitoriasTime1++;
          else if (golsCasa < golsFora) vitoriasTime2++;
          else empates++;
        } else {
          golsTime1 += golsFora;
          golsTime2 += golsCasa;
          if (golsFora > golsCasa) vitoriasTime1++;
          else if (golsFora < golsCasa) vitoriasTime2++;
          else empates++;
        }
        
        return {
          data: match.data,
          golsCasa,
          golsFora,
          time1EmCasa,
        };
      });
      
      // Contar todos os jogos
      matches.slice(5).forEach(match => {
        const time1EmCasa = match.time_casa_id === team1Id;
        const golsCasa = match.gols_casa ?? 0;
        const golsFora = match.gols_fora ?? 0;
        
        if (time1EmCasa) {
          golsTime1 += golsCasa;
          golsTime2 += golsFora;
          if (golsCasa > golsFora) vitoriasTime1++;
          else if (golsCasa < golsFora) vitoriasTime2++;
          else empates++;
        } else {
          golsTime1 += golsFora;
          golsTime2 += golsCasa;
          if (golsFora > golsCasa) vitoriasTime1++;
          else if (golsFora < golsCasa) vitoriasTime2++;
          else empates++;
        }
      });
      
      return {
        totalJogos: matches.length,
        vitoriasTime1,
        vitoriasTime2,
        empates,
        golsTime1,
        golsTime2,
        ultimosJogos,
      } as HeadToHead;
    },
    enabled: !!team1Id && !!team2Id,
  });
}
