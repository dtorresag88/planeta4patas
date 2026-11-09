-- =====================================================================
-- 009 · Reservas de stock, promociones automáticas, códigos únicos, grupos
--       de clientes, búsquedas, tráfico, reseñas, recompra, correo,
--       devoluciones y códigos de barras.
-- =====================================================================

-- ---------------------------------------------------------------- columnas
alter table public.orders
  add column if not exists reserved_until timestamptz,
  add column if not exists promo_discount int not null default 0,
  add column if not exists promotions jsonb not null default '[]'::jsonb,
  add column if not exists refunded int not null default 0;

alter table public.store_settings
  add column if not exists reserve_minutes int not null default 30,
  add column if not exists transfer_reserve_hours int not null default 48,
  add column if not exists popup_unique_codes boolean not null default true,
  add column if not exists umami_website_id text,
  add column if not exists reviews_enabled boolean not null default true,
  add column if not exists reviews_auto_approve boolean not null default false,
  add column if not exists email_from text,
  add column if not exists email_configured boolean not null default false,
  add column if not exists reminders_auto boolean not null default false;

alter table public.product_variants add column if not exists barcode text;
create unique index if not exists product_variants_barcode_key on public.product_variants(barcode) where barcode is not null;

alter table public.products add column if not exists replenish_days int check (replenish_days is null or replenish_days between 1 and 365);
alter table public.categories add column if not exists replenish_days int check (replenish_days is null or replenish_days between 1 and 365);
update public.categories set replenish_days = 30 where slug in ('alimento-perro', 'alimento-gato', 'arena') and replenish_days is null;
update public.categories set replenish_days = 21 where slug in ('humedo', 'snacks') and replenish_days is null;

-- Admin o funciones del servidor (service_role)
create or replace function public.is_admin_or_service()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

-- ================================================================ 1. RESERVAS
create or replace function public.reserve_order(p_order uuid)
returns json language plpgsql security definer set search_path = '' as $$
declare o public.orders; v_short text; v_min int; v_until timestamptz;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then return json_build_object('ok', false, 'error', 'Pedido no encontrado'); end if;
  if o.stock_applied or o.paid_at is not null then return json_build_object('ok', true); end if;
  -- bloquea los formatos en orden para evitar ventas simultáneas de la última unidad
  perform 1 from public.product_variants v
   where v.id in (select i.variant_id from public.order_items i where i.order_id = p_order)
   order by v.id for update;
  select string_agg(i.name || ' ' || i.variant_label || ' (quedan ' || greatest(v.stock, 0) || ')', ', ') into v_short
    from public.order_items i join public.product_variants v on v.id = i.variant_id
   where i.order_id = p_order and v.stock is not null and v.stock < i.qty;
  if v_short is not null then return json_build_object('ok', false, 'error', 'Stock insuficiente: ' || v_short); end if;

  with upd as (
    update public.product_variants v set stock = v.stock - i.qty
      from public.order_items i
     where i.order_id = p_order and i.variant_id = v.id and v.stock is not null
    returning v.id, v.stock, i.qty)
  insert into public.inventory_adjustments(variant_id, delta, stock_after, reason, actor)
  select id, -qty, stock, 'Reserva · pedido #' || o.number, 'Sistema' from upd;

  select case when o.payment_method = 'transferencia' then s.transfer_reserve_hours * 60 else s.reserve_minutes end
    into v_min from public.store_settings s where s.id = 1;
  v_until := now() + make_interval(mins => greatest(coalesce(v_min, 30), 5));
  update public.orders set stock_applied = true, reserved_until = v_until where id = p_order;
  return json_build_object('ok', true, 'reserved_until', v_until);
end; $$;

create or replace function public.release_order_stock(p_order uuid, p_reason text default 'pago no completado')
returns boolean language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order for update;
  if not found or not o.stock_applied or o.paid_at is not null then return false; end if;
  with upd as (
    update public.product_variants v set stock = v.stock + i.qty
      from public.order_items i
     where i.order_id = p_order and i.variant_id = v.id and v.stock is not null
    returning v.id, v.stock, i.qty)
  insert into public.inventory_adjustments(variant_id, delta, stock_after, reason, actor)
  select id, qty, stock, 'Reserva liberada · pedido #' || o.number, 'Sistema' from upd;
  update public.orders set stock_applied = false, reserved_until = null where id = p_order;
  insert into public.order_events(order_id, kind, message, actor)
  values (p_order, 'stock', 'Stock liberado: ' || p_reason, 'Sistema');
  return true;
end; $$;

create or replace function public.release_expired_reservations()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in select id from public.orders
            where status in ('pendiente_pago', 'rechazado') and stock_applied and paid_at is null
              and reserved_until is not null and reserved_until < now()
  loop
    if public.release_order_stock(r.id, 'el pago no se completó a tiempo') then n := n + 1; end if;
  end loop;
  return n;
end; $$;

create or replace function public.mark_order_paid(p_order uuid, p_ref text, p_detail jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then return; end if;

  update public.orders
     set status = case when status in ('pendiente_pago', 'rechazado') then 'pagado' else status end,
         paid_at = coalesce(paid_at, now()),
         payment_ref = coalesce(p_ref, payment_ref),
         payment_detail = p_detail,
         reserved_until = null
   where id = p_order;

  if not o.stock_applied then
    with upd as (
      update public.product_variants v set stock = greatest(v.stock - i.qty, 0)
        from public.order_items i
       where i.order_id = p_order and i.variant_id = v.id and v.stock is not null
      returning v.id, v.stock, i.qty)
    insert into public.inventory_adjustments(variant_id, delta, stock_after, reason, actor)
    select id, -qty, stock, 'Venta · pedido #' || o.number, 'Sistema' from upd;
    update public.orders set stock_applied = true where id = p_order;
  end if;

  if o.paid_at is null then
    if o.discount_code is not null then
      update public.discounts set used_count = used_count + 1
       where code = o.discount_code
          or id = (select dc.discount_id from public.discount_codes dc where dc.code = o.discount_code);
      update public.discount_codes set used_at = now(), order_id = o.id
       where code = o.discount_code and used_at is null;
    end if;
    update public.promotions set used_count = used_count + 1
     where id in (select (x ->> 'id')::uuid from jsonb_array_elements(o.promotions) x where x ? 'id');
  end if;
end; $$;

create or replace function public.mark_order_failed(p_order uuid, p_detail jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.orders set status = 'rechazado', payment_detail = p_detail
   where id = p_order and status = 'pendiente_pago';
  perform public.release_order_stock(p_order, 'pago rechazado');
end; $$;

revoke execute on function public.reserve_order(uuid) from public, anon, authenticated;
revoke execute on function public.release_order_stock(uuid, text) from public, anon, authenticated;
revoke execute on function public.release_expired_reservations() from public, anon, authenticated;
revoke execute on function public.mark_order_paid(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.mark_order_failed(uuid, jsonb) from public, anon, authenticated;

-- ================================================================ 2. CÓDIGOS ÚNICOS
create table if not exists public.discount_codes (
  code text primary key check (code = upper(code) and length(code) between 3 and 40),
  discount_id uuid not null references public.discounts(id) on delete cascade,
  email text,
  used_at timestamptz,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists discount_codes_discount_idx on public.discount_codes(discount_id);
create index if not exists discount_codes_email_idx on public.discount_codes(email);
alter table public.discount_codes enable row level security;
create policy "dcodes_admin" on public.discount_codes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.gen_code(p_prefix text)
returns text language sql volatile set search_path = '' as $$
  select upper(left(regexp_replace(coalesce(nullif(p_prefix, ''), 'P4P'), '[^A-Za-z0-9]', '', 'g'), 8)) || '-' ||
         (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), '')
            from generate_series(1, 6));
$$;
revoke execute on function public.gen_code(text) from public, anon, authenticated;

create or replace function public.generate_discount_codes(p_discount uuid, p_count int, p_prefix text default null)
returns text[] language plpgsql security definer set search_path = '' as $$
declare d public.discounts; v_out text[] := '{}'; v_code text; v_tries int := 0;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  select * into d from public.discounts where id = p_discount;
  if not found then raise exception 'Descuento no encontrado'; end if;
  if p_count is null or p_count < 1 or p_count > 1000 then raise exception 'Puedes generar entre 1 y 1000 códigos'; end if;
  while coalesce(array_length(v_out, 1), 0) < p_count and v_tries < p_count * 5 loop
    v_tries := v_tries + 1;
    v_code := public.gen_code(coalesce(nullif(trim(p_prefix), ''), d.code));
    insert into public.discount_codes(code, discount_id) values (v_code, d.id) on conflict do nothing;
    if found then v_out := v_out || v_code; end if;
  end loop;
  return v_out;
end; $$;

create or replace function public.eval_discount(p_code text, p_subtotal integer, p_email text default null)
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  d public.discounts; c public.discount_codes; v_unique boolean := false;
  v_code text := upper(trim(coalesce(p_code, ''))); v_email text := lower(trim(coalesce(p_email, '')));
  v_amount int := 0; v_used int;
begin
  select * into d from public.discounts where code = v_code;
  if d.id is null then
    select * into c from public.discount_codes where code = v_code;
    if c.code is not null then
      select * into d from public.discounts where id = c.discount_id;
      v_unique := true;
    end if;
  end if;
  if d.id is null or not d.active then return json_build_object('ok', false, 'error', 'El código no existe o no está activo'); end if;
  if d.starts_at is not null and now() < d.starts_at then return json_build_object('ok', false, 'error', 'El código aún no está vigente'); end if;
  if d.ends_at is not null and now() > d.ends_at then return json_build_object('ok', false, 'error', 'El código expiró'); end if;
  if d.usage_limit is not null and d.used_count >= d.usage_limit then return json_build_object('ok', false, 'error', 'El código ya alcanzó su límite de usos'); end if;
  if v_unique and c.used_at is not null then return json_build_object('ok', false, 'error', 'Este código ya fue usado'); end if;
  if v_unique and c.email is not null and v_email <> '' and c.email <> v_email then
    return json_build_object('ok', false, 'error', 'Este código es personal: usa el mismo correo con el que lo recibiste');
  end if;
  if p_subtotal < d.min_subtotal then
    return json_build_object('ok', false, 'error', 'Este código aplica en compras desde $' || replace(to_char(d.min_subtotal, 'FM999,999,999'), ',', '.'));
  end if;
  if v_email <> '' then
    if d.once_per_customer then
      select count(*) into v_used from public.orders o
       where lower(o.customer_email) = v_email and o.status in ('pagado','preparando','despachado','entregado')
         and (o.discount_code = d.code or o.discount_code in (select dc.code from public.discount_codes dc where dc.discount_id = d.id));
      if v_used > 0 then return json_build_object('ok', false, 'error', 'Ya usaste este código'); end if;
    end if;
    if d.first_order_only and exists (select 1 from public.orders where lower(customer_email) = v_email
                                         and status in ('pagado','preparando','despachado','entregado')) then
      return json_build_object('ok', false, 'error', 'Este código es solo para tu primera compra');
    end if;
    if d.subscribers_only and not (v_unique and c.email is not null)
       and not exists (select 1 from public.subscribers where email = v_email) then
      return json_build_object('ok', false, 'error', 'Este código es para quienes se registraron en la web. Usa el mismo correo con el que te registraste.');
    end if;
  end if;
  if d.kind = 'percent' then v_amount := floor(p_subtotal * least(d.value, 100) / 100.0);
  elsif d.kind = 'fixed' then v_amount := least(d.value, p_subtotal);
  end if;
  return json_build_object('ok', true, 'code', v_code, 'kind', d.kind, 'value', d.value, 'unique', v_unique,
                           'amount', v_amount, 'free_shipping', d.kind = 'free_shipping', 'description', d.description,
                           'needs_email', (d.first_order_only or d.subscribers_only or d.once_per_customer) and v_email = '');
end; $$;

create or replace function public.subscribe(p_email text, p_name text default null, p_phone text default null,
                                            p_pet text default null, p_source text default 'popup')
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_parent text; v_unique boolean; v_did uuid; v_code text; v_new boolean; i int := 0;
begin
  if length(v_email) > 120 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then
    return json_build_object('ok', false, 'error', 'Revisa que tu correo esté bien escrito');
  end if;
  select nullif(upper(trim(s.popup_code)), ''), s.popup_unique_codes into v_parent, v_unique from public.store_settings s where s.id = 1;
  if v_parent is not null then
    select d.id into v_did from public.discounts d where d.code = v_parent and d.active;
    if v_did is null then v_parent := null; end if;
  end if;
  v_code := v_parent;
  if v_parent is not null and v_unique then
    select dc.code into v_code from public.discount_codes dc
     where dc.discount_id = v_did and dc.email = v_email order by dc.created_at desc limit 1;
    while v_code is null and i < 10 loop
      i := i + 1;
      v_code := public.gen_code(left(v_parent, 5));
      insert into public.discount_codes(code, discount_id, email) values (v_code, v_did, v_email) on conflict do nothing;
      if not found then v_code := null; end if;
    end loop;
  end if;
  insert into public.subscribers as sb (email, name, phone, pet, source, discount_code)
  values (v_email, left(nullif(trim(p_name), ''), 80),
          left(nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), ''), 20),
          case when p_pet in ('perro', 'gato', 'ambos', 'otro') then p_pet end,
          left(coalesce(nullif(trim(p_source), ''), 'popup'), 20), v_code)
  on conflict (email) do update
    set name = coalesce(excluded.name, sb.name), phone = coalesce(excluded.phone, sb.phone),
        pet = coalesce(excluded.pet, sb.pet), discount_code = coalesce(excluded.discount_code, sb.discount_code)
  returning (xmax = 0) into v_new;
  return json_build_object('ok', true, 'code', v_code, 'new', v_new);
end; $$;

-- ================================================================ 3. PROMOCIONES Y GRUPOS
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('percent', 'buy_x_pay_y', 'fixed_order', 'free_shipping')),
  value int not null default 0 check (value >= 0),
  buy_qty int, pay_qty int,
  scope text not null default 'all' check (scope in ('all', 'category', 'brand', 'products')),
  scope_values text[] not null default '{}',
  min_subtotal int not null default 0, min_qty int not null default 0,
  badge text,
  starts_at timestamptz, ends_at timestamptz,
  active boolean not null default true,
  sort int not null default 0,
  used_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.promotions enable row level security;
create policy "promo_read" on public.promotions for select using (active or (select public.is_admin()));
create policy "promo_admin" on public.promotions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create table if not exists public.customer_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  percent int not null default 0 check (percent between 0 and 100),
  free_shipping boolean not null default false,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.customer_group_members (
  email text primary key,
  group_id uuid not null references public.customer_groups(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.customer_groups enable row level security;
alter table public.customer_group_members enable row level security;
create policy "cgroups_admin" on public.customer_groups for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "cgmembers_admin" on public.customer_group_members for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Calcula el carrito completo en el servidor (fuente única de precios para la tienda y el checkout)
create or replace function public.price_cart(p_items jsonb, p_email text default null, p_code text default null, p_delivery text default null)
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  s public.store_settings;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_lines jsonb; v_sub int := 0;
  pr record; g record;
  v_done uuid[] := '{}'; v_promos jsonb := '[]'::jsonb; v_promo int := 0; v_free boolean := false;
  v_qty int; v_amt int; v_ids uuid[]; v_units int[]; v_nfree int;
  v_coupon json; v_disc int := 0; v_after int; v_ship int := 0;
begin
  select * into s from public.store_settings where id = 1;

  select coalesce(jsonb_agg(to_jsonb(l) order by l.name, l.variant_label), '[]'::jsonb), coalesce(sum(l.line_total), 0)
    into v_lines, v_sub
    from (
      select pv.id as variant_id, p.id as product_id, pv.sku, p.name, pv.label as variant_label, pv.price as unit_price,
             q.qty, pv.price * q.qty as line_total, pv.stock, (pv.active and p.active) as active, p.category, p.brand
        from (select (x ->> 'variant_id')::uuid as vid, sum(least(greatest(coalesce((x ->> 'qty')::int, 1), 1), 99))::int as qty
                from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) x
               where (x ->> 'variant_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
               group by 1) q
        join public.product_variants pv on pv.id = q.vid
        join public.products p on p.id = pv.product_id
    ) l;

  -- Promociones automáticas: cada línea recibe como máximo una promoción de producto (% o lleva X paga Y)
  for pr in select * from public.promotions
             where active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
             order by sort, created_at
  loop
    select coalesce(sum(l.qty), 0), coalesce(array_agg(l.variant_id), '{}')
      into v_qty, v_ids
      from jsonb_to_recordset(v_lines) as l(variant_id uuid, product_id uuid, category text, brand text, qty int)
     where (pr.scope = 'all'
            or (pr.scope = 'category' and l.category = any(pr.scope_values))
            or (pr.scope = 'brand' and l.brand = any(pr.scope_values))
            or (pr.scope = 'products' and l.product_id::text = any(pr.scope_values)))
       and (pr.kind not in ('percent', 'buy_x_pay_y') or not (l.variant_id = any(v_done)));
    if v_qty = 0 or v_qty < pr.min_qty or v_sub < pr.min_subtotal then continue; end if;
    v_amt := 0;
    if pr.kind = 'percent' then
      select coalesce(sum(floor(l.line_total * least(pr.value, 100) / 100.0)), 0)::int into v_amt
        from jsonb_to_recordset(v_lines) as l(variant_id uuid, line_total int) where l.variant_id = any(v_ids);
      v_done := v_done || v_ids;
    elsif pr.kind = 'buy_x_pay_y' then
      if coalesce(pr.buy_qty, 0) < 2 or coalesce(pr.pay_qty, 0) < 1 or pr.pay_qty >= pr.buy_qty then continue; end if;
      select array_agg(z.u order by z.u) into v_units
        from (select l.unit_price as u from jsonb_to_recordset(v_lines) as l(variant_id uuid, unit_price int, qty int)
                cross join generate_series(1, l.qty) where l.variant_id = any(v_ids)) z;
      v_nfree := (coalesce(array_length(v_units, 1), 0) / pr.buy_qty) * (pr.buy_qty - pr.pay_qty);
      if v_nfree = 0 then continue; end if;
      select coalesce(sum(u), 0)::int into v_amt from unnest(v_units[1:v_nfree]) u;
      v_done := v_done || v_ids;
    elsif pr.kind = 'fixed_order' then
      v_amt := least(pr.value, greatest(v_sub - v_promo, 0));
    elsif pr.kind = 'free_shipping' then
      v_free := true;
    end if;
    if v_amt <= 0 and pr.kind <> 'free_shipping' then continue; end if;
    v_promo := v_promo + v_amt;
    v_promos := v_promos || jsonb_build_object('id', pr.id, 'name', pr.name, 'amount', v_amt, 'free_shipping', pr.kind = 'free_shipping');
  end loop;

  -- Grupo de clientes (precio especial) sobre las líneas sin promoción
  if v_email <> '' then
    select g2.* into g from public.customer_group_members m join public.customer_groups g2 on g2.id = m.group_id
     where m.email = v_email and g2.active;
    if g.id is not null then
      if g.percent > 0 then
        select coalesce(sum(floor(l.line_total * g.percent / 100.0)), 0)::int into v_amt
          from jsonb_to_recordset(v_lines) as l(variant_id uuid, line_total int) where not (l.variant_id = any(v_done));
        if v_amt > 0 then
          v_promo := v_promo + v_amt;
          v_promos := v_promos || jsonb_build_object('group', g.id, 'name', 'Precio ' || g.name || ' (-' || g.percent || '%)', 'amount', v_amt, 'free_shipping', false);
        end if;
      end if;
      if g.free_shipping then
        v_free := true;
        v_promos := v_promos || jsonb_build_object('group', g.id, 'name', 'Despacho gratis · ' || g.name, 'amount', 0, 'free_shipping', true);
      end if;
    end if;
  end if;
  v_promo := least(v_promo, v_sub);

  if nullif(trim(coalesce(p_code, '')), '') is not null then
    v_coupon := public.eval_discount(p_code, v_sub - v_promo, nullif(v_email, ''));
    if (v_coupon ->> 'ok')::boolean then
      v_disc := least(coalesce((v_coupon ->> 'amount')::int, 0), v_sub - v_promo);
      if (v_coupon ->> 'free_shipping')::boolean then v_free := true; end if;
    end if;
  end if;

  v_after := v_sub - v_promo - v_disc;
  if p_delivery = 'despacho' then
    v_ship := case when v_free or (coalesce(s.free_shipping_from, 0) > 0 and v_after >= s.free_shipping_from) then 0
                   else coalesce(s.shipping_fee, 0) end;
  end if;
  return json_build_object('lines', v_lines, 'subtotal', v_sub, 'promotions', v_promos, 'promo_discount', v_promo,
                           'coupon', v_coupon, 'discount', v_disc, 'free_shipping', v_free, 'after_discounts', v_after,
                           'shipping', v_ship, 'total', v_after + v_ship,
                           'free_shipping_from', s.free_shipping_from, 'shipping_fee', s.shipping_fee);
end; $$;
grant execute on function public.price_cart(jsonb, text, text, text) to anon, authenticated;

-- ================================================================ 4. BÚSQUEDAS
create table if not exists public.search_terms (
  term text primary key,
  searches int not null default 0,
  zero_results int not null default 0,
  last_results int,
  last_at timestamptz not null default now()
);
alter table public.search_terms enable row level security;
create policy "search_admin" on public.search_terms for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.log_search(p_term text, p_results int)
returns void language plpgsql security definer set search_path = '' as $$
declare v text := lower(trim(regexp_replace(coalesce(p_term, ''), '\s+', ' ', 'g')));
begin
  if length(v) < 2 or length(v) > 60 then return; end if;
  insert into public.search_terms as st (term, searches, zero_results, last_results, last_at)
  values (v, 1, case when coalesce(p_results, 0) = 0 then 1 else 0 end, p_results, now())
  on conflict (term) do update
    set searches = st.searches + 1,
        zero_results = st.zero_results + case when coalesce(p_results, 0) = 0 then 1 else 0 end,
        last_results = excluded.last_results, last_at = now();
end; $$;
grant execute on function public.log_search(text, int) to anon, authenticated;

-- ================================================================ 5. TRÁFICO (analítica propia, sin cookies)
create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session text not null,
  event text not null,
  product_id uuid,
  value int,
  source text,
  device text
);
create index if not exists site_events_created_idx on public.site_events(created_at);
create index if not exists site_events_session_idx on public.site_events(session, created_at);
alter table public.site_events enable row level security;
create policy "events_admin" on public.site_events for select to authenticated using ((select public.is_admin()));

create or replace function public.track(p_session text, p_event text, p_product uuid default null, p_value int default null,
                                        p_source text default null, p_device text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_event not in ('visit', 'view_product', 'add_to_cart', 'begin_checkout', 'purchase', 'popup_view', 'popup_submit') then return; end if;
  if p_session is null or length(p_session) not between 8 and 64 then return; end if;
  if (select count(*) from public.site_events where session = p_session and created_at > now() - interval '1 hour') > 300 then return; end if;
  insert into public.site_events(session, event, product_id, value, source, device)
  values (p_session, p_event, p_product, p_value, left(nullif(trim(p_source), ''), 60), left(nullif(trim(p_device), ''), 10));
end; $$;
grant execute on function public.track(text, text, uuid, int, text, text) to anon, authenticated;

create or replace function public.traffic_report(p_from timestamptz, p_to timestamptz)
returns json language plpgsql stable security definer set search_path = '' as $$
declare v json;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  with e as (select * from public.site_events where created_at >= p_from and created_at < p_to),
  ses as (
    select session,
           coalesce(max(source) filter (where event = 'visit'), 'Directo') as source,
           coalesce(max(device) filter (where event = 'visit'), 'otro') as device,
           bool_or(event = 'purchase') as bought
      from e group by session)
  select json_build_object(
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

-- ================================================================ 6. RESEÑAS
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  email text,
  rating int not null check (rating between 1 and 5),
  comment text,
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobada', 'rechazada')),
  verified boolean not null default false,
  reply text,
  created_at timestamptz not null default now()
);
create index if not exists product_reviews_product_idx on public.product_reviews(product_id, status);
alter table public.product_reviews enable row level security;
create policy "reviews_admin" on public.product_reviews for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.submit_review(p_product uuid, p_name text, p_email text, p_rating int, p_comment text)
returns json language plpgsql security definer set search_path = '' as $$
declare s public.store_settings; v_email text := lower(trim(coalesce(p_email, ''))); v_verified boolean; v_status text;
begin
  select * into s from public.store_settings where id = 1;
  if not s.reviews_enabled then return json_build_object('ok', false, 'error', 'Las reseñas no están disponibles'); end if;
  if not exists (select 1 from public.products where id = p_product and active) then return json_build_object('ok', false, 'error', 'Producto no encontrado'); end if;
  if length(trim(coalesce(p_name, ''))) < 2 then return json_build_object('ok', false, 'error', 'Escribe tu nombre'); end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then return json_build_object('ok', false, 'error', 'Revisa tu correo'); end if;
  if p_rating is null or p_rating not between 1 and 5 then return json_build_object('ok', false, 'error', 'Elige de 1 a 5 estrellas'); end if;
  if exists (select 1 from public.product_reviews where product_id = p_product and email = v_email) then
    return json_build_object('ok', false, 'error', 'Ya dejaste una reseña para este producto. ¡Gracias!');
  end if;
  v_verified := exists (select 1 from public.orders o join public.order_items i on i.order_id = o.id
                         where lower(o.customer_email) = v_email and i.product_id = p_product
                           and o.status in ('pagado','preparando','despachado','entregado'));
  v_status := case when s.reviews_auto_approve then 'aprobada' else 'pendiente' end;
  insert into public.product_reviews(product_id, name, email, rating, comment, status, verified)
  values (p_product, left(trim(p_name), 60), v_email, p_rating, left(nullif(trim(p_comment), ''), 1000), v_status, v_verified);
  return json_build_object('ok', true, 'status', v_status);
end; $$;
grant execute on function public.submit_review(uuid, text, text, int, text) to anon, authenticated;

create or replace function public.get_reviews(p_product uuid)
returns json language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(json_build_object(
           'name', split_part(r.name, ' ', 1) || coalesce(' ' || left(nullif(split_part(r.name, ' ', 2), ''), 1) || '.', ''),
           'rating', r.rating, 'comment', r.comment, 'verified', r.verified, 'reply', r.reply, 'created_at', r.created_at)
           order by r.created_at desc), '[]'::json)
    from (select * from public.product_reviews where product_id = p_product and status = 'aprobada' order by created_at desc limit 50) r;
$$;
grant execute on function public.get_reviews(uuid) to anon, authenticated;

create or replace function public.review_summary()
returns json language sql stable security definer set search_path = '' as $$
  select coalesce(json_object_agg(product_id, json_build_object('avg', avg_rating, 'count', n)), '{}'::json)
    from (select product_id, round(avg(rating)::numeric, 1) as avg_rating, count(*) as n
            from public.product_reviews where status = 'aprobada' group by product_id) x;
$$;
grant execute on function public.review_summary() to anon, authenticated;

-- ================================================================ 7. RECOMPRA
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product_id uuid references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  channel text not null check (channel in ('whatsapp', 'email')),
  actor text,
  created_at timestamptz not null default now()
);
create index if not exists reminders_email_idx on public.reminders(email, product_id);
alter table public.reminders enable row level security;
create policy "reminders_admin" on public.reminders for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.replenish_due(p_ahead int default 7, p_back int default 30)
returns table(email text, name text, phone text, product_id uuid, product_name text, variant_label text, variant_id uuid,
              last_order uuid, last_number bigint, last_date timestamptz, due_date timestamptz, days int, reminded_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with last as (
    select distinct on (lower(o.customer_email), i.product_id)
           lower(o.customer_email) as email, o.customer_name as name, o.customer_phone as phone,
           i.product_id, i.name as product_name, i.variant_label, i.variant_id, o.id as last_order, o.number as last_number,
           coalesce(o.paid_at, o.created_at) as last_date
      from public.orders o join public.order_items i on i.order_id = o.id
     where o.status in ('pagado','preparando','despachado','entregado')
       and o.customer_email <> 'sin-correo@planeta4patas.cl' and i.product_id is not null
     order by lower(o.customer_email), i.product_id, coalesce(o.paid_at, o.created_at) desc)
  select l.email, l.name, l.phone, l.product_id, l.product_name, l.variant_label, l.variant_id, l.last_order, l.last_number, l.last_date,
         l.last_date + make_interval(days => coalesce(p.replenish_days, c.replenish_days)) as due_date,
         coalesce(p.replenish_days, c.replenish_days) as days,
         (select max(r.created_at) from public.reminders r
           where r.email = l.email and r.product_id = l.product_id and r.created_at > l.last_date) as reminded_at
    from last l
    join public.products p on p.id = l.product_id
    left join public.categories c on c.slug = p.category
   where public.is_admin_or_service()
     and coalesce(p.replenish_days, c.replenish_days) is not null
     and l.last_date + make_interval(days => coalesce(p.replenish_days, c.replenish_days))
         between now() - make_interval(days => p_back) and now() + make_interval(days => p_ahead)
   order by due_date;
$$;
revoke execute on function public.replenish_due(int, int) from public, anon;

create or replace function public.log_reminder(p_email text, p_product uuid, p_order uuid, p_channel text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor text;
begin
  if not public.is_admin_or_service() then raise exception 'No autorizado'; end if;
  select email into v_actor from auth.users where id = auth.uid();
  insert into public.reminders(email, product_id, order_id, channel, actor)
  values (lower(trim(p_email)), p_product, p_order, p_channel, coalesce(v_actor, 'Automático'));
end; $$;
revoke execute on function public.log_reminder(text, uuid, uuid, text) from public, anon;

-- ================================================================ 8. CORREO (campañas y bajas)
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  heading text,
  body text not null,
  button_text text,
  button_url text,
  image_url text,
  discount_code text,
  audience text not null default 'suscriptores',
  status text not null default 'borrador' check (status in ('borrador', 'enviando', 'enviada', 'error')),
  recipients int not null default 0,
  sent int not null default 0,
  error text,
  created_by text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create table if not exists public.email_optouts (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.email_campaigns enable row level security;
alter table public.email_optouts enable row level security;
create policy "campaigns_admin" on public.email_campaigns for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "optouts_admin" on public.email_optouts for select to authenticated using ((select public.is_admin()));

create or replace function public.campaign_audience(p_audience text)
returns table(email text, name text) language sql stable security definer set search_path = '' as $$
  with buyers as (
    select lower(customer_email) as email, max(customer_name) as name, max(coalesce(paid_at, created_at)) as last_at
      from public.orders where status in ('pagado','preparando','despachado','entregado')
       and customer_email <> 'sin-correo@planeta4patas.cl' group by 1),
  subs as (select email, name, pet from public.subscribers),
  pool as (
    select s.email, s.name from subs s where p_audience in ('suscriptores', 'todos')
    union select b.email, b.name from buyers b where p_audience in ('clientes', 'todos')
    union select s.email, s.name from subs s where p_audience = 'perro' and s.pet in ('perro', 'ambos')
    union select s.email, s.name from subs s where p_audience = 'gato' and s.pet in ('gato', 'ambos')
    union select s.email, s.name from subs s where p_audience = 'sin_compra' and not exists (select 1 from buyers b where b.email = s.email)
    union select b.email, b.name from buyers b where p_audience = 'inactivos' and b.last_at < now() - interval '60 days')
  select distinct on (p.email) p.email, p.name from pool p
   where public.is_admin_or_service()
     and not exists (select 1 from public.email_optouts o where o.email = p.email)
   order by p.email;
$$;
revoke execute on function public.campaign_audience(text) from public, anon;

-- Código aleatorio por correo para el enlace "darse de baja"
create table if not exists public.email_tokens (
  email text primary key,
  token uuid not null unique default gen_random_uuid()
);
alter table public.email_tokens enable row level security;

alter table public.store_settings add column if not exists reminders_last_run timestamptz;

-- Enlace de baja: devuelve (o crea) el código de un correo. Solo servidor.
create or replace function public.email_token(p_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid; v_email text := lower(trim(p_email));
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'No autorizado'; end if;
  insert into public.email_tokens(email) values (v_email) on conflict (email) do nothing;
  select token into v from public.email_tokens where email = v_email;
  return v;
end; $$;
revoke execute on function public.email_token(text) from public, anon, authenticated;

-- Darse de baja (público, con el código del enlace)
create or replace function public.unsubscribe(p_token uuid)
returns json language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  select email into v_email from public.email_tokens where token = p_token;
  if v_email is null then return json_build_object('ok', false); end if;
  insert into public.email_optouts(email) values (v_email) on conflict do nothing;
  return json_build_object('ok', true, 'email', v_email);
end; $$;
grant execute on function public.unsubscribe(uuid) to anon, authenticated;

-- La API key de Resend se configura como secreto RESEND_API_KEY de Edge Functions.

-- ================================================================ 9. DEVOLUCIONES Y CAMBIOS
create table if not exists public.order_returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null check (kind in ('devolucion', 'cambio')),
  items jsonb not null default '[]'::jsonb,
  restock boolean not null default true,
  refund_amount int not null default 0,
  refund_method text,
  reason text,
  actor text,
  created_at timestamptz not null default now()
);
create index if not exists order_returns_order_idx on public.order_returns(order_id);
alter table public.order_returns enable row level security;
create policy "returns_admin" on public.order_returns for select to authenticated using ((select public.is_admin()));

create or replace function public.register_return(p jsonb)
returns json language plpgsql security definer set search_path = '' as $$
declare
  o public.orders; v_actor text; it jsonb; v_item public.order_items; v_qty int; v_prev int;
  v_items jsonb := '[]'::jsonb; v_refund int; v_restock boolean := coalesce((p ->> 'restock')::boolean, true);
  v_kind text := coalesce(p ->> 'kind', 'devolucion'); v_desc text := ''; v_stock int; v_id uuid;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  select * into o from public.orders where id = (p ->> 'order_id')::uuid for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_kind not in ('devolucion', 'cambio') then raise exception 'Tipo inválido'; end if;
  select email into v_actor from auth.users where id = auth.uid();

  for it in select * from jsonb_array_elements(coalesce(p -> 'items', '[]'::jsonb)) loop
    v_qty := coalesce((it ->> 'qty')::int, 0);
    continue when v_qty <= 0;
    select * into v_item from public.order_items where order_id = o.id and variant_id = (it ->> 'variant_id')::uuid limit 1;
    if not found then raise exception 'El producto no pertenece al pedido'; end if;
    select coalesce(sum((x ->> 'qty')::int), 0) into v_prev
      from public.order_returns r cross join jsonb_array_elements(r.items) x
     where r.order_id = o.id and x ->> 'variant_id' = v_item.variant_id::text;
    if v_prev + v_qty > v_item.qty then
      raise exception 'No puedes devolver más unidades de las compradas (% %)', v_item.name, v_item.variant_label;
    end if;
    v_stock := null;
    if v_restock and v_item.variant_id is not null then
      update public.product_variants set stock = stock + v_qty where id = v_item.variant_id and stock is not null
      returning stock into v_stock;
      if v_stock is not null then
        insert into public.inventory_adjustments(variant_id, delta, stock_after, reason, actor)
        values (v_item.variant_id, v_qty, v_stock, case when v_kind = 'cambio' then 'Cambio' else 'Devolución' end || ' · pedido #' || o.number, v_actor);
      end if;
    end if;
    v_items := v_items || jsonb_build_object('variant_id', v_item.variant_id, 'name', v_item.name, 'variant_label', v_item.variant_label,
                                             'qty', v_qty, 'unit_price', v_item.unit_price);
    v_desc := v_desc || case when v_desc = '' then '' else ', ' end || v_qty || ' × ' || v_item.name || ' ' || v_item.variant_label;
  end loop;
  if jsonb_array_length(v_items) = 0 then raise exception 'Elige al menos un producto'; end if;

  v_refund := least(greatest(coalesce((p ->> 'refund_amount')::int, 0), 0), greatest(o.total - o.refunded, 0));
  insert into public.order_returns(order_id, kind, items, restock, refund_amount, refund_method, reason, actor)
  values (o.id, v_kind, v_items, v_restock, v_refund, nullif(trim(p ->> 'refund_method'), ''), nullif(trim(p ->> 'reason'), ''), v_actor)
  returning id into v_id;
  if v_refund > 0 then update public.orders set refunded = refunded + v_refund where id = o.id; end if;
  insert into public.order_events(order_id, kind, message, actor)
  values (o.id, 'return',
          case when v_kind = 'cambio' then 'Cambio registrado: ' else 'Devolución registrada: ' end || v_desc ||
          case when v_restock then ' · stock repuesto' else '' end ||
          case when v_refund > 0 then ' · reembolso $' || replace(to_char(v_refund, 'FM999,999,999'), ',', '.') ||
                 coalesce(' (' || nullif(trim(p ->> 'refund_method'), '') || ')', '') else '' end ||
          coalesce(' · Motivo: ' || nullif(trim(p ->> 'reason'), ''), ''),
          v_actor);
  return json_build_object('id', v_id, 'refund', v_refund);
end; $$;

-- ================================================================ 10. ESTADO DEL PEDIDO (cliente)
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
      from public.order_items i where i.order_id = o.id), '[]'::json)
  )
  from public.orders o where o.id = p_id and o.access_token = p_token;
$$;
