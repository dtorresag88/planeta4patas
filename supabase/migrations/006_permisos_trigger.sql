-- La función del historial de pedidos solo se usa como trigger: no debe poder llamarse desde la API.
revoke execute on function public.log_order_change() from public, anon, authenticated;
