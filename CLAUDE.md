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

## Despliegue actual
- Sitio: https://dtorresag88.github.io/planeta4patas/ (GitHub Pages, repo público dtorresag88/planeta4patas, rama main). Panel: `/admin.html`.
- Supabase: proyecto `nfwezvfzmbxkjptubdvi`. Migraciones 001–008 aplicadas; funciones (checkout, mp-webhook, webpay-return, admin-tools, import-images) con verify_jwt=false.
- Panel modular: `assets/admin/core.js` (utilidades, router hash `#/ruta`, modales `A.modal/A.ask/A.confirm`, `A.setDirty` barra de guardado) + un archivo por sección. Todo cuelga de `window.A`.
- Config de tienda y pagos en `store_settings` (editable desde el panel). Credenciales de pago en Vault vía `set_payment_secret` (admin) / `get_payment_secret` (solo service_role).
- Pop-up promocional: columnas `popup_*` en `store_settings`; datos en `subscribers` vía RPC pública `subscribe()`; descuentos con `first_order_only` / `subscribers_only`. `?popup=1` fuerza la vista previa en la tienda.
- Admins: tabla `admins` (`disabled_at` = acceso quitado, `admin_remove()`); invitaciones en `admin_invites` + `claim_admin_invite()` al iniciar sesión (requiere correo confirmado).
- Funciones admin (`set_stock`, `admin_mark_paid`, `cancel_order`, `create_manual_order`, `admin_invite`, `admin_team`) validan `is_admin()` internamente.
- Pruebas: arnés Playwright con backend simulado (no hay usuario admin de prueba). Probar a 375 px.

## Pendientes
- Dueño debe crear su cuenta en el panel (dtorresag@gmail.com ya invitado) y pegar el Access Token de Mercado Pago en Configuración → Pagos.
- Auth Site URL → admin.html; borrar usuario de prueba sin confirmar dtorresag+qa@gmail.com.
- Fotos: 24 productos tienen foto (enlaces externos); faltan marcas masivas y accesorios.
- Dominio propio (opcional) y actualizar URL en Configuración → General.

## Previsualizar en local
`npx serve .` o `python -m http.server 8000` y abrir http://localhost:8000
