# Planeta 4 Patas · Tienda online

Tienda online del pet shop Planeta 4 Patas (Vicuña Mackenna 10492, La Florida, Santiago). Instagram: @planeta4patas_tienda · WhatsApp +56 9 8120 3671.

## Stack
- Frontend estático sin build: `index.html` (tienda), `admin.html` (panel), `assets/app.js`, `assets/styles.css`.
- Backend: Supabase (Postgres + Auth + Storage + Edge Functions en Deno).
- Pagos: Webpay Plus (Transbank, REST v1.2) y Mercado Pago (Checkout Pro).
- `assets/config.js` vacío = MODO DEMO (usa `assets/demo-data.js`, sin cobros).

## Estructura
- `supabase/migrations/001_tienda.sql` — esquema, RLS, funciones `get_order_status`, `mark_order_paid` (idempotente, descuenta stock), `mark_order_failed`, bucket `productos`.
- `supabase/migrations/002_catalogo.sql` — catálogo. GENERADO: no editar a mano.
- `tools/catalogo.py` — fuente del catálogo (productos, formatos, códigos, precios, fotos). Ejecutar `python3 tools/catalogo.py` para regenerar `002_catalogo.sql` y `assets/demo-data.js`.
- `supabase/functions/checkout` — crea pedido con precios del servidor y genera pago.
- `supabase/functions/mp-webhook` — confirma pagos MP consultando la API.
- `supabase/functions/webpay-return` — commit de Webpay y redirección al cliente.
- `supabase/functions/import-images` — copia fotos externas al Storage propio (solo admin).

## Reglas de negocio
- Despacho $1.990, gratis desde $60.000 (configurable en `store_settings`).
- Comunas y días: La Florida (Mié/Vie), Las Condes (Lun/Jue), Ñuñoa y Providencia (Mar).
- `product_variants.stock` null = sin control de stock.
- Precios en CLP enteros. Nunca confiar en precios del cliente.
- Códigos de producto (SKU) vienen del Excel del cliente; deben mantenerse.

## Estilo
- Marca: navy #0f2a52, azul #1f63c6, celeste #4cc3f2, naranjo #f7931e, amarillo #ffc83d. Tipografías Baloo 2 (títulos) y Nunito (texto).
- Tono cercano, español de Chile, emojis 🐾 con moderación.
- Mobile first: probar a 375 px sin scroll horizontal.

## Pendientes
- Crear proyecto Supabase, ejecutar migraciones, desplegar funciones, cargar secretos (ver README.md).
- Fotos: 24 productos tienen foto (enlaces externos); faltan marcas masivas y accesorios.
- Publicar en hosting estático (Netlify/Vercel/Cloudflare Pages) y conectar dominio.

## Previsualizar en local
`npx serve .` o `python -m http.server 8000` y abrir http://localhost:8000
