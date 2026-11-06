-- =====================================================================
-- PLANETA 4 PATAS · Tienda online
-- Esquema, seguridad (RLS), funciones y datos iniciales
-- Ejecutar completo en: Supabase > SQL Editor (o como migración)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  slug   text primary key,
  name   text not null,
  emoji  text,
  sort   int  not null default 0
);

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  brand       text,
  category    text references public.categories(slug) on update cascade,
  species     text not null default 'ambos' check (species in ('perro','gato','ambos')),
  life_stage  text,
  description text,
  image_url   text,
  featured    boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.product_variants (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products(id) on delete cascade,
  label            text not null,
  price            int  not null check (price >= 0),
  compare_at_price int  check (compare_at_price is null or compare_at_price >= 0),
  stock            int,  -- null = sin control de stock
  sku              text,
  sort             int  not null default 0,
  active           boolean not null default true
);
create index if not exists product_variants_product_idx on public.product_variants(product_id);

-- ---------------------------------------------------------------------
-- Configuración de la tienda (fila única)
-- ---------------------------------------------------------------------
create table if not exists public.store_settings (
  id                 int primary key default 1 check (id = 1),
  shipping_fee       int  not null default 1990,
  free_shipping_from int  not null default 60000,
  delivery_zones     jsonb not null default '[]'::jsonb,
  whatsapp           text,
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Administradores (usuarios de Supabase Auth con acceso al panel)
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  number          bigint unique not null default nextval('public.order_number_seq'),
  access_token    uuid not null default gen_random_uuid(),
  status          text not null default 'pendiente_pago'
                  check (status in ('pendiente_pago','pagado','preparando','despachado','entregado','cancelado','rechazado')),
  payment_method  text not null check (payment_method in ('mercadopago','webpay')),
  payment_ref     text,
  payment_detail  jsonb,
  customer_name   text not null,
  customer_email  text not null,
  customer_phone  text not null,
  customer_rut    text,
  delivery_method text not null check (delivery_method in ('retiro','despacho')),
  comuna          text,
  address         text,
  address_detail  text,
  delivery_day    text,
  notes           text,
  subtotal        int not null,
  shipping        int not null default 0,
  total           int not null,
  stock_applied   boolean not null default false,
  created_at      timestamptz not null default now(),
  paid_at         timestamptz,
  updated_at      timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_payment_ref_idx on public.orders(payment_ref);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  variant_id    uuid references public.product_variants(id) on delete set null,
  sku           text,
  name          text not null,
  variant_label text,
  unit_price    int not null,
  qty           int not null check (qty > 0),
  line_total    int not null
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.store_settings   enable row level security;
alter table public.admins           enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;

-- Lectura pública del catálogo
drop policy if exists "cat_read" on public.categories;
create policy "cat_read" on public.categories for select using (true);

drop policy if exists "prod_read" on public.products;
create policy "prod_read" on public.products for select
  using (active or (select public.is_admin()));

drop policy if exists "var_read" on public.product_variants;
create policy "var_read" on public.product_variants for select
  using ((active and exists (select 1 from public.products p where p.id = product_id and p.active))
         or (select public.is_admin()));

drop policy if exists "settings_read" on public.store_settings;
create policy "settings_read" on public.store_settings for select using (true);

-- Escritura solo administradores
drop policy if exists "cat_admin" on public.categories;
create policy "cat_admin" on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "prod_admin" on public.products;
create policy "prod_admin" on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "var_admin" on public.product_variants;
create policy "var_admin" on public.product_variants for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "settings_admin" on public.store_settings;
create policy "settings_admin" on public.store_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "admins_self" on public.admins;
create policy "admins_self" on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

-- Pedidos: solo administradores (la tienda crea pedidos vía Edge Function con service role)
drop policy if exists "orders_admin_read" on public.orders;
create policy "orders_admin_read" on public.orders for select to authenticated
  using ((select public.is_admin()));
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "items_admin_read" on public.order_items;
create policy "items_admin_read" on public.order_items for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Estado público de un pedido (requiere id + token secreto del pedido)
-- ---------------------------------------------------------------------
create or replace function public.get_order_status(p_id uuid, p_token uuid)
returns json
language sql stable security definer
set search_path = ''
as $$
  select json_build_object(
    'number', o.number,
    'status', o.status,
    'payment_method', o.payment_method,
    'customer_name', o.customer_name,
    'delivery_method', o.delivery_method,
    'comuna', o.comuna,
    'address', o.address,
    'delivery_day', o.delivery_day,
    'subtotal', o.subtotal,
    'shipping', o.shipping,
    'total', o.total,
    'created_at', o.created_at,
    'items', coalesce((
      select json_agg(json_build_object('name', i.name, 'variant', i.variant_label,
                                        'qty', i.qty, 'line_total', i.line_total))
      from public.order_items i where i.order_id = o.id), '[]'::json)
  )
  from public.orders o
  where o.id = p_id and o.access_token = p_token;
$$;
grant execute on function public.get_order_status(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Confirmación de pago (solo service role / Edge Functions)
-- Idempotente: descuenta stock una sola vez
-- ---------------------------------------------------------------------
create or replace function public.mark_order_paid(p_order uuid, p_ref text, p_detail jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_applied boolean;
begin
  select stock_applied into v_applied from public.orders where id = p_order for update;
  if not found then return; end if;

  update public.orders
     set status = case when status in ('pendiente_pago','rechazado') then 'pagado' else status end,
         paid_at = coalesce(paid_at, now()),
         payment_ref = coalesce(p_ref, payment_ref),
         payment_detail = p_detail
   where id = p_order;

  if not v_applied then
    update public.product_variants v
       set stock = greatest(v.stock - i.qty, 0)
      from public.order_items i
     where i.order_id = p_order and i.variant_id = v.id and v.stock is not null;
    update public.orders set stock_applied = true where id = p_order;
  end if;
end; $$;

create or replace function public.mark_order_failed(p_order uuid, p_detail jsonb)
returns void
language sql security definer
set search_path = ''
as $$
  update public.orders
     set status = 'rechazado', payment_detail = p_detail
   where id = p_order and status = 'pendiente_pago';
$$;

revoke all on function public.mark_order_paid(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.mark_order_failed(uuid, jsonb)     from public, anon, authenticated;
grant execute on function public.mark_order_paid(uuid, text, jsonb) to service_role;
grant execute on function public.mark_order_failed(uuid, jsonb)     to service_role;

-- ---------------------------------------------------------------------
-- Imágenes de productos (Storage)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

drop policy if exists "productos_admin_insert" on storage.objects;
create policy "productos_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and (select public.is_admin()));
drop policy if exists "productos_admin_update" on storage.objects;
create policy "productos_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'productos' and (select public.is_admin()));
drop policy if exists "productos_admin_delete" on storage.objects;
create policy "productos_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and (select public.is_admin()));

-- =====================================================================
-- DATOS INICIALES
-- =====================================================================
insert into public.store_settings (id, shipping_fee, free_shipping_from, whatsapp, delivery_zones)
values (1, 1990, 60000, '56981203671', '[
  {"comuna":"La Florida",  "dias":["Miércoles","Viernes"]},
  {"comuna":"Las Condes",  "dias":["Lunes","Jueves"]},
  {"comuna":"Ñuñoa",       "dias":["Martes"]},
  {"comuna":"Providencia", "dias":["Martes"]}
]'::jsonb)
on conflict (id) do nothing;

-- El catálogo (categorías, productos y formatos) se carga con 002_catalogo.sql

-- ---------------------------------------------------------------------
-- Para dar acceso al panel: crear el usuario en Authentication > Users
-- y luego ejecutar:
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'correo@planeta4patas.cl';
-- ---------------------------------------------------------------------
