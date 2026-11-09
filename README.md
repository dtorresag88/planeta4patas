# Planeta 4 Patas · Tienda online + panel de administración

- **Tienda:** https://dtorresag88.github.io/planeta4patas/
- **Panel (estilo Shopify):** https://dtorresag88.github.io/planeta4patas/admin.html

Backend en Supabase (proyecto `nfwezvfzmbxkjptubdvi`): base de datos, usuarios, fotos y funciones de pago.

---

## 🚀 Primeros pasos (5 minutos)

1. **Crear tu cuenta del panel.** Entra a `admin.html` → **¿Primera vez? Crear cuenta** con `dtorresag@gmail.com` (ya está invitado) y una contraseña. Confirma el correo que te llega y vuelve a ingresar.
   *Si el enlace del correo abre una página que no carga, no importa: el correo ya quedó confirmado.*
2. **Conectar Mercado Pago.** Panel → **Configuración → Pagos** → pega el *Access Token* de producción (`APP_USR-…`) → **Probar conexión**. Ahí mismo hay una guía paso a paso para obtenerlo.
3. **Hacer una compra real de bajo monto** en la tienda y verificar que aparece como **Pagado** en el panel.

Mientras no haya un medio de pago activo, la tienda **sigue vendiendo**: el botón del checkout envía el pedido completo por WhatsApp.

---

## 🧭 Guía del panel

| Sección | Qué puedes hacer |
|---|---|
| **Inicio** | Ventas, pedidos, ticket promedio y unidades (con comparación al período anterior), gráfico de ventas, tareas pendientes (pedidos por preparar, transferencias por confirmar, stock bajo, productos sin foto) y más vendidos. |
| **Pedidos** | Pestañas por estado, búsqueda (#, nombre, teléfono, correo, RUT, comuna), acciones en lote (preparando / despachado / entregado), imprimir hojas de preparación y exportar a Excel. |
| **Detalle de pedido** | Avanzar el estado con un clic, registrar pago manual (transferencia/efectivo), cancelar con reposición de stock, historial con comentarios del equipo, notas internas, etiquetas, mensajes de WhatsApp listos por etapa (confirmación, en camino, listo para retiro, recuperar compra), enlace de seguimiento, mapa y Waze. |
| **Crear pedido** | Ventas en el local, por WhatsApp o teléfono: buscar productos, ajustar precios, despacho, descuento, medio de pago y cliente existente. Descuenta stock si está pagado. |
| **Pagos no completados** | Clientes que llegaron a pagar y no terminaron: recupéralos con la plantilla de WhatsApp. |
| **Productos** | Filtros (visibles, ocultos, destacados, sin foto, en oferta, stock bajo), acciones en lote (mostrar/ocultar, destacar, cambiar categoría, **subir/bajar precios %, poner/quitar oferta**, eliminar), exportar catálogo, **actualizar precios y stock desde un CSV de Excel** por código, copiar fotos externas a la tienda. |
| **Ficha de producto** | Título, descripción, **varias fotos** (arrastrar y soltar, se optimizan solas), formatos con precio, precio "antes", código y stock, categoría, marca, mascota, etapa, etiquetas, ventas de 90 días, duplicar, compartir enlace. |
| **Inventario** | Stock de todos los formatos con +/−, motivo del ajuste e **historial de movimientos** (ventas, cancelaciones, ajustes, importaciones). |
| **Categorías** | Crear, editar, ordenar (orden de la tienda) y eliminar. |
| **Clientes** | Generados automáticamente desde los pedidos: total gastado, n° de pedidos, recurrentes, mejores clientes, inactivos +60 días, notas y etiquetas, lo que más compra, botón "recordar reposición" por WhatsApp, exportar. |
| **Suscriptores** | Personas que dejaron sus datos en el pop-up: nombre, correo, WhatsApp, mascota, si ya compraron. Filtros, WhatsApp directo y exportar a Excel. |
| **Descuentos** | Códigos por % / monto fijo / despacho gratis, compra mínima, fechas, límite de usos, una vez por cliente, **solo primera compra** y **solo suscriptores**. Botón para compartir por WhatsApp. |
| **Pop-up promocional** | Ventana que aparece a los visitantes nuevos ofreciendo una promoción a cambio de sus datos. Título, texto, imagen, botón, código que se entrega, datos que se piden, segundos de espera y frecuencia, con vista previa. Viene listo con **BIENVENIDA10** (10% solo primera compra, solo suscriptores); se activa con un interruptor. |
| **Análisis** | Cualquier rango de fechas: ventas, descuentos, conversión del pago, clientes que repiten, más vendidos, por categoría, medio de pago, comuna, canal, día de la semana y hora. Exportar ventas por línea. |
| **Configuración** | General (datos, barra de anuncios, alerta de stock), **Pagos** (Mercado Pago, transferencia, Webpay), Despacho (costo, gratis desde, comunas y días, retiro) y **Equipo** (agregar administradores y quitar acceso). |

Extras: búsqueda global (tecla `/`), aviso con sonido y notificación al entrar un pedido pagado, contador de pedidos por preparar, funciona en el celular.

---

## 👥 Agregar administradores

Menú **Configuración → Administradores** → **＋ Agregar administrador** → escribe su correo. El panel te da un mensaje listo para enviarle por WhatsApp o correo; la persona entra a `admin.html`, elige **Crear cuenta** con ese correo, lo confirma e ingresa. Para sacar a alguien: **Quitar acceso** (se puede volver a invitar).

## 🛍️ Mejoras de la tienda

- Todo se controla desde el panel: anuncio, costo de despacho, comunas/días, retiro, medios de pago, WhatsApp, Instagram y horario.
- **Códigos de descuento** en el checkout (validados en el servidor).
- **Transferencia bancaria** opcional con instrucciones al cliente.
- Si no hay pagos en línea activos: **pedido por WhatsApp** con el detalle completo.
- Ficha de producto con **galería**, **productos relacionados**, **compartir por WhatsApp** y **enlace directo** (`?p=slug`).
- SEO: datos estructurados de tienda (PetStore), Open Graph, `robots.txt` y `sitemap.xml`.

---

## 🔐 Seguridad

- Precios, stock y descuentos se calculan **siempre en el servidor** (función `checkout`).
- Credenciales de pago guardadas **encriptadas en Supabase Vault**; el navegador nunca puede leerlas.
- Permisos por fila (RLS): solo administradores ven pedidos, clientes y configuración privada.
- Pagos de Mercado Pago y Webpay se confirman consultando la API del proveedor (nunca confiando en el navegador).
- Webpay en modo **integración** NO cobra: está desactivado por defecto y el panel lo advierte.

---

## 🏗️ Estructura técnica

```
index.html, assets/app.js, assets/styles.css      Tienda
admin.html, assets/admin.css, assets/admin/*.js   Panel (core, home, orders, products, customers, marketing, settings, boot)
assets/config.js                                  URL y clave pública de Supabase
supabase/migrations/001…006                        Esquema, RLS, funciones (aplicadas en el proyecto)
supabase/functions/checkout                       Crea pedido + pago (MP / Webpay / transferencia) con descuentos
supabase/functions/mp-webhook                     Confirma pagos de Mercado Pago
supabase/functions/webpay-return                  Confirma pagos Webpay
supabase/functions/admin-tools                    Verifica credenciales de Mercado Pago (solo admin)
supabase/functions/import-images                  Copia fotos externas al Storage (solo admin)
tools/catalogo.py                                 Genera 002_catalogo.sql y demo-data.js desde el Excel
```

Las funciones leen la configuración desde `store_settings` y las credenciales desde Vault, así que **no es necesario cargar secretos en Supabase**. (Si se definen variables `SITE_URL`, `MP_ACCESS_TOKEN`, etc. como secretos de Edge Functions, tienen prioridad.)

Publicar cambios: `git push` a `main` → GitHub Pages actualiza el sitio en ~1 minuto.

---

## ✅ Pendientes recomendados

- Supabase → **Authentication → URL Configuration → Site URL**: poner `https://dtorresag88.github.io/planeta4patas/admin.html` (para que los enlaces de confirmación y de "olvidé mi contraseña" vuelvan al panel).
- Supabase → Authentication → Users: eliminar la cuenta de prueba sin confirmar `dtorresag+qa@gmail.com` (creada durante las pruebas; no tiene acceso).
- Para invitar a otras personas al panel: el correo de Supabase por defecto solo envía a miembros de tu organización de Supabase. Para invitar a cualquier correo, configura un SMTP propio (Authentication → Emails → SMTP, p. ej. Resend o Brevo).
- Opcional: activar *Leaked password protection* en Authentication → Passwords.
- Subir fotos de los productos que aún no tienen (Productos → pestaña **Sin foto**).
- Dominio propio (ej. planeta4patas.cl) y actualizar la URL en Configuración → General.
