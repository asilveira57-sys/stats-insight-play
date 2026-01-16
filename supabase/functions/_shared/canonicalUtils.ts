/**
 * Canonical Key Utilities for Edge Functions (Backend)
 * These functions mirror the database functions for consistent behavior
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
 * Compare two names for canonical matching
 */
export function namesMatch(name1: string, name2: string): boolean {
  return normalizeName(name1) === normalizeName(name2);
}

/**
 * Entity types supported by external_id_map
 */
export type EntityType = 'match' | 'team' | 'league';

/**
 * Interface for league resolution result
 */
export interface LeagueResolutionResult {
  success: boolean;
  leagueId: string | null;
  error?: string;
  source?: 'external_id_map' | 'slug_match' | 'name_match';
}

/**
 * Interface for team resolution result
 */
export interface TeamResolutionResult {
  success: boolean;
  teamId: string | null;
  error?: string;
  source?: 'external_id_map' | 'slug_match' | 'name_match' | 'created';
  created?: boolean;
}

/**
 * Resolve a canonical league ID from provider information
 * 
 * (a) If externalLeagueId exists: search in external_id_map (entity_type='league') → return internal_id
 * (b) Else: try to find in ligas by slug or normalized name
 * (c) If not found: create a pending entry in sync_logs and return error
 */
export async function resolveLeagueId(
  supabase: any,
  params: {
    provider: string;  // source_id from data_sources
    externalLeagueId?: string | number;
    leagueName: string;
  }
): Promise<LeagueResolutionResult> {
  const { provider, externalLeagueId, leagueName } = params;

  // (a) Try external_id_map first if we have an external ID
  if (externalLeagueId) {
    const { data: mapping, error: mappingError } = await supabase
      .from('external_id_map')
      .select('internal_id')
      .eq('source_id', provider)
      .eq('entity_type', 'league')
      .eq('external_id', String(externalLeagueId))
      .maybeSingle();

    if (!mappingError && mapping?.internal_id) {
      return {
        success: true,
        leagueId: mapping.internal_id,
        source: 'external_id_map',
      };
    }
  }

  // (b) Try to find by slug
  const slug = slugify(leagueName);
  if (slug) {
    const { data: leagueBySlug } = await supabase
      .from('ligas')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (leagueBySlug?.id) {
      // Register the mapping if we have an external ID
      if (externalLeagueId) {
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
        leagueId: leagueBySlug.id,
        source: 'slug_match',
      };
    }
  }

  // Try to find by normalized name
  const normalizedName = normalizeName(leagueName);
  const { data: allLeagues } = await supabase
    .from('ligas')
    .select('id, nome');

  if (allLeagues) {
    const matchingLeague = allLeagues.find((l: any) => 
      normalizeName(l.nome) === normalizedName
    );

    if (matchingLeague) {
      // Register the mapping if we have an external ID
      if (externalLeagueId) {
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
        leagueId: matchingLeague.id,
        source: 'name_match',
      };
    }
  }

  // (c) Not found - create pending entry in sync_logs
  await supabase.from('sync_logs').insert({
    source_id: provider,
    entity_type: 'league_mapping_missing',
    status: 'pending',
    details: {
      external_id: externalLeagueId ? String(externalLeagueId) : null,
      league_name: leagueName,
      normalized_name: normalizedName,
      slug: slug,
    },
    error_message: `Liga não encontrada: ${leagueName} (external_id: ${externalLeagueId || 'N/A'})`,
  });

  return {
    success: false,
    leagueId: null,
    error: `Liga não encontrada: ${leagueName}. Pendência registrada para revisão manual.`,
  };
}

/**
 * Resolve a canonical team ID from provider information
 * 
 * (a) If externalTeamId exists: search in external_id_map (entity_type='team') → return internal_id
 * (b) Else: try to find in times by slug or normalized name
 * (c) If not found: create new team with nome=teamName, generate slug, and create external_id_map entry
 */
export async function resolveTeamId(
  supabase: any,
  params: {
    provider: string;  // source_id from data_sources
    externalTeamId?: string | number;
    teamName: string;
    teamLogo?: string;
    country?: string;
  }
): Promise<TeamResolutionResult> {
  const { provider, externalTeamId, teamName, teamLogo, country } = params;

  // (a) Try external_id_map first if we have an external ID
  if (externalTeamId) {
    const { data: mapping, error: mappingError } = await supabase
      .from('external_id_map')
      .select('internal_id')
      .eq('source_id', provider)
      .eq('entity_type', 'team')
      .eq('external_id', String(externalTeamId))
      .maybeSingle();

    if (!mappingError && mapping?.internal_id) {
      return {
        success: true,
        teamId: mapping.internal_id,
        source: 'external_id_map',
      };
    }
  }

  // (b) Try to find by slug
  const slug = slugify(teamName);
  if (slug) {
    const { data: teamBySlug } = await supabase
      .from('times')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (teamBySlug?.id) {
      // Register the mapping if we have an external ID
      if (externalTeamId) {
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
        teamId: teamBySlug.id,
        source: 'slug_match',
      };
    }
  }

  // Try to find by normalized name
  const normalizedName = normalizeName(teamName);
  const { data: allTeams } = await supabase
    .from('times')
    .select('id, nome');

  if (allTeams) {
    const matchingTeam = allTeams.find((t: any) => 
      normalizeName(t.nome) === normalizedName
    );

    if (matchingTeam) {
      // Register the mapping if we have an external ID
      if (externalTeamId) {
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
        teamId: matchingTeam.id,
        source: 'name_match',
      };
    }
  }

  // Also check team_aliases
  if (normalizedName.length > 0) {
    const { data: alias } = await supabase
      .from('team_aliases')
      .select('team_id')
      .eq('normalized_alias', normalizedName)
      .maybeSingle();

    if (alias?.team_id) {
      // Register the mapping if we have an external ID
      if (externalTeamId) {
        await supabase.from('external_id_map').upsert({
          source_id: provider,
          entity_type: 'team',
          external_id: String(externalTeamId),
          internal_id: alias.team_id,
          confidence: 'medium',
        }, { onConflict: 'source_id,entity_type,external_id' });
      }
      return {
        success: true,
        teamId: alias.team_id,
        source: 'name_match',
      };
    }
  }

  // (c) Create new team
  const { data: newTeam, error: createError } = await supabase
    .from('times')
    .insert({
      nome: teamName,
      escudo_url: teamLogo || null,
      pais: country || null,
      // slug will be auto-generated by trigger
    })
    .select('id')
    .single();

  if (createError || !newTeam) {
    return {
      success: false,
      teamId: null,
      error: `Erro ao criar time: ${createError?.message || 'Desconhecido'}`,
    };
  }

  // Register the mapping if we have an external ID
  if (externalTeamId) {
    await supabase.from('external_id_map').upsert({
      source_id: provider,
      entity_type: 'team',
      external_id: String(externalTeamId),
      internal_id: newTeam.id,
      confidence: 'exact',
    }, { onConflict: 'source_id,entity_type,external_id' });
  }

  // Create an alias for easier future matching
  await supabase.from('team_aliases').insert({
    team_id: newTeam.id,
    source_id: provider,
    alias: teamName,
    normalized_alias: normalizedName,
  });

  return {
    success: true,
    teamId: newTeam.id,
    source: 'created',
    created: true,
  };
}
