

## Diagnosis

The pipeline downloads and stages rows, but **all mapped fields (`raw_home_team`, `raw_away_team`, etc.) are NULL** in `kaggle_staging_matches`. Here's why:

1. The **profile** step tries to persist column mappings via `.upsert(..., { onConflict: "dataset_file_id,source_column_name" })`, but **there is no unique constraint** on those columns in `kaggle_column_mappings`. The upsert silently fails.
2. With 0 mappings in the database, the **stage** step has an empty `mappingLookup`, so every CSV column value is discarded --- all staging rows end up with NULL team names, dates, and scores.
3. The **resolve** step finds 0 teams / 0 competitions (everything is NULL), and **promote** finds 0 new records.

**Evidence from database**:
- `kaggle_column_mappings` table: **0 rows** total.
- `kaggle_staging_matches` for all jobs: `raw_home_team` = NULL, `raw_away_team` = NULL for every row.

## Plan

### 1. Database migration: Add unique constraint
Add the missing unique constraint to `kaggle_column_mappings`:
```sql
ALTER TABLE public.kaggle_column_mappings 
ADD CONSTRAINT uq_kaggle_col_mapping_file_col 
UNIQUE (dataset_file_id, source_column_name);
```

### 2. Fix `kaggle-process` profile step (fallback insert)
Update `supabase/functions/kaggle-process/index.ts` to also use a plain `.insert()` with individual conflict handling as a fallback, ensuring mappings are always persisted even if the upsert path has issues.

### 3. Clean stale staging data
Delete the broken staging rows (all NULLs) from previous failed attempts so re-imports start fresh:
```sql
DELETE FROM kaggle_staging_matches WHERE raw_home_team IS NULL;
DELETE FROM kaggle_staging_teams WHERE job_id IN (select id from kaggle_import_jobs where total_promoted = 0);
DELETE FROM kaggle_staging_competitions WHERE job_id IN (select id from kaggle_import_jobs where total_promoted = 0);
```
Reset the stuck jobs back to `downloading` status so they can be re-processed.

### 4. Enhance column name matching
The `results.csv` from the "International Football Results" dataset uses columns like `home_team`, `away_team`, `tournament`, `home_score`, `away_score`. The profiling normalizer converts `home_team` → `home_team` which matches the dictionary. However, I'll add additional aliases like `tournament` → `competicao` to improve coverage.

### 5. Redeploy `kaggle-process`
Redeploy the edge function so the fix takes effect.

### Files to modify
- **New migration SQL** --- add unique constraint
- **`supabase/functions/kaggle-process/index.ts`** --- fix mapping persistence, add more column aliases
- **Data cleanup** --- delete broken staging rows + reset jobs

