/**
 * Canonical Key Utilities for Edge Functions
 * Sistema de slugs canônicos para importação idempotente
 * 
 * Regras:
 * 1. Slugs são imutáveis após criação
 * 2. Mesmo nome sempre gera mesmo slug base
 * 3. Conflitos resolvidos com sufixo incremental (-2, -3)
 * 4. Importações são idempotentes (mesmo arquivo importado várias vezes não duplica)
 * 5. Slug é chave canônica, não apenas ID interno
 */

/**
 * Normalize a name: remove accents, trim, lowercase, collapse multiple spaces
 */
export function normalizeName(str: string): string {
  if (!str) return '';
  
  // Remove accents using normalize + regex
  const normalized = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Lowercase, trim, and collapse multiple spaces
  return normalized
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Generate a URL-friendly slug from a string
 * normalize + replace spaces with hyphens + remove non-alphanumeric
 */
export function slugify(str: string): string {
  if (!str) return '';
  
  let slug = normalizeName(str);
  
  // Replace spaces with hyphens
  slug = slug.replace(/\s/g, '-');
  
  // Remove anything that's not a-z, 0-9, or hyphen
  slug = slug.replace(/[^a-z0-9-]/g, '');
  
  // Collapse multiple hyphens
  slug = slug.replace(/-+/g, '-');
  
  // Trim hyphens from start and end
  slug = slug.replace(/^-+|-+$/g, '');
  
  return slug;
}

/**
 * Generate match slug: time-casa-vs-time-fora-YYYY-MM-DD
 */
export function generateMatchSlug(homeSlug: string, awaySlug: string, date: string): string {
  const home = homeSlug || 'time-casa';
  const away = awaySlug || 'time-fora';
  // Ensure date is in YYYY-MM-DD format
  const dateStr = date.split('T')[0];
  return `${home}-vs-${away}-${dateStr}`;
}

/**
 * Compare two names for canonical matching
 */
export function namesMatch(name1: string, name2: string): boolean {
  return normalizeName(name1) === normalizeName(name2);
}

/**
 * Compare two slugs for matching
 */
export function slugsMatch(slug1: string, slug2: string): boolean {
  return slugify(slug1) === slugify(slug2);
}

/**
 * Entity types supported by external_id_map
 */
export type EntityType = 'match' | 'team' | 'league';

/**
 * Confidence levels for mappings
 */
export type MatchConfidence = 'low' | 'medium' | 'high' | 'exact';

/**
 * Interface for external ID mapping
 */
export interface ExternalIdMapping {
  id: string;
  entity_type: EntityType;
  internal_id: string;
  external_id: string;
  source_id: string | null;
  confidence: MatchConfidence;
  metadata?: Record<string, unknown>;
}

/**
 * Result interface for resolution operations
 */
export interface ResolutionResult {
  success: boolean;
  id: string | null;
  source?: 'external_id_map' | 'slug_match' | 'name_match' | 'created';
  error?: string;
  isNew?: boolean;
}

/**
 * Validate that a name is not empty or null
 */
export function validateName(name: string | null | undefined): boolean {
  if (!name) return false;
  return name.trim().length > 0;
}

/**
 * Log import validation error to sync_logs
 */
export async function logImportError(
  supabase: any,
  sourceId: string | null,
  entityType: string,
  errorMessage: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase.from('sync_logs').insert({
      source_id: sourceId,
      entity_type: `${entityType}_import_error`,
      status: 'failed',
      error_message: errorMessage,
      details: details,
    });
  } catch (e) {
    console.error('Failed to log import error:', e);
  }
}

/**
 * Resolve a team by canonical key (slug-first approach)
 * 
 * Resolution order:
 * 1. external_id_map (if externalId provided)
 * 2. Slug match
 * 3. Normalized name match
 * 4. Create new if not found
 */
export async function resolveTeamId(
  supabase: any,
  params: {
    provider: string | null;
    externalTeamId?: string | number;
    teamName: string;
    escudoUrl?: string;
    pais?: string;
    apiId?: number;
  }
): Promise<ResolutionResult> {
  const { provider, externalTeamId, teamName, escudoUrl, pais, apiId } = params;

  // Validate name
  if (!validateName(teamName)) {
    await logImportError(supabase, provider, 'team', 'Nome do time não pode ser vazio', {
      external_id: externalTeamId,
      provider,
    });
    return {
      success: false,
      id: null,
      error: 'Nome do time não pode ser vazio',
    };
  }

  const slug = slugify(teamName);
  const normalizedName = normalizeName(teamName);

  // 1. Try external_id_map first
  if (provider && externalTeamId) {
    const { data: mapping } = await supabase
      .from('external_id_map')
      .select('internal_id')
      .eq('source_id', provider)
      .eq('entity_type', 'team')
      .eq('external_id', String(externalTeamId))
      .maybeSingle();

    if (mapping?.internal_id) {
      return {
        success: true,
        id: mapping.internal_id,
        source: 'external_id_map',
        isNew: false,
      };
    }
  }

  // 2. Try slug match
  if (slug) {
    const { data: teamBySlug } = await supabase
      .from('times')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (teamBySlug?.id) {
      // Register mapping if we have external ID
      if (provider && externalTeamId) {
        await supabase.from('external_id_map').upsert({
          source_id: provider,
          entity_type: 'team',
          external_id: String(externalTeamId),
          internal_id: teamBySlug.id,
          confidence: 'high',
        }, { onConflict: 'source_id,entity_type,external_id' });
      }
      return {
        success: true,
        id: teamBySlug.id,
        source: 'slug_match',
        isNew: false,
      };
    }
  }

  // 3. Try normalized name match
  const { data: allTeams } = await supabase
    .from('times')
    .select('id, nome');

  if (allTeams) {
    const matchingTeam = allTeams.find((t: any) => 
      normalizeName(t.nome) === normalizedName
    );

    if (matchingTeam) {
      // Register mapping if we have external ID
      if (provider && externalTeamId) {
        await supabase.from('external_id_map').upsert({
          source_id: provider,
          entity_type: 'team',
          external_id: String(externalTeamId),
          internal_id: matchingTeam.id,
          confidence: 'medium',
        }, { onConflict: 'source_id,entity_type,external_id' });
      }
      return {
        success: true,
        id: matchingTeam.id,
        source: 'name_match',
        isNew: false,
      };
    }
  }

  // 4. Create new team (trigger will generate unique slug)
  const { data: newTeam, error: createError } = await supabase
    .from('times')
    .insert({
      nome: teamName,
      escudo_url: escudoUrl,
      pais: pais,
      api_id: apiId,
    })
    .select()
    .single();

  if (createError || !newTeam) {
    return {
      success: false,
      id: null,
      error: `Falha ao criar time: ${createError?.message || 'Unknown error'}`,
    };
  }

  // Register mapping
  if (provider && externalTeamId) {
    await supabase.from('external_id_map').upsert({
      source_id: provider,
      entity_type: 'team',
      external_id: String(externalTeamId),
      internal_id: newTeam.id,
      confidence: 'exact',
    }, { onConflict: 'source_id,entity_type,external_id' });
  }

  // Register alias
  await supabase.from('team_aliases').insert({
    team_id: newTeam.id,
    source_id: provider,
    alias: teamName,
    normalized_alias: normalizedName,
  }).onConflict('normalized_alias').ignore();

  return {
    success: true,
    id: newTeam.id,
    source: 'created',
    isNew: true,
  };
}

/**
 * Resolve a league by canonical key (slug-first approach)
 */
export async function resolveLeagueId(
  supabase: any,
  params: {
    provider: string | null;
    externalLeagueId?: string | number;
    leagueName: string;
    codigoApi?: string;
    pais?: string;
    logoUrl?: string;
    apiId?: number;
  }
): Promise<ResolutionResult> {
  const { provider, externalLeagueId, leagueName, codigoApi, pais, logoUrl, apiId } = params;

  // Validate name
  if (!validateName(leagueName)) {
    await logImportError(supabase, provider, 'league', 'Nome da liga não pode ser vazio', {
      external_id: externalLeagueId,
      provider,
    });
    return {
      success: false,
      id: null,
      error: 'Nome da liga não pode ser vazio',
    };
  }

  const slug = slugify(leagueName);
  const normalizedName = normalizeName(leagueName);

  // 1. Try external_id_map first
  if (provider && externalLeagueId) {
    const { data: mapping } = await supabase
      .from('external_id_map')
      .select('internal_id')
      .eq('source_id', provider)
      .eq('entity_type', 'league')
      .eq('external_id', String(externalLeagueId))
      .maybeSingle();

    if (mapping?.internal_id) {
      return {
        success: true,
        id: mapping.internal_id,
        source: 'external_id_map',
        isNew: false,
      };
    }
  }

  // 2. Try slug match
  if (slug) {
    const { data: leagueBySlug } = await supabase
      .from('ligas')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (leagueBySlug?.id) {
      if (provider && externalLeagueId) {
        await supabase.from('external_id_map').upsert({
          source_id: provider,
          entity_type: 'league',
          external_id: String(externalLeagueId),
          internal_id: leagueBySlug.id,
          confidence: 'high',
        }, { onConflict: 'source_id,entity_type,external_id' });
      }
      return {
        success: true,
        id: leagueBySlug.id,
        source: 'slug_match',
        isNew: false,
      };
    }
  }

  // 3. Try normalized name match
  const { data: allLeagues } = await supabase
    .from('ligas')
    .select('id, nome');

  if (allLeagues) {
    const matchingLeague = allLeagues.find((l: any) => 
      normalizeName(l.nome) === normalizedName
    );

    if (matchingLeague) {
      if (provider && externalLeagueId) {
        await supabase.from('external_id_map').upsert({
          source_id: provider,
          entity_type: 'league',
          external_id: String(externalLeagueId),
          internal_id: matchingLeague.id,
          confidence: 'medium',
        }, { onConflict: 'source_id,entity_type,external_id' });
      }
      return {
        success: true,
        id: matchingLeague.id,
        source: 'name_match',
        isNew: false,
      };
    }
  }

  // 4. Create new league (trigger will generate unique slug)
  const { data: newLeague, error: createError } = await supabase
    .from('ligas')
    .insert({
      nome: leagueName,
      codigo_api: codigoApi,
      pais: pais,
      logo_url: logoUrl,
      api_id: apiId,
    })
    .select()
    .single();

  if (createError || !newLeague) {
    return {
      success: false,
      id: null,
      error: `Falha ao criar liga: ${createError?.message || 'Unknown error'}`,
    };
  }

  if (provider && externalLeagueId) {
    await supabase.from('external_id_map').upsert({
      source_id: provider,
      entity_type: 'league',
      external_id: String(externalLeagueId),
      internal_id: newLeague.id,
      confidence: 'exact',
    }, { onConflict: 'source_id,entity_type,external_id' });
  }

  await supabase.from('competition_aliases').insert({
    league_id: newLeague.id,
    source_id: provider,
    alias: leagueName,
    normalized_alias: normalizedName,
  }).onConflict('normalized_alias').ignore();

  return {
    success: true,
    id: newLeague.id,
    source: 'created',
    isNew: true,
  };
}

/**
 * Resolve a match by canonical key (slug-first approach)
 * Slug format: time-casa-vs-time-fora-YYYY-MM-DD
 */
export async function resolveMatchId(
  supabase: any,
  params: {
    provider: string | null;
    externalMatchId?: string | number;
    homeTeamId: string;
    awayTeamId: string;
    matchDate: string;
    hora?: string;
    ligaId?: string;
    apiId?: number;
    status?: string;
    rodada?: number;
    golsCasa?: number;
    golsFora?: number;
  }
): Promise<ResolutionResult> {
  const { 
    provider, externalMatchId, homeTeamId, awayTeamId, matchDate,
    hora, ligaId, apiId, status, rodada, golsCasa, golsFora
  } = params;

  // Validate required fields
  if (!homeTeamId || !awayTeamId || !matchDate) {
    await logImportError(supabase, provider, 'match', 'time_casa_id, time_fora_id e data são obrigatórios', {
      external_id: externalMatchId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      date: matchDate,
    });
    return {
      success: false,
      id: null,
      error: 'time_casa_id, time_fora_id e data são obrigatórios',
    };
  }

  const dateOnly = matchDate.split('T')[0];

  // 1. Try external_id_map first
  if (provider && externalMatchId) {
    const { data: mapping } = await supabase
      .from('external_id_map')
      .select('internal_id')
      .eq('source_id', provider)
      .eq('entity_type', 'match')
      .eq('external_id', String(externalMatchId))
      .maybeSingle();

    if (mapping?.internal_id) {
      // Update match data
      await supabase.from('partidas')
        .update({
          hora: hora || undefined,
          liga_id: ligaId || undefined,
          status: status || undefined,
          rodada: rodada || undefined,
          gols_casa: golsCasa,
          gols_fora: golsFora,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mapping.internal_id);
      
      return {
        success: true,
        id: mapping.internal_id,
        source: 'external_id_map',
        isNew: false,
      };
    }
  }

  // 2. Get team slugs for match slug generation
  const { data: homeTeam } = await supabase
    .from('times')
    .select('slug')
    .eq('id', homeTeamId)
    .single();
  
  const { data: awayTeam } = await supabase
    .from('times')
    .select('slug')
    .eq('id', awayTeamId)
    .single();

  const expectedSlug = generateMatchSlug(
    homeTeam?.slug || 'time-casa',
    awayTeam?.slug || 'time-fora',
    dateOnly
  );

  // 3. Try slug match
  const { data: matchBySlug } = await supabase
    .from('partidas')
    .select('id')
    .eq('slug', expectedSlug)
    .maybeSingle();

  if (matchBySlug?.id) {
    // Update and register mapping
    await supabase.from('partidas')
      .update({
        hora: hora || undefined,
        liga_id: ligaId || undefined,
        status: status || undefined,
        rodada: rodada || undefined,
        gols_casa: golsCasa,
        gols_fora: golsFora,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchBySlug.id);

    if (provider && externalMatchId) {
      await supabase.from('external_id_map').upsert({
        source_id: provider,
        entity_type: 'match',
        external_id: String(externalMatchId),
        internal_id: matchBySlug.id,
        confidence: 'high',
      }, { onConflict: 'source_id,entity_type,external_id' });
    }
    
    return {
      success: true,
      id: matchBySlug.id,
      source: 'slug_match',
      isNew: false,
    };
  }

  // 4. Try by teams + date (fallback)
  const { data: matchByKey } = await supabase
    .from('partidas')
    .select('id')
    .eq('time_casa_id', homeTeamId)
    .eq('time_fora_id', awayTeamId)
    .eq('data', dateOnly)
    .maybeSingle();

  if (matchByKey?.id) {
    await supabase.from('partidas')
      .update({
        hora: hora || undefined,
        liga_id: ligaId || undefined,
        status: status || undefined,
        rodada: rodada || undefined,
        gols_casa: golsCasa,
        gols_fora: golsFora,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchByKey.id);

    if (provider && externalMatchId) {
      await supabase.from('external_id_map').upsert({
        source_id: provider,
        entity_type: 'match',
        external_id: String(externalMatchId),
        internal_id: matchByKey.id,
        confidence: 'high',
      }, { onConflict: 'source_id,entity_type,external_id' });
    }
    
    return {
      success: true,
      id: matchByKey.id,
      source: 'name_match',
      isNew: false,
    };
  }

  // 5. Create new match (trigger will generate unique slug)
  const { data: newMatch, error: createError } = await supabase
    .from('partidas')
    .insert({
      time_casa_id: homeTeamId,
      time_fora_id: awayTeamId,
      data: dateOnly,
      hora: hora,
      liga_id: ligaId,
      api_id: apiId,
      status: status || 'scheduled',
      rodada: rodada,
      gols_casa: golsCasa,
      gols_fora: golsFora,
    })
    .select()
    .single();

  if (createError || !newMatch) {
    return {
      success: false,
      id: null,
      error: `Falha ao criar partida: ${createError?.message || 'Unknown error'}`,
    };
  }

  if (provider && externalMatchId) {
    await supabase.from('external_id_map').upsert({
      source_id: provider,
      entity_type: 'match',
      external_id: String(externalMatchId),
      internal_id: newMatch.id,
      confidence: 'exact',
    }, { onConflict: 'source_id,entity_type,external_id' });
  }

  return {
    success: true,
    id: newMatch.id,
    source: 'created',
    isNew: true,
  };
}
