
ALTER TABLE public.user_fiscal_data
  ADD COLUMN ie TEXT,
  ADD COLUMN ie_isento BOOLEAN DEFAULT false;
