-- =====================================================================
-- 012 · Fecha de inicio de estadísticas de tráfico (para descartar pruebas)
--       y la página del pedido oculta líneas en cantidad 0 (pedidos editados)
-- =====================================================================
alter table public.store_settings add column if not exists analytics_since timestamptz;

create or replace function public.traffic_report(p_from timestamptz, p_to timestamptz)
returns json language plpgsql stable security definer set search_path = '' as $$
declare v json; v_from timestamptz;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  select greatest(p_from, coalesce(s.analytics_since, p_from)) into v_from from public.store_settings s where s.id = 1;
  with e as (select * from public.site_events where created_at >= v_from and created_at < p_to),
  ses as (
    select session,
           coalesce(max(source) filter (where event = 'visit'), 'directo') as source,
           coalesce(max(device) filter (where event = 'visit'), 'otro') as device,
           bool_or(event = 'purchase') as bought
      from e group by session)
  select json_build_object(
    'since', v_from,
    'funnel', (select json_build_object(
        'visit', count(distinct session) filter (where event = 'visit'),
        'view_product', count(distinct session) filter (where event = 'view_product'),
        'add_to_cart', count(distinct session) filter (where event = 'add_to_cart'),
        'begin_checkout', count(distinct session) filter (where event = 'begin_checkout'),
        'purchase', count(distinct session) filter (where event = 'purchase'),
        'popup_view', count(distinct session) filter (where event = 'popup_view'),
        'popup_submit', count(distinct session) filter (where event = 'popup_submit')) from e),
    'sources', (select coalesce(json_agg(x order by x.sessions desc), '[]') from
        (select source, count(*) as sessions, count(*) filter (where bought) as purchases from ses group by source) x),
    'devices', (select coalesce(json_agg(x order by x.sessions desc), '[]') from
        (select device, count(*) as sessions, count(*) filter (where bought) as purchases from ses group by device) x),
    'days', (select coalesce(json_agg(x order by x.day), '[]') from
        (select to_char(created_at at time zone 'America/Santiago', 'YYYY-MM-DD') as day, count(distinct session) as visits
           from e where event = 'visit' group by 1) x),
    'products', (select coalesce(json_agg(x order by x.views desc), '[]') from
        (select product_id, count(*) filter (where event = 'view_product') as views,
                count(*) filter (where event = 'add_to_cart') as adds
           from e where product_id is not null group by product_id order by 2 desc limit 30) x)
  ) into v;
  return v;
end; $$;

create or replace function public.get_order_status(p_id uuid, p_token uuid)
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'number', o.number, 'status', o.status, 'payment_method', o.payment_method,
    'customer_name', o.customer_name, 'delivery_method', o.delivery_method,
    'comuna', o.comuna, 'address', o.address, 'delivery_day', o.delivery_day,
    'subtotal', o.subtotal, 'shipping', o.shipping, 'discount', o.discount, 'discount_code', o.discount_code,
    'promo_discount', o.promo_discount, 'promotions', o.promotions, 'refunded', o.refunded,
    'reserved_until', o.reserved_until, 'total', o.total, 'created_at', o.created_at,
    'transfer_info', case when o.payment_method = 'transferencia' then (select s.transfer_info from public.store_settings s where s.id = 1) end,
    'items', coalesce((
      select json_agg(json_build_object('name', i.name, 'variant', i.variant_label, 'qty', i.qty, 'line_total', i.line_total, 'product_id', i.product_id))
      from public.order_items i where i.order_id = o.id and i.qty > 0), '[]'::json)
  )
  from public.orders o where o.id = p_id and o.access_token = p_token;
$$;
