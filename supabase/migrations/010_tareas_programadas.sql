-- =====================================================================
-- 010 · Tareas programadas (pg_cron + pg_net)
--   · cada 5 min: libera reservas de stock vencidas
--   · todos los días 13:00 UTC (~10:00 Chile): recordatorios de recompra por correo
--     (la función "marketing" solo envía si está activado en el panel y hay correo conectado)
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('p4p-liberar-reservas', '*/5 * * * *', $$select public.release_expired_reservations()$$);
select cron.schedule('p4p-recompra-diaria', '0 13 * * *', $$
  select net.http_post(
    url := 'https://nfwezvfzmbxkjptubdvi.supabase.co/functions/v1/marketing',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"action": "cron_reminders"}'::jsonb)
$$);
