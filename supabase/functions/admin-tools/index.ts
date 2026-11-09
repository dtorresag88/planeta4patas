// Planeta 4 Patas · Edge Function "admin-tools"
// Herramientas del panel que necesitan credenciales del servidor. Solo administradores.
//   { action: "mp_check" } → verifica el Access Token de Mercado Pago guardado y devuelve la cuenta.
//   { action: "mp_refund", order_id, amount } → reembolsa (total o parcial) un pago de Mercado Pago.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const { data: u } = await db.auth.getUser(token);
  if (!u?.user) return json({ error: "No autorizado" }, 401);
  const { data: admin } = await db.from("admins").select("user_id").eq("user_id", u.user.id).is("disabled_at", null).maybeSingle();
  if (!admin) return json({ error: "No autorizado" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { /* vacío */ }

  if (body.action === "mp_check") {
    const { data: mp } = await db.rpc("get_payment_secret", { p_name: "mp_access_token" });
    if (!mp) return json({ ok: false, error: "No hay Access Token guardado" });
    const r = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${mp}` } });
    const me = await r.json().catch(() => ({}));
    if (!r.ok) return json({ ok: false, error: me?.message || "Mercado Pago rechazó el Access Token" });
    return json({
      ok: true, nickname: me.nickname, email: me.email, site_id: me.site_id,
      test: String(mp).startsWith("TEST-"),
    });
  }
  if (body.action === "mp_refund") {
    const amount = Math.floor(Number(body.amount));
    if (!(amount > 0)) return json({ ok: false, error: "Monto inválido" });
    const { data: o } = await db.from("orders").select("id, number, payment_method, payment_detail, total, refunded").eq("id", body.order_id).maybeSingle();
    if (!o) return json({ ok: false, error: "Pedido no encontrado" });
    const paymentId = o.payment_detail?.payment_id;
    if (o.payment_method !== "mercadopago" || !paymentId) return json({ ok: false, error: "Este pedido no tiene un pago de Mercado Pago para reembolsar" });
    if (amount > o.total - (o.refunded ?? 0)) return json({ ok: false, error: "El monto supera lo que queda por reembolsar" });
    const { data: mp } = await db.rpc("get_payment_secret", { p_name: "mp_access_token" });
    if (!mp) return json({ ok: false, error: "Mercado Pago no está conectado" });
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: { Authorization: `Bearer ${mp}`, "Content-Type": "application/json", "X-Idempotency-Key": `${o.id}-${o.refunded ?? 0}-${amount}` },
      body: JSON.stringify({ amount }),
    });
    const res = await r.json().catch(() => ({}));
    if (!r.ok) return json({ ok: false, error: res?.message || "Mercado Pago rechazó el reembolso" });
    return json({ ok: true, refund_id: res.id, status: res.status });
  }
  return json({ error: "Acción desconocida" }, 400);
});
