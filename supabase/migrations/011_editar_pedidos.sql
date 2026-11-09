-- =====================================================================
-- 011 · Editar los productos de un pedido (antes del despacho)
-- Ajusta stock por diferencia, recalcula totales y deja registro.
-- =====================================================================
alter table public.order_items drop constraint if exists order_items_qty_check;
alter table public.order_items add constraint order_items_qty_check check (qty >= 0);

create or replace function public.edit_order_items(p_order uuid, p_items jsonb, p_shipping int default null, p_reason text default null)
returns json language plpgsql security definer set search_path = '' as $$
declare
  o public.orders; v_actor text; it jsonb; v record; r record;
  v_old jsonb; v_new jsonb := '{}'::jsonb; v_qty int; v_price int; v_sub int := 0;
  v_delta int; v_stock int; v_total int; v_disc int; v_promo int; v_ship int; v_desc text := '';
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if o.status not in ('pendiente_pago', 'pagado', 'preparando') then
    raise exception 'Solo se pueden editar pedidos que aún no se despachan';
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then raise exception 'El pedido debe tener al menos un producto'; end if;
  select email into v_actor from auth.users where id = auth.uid();

  select coalesce(jsonb_object_agg(variant_id::text, q), '{}'::jsonb) into v_old
    from (select variant_id, sum(qty) as q from public.order_items where order_id = p_order and variant_id is not null group by 1) x;
  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(coalesce((it ->> 'qty')::int, 0), 0);
    continue when v_qty = 0;
    v_new := jsonb_set(v_new, array[it ->> 'variant_id'], to_jsonb(coalesce((v_new ->> (it ->> 'variant_id'))::int, 0) + v_qty));
  end loop;
  if v_new = '{}'::jsonb then raise exception 'El pedido debe tener al menos un producto'; end if;

  -- Stock: solo si el pedido ya lo había descontado (pagado o reservado)
  for r in select k as variant_id, coalesce((v_new ->> k)::int, 0) - coalesce((v_old ->> k)::int, 0) as delta
             from (select jsonb_object_keys(v_old) as k union select jsonb_object_keys(v_new)) keys
  loop
    continue when r.delta = 0;
    select pv.id, pv.stock, pv.label, p.name into v from public.product_variants pv join public.products p on p.id = pv.product_id
     where pv.id = r.variant_id::uuid for update of pv;
    if not found then raise exception 'Producto no encontrado'; end if;
    v_desc := v_desc || case when v_desc = '' then '' else ', ' end || v.name || ' ' || v.label || ' ' ||
              case when r.delta > 0 then '+' else '' end || r.delta;
    if o.stock_applied and v.stock is not null then
      if r.delta > 0 and v.stock < r.delta then raise exception 'Stock insuficiente: % % (quedan %)', v.name, v.label, v.stock; end if;
      update public.product_variants set stock = stock - r.delta where id = v.id returning stock into v_stock;
      insert into public.inventory_adjustments(variant_id, delta, stock_after, reason, actor)
      values (v.id, -r.delta, v_stock, 'Edición · pedido #' || o.number, v_actor);
    end if;
  end loop;

  -- Las líneas quitadas quedan con cantidad 0 (se ocultan en las vistas) para conservar el historial
  update public.order_items set qty = 0, line_total = 0 where order_id = p_order;
  for r in select key as variant_id, value::int as qty from jsonb_each_text(v_new) loop
    select pv.id, pv.sku, pv.label, pv.price, p.id as product_id, p.name into v
      from public.product_variants pv join public.products p on p.id = pv.product_id where pv.id = r.variant_id::uuid;
    select greatest(coalesce((x ->> 'unit_price')::int, v.price), 0) into v_price
      from jsonb_array_elements(p_items) x where x ->> 'variant_id' = r.variant_id limit 1;
    update public.order_items set qty = r.qty, unit_price = v_price, line_total = v_price * r.qty
     where id = (select i.id from public.order_items i where i.order_id = p_order and i.variant_id = v.id limit 1);
    if not found then
      insert into public.order_items(order_id, product_id, variant_id, sku, name, variant_label, unit_price, qty, line_total)
      values (p_order, v.product_id, v.id, v.sku, v.name, v.label, v_price, r.qty, v_price * r.qty);
    end if;
  end loop;
  select coalesce(sum(line_total), 0) into v_sub from public.order_items where order_id = p_order;

  v_promo := least(o.promo_discount, v_sub);
  v_disc := least(o.discount, v_sub - v_promo);
  v_ship := greatest(coalesce(p_shipping, o.shipping), 0);
  v_total := v_sub - v_promo - v_disc + v_ship;
  update public.orders set subtotal = v_sub, promo_discount = v_promo, discount = v_disc, shipping = v_ship, total = v_total
   where id = p_order;

  insert into public.order_events(order_id, kind, message, actor)
  values (p_order, 'edit',
          'Pedido editado' || case when v_desc <> '' then ': ' || v_desc else '' end ||
          ' · Total $' || replace(to_char(o.total, 'FM999,999,999'), ',', '.') || ' → $' || replace(to_char(v_total, 'FM999,999,999'), ',', '.') ||
          case when o.paid_at is not null and v_total > o.total then ' (cobrar $' || replace(to_char(v_total - o.total, 'FM999,999,999'), ',', '.') || ' adicionales)'
               when o.paid_at is not null and v_total < o.total then ' (devolver $' || replace(to_char(o.total - v_total, 'FM999,999,999'), ',', '.') || ')'
               else '' end ||
          coalesce(' · ' || nullif(trim(p_reason), ''), ''),
          v_actor);
  return json_build_object('total', v_total, 'difference', v_total - o.total);
end; $$;
revoke execute on function public.edit_order_items(uuid, jsonb, int, text) from public, anon;
