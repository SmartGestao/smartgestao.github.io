-- Integração automática: OS pronta gera receita pendente no Financeiro.
-- A coluna nullable mantém compatibilidade com lançamentos manuais já existentes.
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS service_order_id uuid
  REFERENCES public.service_orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS financial_entries_service_order_id_uidx
  ON public.financial_entries (service_order_id)
  WHERE service_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_financial_entry_for_completed_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'completed'
     AND COALESCE(NEW.budget, 0) > 0
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.financial_entries
      (company_id, service_order_id, entry_date, amount, status, category, description, entry_type)
    VALUES
      (NEW.company_id, NEW.id, CURRENT_DATE, NEW.budget, 'pending', 'Serviços',
       'OS-' || lpad(NEW.order_number::text, 4, '0') || ' — ' || COALESCE(NEW.description, 'Serviço'),
       'income')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_orders_financial_entry_on_completed
  ON public.service_orders;

CREATE TRIGGER service_orders_financial_entry_on_completed
AFTER INSERT OR UPDATE OF status ON public.service_orders
FOR EACH ROW
EXECUTE FUNCTION public.create_financial_entry_for_completed_order();
