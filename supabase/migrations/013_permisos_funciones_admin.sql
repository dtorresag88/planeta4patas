-- 013 · Las funciones de administración no se exponen al rol anónimo
revoke execute on function public.register_return(jsonb) from public, anon;
revoke execute on function public.generate_discount_codes(uuid, integer, text) from public, anon;
revoke execute on function public.traffic_report(timestamptz, timestamptz) from public, anon;
revoke execute on function public.is_admin_or_service() from public, anon;
