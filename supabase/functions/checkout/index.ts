// Planeta 4 Patas · Edge Function "checkout"
// Crea el pedido con precios del servidor, aplica descuentos y genera el pago
// (Mercado Pago, Webpay Plus o transferencia). La configuración se lee de store_settings
// y las credenciales de Vault (se cargan desde el panel: Configuración → Pagos).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const db = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

// Credenciales públicas de PRUEBA de Transbank (ambiente de integración, sin cobros reales)
const WEBPAY_TEST = { code: "597055555532", key: "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C" };

async function secret(name: string): Promise<string> {
  const env = Deno.env.get(name.toUpperCase());
  if (env) return env;
  const { data } = await db.rpc("get_payment_secret", { p_name: name });
  return (data as string) ?? "";
}

type CartLine = { variant_id: string; qty: number };
const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Solicitud inválida" }, 400); }

  const { data: settings } = await db.from("store_settings").select("*").eq("id", 1).single();
  if (!settings) return json({ error: "Tienda no configurada" }, 500);
  const SITE_URL = (Deno.env.get("SITE_URL") || settings.site_url || "").replace(/\/$/, "");
  if (!SITE_URL) return json({ error: "Falta configurar la URL de la tienda" }, 500);

  // ---------- Validación ----------
  const items: CartLine[] = Array.isArray(body?.items) ? body.items : [];
  const customer = body?.customer ?? {};
  const delivery = body?.delivery ?? {};
  const payment = body?.payment_method;

  if (!items.length || items.length > 50) return json({ error: "El carrito está vacío" }, 400);
  if (!["mercadopago", "webpay", "transferencia"].includes(payment)) return json({ error: "Medio de pago inválido" }, 400);

  let mpToken = "", wp = { code: "", key: "", base: "" };
  if (payment === "mercadopago") {
    mpToken = settings.mp_enabled ? await secret("mp_access_token") : "";
    if (!mpToken) return json({ error: "Mercado Pago no está disponible en este momento" }, 503);
  }
  if (payment === "webpay") {
    if (!settings.webpay_enabled) return json({ error: "Webpay no está disponible en este momento" }, 503);
    if (settings.webpay_env === "production") {
      wp = { code: await secret("webpay_commerce_code"), key: await secret("webpay_api_key"), base: "https://webpay3g.transbank.cl" };
      if (!wp.code || !wp.key) return json({ error: "Webpay no está disponible en este momento" }, 503);
    } else {
      wp = { ...WEBPAY_TEST, base: "https://webpay3gint.transbank.cl" };
    }
  }
  if (payment === "transferencia" && !settings.transfer_enabled) return json({ error: "La transferencia no está disponible" }, 503);

  const name = clean(customer.name, 120), email = clean(customer.email, 160).toLowerCase(),
    phone = clean(customer.phone, 30), rut = clean(customer.rut, 15);
  if (name.length < 3) return json({ error: "Ingresa tu nombre" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Correo inválido" }, 400);
  if (phone.replace(/\D/g, "").length < 8) return json({ error: "Teléfono inválido" }, 400);

  const method = delivery.method === "despacho" ? "despacho" : "retiro";
  if (method === "retiro" && settings.pickup_enabled === false) return json({ error: "El retiro en tienda no está disponible" }, 400);
  const comuna = clean(delivery.comuna, 60), address = clean(delivery.address, 200),
    addressDetail = clean(delivery.detail, 120), notes = clean(delivery.notes, 500);

  // ---------- Precios y stock desde la base ----------
  const qtyById = new Map<string, number>();
  for (const l of items) {
    const q = Math.floor(Number(l?.qty));
    if (typeof l?.variant_id !== "string" || !(q > 0) || q > 99) return json({ error: "Cantidad inválida" }, 400);
    qtyById.set(l.variant_id, (qtyById.get(l.variant_id) ?? 0) + q);
  }
  const { data: variants, error: vErr } = await db
    .from("product_variants")
    .select("id, sku, label, price, stock, active, product:products(id, name, active)")
    .in("id", [...qtyById.keys()]);
  if (vErr) return json({ error: "No pudimos validar el carrito" }, 500);

  const lines = [];
  let subtotal = 0;
  for (const [id, qty] of qtyById) {
    const v: any = variants?.find((x) => x.id === id);
    if (!v || !v.active || !v.product?.active) return json({ error: "Un producto del carrito ya no está disponible" }, 409);
    if (v.stock !== null && v.stock < qty) return json({ error: `Stock insuficiente: ${v.product.name} ${v.label} (quedan ${v.stock})` }, 409);
    const line_total = v.price * qty;
    subtotal += line_total;
    lines.push({ product_id: v.product.id, variant_id: v.id, sku: v.sku, name: v.product.name, variant_label: v.label, unit_price: v.price, qty, line_total });
  }

  // ---------- Descuento ----------
  let discount = 0, discountCode: string | null = null, freeShipping = false;
  const code = clean(body?.discount_code, 30);
  if (code) {
    const { data: d } = await db.rpc("eval_discount", { p_code: code, p_subtotal: subtotal, p_email: email });
    if (!d?.ok) return json({ error: d?.error ?? "Código de descuento inválido" }, 400);
    discount = d.amount ?? 0; discountCode = d.code; freeShipping = !!d.free_shipping;
  }

  // ---------- Despacho ----------
  const fee = settings.shipping_fee ?? 1990, freeFrom = settings.free_shipping_from ?? 60000;
  let shipping = 0, deliveryDay: string | null = null;
  if (method === "despacho") {
    const zone = (settings.delivery_zones ?? []).find((z: any) => z.comuna === comuna);
    if (!zone) return json({ error: "Aún no despachamos a esa comuna" }, 400);
    if (address.length < 5) return json({ error: "Ingresa la dirección de despacho" }, 400);
    shipping = freeShipping || subtotal >= freeFrom ? 0 : fee;
    deliveryDay = (zone.dias ?? []).join(" / ");
  }
  const total = subtotal - discount + shipping;
  if (total <= 0 && payment !== "transferencia") return json({ error: "El total del pedido debe ser mayor a $0" }, 400);

  // ---------- Crear pedido ----------
  const { data: order, error: oErr } = await db.from("orders").insert({
    payment_method: payment, customer_name: name, customer_email: email, customer_phone: phone,
    customer_rut: rut || null, delivery_method: method, comuna: method === "despacho" ? comuna : null,
    address: method === "despacho" ? address : null, address_detail: addressDetail || null,
    delivery_day: deliveryDay, notes: notes || null, subtotal, shipping, total,
    discount, discount_code: discountCode, source: "web",
  }).select("id, number, access_token").single();
  if (oErr || !order) return json({ error: "No pudimos crear el pedido" }, 500);

  const { error: iErr } = await db.from("order_items").insert(lines.map((l) => ({ ...l, order_id: order.id })));
  if (iErr) {
    await db.from("orders").update({ status: "cancelado", cancel_reason: "Error al guardar productos" }).eq("id", order.id);
    return json({ error: "No pudimos crear el pedido" }, 500);
  }

  const backUrl = `${SITE_URL}/?pedido=${order.id}&t=${order.access_token}`;

  // ---------- Transferencia: queda pendiente hasta que la tienda confirme ----------
  if (payment === "transferencia") {
    return json({ order_id: order.id, number: order.number, redirect_url: backUrl });
  }

  // ---------- Mercado Pago (Checkout Pro) ----------
  if (payment === "mercadopago") {
    // Con descuento se envía un único ítem por el total, para que el monto cobrado sea exacto.
    const mpItems = discount > 0
      ? [{ id: order.id, title: `Pedido #${order.number} · Planeta 4 Patas`, quantity: 1, unit_price: total, currency_id: "CLP" }]
      : lines.map((l) => ({
        id: l.variant_id, title: `${l.name} ${l.variant_label}`.slice(0, 250),
        quantity: l.qty, unit_price: l.unit_price, currency_id: "CLP",
      }));
    if (discount === 0 && shipping > 0) mpItems.push({ id: "despacho", title: "Despacho", quantity: 1, unit_price: shipping, currency_id: "CLP" });

    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${mpToken}`, "Content-Type": "application/json", "X-Idempotency-Key": order.id },
      body: JSON.stringify({
        items: mpItems,
        payer: { name, email },
        external_reference: order.id,
        statement_descriptor: "PLANETA4PATAS",
        back_urls: { success: backUrl, failure: backUrl, pending: backUrl },
        auto_return: "approved",
        notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
      }),
    });
    const pref = await r.json().catch(() => ({}));
    if (!r.ok || !pref.init_point) {
      await db.from("orders").update({ status: "cancelado", cancel_reason: "Mercado Pago no respondió", payment_detail: pref }).eq("id", order.id);
      return json({ error: "Mercado Pago no respondió. Intenta nuevamente." }, 502);
    }
    await db.from("orders").update({ payment_ref: pref.id }).eq("id", order.id);
    return json({ order_id: order.id, number: order.number, redirect_url: pref.init_point });
  }

  // ---------- Webpay Plus ----------
  const r = await fetch(`${wp.base}/rswebpaytransaction/api/webpay/v1.2/transactions`, {
    method: "POST",
    headers: { "Tbk-Api-Key-Id": wp.code, "Tbk-Api-Key-Secret": wp.key, "Content-Type": "application/json" },
    body: JSON.stringify({
      buy_order: `P4P${order.number}`,
      session_id: order.id,
      amount: total,
      return_url: `${SUPABASE_URL}/functions/v1/webpay-return`,
    }),
  });
  const tx = await r.json().catch(() => ({}));
  if (!r.ok || !tx.token) {
    await db.from("orders").update({ status: "cancelado", cancel_reason: "Webpay no respondió", payment_detail: tx }).eq("id", order.id);
    return json({ error: "Webpay no respondió. Intenta nuevamente." }, 502);
  }
  await db.from("orders").update({ payment_ref: tx.token }).eq("id", order.id);
  return json({ order_id: order.id, number: order.number, webpay: { url: tx.url, token: tx.token } });
});
