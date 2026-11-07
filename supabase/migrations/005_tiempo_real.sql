-- Avisos en tiempo real de pedidos nuevos en el panel (respeta RLS: solo administradores los reciben)
alter publication supabase_realtime add table public.orders;
