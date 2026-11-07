// Planeta 4 Patas · Edge Function "mp-webhook"
// Recibe notificaciones de Mercado Pago y confirma el pago consultando la API (nunca confía en el payload).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const ok = (extra = {}) => new Response(JSON.stringify({ ok: true, ...extra }), { headers: { ...cors, "Content-Type": "application/json" } });
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

async function mpToken(): Promise<string> {
  const env = Deno.env.get("MP_ACCESS_TOKEN");
  if (env) return env;
  const { data } = await db.rpc("get_payment_secret", { p_name: "mp_access_token" });
  return (data as string) ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  let body: any = {};
  try { body = req.method === "POST" ? await req.json() : {}; } catch { /* body vacío */ }

  const type = body?.type ?? body?.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const paymentId = body?.data?.id ?? url.searchParams.get("data.id") ??
    (type === "payment" ? url.searchParams.get("id") : null);
  if (type !== "payment" || !paymentId || !/^\d+$/.test(String(paymentId))) return ok({ ignored: true });

  const token = await mpToken();
  if (!token) return ok({ ignored: true });

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return new Response("payment not found", { status: 200, headers: cors });
  const p = await r.json();

  const orderId = p.external_reference;
  if (orderId && /^[0-9a-f-]{36}$/i.test(orderId)) {
    const { data: order } = await db.from("orders").select("id, total").eq("id", orderId).maybeSingle();
    if (order) {
      const detail = {
        provider: "mercadopago", payment_id: p.id, status: p.status, status_detail: p.status_detail,
        amount: p.transaction_amount, method: p.payment_method_id, type: p.payment_type_id,
        installments: p.installments, card: p.card?.last_four_digits, date: p.date_approved,
      };
      if (p.status === "approved" && Math.round(p.transaction_amount) >= order.total) {
        await db.rpc("mark_order_paid", { p_order: order.id, p_ref: String(p.id), p_detail: detail });
      } else if (["rejected", "cancelled"].includes(p.status)) {
        await db.rpc("mark_order_failed", { p_order: order.id, p_detail: detail });
      }
    }
  }
  return ok();
});
