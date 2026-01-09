-- Table to store analytics integrations configuration
CREATE TABLE public.analytics_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- GA4 Configuration
  ga4_enabled BOOLEAN DEFAULT false,
  ga4_measurement_id TEXT,
  ga4_property_name TEXT,
  ga4_test_measurement_id TEXT,
  ga4_use_test_in_dev BOOLEAN DEFAULT true,
  -- Meta Pixel Configuration
  pixel_enabled BOOLEAN DEFAULT false,
  pixel_id TEXT,
  pixel_account_name TEXT,
  pixel_test_id TEXT,
  pixel_use_test_in_dev BOOLEAN DEFAULT true,
  -- Metadata
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.analytics_config ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "Admins can read analytics_config"
ON public.analytics_config
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update analytics_config"
ON public.analytics_config
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert analytics_config"
ON public.analytics_config
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public read for script injection (only enabled status and IDs)
CREATE POLICY "Anyone can read enabled analytics for script injection"
ON public.analytics_config
FOR SELECT
TO anon
USING (true);

-- Table to log analytics configuration changes
CREATE TABLE public.analytics_config_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value_masked TEXT,
  new_value_masked TEXT,
  environment TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_config_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read logs
CREATE POLICY "Admins can read analytics_config_logs"
ON public.analytics_config_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert logs
CREATE POLICY "Admins can insert analytics_config_logs"
ON public.analytics_config_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default row
INSERT INTO public.analytics_config (id) VALUES (gen_random_uuid());