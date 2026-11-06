# Planeta 4 Patas · Tienda online

Tienda propia con catálogo, carrito, checkout con **Webpay Plus** y **Mercado Pago**, seguimiento de pedidos y panel de administración. El backend corre sobre Supabase.

## Estructura

```
index.html                  Tienda (catálogo, carrito, checkout, estado del pedido)
admin.html                  Panel: pedidos, productos/stock/precios, despacho
assets/config.js            ← ÚNICO archivo que se edita para conectar la tienda
assets/app.js · styles.css  Lógica y diseño
assets/demo-data.js         Catálogo de vista previa (modo demo)
supabase/migrations/001_tienda.sql   Base de datos, seguridad y catálogo inicial
supabase/functions/checkout          Crea el pedido y el pago
supabase/functions/mp-webhook        Confirma pagos de Mercado Pago
supabase/functions/webpay-return     Confirma pagos Webpay
```

Sin `config.js` completo la tienda funciona en **modo demo** (navegable, sin cobros).

## Puesta en marcha

### 1. Supabase
1. Crear proyecto (región **South America – São Paulo**).
2. **SQL Editor** → ejecutar `supabase/migrations/001_tienda.sql` y luego `002_catalogo.sql` (catálogo con códigos y precios).
3. **Authentication → Users → Add user**: crear el usuario administrador (correo + contraseña).
4. En SQL Editor:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'CORREO_DEL_ADMIN';
   ```

### 2. Edge Functions
Con Supabase CLI (`npm i -g supabase`):
```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy checkout --no-verify-jwt
supabase functions deploy mp-webhook --no-verify-jwt
supabase functions deploy webpay-return --no-verify-jwt
supabase functions deploy import-images --no-verify-jwt
```

Secretos (**Project Settings → Edge Functions → Secrets**):

| Secreto | Valor |
|---|---|
| `SITE_URL` | URL pública de la tienda, ej. `https://planeta4patas.cl` |
| `MP_ACCESS_TOKEN` | Mercado Pago → Tus integraciones → Credenciales de producción → *Access Token* |
| `WEBPAY_ENV` | `integration` (pruebas) o `production` |
| `WEBPAY_COMMERCE_CODE` | Código de comercio entregado por Transbank (solo producción) |
| `WEBPAY_API_KEY` | API Key secreta entregada por Transbank (solo producción) |

> Webpay parte en **ambiente de integración** con las credenciales públicas de prueba de Transbank, así se puede probar el flujo completo sin cobros reales. Tarjetas de prueba: transbankdevelopers.cl → Documentación → Ambientes.

### 3. Conectar la web
En `assets/config.js` completar `SUPABASE_URL` y `SUPABASE_ANON_KEY` (Project Settings → API).

### 4. Publicar
Cualquier hosting estático sirve (gratis): **Netlify** (arrastrar la carpeta en app.netlify.com/drop), **Vercel** o **Cloudflare Pages**. Luego apuntar el dominio y actualizar `SITE_URL`.

### 5. Pasar a producción
- **Webpay**: contratar Webpay Plus REST en Transbank, completar el proceso de validación, cargar `WEBPAY_COMMERCE_CODE`, `WEBPAY_API_KEY` y `WEBPAY_ENV=production`.
- **Mercado Pago**: usar credenciales de producción de la cuenta de la tienda. Las notificaciones de pago llegan solas (la URL va en cada preferencia).
- Hacer una compra real de bajo monto con cada medio y revisar que aparezca como **Pagado** en el panel.

## Fotos de productos
El catálogo trae fotos oficiales de 24 productos enlazadas desde internet. Al conectar la tienda, en el panel **Productos → "Copiar fotos a la tienda"** quedan guardadas en el Storage propio. El resto se sube desde el panel (Editar producto → Imagen).

## Operación diaria (admin.html)
- **Pedidos**: los pagados quedan en "Pagados (por preparar)". Cambiar estado a Preparando → Despachado → Entregado. Botón directo a WhatsApp del cliente.
- **Productos**: crear/editar, subir foto, formatos (kg, packs) con precio, precio "antes" para ofertas y stock. El stock se descuenta solo al confirmarse el pago.
- **Despacho**: costo, monto para despacho gratis y comunas con días de reparto.

## Pendiente antes de lanzar
- Cargar **stock** (opcional) y subir las fotos de los productos que aún no tienen.
- Confirmar comunas y días de reparto en el panel.
