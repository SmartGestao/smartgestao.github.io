-- SmartGestão: exige assinatura ativa também no banco, não apenas na interface.
-- Política RESTRICTIVE complementa as políticas de isolamento por company_id já existentes.
BEGIN;

CREATE OR REPLACE FUNCTION public.company_has_active_subscription(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_subscriptions s
    WHERE s.company_id = p_company_id
      AND s.status = 'active'
  );
$function$;

REVOKE ALL ON FUNCTION public.company_has_active_subscription(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.company_has_active_subscription(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.company_has_active_subscription(uuid) TO authenticated;

DROP POLICY IF EXISTS require_active_subscription_customers ON public.customers;
CREATE POLICY require_active_subscription_customers
  ON public.customers AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (public.company_has_active_subscription(company_id))
  WITH CHECK (public.company_has_active_subscription(company_id));

DROP POLICY IF EXISTS require_active_subscription_devices ON public.devices;
CREATE POLICY require_active_subscription_devices
  ON public.devices AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (public.company_has_active_subscription(company_id))
  WITH CHECK (public.company_has_active_subscription(company_id));

DROP POLICY IF EXISTS require_active_subscription_inventory ON public.inventory;
CREATE POLICY require_active_subscription_inventory
  ON public.inventory AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (public.company_has_active_subscription(company_id))
  WITH CHECK (public.company_has_active_subscription(company_id));

DROP POLICY IF EXISTS require_active_subscription_service_orders ON public.service_orders;
CREATE POLICY require_active_subscription_service_orders
  ON public.service_orders AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (public.company_has_active_subscription(company_id))
  WITH CHECK (public.company_has_active_subscription(company_id));

DROP POLICY IF EXISTS require_active_subscription_financial_entries ON public.financial_entries;
CREATE POLICY require_active_subscription_financial_entries
  ON public.financial_entries AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (public.company_has_active_subscription(company_id))
  WITH CHECK (public.company_has_active_subscription(company_id));

COMMIT;
