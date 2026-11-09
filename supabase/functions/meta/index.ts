// Planeta 4 Patas · Edge Function "meta"
// API de Conversiones de Meta (compras confirmadas desde el servidor) y catálogo de productos.
//   GET  ?feed=1                              → catálogo CSV para Meta Commerce Manager (público)
//   POST { action: "purchase", order_id }     → lo llama la base al pagarse un pedido web. Envía la compra
//                                               una sola vez (orders.meta_sent_at). Público pero idempotente.
//   POST { action: "status" | "test" }        → solo administradores
// El token se lee del secreto META_CAPI_TOKEN (Supabase → Edge Functions → Secrets).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const API = "https://graph.facebook.com/v21.0";

async function settings() {
  const { data } = await db.from("store_settings").select("*").eq("id", 1).single();
  return data ?? {};
}
const capiToken = () => Deno.env.get("META_CAPI_TOKEN") ?? "";
const siteOf = (s: any) => String(s.site_url || "").replace(/\/$/, "");

async function sha256(v: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
function phoneCL(v: unknown) {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.length === 9 && d.startsWith("9")) d = "56" + d;
  else if (d.length === 8) d = "569" + d;
  return d.length >= 10 ? d : "";
}

async function sendEvents(s: any, events: unknown[], testCode?: string) {
  const token = capiToken();
  if (!token) return { ok: false, error: "Falta el token de la API de Conversiones (secreto META_CAPI_TOKEN)" };
  const pixel = String(s.meta_pixel_id || "").trim();
  if (!pixel) return { ok: false, error: "Falta el ID del pixel" };
  const body: any = { data: events };
  const code = testCode ?? String(s.meta_test_event_code || "").trim();
  if (code) body.test_event_code = code;
  const r = await fetch(`${API}/${encodeURIComponent(pixel)}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const res = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: res?.error?.error_user_msg || res?.error?.message || `Error ${r.status}` };
  return { ok: true, received: res.events_received ?? 0, test: !!code };
}

async function purchaseEvent(s: any, o: any, items: any[]) {
  const m = o.meta ?? {};
  const [first, ...rest] = String(o.customer_name || "").trim().split(/\s+/);
  const ud: Record<string, unknown> = {
    em: [await sha256(String(o.customer_email || "").trim().toLowerCase())],
    external_id: [await sha256(String(o.customer_email || "").trim().toLowerCase())],
    country: [await sha256("cl")],
  };
  const ph = phoneCL(o.customer_phone);
  if (ph) ud.ph = [await sha256(ph)];
  if (first) ud.fn = [await sha256(norm(first))];
  if (rest.length) ud.ln = [await sha256(norm(rest.join("")))];
  if (o.comuna) ud.ct = [await sha256(norm(o.comuna))];
  if (m.ip) ud.client_ip_address = m.ip;
  if (m.ua) ud.client_user_agent = m.ua;
  if (m.fbp) ud.fbp = m.fbp;
  if (m.fbc) ud.fbc = m.fbc;
  const lines = items.filter((i) => i.qty > 0);
  return {
    event_name: "Purchase",
    event_time: Math.floor(new Date(o.paid_at || Date.now()).getTime() / 1000),
    event_id: `purchase-${o.number}`,
    action_source: "website",
    event_source_url: m.url || `${siteOf(s)}/`,
    user_data: ud,
    custom_data: {
      currency: "CLP", value: o.total, order_id: String(o.number), content_type: "product",
      content_ids: [...new Set(lines.map((i) => i.product_id))],
      contents: lines.map((i) => ({ id: i.product_id, quantity: i.qty, item_price: i.unit_price })),
      num_items: lines.reduce((a, i) => a + i.qty, 0),
    },
  };
}

// ---------------------------------------------------------------- catálogo CSV
const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\s+/g, " ").trim()}"`;
async function feed() {
  const s = await settings();
  const site = siteOf(s);
  const { data: products } = await db.from("products")
    .select("id, slug, name, brand, category, description, image_url, gallery, product_variants(label, price, compare_at_price, stock, active)")
    .eq("active", true);
  const head = ["id", "title", "description", "availability", "condition", "price", "sale_price", "link", "image_link", "additional_image_link", "brand", "product_type"];
  const rows = [head.join(",")];
  for (const p of products ?? []) {
    const vs = (p.product_variants ?? []).filter((v: any) => v.active !== false);
    if (!vs.length || !p.image_url) continue;
    const avail = vs.filter((v: any) => v.stock == null || v.stock > 0);
    const v = [...(avail.length ? avail : vs)].sort((a: any, b: any) => a.price - b.price)[0];
    const sale = v.compare_at_price > v.price;
    const labels = vs.map((x: any) => x.label).filter(Boolean).join(", ");
    rows.push([
      p.id, p.name, (p.description || p.name) + (vs.length > 1 && labels ? ` · Formatos: ${labels}` : ""),
      avail.length ? "in stock" : "out of stock", "new",
      `${sale ? v.compare_at_price : v.price} CLP`, sale ? `${v.price} CLP` : "",
      `${site}/?p=${encodeURIComponent(p.slug)}`, p.image_url, (p.gallery ?? []).slice(0, 10).join(","),
      p.brand || s.store_name || "Planeta 4 Patas", p.category || "",
    ].map(csv).join(","));
  }
  return new Response(rows.join("\n"), { headers: { ...cors, "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "public, max-age=900" } });
}

// ---------------------------------------------------------------- servidor
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  if (req.method === "GET" && url.searchParams.get("feed")) return feed();
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let body: any = {};
  try { body = await req.json(); } catch { /* vacío */ }
  const s = await settings();

  // Compra confirmada (desde la base al pagarse el pedido)
  if (body.action === "purchase") {
    const id = String(body.order_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Pedido inválido" }, 400);
    if (!capiToken() || !String(s.meta_pixel_id || "").trim()) return json({ ok: true, skipped: "Meta no configurado" });
    // Marca como enviado antes de enviar: nunca se envía dos veces aunque lleguen dos avisos
    const { data: o } = await db.from("orders").update({ meta_sent_at: new Date().toISOString(), meta_error: null })
      .eq("id", id).is("meta_sent_at", null).not("paid_at", "is", null).eq("source", "web").select("*").maybeSingle();
    if (!o) return json({ ok: true, skipped: "ya enviado o no pagado" });
    if (o.meta?.consent === false) return json({ ok: true, skipped: "sin consentimiento" });
    if (Date.now() - new Date(o.paid_at).getTime() > 6 * 864e5) return json({ ok: true, skipped: "demasiado antiguo" });
    const { data: items } = await db.from("order_items").select("product_id, qty, unit_price").eq("order_id", o.id);
    const res = await sendEvents(s, [await purchaseEvent(s, o, items ?? [])]);
    if (!res.ok) await db.from("orders").update({ meta_sent_at: null, meta_error: res.error }).eq("id", o.id);
    return json(res);
  }

  // Resto: solo administradores
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const { data: u } = await db.auth.getUser(token);
  if (!u?.user) return json({ error: "No autorizado" }, 401);
  const { data: admin } = await db.from("admins").select("user_id").eq("user_id", u.user.id).is("disabled_at", null).maybeSingle();
  if (!admin) return json({ error: "No autorizado" }, 403);

  if (body.action === "status") {
    const { count: sent } = await db.from("orders").select("id", { count: "exact", head: true }).not("meta_sent_at", "is", null);
    const { data: last } = await db.from("orders").select("number, meta_error").not("meta_error", "is", null).order("created_at", { ascending: false }).limit(1);
    return json({ ok: true, capi: !!capiToken(), pixel: String(s.meta_pixel_id || "").trim(), sent: sent ?? 0, last_error: last?.[0] ?? null });
  }

  if (body.action === "test") {
    const code = String(body.test_event_code || s.meta_test_event_code || "").trim();
    if (!code) return json({ ok: false, error: "Ingresa el código de prueba de Meta (Administrador de eventos → Probar eventos)" }, 400);
    const res = await sendEvents(s, [{
      event_name: "PageView", event_time: Math.floor(Date.now() / 1000), event_id: `test-${crypto.randomUUID()}`,
      action_source: "website", event_source_url: `${siteOf(s)}/`,
      user_data: { client_ip_address: req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1", client_user_agent: req.headers.get("user-agent") || "Planeta4Patas-Test" },
    }], code);
    return json(res, res.ok ? 200 : 400);
  }

  if (body.action === "retry") {
    const { data: rows } = await db.from("orders").select("id").not("meta_error", "is", null).is("meta_sent_at", null).not("paid_at", "is", null)
      .gte("paid_at", new Date(Date.now() - 6 * 864e5).toISOString()).limit(50);
    let ok = 0;
    for (const r of rows ?? []) {
      const { data: o } = await db.from("orders").update({ meta_sent_at: new Date().toISOString(), meta_error: null }).eq("id", r.id).is("meta_sent_at", null).select("*").maybeSingle();
      if (!o) continue;
      const { data: items } = await db.from("order_items").select("product_id, qty, unit_price").eq("order_id", o.id);
      const res = await sendEvents(s, [await purchaseEvent(s, o, items ?? [])]);
      if (res.ok) ok++; else await db.from("orders").update({ meta_sent_at: null, meta_error: res.error }).eq("id", o.id);
    }
    return json({ ok: true, sent: ok, pending: (rows ?? []).length });
  }

  return json({ error: "Acción no válida" }, 400);
});
