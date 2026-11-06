-- =====================================================================
-- PLANETA 4 PATAS · Catálogo (generado desde Lista productos Planeta4patas.xlsx)
-- Generado por tools/catalogo.py — reemplaza el catálogo completo.
-- Ejecutar DESPUÉS de 001_tienda.sql y antes de recibir pedidos.
-- =====================================================================
begin;
delete from public.product_variants;
delete from public.products;
delete from public.categories;
insert into public.categories (slug, name, emoji, sort) values
  ('alimento-perro', 'Alimento perros', '🐶', 1),
  ('alimento-gato', 'Alimento gatos', '🐱', 2),
  ('humedo', 'Sobres y latas', '🥫', 3),
  ('snacks', 'Snacks y premios', '🦴', 4),
  ('arena', 'Arenas sanitarias', '🪣', 5),
  ('higiene', 'Higiene y cuidado', '🧼', 6),
  ('juguetes', 'Juguetes', '🎾', 7),
  ('paseo', 'Collares, correas y arneses', '🦮', 8),
  ('ropa', 'Ropa y abrigo', '🧥', 9),
  ('accesorios', 'Platos y accesorios', '🥣', 10);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('master-dog-adulto', 'Master Dog Adulto', 'Master Dog', 'alimento-perro', 'perro', 'Adulto', true, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('1091', '1 kg a granel', 2980, null::int, null::int, 0),
  ('112', '2 kg a granel', 5490, null::int, null::int, 1),
  ('101', '18 kg', 30990, null::int, null::int, 2),
  ('102', '18 kg Pollo', 29990, null::int, null::int, 3)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('master-dog-raza-pequena', 'Master Dog Raza Pequeña', 'Master Dog', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('103', '21 kg', 31990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('champion-dog-raza-pequena', 'Champion Dog Raza Pequeña', 'Champion Dog', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('303', '18 kg', 29490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('champion-dog-cachorro', 'Champion Dog Cachorro', 'Champion Dog', 'alimento-perro', 'perro', 'Cachorro', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('89897', '18 kg', 29490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('fit-formula-perro-adulto', 'Fit Formula Perro Adulto', 'Fit Formula', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('401', '20 kg', 36990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('fit-formula-raza-pequena', 'Fit Formula Raza Pequeña', 'Fit Formula', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('403', '10 kg', 21990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('fit-formula-cachorro', 'Fit Formula Cachorro', 'Fit Formula', 'alimento-perro', 'perro', 'Cachorro', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/fit-formula-cachorro-todas-las-razas-6498227.jpg?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('404', '10 kg', 22990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('fit-formula-senior-razas-pequenas', 'Fit Formula Senior Razas Pequeñas', 'Fit Formula', 'alimento-perro', 'perro', 'Senior', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('209', 'Saco', 25990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('nomade-adulto', 'Nómade Adulto', 'Nómade', 'alimento-perro', 'perro', 'Adulto', true, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/nomade-alimento-perro-adulto-razas-medianas-y-grandes-5295795.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('702', '20 kg', 38490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('nomade-raza-pequena', 'Nómade Raza Pequeña', 'Nómade', 'alimento-perro', 'perro', 'Adulto', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/nomade-alimento-adulto-razas-pequenas-8701279.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('706', '10 kg', 22490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('nomade-cachorro', 'Nómade Cachorro', 'Nómade', 'alimento-perro', 'perro', 'Cachorro', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/nmade-alimento-perro-cachorro-todas-las-razas-10kg.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('708', '10 kg', 23990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('nomade-senior', 'Nómade Senior', 'Nómade', 'alimento-perro', 'perro', 'Senior', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/NSRP9KG_1761060319.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('705', '9 kg', 21490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('pet-family-todas-las-razas', 'Pet Family Todas las Razas Pollo y Vacuno', 'Pet Family', 'alimento-perro', 'perro', 'Adulto', true, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('1008', '5 kg', 25990, null::int, null::int, 0),
  ('1002', '15 kg', 47990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('pet-family-raza-pequena', 'Pet Family Raza Pequeña', 'Pet Family', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('1004', '5 kg', 25990, null::int, null::int, 0),
  ('1003', '15 kg', 48990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('pet-family-cachorro', 'Pet Family Cachorro', 'Pet Family', 'alimento-perro', 'perro', 'Cachorro', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('1001', '10 kg', 34990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('pet-family-cerdo-nordico', 'Pet Family Cerdo Nórdico', 'Pet Family', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('1005', '15 kg', 49990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('pet-family-grain-free', 'Pet Family Grain Free', 'Pet Family', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('1007', '3 kg', 19990, null::int, null::int, 0),
  ('1006', '12 kg', 57990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bravery-perro-pollo', 'Bravery Perro Adulto Pollo', 'Bravery', 'alimento-perro', 'perro', 'Adulto', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/bravery-chicken-adult-largemedium-breeds-6741870.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('1401', '2 kg', 19990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bravery-perro-salmon-medianas-grandes', 'Bravery Salmón Adulto Razas Medianas y Grandes', 'Bravery', 'alimento-perro', 'perro', 'Adulto', true, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('1402', '4 kg', 27990, null::int, null::int, 0),
  ('BR01', '12 kg', 63990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bravery-perro-salmon-mini', 'Bravery Salmón Mini Adulto Razas Pequeñas', 'Bravery', 'alimento-perro', 'perro', 'Adulto', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/bravery-salmon-mini-adult-small-breeds-1732026.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('BR04', '7 kg', 46990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bravery-perro-salmon-mini-puppy', 'Bravery Salmón Mini Puppy Razas Pequeñas', 'Bravery', 'alimento-perro', 'perro', 'Cachorro', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('4PE07', '7 kg', 48990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bravery-iberian-pork-mini', 'Bravery Iberian Pork Mini Adulto Razas Pequeñas', 'Bravery', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('BR02', '7 kg', 43990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bravery-iberian-pork-medianas-grandes', 'Bravery Iberian Pork Adulto Razas Medianas y Grandes', 'Bravery', 'alimento-perro', 'perro', 'Adulto', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/bravery-iberian-pork-adult-largemedium-breeds-3228846.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('BR03', '12 kg', 62990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bravery-lamb-mini', 'Bravery Cordero Mini Adulto Razas Pequeñas', 'Bravery', 'alimento-perro', 'perro', 'Adulto', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/bravery-lamb-mini-adult-small-breeds-3299866.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('BR05', '7 kg', 46990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('brit-care-gf-adult-salmon', 'Brit Care Grain Free Adulto Salmón', 'Brit Care', 'alimento-perro', 'perro', 'Adulto', true, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/brit-care-adult-small-medium-breed-salmon-5954742.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('B03', '3 kg', 22490, null::int, null::int, 0),
  ('B04', '12 kg', 65990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('brit-care-gf-senior-light-salmon', 'Brit Care Grain Free Senior & Light Salmón', 'Brit Care', 'alimento-perro', 'perro', 'Senior', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/brit-care-senior-light-all-breed-salmon-7270681.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('B05', '3 kg', 22490, null::int, null::int, 0),
  ('B014', '12 kg', 64490, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('brit-care-chicken-insect-small', 'Brit Care Chicken & Insect Adulto Raza Pequeña', 'Brit Care', 'alimento-perro', 'perro', 'Adulto', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/brit-care-dog-chicken-insect-adult-small-breed-8645486.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('B01', '3 kg', 20490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('brit-care-chicken-insect-senior', 'Brit Care Chicken & Insect Senior', 'Brit Care', 'alimento-perro', 'perro', 'Senior', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('B013', '3 kg', 20490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('brit-care-insect-fish-sensitive', 'Brit Care Insect & Fish Sensitive', 'Brit Care', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('B02', '3 kg', 26990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('brit-care-hypo-small-lamb', 'Brit Care Hypoallergenic Adulto Raza Pequeña Cordero', 'Brit Care', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('B06', '3 kg', 22490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('brit-care-hypo-medium-lamb', 'Brit Care Hypoallergenic Adulto Raza Mediana Cordero', 'Brit Care', 'alimento-perro', 'perro', 'Adulto', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/brit-care-dog-hypoallergenic-adult-medium-breed-lamb-14-k-6883530.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('B07', '3 kg', 22490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('brit-care-hypo-weight-loss-rabbit', 'Brit Care Hypoallergenic Weight Loss Conejo', 'Brit Care', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('B08', '3 kg', 22490, null::int, null::int, 0),
  ('B015', '12 kg', 66990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('brit-care-hypo-senior-lamb', 'Brit Care Hypoallergenic Senior Cordero', 'Brit Care', 'alimento-perro', 'perro', 'Senior', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('B010', '3 kg', 22490, null::int, null::int, 0),
  ('B09', '12 kg', 61990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('brit-premium-by-nature-medium', 'Brit Premium by Nature Adulto Raza Mediana', 'Brit Premium', 'alimento-perro', 'perro', 'Adulto', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/brit-premium-by-nature-adult-medium-9002612.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('B016', '3 kg', 18490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('vitalcan-cordero', 'Vitalcan Cordero', 'Vitalcan', 'alimento-perro', 'perro', 'Adulto', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/vitalcan-premium-perro-adulto-cordero-20-kg-8344738.png?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('1201', '20 kg', 38990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bokato-gold', 'Bokato Gold', 'Bokato', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('3001', '20 kg', 52990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bokato-veloz', 'Bokato Veloz', 'Bokato', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('BO 01', '20 kg', 54990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bokato-tradicion-premium', 'Bokato Tradición Premium', 'Bokato', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('BOK01', '20 kg', 50990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bokato-lady', 'Bokato Lady Súper Premium', 'Bokato', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('BO03', '10 kg', 35990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bokato-petit', 'Bokato Petit Súper Premium', 'Bokato', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('BO02', '10 kg', 31990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('dog-chow-adulto', 'Dog Chow Adulto', 'Purina Dog Chow', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('9170', '8 kg', 20990, null::int, null::int, 0),
  ('6565', '19,5 kg', 47990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('amity-low-grain-salmon-perro', 'Amity Low Grain Salmón Perro Adulto', 'Amity', 'alimento-perro', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('4PE140004', '14 kg', 55490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('master-cat-adulto', 'Master Cat Adulto', 'Master Cat', 'alimento-gato', 'gato', 'Adulto', true, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('106', '1 kg a granel', 3690, null::int, null::int, 0),
  ('107', '2 kg a granel', 6990, null::int, null::int, 1),
  ('202', '3 kg', 9990, null::int, null::int, 2),
  ('201', '20 kg', 43990, null::int, null::int, 3)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('master-cat-gatito', 'Master Cat Gatito', 'Master Cat', 'alimento-gato', 'gato', 'Gatito', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('203', '8 kg', 20990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('fit-formula-gato', 'Fit Formula Gato', 'Fit Formula', 'alimento-gato', 'gato', 'Adulto', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/fit-formula-alimento-para-gato-5135676.jpg?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('501', '10 kg', 26990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('cat-chow-adultos', 'Cat Chow Adultos', 'Purina Cat Chow', 'alimento-gato', 'gato', 'Adulto', true, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('602', '8 kg', 22990, null::int, null::int, 0),
  ('601', '19,5 kg', 54990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('cat-chow-gatitos', 'Cat Chow Gatitos', 'Purina Cat Chow', 'alimento-gato', 'gato', 'Gatito', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('603', 'Saco', 23990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('nomade-gato', 'Nómade Gato', 'Nómade', 'alimento-gato', 'gato', 'Adulto', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/nomade-gato-adulto-6624474.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('56734', '3 kg', 10990, null::int, null::int, 0),
  ('704', '10 kg', 26990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bravery-gato-pollo-adulto', 'Bravery Gato Adulto Pollo', 'Bravery', 'alimento-gato', 'gato', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('1403', '2 kg', 19990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bravery-gato-pollo-esterilizado', 'Bravery Gato Adulto Esterilizado Pollo', 'Bravery', 'alimento-gato', 'gato', 'Adulto', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/bravery-chicken-adult-cat-sterilized-4947322.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('4GA0200', '2 kg', 20990, null::int, null::int, 0),
  ('BR786', '7 kg', 47990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bravery-gato-salmon-esterilizado', 'Bravery Gato Adulto Esterilizado Salmón', 'Bravery', 'alimento-gato', 'gato', 'Adulto', true, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/bravery-salmon-adult-cat-sterilized-8956238.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('AGA02003', '2 kg', 22990, null::int, null::int, 0),
  ('BR06', '7 kg', 52990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bravery-gato-herring-esterilizado', 'Bravery Gato Adulto Esterilizado Arenque', 'Bravery', 'alimento-gato', 'gato', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('BR07', '2 kg', 22990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bravery-gatito-pollo', 'Bravery Gatito Pollo', 'Bravery', 'alimento-gato', 'gato', 'Gatito', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/bravery-chicken-kitten-4453308.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('4GA020', '2 kg', 20990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('brit-care-gato-sterilized-sensitive', 'Brit Care Gato Grain Free Sterilized Sensitive', 'Brit Care', 'alimento-gato', 'gato', 'Adulto', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/brit-care-cat-sterilized-sensitive-6875933.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('B011', '2 kg', 18990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('brit-care-gato-indoor', 'Brit Care Gato Grain Free Indoor Anti-stress', 'Brit Care', 'alimento-gato', 'gato', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('B012', '2 kg', 17490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('amity-low-grain-gato-esterilizado', 'Amity Low Grain Salmón Gato Adulto Esterilizado', 'Amity', 'alimento-gato', 'gato', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('4GA020040', '2 kg', 19490, null::int, null::int, 0),
  ('4GA070010', '7 kg', 45990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('pet-family-gato', 'Pet Family Gato', 'Pet Family', 'alimento-gato', 'gato', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('109', '7 kg', 37990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bokato-gato-adulto', 'Bokato Gato Adulto', 'Bokato', 'alimento-gato', 'gato', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('BO 02', '7 kg', 35490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('whiskas-adulto', 'Whiskas Adulto', 'Whiskas', 'alimento-gato', 'gato', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('9898', '10 kg', 26990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('royal-canin-urinary', 'Royal Canin Urinary', 'Royal Canin', 'alimento-gato', 'gato', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('98978', '1,5 kg', 18990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('sachet-master-cat', 'Sachet Master Cat', 'Master Cat', 'humedo', 'gato', 'Adulto', true, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('909', '1 unidad', 890, null::int, null::int, 0),
  ('910', 'Promo x3', 1990, 2670, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('sachet-master-dog', 'Sachet Master Dog', 'Master Dog', 'humedo', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('911', '1 unidad', 890, null::int, null::int, 0),
  ('912', 'Promo x3', 1990, 2670, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('sachet-dog-chow', 'Sachet Dog Chow', 'Purina Dog Chow', 'humedo', 'perro', 'Adulto', true, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('913', '1 unidad', 990, null::int, null::int, 0),
  ('914', 'Promo x3', 2490, 2970, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('sachet-whiskas', 'Sachet Whiskas', 'Whiskas', 'humedo', 'gato', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('916', '1 unidad', 850, null::int, null::int, 0),
  ('917', 'Promo x3', 2500, 2550, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('sachet-felix', 'Sachet Felix', 'Felix', 'humedo', 'gato', 'Adulto', true, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('F01', '1 unidad', 990, null::int, null::int, 0),
  ('F02', 'Promo x3', 2250, 2970, null::int, 1),
  ('A7', 'Pack x5', 3990, 4950, null::int, 2)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('felix-gatitos-sobre', 'Felix Sobre Gatitos', 'Felix', 'humedo', 'gato', 'Gatito', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('A6', '1 unidad', 990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('sachet-pedigree', 'Sachet Pedigree', 'Pedigree', 'humedo', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('P01', '1 unidad', 950, null::int, null::int, 0),
  ('P02', 'Promo x3', 2450, 2850, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('lata-pedigree', 'Lata Pedigree', 'Pedigree', 'humedo', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('5656', 'Lata', 1790, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('lata-whiskas', 'Lata Whiskas', 'Whiskas', 'humedo', 'gato', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('9899', 'Lata', 2190, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('lata-felix', 'Lata Felix', 'Felix', 'humedo', 'gato', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('8785', '156 g', 1190, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('churu-gato', 'Churu Gato', 'Churu', 'snacks', 'gato', 'Todas', true, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/churu-atun.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('903', '1 unidad', 2990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('churu-perro', 'Churu Perro', 'Churu', 'snacks', 'perro', 'Todas', false, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/LKD650_1763563602.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('904', '1 unidad', 2990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('churu-promo', 'Churu Promo (gato o perro)', 'Churu', 'snacks', 'ambos', 'Todas', true, true, 'https://cdn.shopify.com/s/files/1/0807/8311/4470/files/churu-variedades-atn-y-pollo-50-p.webp?width=600') returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('905', 'Promo x2', 5500, 5980, null::int, 0),
  ('906', 'Promo x3', 6990, 8970, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('cremi-gato', 'Cremi Gato', 'Cremi', 'snacks', 'gato', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('907', '1 unidad', 1890, null::int, null::int, 0),
  ('908', 'Promo x3', 5490, 5670, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('whiskas-snack', 'Whiskas Snack', 'Whiskas', 'snacks', 'gato', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('5657', 'Unidad', 1290, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('felix-travesuras', 'Felix Travesuras Snacks', 'Felix', 'snacks', 'gato', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('A8', '40 g', 990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('dentastix-raza-mediana', 'Dentastix Raza Mediana', 'Pedigree', 'snacks', 'perro', 'Adulto', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('915', 'Unidad', 2390, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('dingo-mini-bones', 'Dingo Mini Bones', 'Dingo', 'snacks', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('D01', 'Unidad', 4990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('dingo-hueso-medium', 'Dingo Hueso Medium', 'Dingo', 'snacks', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('D02', 'Unidad', 4990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('naturalistic-grill-meat-pato', 'Naturalistic Grill Meat Pato', 'Naturalistic', 'snacks', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('4217', 'Unidad', 2900, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('hueso-femur-porcino', 'Hueso Fémur Porcino', null, 'snacks', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('7786', 'Unidad', 2990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('galletas-pet-family', 'Galletas Pet Family', 'Pet Family', 'snacks', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('PET01', 'Unidad', 2990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('galleta-fit-formula', 'Galletas Fit Formula', 'Fit Formula', 'snacks', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('GA01', '400 g', 3690, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('arena-fit-formula', 'Arena Fit Formula', 'Fit Formula', 'arena', 'gato', 'Todas', true, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('802', '4 kg', 6990, null::int, null::int, 0),
  ('801', '10 kg', 11990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('arena-ciudad-animal', 'Arena Ciudad Animal', 'Ciudad Animal', 'arena', 'gato', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('803', '2 kg', 2990, null::int, null::int, 0),
  ('805', 'Pack x2 (2 kg)', 4990, 5980, null::int, 1),
  ('808', '20 kg', 14990, null::int, null::int, 2)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('arena-safari', 'Arena Safari', 'Safari', 'arena', 'gato', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('804', '4 kg', 4990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('arena-cristal', 'Arena de Cristal', null, 'arena', 'gato', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('A1', '5 L', 5490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('arena-turbo-clean-lavanda', 'Arena Turbo Clean Lavanda', 'Turbo Clean', 'arena', 'gato', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('A2', '4 kg', 4990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('arena-top-k9-rosas', 'Arena Top K9 Rosas', 'Top K9', 'arena', 'gato', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('A3', '2 kg', 2990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('sabanillas-zooper', 'Sabanillas Zooper', 'Zooper', 'higiene', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('A4', '60x60 · 30 un.', 9990, null::int, null::int, 0),
  ('A5', '60x90 · 30 un.', 11990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('sabanillas-60x90', 'Sabanillas 60x90', null, 'higiene', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('79040', '20 un.', 6990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('bolsas-desechos', 'Bolsas para Desechos', null, 'higiene', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('5311983', '120 bolsas', 2190, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('cepillo-deslanador', 'Cepillo Deslanador', null, 'higiene', 'ambos', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('Cs040', 'Unidad', 5990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('cepillo-mascota', 'Cepillo para Mascota', null, 'higiene', 'ambos', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('65677', 'Unidad', 3490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('juguete-cuerda', 'Juguete de Cuerda', null, 'juguetes', 'perro', 'Todas', true, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('82530', 'Rollito de nudo chico', 1190, null::int, null::int, 0),
  ('74771', 'Rollo', 2490, null::int, null::int, 1),
  ('79274', 'Rollito de nudo', 2790, null::int, null::int, 2),
  ('82535', 'Lazo y pelota', 2990, null::int, null::int, 3),
  ('68043', 'Hueso', 3490, null::int, null::int, 4),
  ('79312', 'Nudos XL', 5990, null::int, null::int, 5)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('peluche-perro', 'Peluche para Perro', null, 'juguetes', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('82344', 'Cuerpo mordedor', 3490, null::int, null::int, 0),
  ('82372', 'Cuerda y cara (jirafa, hipopótamo, cocodrilo)', 4290, null::int, null::int, 1),
  ('82069', 'Con pelota y cuerpo de cuerda', 4990, null::int, null::int, 2)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('pelota-premio', 'Pelota Premio', null, 'juguetes', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('74209', 'Unidad', 2490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('manta-olfatoria', 'Manta Olfatoria', null, 'juguetes', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('6897', 'Unidad', 9990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('raton-juguete-gato', 'Ratón de Juguete', null, 'juguetes', 'gato', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('66108', 'Ratón', 1190, null::int, null::int, 0),
  ('82815', 'Ratón volador', 3990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('varita-gato', 'Varita para Gato', null, 'juguetes', 'gato', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('79824', 'Pelota blanca', 1490, null::int, null::int, 0),
  ('79832', 'Cascabel', 1890, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('rodillo-gato', 'Juguete Rodillo para Gato', null, 'juguetes', 'gato', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('82762', 'Unidad', 1290, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('collar-perro', 'Collar de Perro', null, 'paseo', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('79628', 'Talla M (2,0 cm)', 1490, null::int, null::int, 0),
  ('81214', 'Talla L (2,5 cm)', 1990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('collar-deluxe', 'Collar Deluxe Broche Metálico', null, 'paseo', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('79696', 'Unidad', 2990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('collar-gato', 'Collar de Gato', null, 'paseo', 'gato', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('83596', 'Unidad', 1190, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('correa', 'Correa', null, 'paseo', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('75252', '1,5 m · 2,5 cm', 3490, null::int, null::int, 0),
  ('75256', '3 m · 3,8 cm', 5490, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('correa-retractil', 'Correa Retráctil', null, 'paseo', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('82515', '3 m', 6490, null::int, null::int, 0),
  ('79995', '5 m', 6990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('arnes-pechera', 'Arnés Pechera', null, 'paseo', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('75440', 'XS', 8990, null::int, null::int, 0),
  ('75442', 'M', 9990, null::int, null::int, 1),
  ('75443', 'L', 10990, null::int, null::int, 2)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('arnes-con-agarre', 'Arnés con Agarre', null, 'paseo', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('75493', 'M', 7990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('arnes-xcho', 'Arnés Xcho', null, 'paseo', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('75545', 'S', 5990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('arnes-cachorro', 'Arnés Cachorro', null, 'paseo', 'perro', 'Cachorro', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('73380', 'Unidad', 4590, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('arnes-gato', 'Arnés para Gato', null, 'paseo', 'gato', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('73415', 'Arnés', 3590, null::int, null::int, 0),
  ('79718', 'Arnés + correa', 3990, null::int, null::int, 1)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('parka', 'Parka para Perro', null, 'ropa', 'perro', 'Todas', true, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('76209', 'S', 5990, null::int, null::int, 0),
  ('762090', 'M', 6990, null::int, null::int, 1),
  ('762092', 'L', 7990, null::int, null::int, 2),
  ('76251', '5XL', 11990, null::int, null::int, 3)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('chaleco', 'Chaleco para Perro', null, 'ropa', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('81104', 'XL', 4590, null::int, null::int, 0),
  ('811041', 'XXL', 4990, null::int, null::int, 1),
  ('81107', 'XXL Rosado', 4990, null::int, null::int, 2)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('polar-huellitas', 'Polar Huellitas Azul', null, 'ropa', 'perro', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('83504', 'S', 3490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('plato-colores', 'Plato de Colores', null, 'accesorios', 'ambos', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('82508', 'Unidad', 3890, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('plato-inclinado', 'Plato Inclinado', null, 'accesorios', 'ambos', 'Todas', false, true, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('82709', 'Unidad', 2490, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('promo-18-gato-arena', 'Promo 18 Gato Arena', null, 'arena', 'gato', 'Todas', false, false, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('PRO1', 'Promo', 9990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('promo-18-gato-nomade', 'Promo 18 Gato Nómade', 'Nómade', 'alimento-gato', 'gato', 'Adulto', false, false, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('PRO2', 'Promo', 14990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values ('promo-18-perro-galleta', 'Promo 18 Perro Galleta', null, 'snacks', 'perro', 'Todas', false, false, null) returning id)
insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)
select p.id, v.* from p, (values
  ('PRO3', 'Promo', 9990, null::int, null::int, 0)
) as v(sku, label, price, compare_at_price, stock, sort);

commit;