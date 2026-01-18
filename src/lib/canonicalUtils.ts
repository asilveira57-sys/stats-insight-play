/**
 * Canonical Key Utilities for Frontend
 * Sistema de slugs canônicos para importação idempotente
 * 
 * Regras:
 * 1. Slugs são imutáveis após criação
 * 2. Mesmo nome sempre gera mesmo slug base
 * 3. Conflitos resolvidos com sufixo incremental (-2, -3)
 * 4. Importações são idempotentes
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
 * Validate that a name is not empty or null
 */
export function validateName(name: string | null | undefined): boolean {
  if (!name) return false;
  return name.trim().length > 0;
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
