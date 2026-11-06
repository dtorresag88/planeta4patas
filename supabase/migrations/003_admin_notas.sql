-- Notas internas del pedido (solo visibles en el panel)
alter table public.orders add column if not exists admin_notes text;
