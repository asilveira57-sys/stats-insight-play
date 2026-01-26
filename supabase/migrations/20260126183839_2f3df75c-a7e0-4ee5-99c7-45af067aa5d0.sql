-- =============================================
-- MERCADO PAGO INTEGRATION - COMPLETE SCHEMA
-- =============================================

-- 1. Create ENUM for subscription status if not exists
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'trial_active', 'active', 'past_due', 'canceled', 'blocked', 'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create ENUM for plan type
DO $$ BEGIN
  CREATE TYPE plan_type AS ENUM ('one_time_days', 'subscription_monthly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Create ENUM for payment status
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending', 'approved', 'authorized', 'in_process', 
    'in_mediation', 'rejected', 'cancelled', 'refunded', 'charged_back'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Create ENUM for payment method
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('credit_card', 'debit_card', 'pix', 'boleto', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. Create ENUM for webhook processing status
DO $$ BEGIN
  CREATE TYPE webhook_status AS ENUM ('pending', 'processing', 'processed', 'failed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 6. Create ENUM for ledger origin
DO $$ BEGIN
  CREATE TYPE ledger_origin AS ENUM ('payment', 'subscription', 'admin', 'refund', 'chargeback', 'trial', 'bonus');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- PLANS TABLE (Admin-managed catalog)
-- =============================================
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type plan_type NOT NULL,
  price_cents INTEGER NOT NULL,
  days INTEGER, -- for one_time_days
  period_months INTEGER DEFAULT 1, -- for subscription_monthly
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  highlight_label TEXT, -- e.g., "Mais vendido", "Melhor custo-benefício"
  mp_preapproval_plan_id TEXT, -- Mercado Pago plan ID for subscriptions
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- EVOLVE ASSINATURAS TABLE
-- =============================================
-- Add new columns to assinaturas if they don't exist
ALTER TABLE public.assinaturas 
  ADD COLUMN IF NOT EXISTS subscription_status subscription_status DEFAULT 'trial_active',
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mp_preapproval_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_payer_id TEXT,
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id),
  ADD COLUMN IF NOT EXISTS total_days_credited INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_payment_due TIMESTAMPTZ;

-- =============================================
-- MP_PAYMENTS TABLE (Payment records)
-- =============================================
CREATE TABLE IF NOT EXISTS public.mp_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.plans(id),
  mp_payment_id TEXT UNIQUE,
  mp_preference_id TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  status_detail TEXT,
  payment_method payment_method,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'BRL',
  payer_email TEXT,
  payer_document TEXT,
  external_reference TEXT,
  days_granted INTEGER,
  refundable_until TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

-- =============================================
-- MP_SUBSCRIPTIONS TABLE (Subscription records)
-- =============================================
CREATE TABLE IF NOT EXISTS public.mp_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.plans(id),
  mp_preapproval_id TEXT UNIQUE,
  mp_preapproval_plan_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  payer_email TEXT,
  payer_id TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  next_payment_date TIMESTAMPTZ,
  last_payment_date TIMESTAMPTZ,
  auto_recurring JSONB,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ
);

-- =============================================
-- WEBHOOK_EVENTS TABLE (Audit & Idempotency)
-- =============================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  action TEXT,
  resource_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processing_status webhook_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  payload JSONB,
  UNIQUE(event_id, topic)
);

-- =============================================
-- ENTITLEMENT_LEDGER TABLE (Day credits)
-- =============================================
CREATE TABLE IF NOT EXISTS public.entitlement_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  days_delta INTEGER NOT NULL,
  origin ledger_origin NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- =============================================
-- REFUNDS TABLE (Refund tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.mp_payments(id),
  user_id UUID NOT NULL,
  mp_refund_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  amount_cents INTEGER NOT NULL,
  days_revoked INTEGER DEFAULT 0,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  raw_data JSONB
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_mp_payments_user_id ON public.mp_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_payments_status ON public.mp_payments(status);
CREATE INDEX IF NOT EXISTS idx_mp_payments_mp_payment_id ON public.mp_payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_mp_subscriptions_user_id ON public.mp_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_subscriptions_status ON public.mp_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_topic ON public.webhook_events(topic);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_entitlement_ledger_user_id ON public.entitlement_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON public.refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_subscription_status ON public.assinaturas(subscription_status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_current_period_end ON public.assinaturas(current_period_end);

-- =============================================
-- RLS POLICIES
-- =============================================

-- PLANS: Public read, admin write
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone"
  ON public.plans FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can view all plans"
  ON public.plans FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage plans"
  ON public.plans FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- MP_PAYMENTS: User reads own, admin all
ALTER TABLE public.mp_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
  ON public.mp_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payments"
  ON public.mp_payments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- MP_SUBSCRIPTIONS: User reads own, admin all
ALTER TABLE public.mp_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON public.mp_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
  ON public.mp_subscriptions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- WEBHOOK_EVENTS: Admin only
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhook events"
  ON public.webhook_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ENTITLEMENT_LEDGER: User reads own, admin all
ALTER TABLE public.entitlement_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ledger"
  ON public.entitlement_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all ledger entries"
  ON public.entitlement_ledger FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- REFUNDS: User reads own, admin all
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own refunds"
  ON public.refunds FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all refunds"
  ON public.refunds FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to recalculate user access
CREATE OR REPLACE FUNCTION public.recalculate_user_access(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_total_days INTEGER;
  v_new_status subscription_status;
  v_period_end TIMESTAMPTZ;
  v_grace_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
  v_result JSONB;
BEGIN
  -- Get or create subscription record
  SELECT * INTO v_subscription FROM assinaturas WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Create new subscription with trial
    INSERT INTO assinaturas (
      user_id, 
      subscription_status, 
      trial_ends_at,
      current_period_start,
      current_period_end,
      tipo_plano,
      status
    ) VALUES (
      p_user_id,
      'trial_active',
      v_now + INTERVAL '7 days',
      v_now,
      v_now + INTERVAL '7 days',
      'free',
      'active'
    )
    RETURNING * INTO v_subscription;
    
    -- Add trial days to ledger
    INSERT INTO entitlement_ledger (user_id, days_delta, origin, description)
    VALUES (p_user_id, 7, 'trial', 'Trial period - 7 days');
    
    RETURN jsonb_build_object(
      'status', 'trial_active',
      'period_end', v_subscription.current_period_end,
      'message', 'Trial started'
    );
  END IF;
  
  -- Calculate total days from ledger
  SELECT COALESCE(SUM(days_delta), 0) INTO v_total_days
  FROM entitlement_ledger WHERE user_id = p_user_id;
  
  -- Check for active MP subscription
  IF EXISTS (
    SELECT 1 FROM mp_subscriptions 
    WHERE user_id = p_user_id AND status = 'authorized'
  ) THEN
    -- Recurrent subscription active
    v_new_status := 'active';
    
    SELECT next_payment_date INTO v_period_end
    FROM mp_subscriptions 
    WHERE user_id = p_user_id AND status = 'authorized'
    LIMIT 1;
    
    IF v_period_end IS NULL THEN
      v_period_end := v_now + INTERVAL '1 month';
    END IF;
    
  ELSIF v_subscription.grace_until IS NOT NULL AND v_subscription.grace_until > v_now THEN
    -- In grace period
    v_new_status := 'past_due';
    v_period_end := v_subscription.grace_until;
    
  ELSIF v_subscription.trial_ends_at IS NOT NULL AND v_subscription.trial_ends_at > v_now THEN
    -- Still in trial
    v_new_status := 'trial_active';
    v_period_end := v_subscription.trial_ends_at;
    
  ELSIF v_subscription.current_period_end IS NOT NULL AND v_subscription.current_period_end > v_now THEN
    -- Has paid time remaining
    v_new_status := 'active';
    v_period_end := v_subscription.current_period_end;
    
  ELSE
    -- No active subscription or time remaining
    IF v_subscription.cancelled_at IS NOT NULL THEN
      v_new_status := 'canceled';
    ELSE
      v_new_status := 'expired';
    END IF;
    v_period_end := v_subscription.current_period_end;
  END IF;
  
  -- Update subscription record
  UPDATE assinaturas SET
    subscription_status = v_new_status,
    current_period_end = v_period_end,
    total_days_credited = v_total_days,
    updated_at = v_now,
    tipo_plano = CASE WHEN v_new_status IN ('active', 'trial_active', 'past_due') THEN 'premium' ELSE 'free' END,
    status = CASE WHEN v_new_status IN ('active', 'trial_active', 'past_due') THEN 'active' ELSE 'expired' END
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'status', v_new_status,
    'period_end', v_period_end,
    'total_days', v_total_days,
    'grace_until', v_subscription.grace_until
  );
END;
$$;

-- Function to grant days to user
CREATE OR REPLACE FUNCTION public.grant_days_to_user(
  p_user_id UUID,
  p_days INTEGER,
  p_origin ledger_origin,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_new_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Insert ledger entry
  INSERT INTO entitlement_ledger (
    user_id, days_delta, origin, reference_id, reference_type, description
  ) VALUES (
    p_user_id, p_days, p_origin, p_reference_id, p_reference_type, p_description
  );
  
  -- Get current subscription
  SELECT * INTO v_subscription FROM assinaturas WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Create subscription
    INSERT INTO assinaturas (
      user_id,
      subscription_status,
      current_period_start,
      current_period_end,
      total_days_credited,
      tipo_plano,
      status
    ) VALUES (
      p_user_id,
      'active',
      v_now,
      v_now + (p_days || ' days')::INTERVAL,
      p_days,
      'premium',
      'active'
    );
    v_new_end := v_now + (p_days || ' days')::INTERVAL;
  ELSE
    -- Extend existing subscription
    IF v_subscription.current_period_end IS NULL OR v_subscription.current_period_end < v_now THEN
      v_new_end := v_now + (p_days || ' days')::INTERVAL;
    ELSE
      v_new_end := v_subscription.current_period_end + (p_days || ' days')::INTERVAL;
    END IF;
    
    UPDATE assinaturas SET
      subscription_status = 'active',
      current_period_end = v_new_end,
      total_days_credited = COALESCE(total_days_credited, 0) + p_days,
      tipo_plano = 'premium',
      status = 'active',
      updated_at = v_now
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'days_granted', p_days,
    'new_period_end', v_new_end
  );
END;
$$;

-- Function to start grace period
CREATE OR REPLACE FUNCTION public.start_grace_period(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grace_end TIMESTAMPTZ := now() + INTERVAL '7 days';
BEGIN
  UPDATE assinaturas SET
    subscription_status = 'past_due',
    grace_until = v_grace_end,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'grace_until', v_grace_end
  );
END;
$$;

-- =============================================
-- SEED DEFAULT PLANS
-- =============================================
INSERT INTO public.plans (name, description, type, price_cents, days, period_months, display_order, highlight_label, features) VALUES
  ('30 dias', 'Acesso completo por 30 dias', 'one_time_days', 2490, 30, NULL, 1, NULL, '["Navegação sem anúncios", "Estatísticas avançadas", "Palpites ilimitados"]'::jsonb),
  ('90 dias', 'Acesso completo por 90 dias', 'one_time_days', 5990, 90, NULL, 2, NULL, '["Navegação sem anúncios", "Estatísticas avançadas", "Palpites ilimitados", "Exportação CSV"]'::jsonb),
  ('180 dias', 'Acesso completo por 180 dias', 'one_time_days', 9990, 180, NULL, 3, 'Mais vendido', '["Navegação sem anúncios", "Estatísticas avançadas", "Palpites ilimitados", "Exportação CSV", "Alertas personalizados"]'::jsonb),
  ('365 dias', 'Acesso completo por 1 ano', 'one_time_days', 17990, 365, NULL, 4, 'Máxima economia', '["Navegação sem anúncios", "Estatísticas avançadas", "Palpites ilimitados", "Exportação CSV", "Alertas personalizados", "Acesso antecipado"]'::jsonb),
  ('Mensal', 'Assinatura mensal com renovação automática', 'subscription_monthly', 1990, NULL, 1, 0, 'Recomendado', '["Navegação sem anúncios", "Estatísticas avançadas", "Palpites ilimitados", "Exportação CSV", "Cancele quando quiser"]'::jsonb)
ON CONFLICT DO NOTHING;

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_plans_updated_at ON public.plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_mp_payments_updated_at ON public.mp_payments;
CREATE TRIGGER update_mp_payments_updated_at
  BEFORE UPDATE ON public.mp_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_mp_subscriptions_updated_at ON public.mp_subscriptions;
CREATE TRIGGER update_mp_subscriptions_updated_at
  BEFORE UPDATE ON public.mp_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();