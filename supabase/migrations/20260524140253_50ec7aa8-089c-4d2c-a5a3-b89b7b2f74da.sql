
TRUNCATE TABLE
  public.kaggle_staging_matches,
  public.kaggle_staging_rows,
  public.kaggle_raw_assets,
  public.kaggle_match_links,
  public.kaggle_import_logs,
  public.historical_staging_matches,
  public.historical_raw_documents,
  public.historical_import_logs,
  public.cartola_scouts_rodada,
  public.cartola_partidas,
  public.cartola_atletas,
  public.team_merge_analysis_cache
RESTART IDENTITY CASCADE;
