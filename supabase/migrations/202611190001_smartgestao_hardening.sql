-- SmartGestão: migração aditiva e endurecimento de create_company
-- Não remove tabelas, registros, políticas nem associações existentes.
BEGIN;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS cost numeric(12,2);
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS technician text;

CREATE OR REPLACE FUNCTION public.create_company(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  new_company_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;
  IF p_name IS NULL OR pg_catalog.btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Nome da empresa obrigatorio';
  END IF;
  INSERT INTO public.companies(name)
  VALUES (pg_catalog.btrim(p_name))
  RETURNING id INTO new_company_id;
  INSERT INTO public.company_members(company_id, user_id, role)
  VALUES (new_company_id, auth.uid(), 'owner');
  RETURN new_company_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_company(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_company(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_company(text) TO authenticated;
COMMIT;
