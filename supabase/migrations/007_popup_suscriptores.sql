-- =====================================================================
-- 007 · Pop-up promocional, suscriptores y gestión del equipo
-- =====================================================================

-- ---------- Configuración del pop-up (editable desde el panel) ----------
alter table public.store_settings
  add column if not exists popup_enabled boolean not null default false,
  add column if not exists popup_title text default '¡10% en tu primera compra! 🐾',
  add column if not exists popup_text text default 'Déjanos tus datos y te regalamos un código de descuento para tu primera compra.',
  add column if not exists popup_button text default 'Quiero mi descuento',
  add column if not exists popup_success text default '¡Bienvenido a la manada! Usa este código al pagar:',
  add column if not exists popup_code text,
  add column if not exists popup_image text,
  add column if not exists popup_delay int not null default 6,
  add column if not exists popup_frequency_days int not null default 7,
  add column if not exists popup_ask_phone boolean not null default true,
  add column if not exists popup_ask_pet boolean not null default true;

-- ---------- Reglas nuevas para descuentos ----------
alter table public.discounts
  add column if not exists first_order_only boolean not null default false,
  add column if not exists subscribers_only boolean not null default false;

-- ---------- Suscriptores (datos capturados por el pop-up) ----------
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  phone text,
  pet text,
  source text not null default 'popup',
  discount_code text,
  consent boolean not null default true,
  tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);
alter table public.subscribers enable row level security;
create policy "subscribers_admin" on public.subscribers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Registro público: valida datos y entrega el código configurado
create or replace function public.subscribe(p_email text, p_name text default null, p_phone text default null,
                                            p_pet text default null, p_source text default 'popup')
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_code text;
  v_new boolean;
begin
  if length(v_email) > 120 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then
    return json_build_object('ok', false, 'error', 'Revisa que tu correo esté bien escrito');
  end if;
  select nullif(upper(trim(s.popup_code)), '') into v_code from public.store_settings s where s.id = 1;
  if v_code is not null and not exists (select 1 from public.discounts d where d.code = v_code and d.active) then
    v_code := null;
  end if;
  insert into public.subscribers as sb (email, name, phone, pet, source, discount_code)
  values (v_email,
          left(nullif(trim(p_name), ''), 80),
          left(nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), ''), 20),
          case when p_pet in ('perro', 'gato', 'ambos', 'otro') then p_pet end,
          left(coalesce(nullif(trim(p_source), ''), 'popup'), 20),
          v_code)
  on conflict (email) do update
    set name = coalesce(excluded.name, sb.name),
        phone = coalesce(excluded.phone, sb.phone),
        pet = coalesce(excluded.pet, sb.pet),
        discount_code = coalesce(sb.discount_code, excluded.discount_code)
  returning (xmax = 0) into v_new;
  return json_build_object('ok', true, 'code', v_code, 'new', v_new);
end; $$;
revoke execute on function public.subscribe(text, text, text, text, text) from public;
grant execute on function public.subscribe(text, text, text, text, text) to anon, authenticated;

-- ---------- eval_discount con "solo primera compra" y "solo suscriptores" ----------
create or replace function public.eval_discount(p_code text, p_subtotal integer, p_email text default null)
returns json language plpgsql stable security definer set search_path = '' as $$
declare d public.discounts; v_amount int := 0; v_used int; v_email text := lower(trim(coalesce(p_email, '')));
begin
  select * into d from public.discounts where code = upper(trim(coalesce(p_code, '')));
  if not found or not d.active then return json_build_object('ok', false, 'error', 'El código no existe o no está activo'); end if;
  if d.starts_at is not null and now() < d.starts_at then return json_build_object('ok', false, 'error', 'El código aún no está vigente'); end if;
  if d.ends_at is not null and now() > d.ends_at then return json_build_object('ok', false, 'error', 'El código expiró'); end if;
  if d.usage_limit is not null and d.used_count >= d.usage_limit then return json_build_object('ok', false, 'error', 'El código ya alcanzó su límite de usos'); end if;
  if p_subtotal < d.min_subtotal then
    return json_build_object('ok', false, 'error', 'Este código aplica en compras desde $' || replace(to_char(d.min_subtotal, 'FM999,999,999'), ',', '.'));
  end if;
  if v_email <> '' then
    if d.once_per_customer then
      select count(*) into v_used from public.orders
       where discount_code = d.code and lower(customer_email) = v_email
         and status in ('pagado','preparando','despachado','entregado');
      if v_used > 0 then return json_build_object('ok', false, 'error', 'Ya usaste este código'); end if;
    end if;
    if d.first_order_only and exists (select 1 from public.orders where lower(customer_email) = v_email
                                         and status in ('pagado','preparando','despachado','entregado')) then
      return json_build_object('ok', false, 'error', 'Este código es solo para tu primera compra');
    end if;
    if d.subscribers_only and not exists (select 1 from public.subscribers where email = v_email) then
      return json_build_object('ok', false, 'error', 'Este código es para quienes se registraron en la web. Usa el mismo correo con el que te registraste.');
    end if;
  end if;
  if d.kind = 'percent' then v_amount := floor(p_subtotal * least(d.value, 100) / 100.0);
  elsif d.kind = 'fixed' then v_amount := least(d.value, p_subtotal);
  end if;
  return json_build_object('ok', true, 'code', d.code, 'kind', d.kind, 'value', d.value,
                           'amount', v_amount, 'free_shipping', d.kind = 'free_shipping',
                           'description', d.description,
                           'needs_email', (d.first_order_only or d.subscribers_only or d.once_per_customer) and v_email = '');
end; $$;

-- Código de bienvenida listo para usar (el pop-up queda apagado hasta activarlo)
insert into public.discounts (code, description, kind, value, first_order_only, subscribers_only, active)
values ('BIENVENIDA10', '10% en la primera compra (pop-up de bienvenida)', 'percent', 10, true, true, true)
on conflict (code) do nothing;
update public.store_settings set popup_code = 'BIENVENIDA10' where id = 1 and popup_code is null;

