-- =====================================================================
-- PLANETA 4 PATAS · 004 · Panel de administración completo
-- Configuración de tienda y pagos, descuentos, historial de pedidos,
-- inventario, clientes, ventas manuales, equipo y credenciales (Vault).
-- Aplicada en Supabase como: 004a_medios_pago, 004_admin_completo y 004b_credenciales_pago.
-- 004a_medios_pago amplió orders.payment_method:
--   alter table public.orders drop constraint if exists orders_payment_method_check;
--   alter table public.orders add constraint orders_payment_method_check
--     check (payment_method in ('mercadopago','webpay','transferencia','efectivo','otro'));
-- =====================================================================

-- ---------------------------------------------------------------------
-- Configuración de la tienda
-- ---------------------------------------------------------------------
alter table public.store_settings
  add column if not exists store_name          text not null default 'Planeta 4 Patas',
  add column if not exists site_url            text,
  add column if not exists contact_email       text,
  add column if not exists instagram           text,
  add column if not exists address             text,
  add column if not exists hours               text,
  add column if not exists announcement        text,
  add column if not exists announcement_active boolean not null default true,
  add column if not exists pickup_enabled      boolean not null default true,
  add column if not exists mp_enabled          boolean not null default true,
  add column if not exists mp_configured       boolean not null default false,
  add column if not exists webpay_enabled      boolean not null default false,
  add column if not exists webpay_configured   boolean not null default false,
  add column if not exists webpay_env          text not null default 'integration',
  add column if not exists transfer_enabled    boolean not null default false,
  add column if not exists transfer_info       text,
  add column if not exists low_stock_threshold int not null default 3;

alter table public.store_settings
  add constraint store_settings_webpay_env_check check (webpay_env in ('integration','production'));

update public.store_settings set
  site_url     = coalesce(site_url, 'https://dtorresag88.github.io/planeta4patas'),
  address      = coalesce(address, 'Vicuña Mackenna 10492, La Florida'),
  instagram    = coalesce(instagram, 'planeta4patas_tienda'),
  hours        = coalesce(hours, 'Lunes a sábado'),
  announcement = coalesce(announcement, '🚚 Despacho $1.990 · ¡GRATIS sobre $60.000!')
where id = 1;

-- ---------------------------------------------------------------------
-- Productos: etiquetas y galería de fotos
-- ---------------------------------------------------------------------
alter table public.products
  add column if not exists tags       text[] not null default '{}',
  add column if not exists gallery    text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

create trigger products_touch before update on public.products
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Pedidos: descuentos, origen, etiquetas, fechas
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists discount_code text,
  add column if not exists discount      int not null default 0,
  add column if not exists source        text not null default 'web',
  add column if not exists tags          text[] not null default '{}',
  add column if not exists cancelled_at  timestamptz,
  add column if not exists cancel_reason text;

alter table public.orders
  add constraint orders_source_check check (source in ('web','manual'));

create index if not exists orders_email_idx on public.orders (lower(customer_email));
create index if not exists orders_status_idx on public.orders (status);

-- Historial (línea de tiempo) del pedido
create table if not exists public.order_events (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders(id) on delete cascade,
  kind       text not null default 'note',
  message    text not null,
  actor      text,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events(order_id, created_at);
alter table public.order_events enable row level security;
create policy "events_admin_read" on public.order_events for select to authenticated
  using ((select public.is_admin()));
create policy "events_admin_insert" on public.order_events for insert to authenticated
  with check ((select public.is_admin()));

create or replace function public.status_label(s text)
returns text language sql immutable set search_path = '' as $$
  select case s
    when 'pendiente_pago' then 'Pendiente de pago' when 'pagado' then 'Pagado'
    when 'preparando' then 'Preparando' when 'despachado' then 'Despachado'
    when 'entregado' then 'Entregado' when 'cancelado' then 'Cancelado'
    when 'rechazado' then 'Pago rechazado' else s end;
$$;

create or replace function public.log_order_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actor text;
begin
  select email into v_actor from auth.users where id = auth.uid();
  if tg_op = 'INSERT' then
    insert into public.order_events(order_id, kind, message, actor)
    values (new.id, 'created',
            case when new.source = 'manual' then 'Pedido creado desde el panel' else 'Pedido creado en la tienda online' end,
            v_actor);
  elsif new.status is distinct from old.status then
    insert into public.order_events(order_id, kind, message, actor)
    values (new.id, 'status', 'Estado: ' || public.status_label(old.status) || ' → ' || public.status_label(new.status),
            coalesce(v_actor, 'Sistema de pagos'));
  end if;
  return new;
end; $$;

create trigger orders_log after insert or update of status on public.orders
for each row execute function public.log_order_change();

-- ---------------------------------------------------------------------
-- Inventario: registro de ajustes
-- ---------------------------------------------------------------------
create table if not exists public.inventory_adjustments (
  id          bigint generated always as identity primary key,
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  delta       int,
  stock_after int,
  reason      text not null,
  actor       text,
  created_at  timestamptz not null default now()
);
create index if not exists inv_adj_variant_idx on public.inventory_adjustments(variant_id, created_at desc);
alter table public.inventory_adjustments enable row level security;
create policy "inv_admin_read" on public.inventory_adjustments for select to authenticated
  using ((select public.is_admin()));

create or replace function public.set_stock(p_variant uuid, p_stock int, p_reason text default 'Ajuste manual')
returns int language plpgsql security definer set search_path = '' as $$
declare v_old int; v_actor text;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  select stock into v_old from public.product_variants where id = p_variant for update;
  if not found then raise exception 'Formato no encontrado'; end if;
  update public.product_variants set stock = p_stock where id = p_variant;
  select email into v_actor from auth.users where id = auth.uid();
  insert into public.inventory_adjustments(variant_id, delta, stock_after, reason, actor)
  values (p_variant, case when v_old is null or p_stock is null then null else p_stock - v_old end, p_stock,
          coalesce(nullif(trim(p_reason), ''), 'Ajuste manual'), v_actor);
  return p_stock;
end; $$;
revoke all on function public.set_stock(uuid, int, text) from public, anon;
grant execute on function public.set_stock(uuid, int, text) to authenticated;

-- ---------------------------------------------------------------------
-- Descuentos (códigos promocionales)
-- ---------------------------------------------------------------------
create table if not exists public.discounts (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique check (code = upper(code) and length(code) between 3 and 30),
  description       text,
  kind              text not null check (kind in ('percent','fixed','free_shipping')),
  value             int  not null default 0 check (value >= 0),
  min_subtotal      int  not null default 0 check (min_subtotal >= 0),
  starts_at         timestamptz,
  ends_at           timestamptz,
  usage_limit       int check (usage_limit is null or usage_limit > 0),
  used_count        int  not null default 0,
  once_per_customer boolean not null default false,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);
alter table public.discounts enable row level security;
create policy "disc_admin" on public.discounts for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Evalúa un código: usada por la tienda (vista previa) y por checkout (cálculo definitivo)
create or replace function public.eval_discount(p_code text, p_subtotal int, p_email text default null)
returns json language plpgsql stable security definer set search_path = '' as $$
declare d public.discounts; v_amount int := 0; v_used int;
begin
  select * into d from public.discounts where code = upper(trim(coalesce(p_code, '')));
  if not found or not d.active then return json_build_object('ok', false, 'error', 'El código no existe o no está activo'); end if;
  if d.starts_at is not null and now() < d.starts_at then return json_build_object('ok', false, 'error', 'El código aún no está vigente'); end if;
  if d.ends_at is not null and now() > d.ends_at then return json_build_object('ok', false, 'error', 'El código expiró'); end if;
  if d.usage_limit is not null and d.used_count >= d.usage_limit then return json_build_object('ok', false, 'error', 'El código ya alcanzó su límite de usos'); end if;
  if p_subtotal < d.min_subtotal then
    return json_build_object('ok', false, 'error', 'Este código aplica en compras desde $' || replace(to_char(d.min_subtotal, 'FM999,999,999'), ',', '.'));
  end if;
  if d.once_per_customer and p_email is not null then
    select count(*) into v_used from public.orders
     where discount_code = d.code and lower(customer_email) = lower(trim(p_email))
       and status in ('pagado','preparando','despachado','entregado');
    if v_used > 0 then return json_build_object('ok', false, 'error', 'Ya usaste este código'); end if;
  end if;
  if d.kind = 'percent' then v_amount := floor(p_subtotal * least(d.value, 100) / 100.0);
  elsif d.kind = 'fixed' then v_amount := least(d.value, p_subtotal);
  end if;
  return json_build_object('ok', true, 'code', d.code, 'kind', d.kind, 'value', d.value,
                           'amount', v_amount, 'free_shipping', d.kind = 'free_shipping',
                           'description', d.description);
end; $$;
grant execute on function public.eval_discount(text, int, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Pago confirmado: ahora registra inventario, historial y uso de descuento
-- ---------------------------------------------------------------------
create or replace function public.mark_order_paid(p_order uuid, p_ref text, p_detail jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then return; end if;

  update public.orders
     set status = case when status in ('pendiente_pago','rechazado') then 'pagado' else status end,
         paid_at = coalesce(paid_at, now()),
         payment_ref = coalesce(p_ref, payment_ref),
         payment_detail = p_detail
   where id = p_order;

  if not o.stock_applied then
    with upd as (
      update public.product_variants v
         set stock = greatest(v.stock - i.qty, 0)
        from public.order_items i
       where i.order_id = p_order and i.variant_id = v.id and v.stock is not null
      returning v.id, v.stock, i.qty
    )
    insert into public.inventory_adjustments(variant_id, delta, stock_after, reason, actor)
    select id, -qty, stock, 'Venta · pedido #' || o.number, 'Sistema' from upd;

    if o.discount_code is not null then
      update public.discounts set used_count = used_count + 1 where code = o.discount_code;
    end if;
    update public.orders set stock_applied = true where id = p_order;
  end if;
end; $$;
revoke all on function public.mark_order_paid(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.mark_order_paid(uuid, text, jsonb) to service_role;

-- Marcar pagado a mano (transferencia, efectivo) desde el panel
create or replace function public.admin_mark_paid(p_order uuid, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor text;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  select email into v_actor from auth.users where id = auth.uid();
  perform public.mark_order_paid(p_order, null,
    jsonb_build_object('provider', 'manual', 'note', p_note, 'by', v_actor, 'date', now()));
  insert into public.order_events(order_id, kind, message, actor)
  values (p_order, 'payment', 'Pago registrado manualmente' || coalesce(' · ' || nullif(trim(p_note), ''), ''), v_actor);
end; $$;
revoke all on function public.admin_mark_paid(uuid, text) from public, anon;
grant execute on function public.admin_mark_paid(uuid, text) to authenticated;

-- Cancelar pedido (opcionalmente repone el stock)
create or replace function public.cancel_order(p_order uuid, p_restock boolean default true, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.orders; v_actor text;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if o.status = 'cancelado' then return; end if;
  select email into v_actor from auth.users where id = auth.uid();

  if p_restock and o.stock_applied then
    with upd as (
      update public.product_variants v
         set stock = v.stock + i.qty
        from public.order_items i
       where i.order_id = p_order and i.variant_id = v.id and v.stock is not null
      returning v.id, v.stock, i.qty
    )
    insert into public.inventory_adjustments(variant_id, delta, stock_after, reason, actor)
    select id, qty, stock, 'Reposición · pedido #' || o.number || ' cancelado', v_actor from upd;
    update public.orders set stock_applied = false where id = p_order;
  end if;

  update public.orders set status = 'cancelado', cancelled_at = now(), cancel_reason = nullif(trim(p_reason), '')
   where id = p_order;
  if nullif(trim(p_reason), '') is not null then
    insert into public.order_events(order_id, kind, message, actor) values (p_order, 'note', 'Motivo de cancelación: ' || p_reason, v_actor);
  end if;
end; $$;
revoke all on function public.cancel_order(uuid, boolean, text) from public, anon;
grant execute on function public.cancel_order(uuid, boolean, text) to authenticated;

-- Crear pedido desde el panel (venta en tienda, WhatsApp, teléfono)
create or replace function public.create_manual_order(p jsonb)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid; v_number bigint; v_token uuid; v_sub int := 0; v_ship int; v_disc int; v_actor text;
  it jsonb; v record; v_qty int; v_price int;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  if jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 then raise exception 'Agrega al menos un producto'; end if;
  select email into v_actor from auth.users where id = auth.uid();

  insert into public.orders (payment_method, customer_name, customer_email, customer_phone, customer_rut,
                             delivery_method, comuna, address, address_detail, delivery_day, notes,
                             subtotal, shipping, total, source, discount_code)
  values (coalesce(p->>'payment_method', 'efectivo'),
          coalesce(nullif(trim(p->>'customer_name'), ''), 'Cliente en tienda'),
          coalesce(nullif(lower(trim(p->>'customer_email')), ''), 'sin-correo@planeta4patas.cl'),
          coalesce(nullif(trim(p->>'customer_phone'), ''), '-'),
          nullif(trim(p->>'customer_rut'), ''),
          coalesce(p->>'delivery_method', 'retiro'),
          nullif(trim(p->>'comuna'), ''), nullif(trim(p->>'address'), ''), nullif(trim(p->>'address_detail'), ''),
          nullif(trim(p->>'delivery_day'), ''), nullif(trim(p->>'notes'), ''),
          0, 0, 0, 'manual', nullif(upper(trim(p->>'discount_code')), ''))
  returning id, number, access_token into v_id, v_number, v_token;

  for it in select * from jsonb_array_elements(p->'items') loop
    select pv.id, pv.sku, pv.label, pv.price, pr.id as product_id, pr.name
      into v from public.product_variants pv join public.products pr on pr.id = pv.product_id
     where pv.id = (it->>'variant_id')::uuid;
    if not found then raise exception 'Producto no encontrado'; end if;
    v_qty := greatest(coalesce((it->>'qty')::int, 1), 1);
    v_price := coalesce((it->>'unit_price')::int, v.price);
    insert into public.order_items(order_id, product_id, variant_id, sku, name, variant_label, unit_price, qty, line_total)
    values (v_id, v.product_id, v.id, v.sku, v.name, v.label, v_price, v_qty, v_price * v_qty);
    v_sub := v_sub + v_price * v_qty;
  end loop;

  v_ship := greatest(coalesce((p->>'shipping')::int, 0), 0);
  v_disc := least(greatest(coalesce((p->>'discount')::int, 0), 0), v_sub);
  update public.orders set subtotal = v_sub, shipping = v_ship, discount = v_disc, total = v_sub - v_disc + v_ship
   where id = v_id;

  if coalesce((p->>'paid')::boolean, false) then
    perform public.mark_order_paid(v_id, null, jsonb_build_object('provider', 'manual', 'by', v_actor, 'date', now()));
  end if;
  return json_build_object('id', v_id, 'number', v_number, 'access_token', v_token);
end; $$;
revoke all on function public.create_manual_order(jsonb) from public, anon;
grant execute on function public.create_manual_order(jsonb) to authenticated;

-- Estado público del pedido: incluye descuento e instrucciones de transferencia
create or replace function public.get_order_status(p_id uuid, p_token uuid)
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'number', o.number, 'status', o.status, 'payment_method', o.payment_method,
    'customer_name', o.customer_name, 'delivery_method', o.delivery_method,
    'comuna', o.comuna, 'address', o.address, 'delivery_day', o.delivery_day,
    'subtotal', o.subtotal, 'shipping', o.shipping, 'discount', o.discount, 'discount_code', o.discount_code,
    'total', o.total, 'created_at', o.created_at,
    'transfer_info', case when o.payment_method = 'transferencia' then (select s.transfer_info from public.store_settings s where s.id = 1) end,
    'items', coalesce((
      select json_agg(json_build_object('name', i.name, 'variant', i.variant_label, 'qty', i.qty, 'line_total', i.line_total))
      from public.order_items i where i.order_id = o.id), '[]'::json)
  )
  from public.orders o where o.id = p_id and o.access_token = p_token;
$$;
grant execute on function public.get_order_status(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Clientes (agrupados por correo) + notas por cliente
-- ---------------------------------------------------------------------
create table if not exists public.customer_notes (
  email      text primary key,
  notes      text,
  tags       text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.customer_notes enable row level security;
create policy "cnotes_admin" on public.customer_notes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace view public.admin_customers with (security_invoker = true) as
select lower(o.customer_email)                                             as email,
       (array_agg(o.customer_name  order by o.created_at desc))[1]         as name,
       (array_agg(o.customer_phone order by o.created_at desc))[1]         as phone,
       (array_agg(o.customer_rut   order by o.created_at desc) filter (where o.customer_rut is not null))[1] as rut,
       (array_agg(o.comuna         order by o.created_at desc) filter (where o.comuna is not null))[1]       as comuna,
       (array_agg(o.address        order by o.created_at desc) filter (where o.address is not null))[1]      as address,
       count(*) filter (where o.status in ('pagado','preparando','despachado','entregado'))                   as orders_count,
       coalesce(sum(o.total) filter (where o.status in ('pagado','preparando','despachado','entregado')), 0)  as total_spent,
       count(*)                                                            as all_orders,
       min(o.created_at)                                                   as first_order_at,
       max(o.created_at)                                                   as last_order_at
  from public.orders o
 group by lower(o.customer_email);

-- ---------------------------------------------------------------------
-- Equipo: invitaciones y listado de administradores
-- ---------------------------------------------------------------------
create table if not exists public.admin_invites (
  email       text primary key check (email = lower(email)),
  invited_by  text,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);
alter table public.admin_invites enable row level security;
create policy "invites_admin_read" on public.admin_invites for select to authenticated
  using ((select public.is_admin()));

insert into public.admin_invites(email, invited_by) values ('dtorresag@gmail.com', 'instalación') on conflict do nothing;

-- La persona invitada se registra (confirmación de correo normal de Supabase) y al entrar
-- al panel reclama su invitación. Solo funciona con el correo ya confirmado.
create or replace function public.claim_admin_invite()
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_email text; v_confirmed timestamptz;
begin
  select lower(email), email_confirmed_at into v_email, v_confirmed from auth.users where id = auth.uid();
  if v_email is null or v_confirmed is null then return false; end if;
  if not exists (select 1 from public.admin_invites where email = v_email and accepted_at is null) then
    return exists (select 1 from public.admins where user_id = auth.uid());
  end if;
  insert into public.admins(user_id) values (auth.uid()) on conflict do nothing;
  update public.admin_invites set accepted_at = now() where email = v_email;
  return true;
end; $$;
revoke all on function public.claim_admin_invite() from public, anon;
grant execute on function public.claim_admin_invite() to authenticated;

-- Lista del equipo (con correo) — solo administradores
create or replace function public.admin_team()
returns table(user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, pending boolean)
language sql stable security definer set search_path = '' as $$
  select a.user_id, u.email::text, a.created_at, u.last_sign_in_at, false
    from public.admins a join auth.users u on u.id = a.user_id
   where public.is_admin()
  union all
  select null, i.email, i.created_at, null, true
    from public.admin_invites i
   where i.accepted_at is null and public.is_admin();
$$;
revoke all on function public.admin_team() from public, anon;
grant execute on function public.admin_team() to authenticated;

-- Invitar: si el usuario ya existe queda como admin; si no, al registrarse
create or replace function public.admin_invite(p_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_uid uuid; v_actor text; v_email text := lower(trim(p_email));
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Correo inválido'; end if;
  select email into v_actor from auth.users where id = auth.uid();
  select id into v_uid from auth.users where lower(email) = v_email and email_confirmed_at is not null;
  if v_uid is not null then
    insert into public.admins(user_id) values (v_uid) on conflict do nothing;
    return 'added';
  end if;
  insert into public.admin_invites(email, invited_by) values (v_email, v_actor)
  on conflict (email) do update set accepted_at = null, invited_by = excluded.invited_by;
  return 'invited';
end; $$;
revoke all on function public.admin_invite(text) from public, anon;
grant execute on function public.admin_invite(text) to authenticated;

-- ---------------------------------------------------------------------
-- Credenciales de pago en Vault (encriptadas; nunca se leen desde el navegador)
-- ---------------------------------------------------------------------
create or replace function public.set_payment_secret(p_name text, p_value text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_key text := 'p4p_' || p_name; v_val text := coalesce(trim(p_value), '');
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  if p_name not in ('mp_access_token', 'webpay_commerce_code', 'webpay_api_key') then raise exception 'Credencial inválida'; end if;
  select id into v_id from vault.secrets where name = v_key;
  if v_id is null then perform vault.create_secret(v_val, v_key, 'Planeta 4 Patas · ' || p_name);
  else perform vault.update_secret(v_id, v_val); end if;

  if p_name = 'mp_access_token' then
    update public.store_settings set mp_configured = (v_val <> '') where id = 1;
  else
    update public.store_settings set webpay_configured = (
      coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'p4p_webpay_commerce_code'), '') <> '' and
      coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'p4p_webpay_api_key'), '') <> '')
    where id = 1;
  end if;
end; $$;
revoke all on function public.set_payment_secret(text, text) from public, anon;
grant execute on function public.set_payment_secret(text, text) to authenticated;

create or replace function public.get_payment_secret(p_name text)
returns text language sql stable security definer set search_path = '' as $$
  select nullif(decrypted_secret, '') from vault.decrypted_secrets where name = 'p4p_' || p_name;
$$;
revoke all on function public.get_payment_secret(text) from public, anon, authenticated;
grant execute on function public.get_payment_secret(text) to service_role;
