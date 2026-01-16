/**
 * Canonical Key Utilities for Frontend
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
 * Interface for external ID mapping
 */
export interface ExternalIdMapping {
  id: string;
  entity_type: EntityType;
  internal_id: string;
  external_id: string;
  source_id: string | null;
  confidence: 'low' | 'medium' | 'high' | 'exact';
  metadata?: Record<string, unknown>;
}
