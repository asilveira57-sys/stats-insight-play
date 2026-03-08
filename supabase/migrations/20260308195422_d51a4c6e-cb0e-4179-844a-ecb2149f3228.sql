ALTER TABLE public.kaggle_column_mappings 
ADD CONSTRAINT uq_kaggle_col_mapping_file_col 
UNIQUE (dataset_file_id, source_column_name);