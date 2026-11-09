-- =====================================================================
-- 014 · Meta (Facebook/Instagram): Pixel + API de Conversiones + catálogo
--   · store_settings.meta_*: ID del pixel, código de prueba y aviso de cookies
--   · orders.meta: datos del navegador para la API de Conversiones (fbp, fbc, IP, user agent, consentimiento)
--   · al pagarse un pedido web se avisa a la función "meta" (pg_net), que envía la compra a Meta
--     una sola vez (meta_sent_at). El token se configura como secreto META_CAPI_TOKEN.
-- =====================================================================
alter table public.store_settings
  add column if not exists meta_pixel_id text,
  add column if not exists meta_test_event_code text,
  add column if not exists meta_consent boolean not null default false;

alter table public.orders
  add column if not exists meta jsonb,
  add column if not exists meta_sent_at timestamptz,
  add column if not exists meta_error text;

create or replace function public.orders_notify_meta()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.paid_at is not null and old.paid_at is null and new.source = 'web' and new.meta_sent_at is null
     and coalesce((select nullif(trim(s.meta_pixel_id), '') from public.store_settings s where s.id = 1), '') <> '' then
    perform net.http_post(
      url := 'https://nfwezvfzmbxkjptubdvi.supabase.co/functions/v1/meta',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('action', 'purchase', 'order_id', new.id));
  end if;
  return new;
end; $$;
revoke execute on function public.orders_notify_meta() from public, anon, authenticated;

create trigger orders_notify_meta after update of paid_at on public.orders
  for each row execute function public.orders_notify_meta();
