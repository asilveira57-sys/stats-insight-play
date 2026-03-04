import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TableNames = keyof Database['public']['Tables'];

/**
 * Fetches all records from a Supabase query without the 1000-row limit.
 * Uses pagination to recursively fetch all data.
 * 
 * @param table - The table name to query
 * @param selectColumns - The columns to select (can include joins)
 * @param filters - Optional function to apply filters to the query
 * @param orderBy - Optional order configuration
 * @param batchSize - Number of records per batch (default: 1000)
 * @returns All matching records
 */
export async function fetchAllRecords<T>(
  table: TableNames,
  selectColumns: string,
  filters?: (query: any) => any,
  orderBy?: { column: string; ascending?: boolean },
  batchSize: number = 1000
): Promise<T[]> {
  const allRecords: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(table)
      .select(selectColumns)
      .range(offset, offset + batchSize - 1);

    // Apply filters if provided
    if (filters) {
      query = filters(query);
    }

    // Apply ordering if provided
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      allRecords.push(...(data as T[]));
      offset += batchSize;
      
      // If we got fewer records than batchSize, we've reached the end
      if (data.length < batchSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return allRecords;
}

/**
 * Counts all records from a table with optional filters.
 * This bypasses the default limit for accurate counts.
 */
export async function countAllRecords(
  table: TableNames,
  filters?: (query: any) => any
): Promise<number> {
  let query = (supabase
    .from(table) as any)
    .select('*', { count: 'exact', head: true });

  if (filters) {
    query = filters(query);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count || 0;
}
