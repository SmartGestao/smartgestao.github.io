-- SmartGestão: estrutura segura para assinaturas Asaas.
-- Migração aditiva: não altera nem remove dados existentes.
BEGIN;

CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  asaas_customer_id text NOT NULL,
  asaas_subscription_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'past_due', 'cancelled', 'inactive')),
  billing_type text NOT NULL DEFAULT 'UNDEFINED',
  amount numeric(12,2) NOT NULL DEFAULT 39.90 CHECK (amount > 0),
  next_due_date date,
  last_payment_id text,
  last_payment_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_subscriptions_status_idx
  ON public.company_subscriptions(status);

CREATE TABLE IF NOT EXISTS public.asaas_webhook_events (
  event_id text PRIMARY KEY,
  event_name text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_webhook_events ENABLE ROW LEVEL SECURITY;

-- Apenas Edge Functions com service_role podem ler ou alterar estes registros.
REVOKE ALL ON TABLE public.company_subscriptions FROM anon, authenticated;
REVOKE ALL ON TABLE public.asaas_webhook_events FROM anon, authenticated;

-- Permite que apenas a Edge Function, via service_role, gerencie as assinaturas.
GRANT ALL PRIVILEGES ON TABLE public.company_subscriptions TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.asaas_webhook_events TO service_role;

COMMIT;
