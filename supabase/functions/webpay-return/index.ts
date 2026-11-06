// Planeta 4 Patas · Edge Function "webpay-return"
// Transbank redirige aquí al terminar el pago: confirma (commit) la transacción y devuelve al cliente a la tienda.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
const WEBPAY_ENV = Deno.env.get("WEBPAY_ENV") ?? "integration";
const WEBPAY_BASE = WEBPAY_ENV === "production" ? "https://webpay3g.transbank.cl" : "https://webpay3gint.transbank.cl";
const WEBPAY_CODE = Deno.env.get("WEBPAY_COMMERCE_CODE") ?? (WEBPAY_ENV === "production" ? "" : "597055555532");
const WEBPAY_KEY = Deno.env.get("WEBPAY_API_KEY") ??
  (WEBPAY_ENV === "production" ? "" : "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C");

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const redirect = (to: string) => new Response(null, { status: 303, headers: { Location: to } });

async function params(req: Request) {
  const out = new URLSearchParams(new URL(req.url).search);
  if (req.method === "POST") {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const f = await req.formData();
      for (const [k, v] of f.entries()) out.set(k, String(v));
    }
  }
  return out;
}

async function backTo(orderId: string | null) {
  if (!orderId) return redirect(`${SITE_URL}/?pago=error`);
  const { data } = await db.from("orders").select("id, access_token").eq("id", orderId).maybeSingle();
  return data ? redirect(`${SITE_URL}/?pedido=${data.id}&t=${data.access_token}`) : redirect(`${SITE_URL}/?pago=error`);
}

Deno.serve(async (req) => {
  const p = await params(req);
  const tokenWs = p.get("token_ws");
  const tbkToken = p.get("TBK_TOKEN");
  const sessionId = p.get("TBK_ID_SESION");

  // Flujo normal: confirmar transacción
  if (tokenWs && !tbkToken) {
    const { data: order } = await db.from("orders").select("id, total").eq("payment_ref", tokenWs).maybeSingle();
    const r = await fetch(`${WEBPAY_BASE}/rswebpaytransaction/api/webpay/v1.2/transactions/${encodeURIComponent(tokenWs)}`, {
      method: "PUT",
      headers: { "Tbk-Api-Key-Id": WEBPAY_CODE, "Tbk-Api-Key-Secret": WEBPAY_KEY, "Content-Type": "application/json" },
    });
    const tx = await r.json().catch(() => ({}));
    const orderId = order?.id ?? tx.session_id ?? null;
    if (orderId) {
      const detail = {
        provider: "webpay", status: tx.status, response_code: tx.response_code, amount: tx.amount,
        authorization_code: tx.authorization_code, payment_type: tx.payment_type_code,
        installments: tx.installments_number, card: tx.card_detail?.card_number, date: tx.transaction_date,
      };
      if (r.ok && tx.status === "AUTHORIZED" && tx.response_code === 0 && (!order || tx.amount >= order.total)) {
        await db.rpc("mark_order_paid", { p_order: orderId, p_ref: tokenWs, p_detail: detail });
      } else {
        await db.rpc("mark_order_failed", { p_order: orderId, p_detail: detail });
      }
    }
    return backTo(orderId);
  }

  // Pago anulado por el cliente o tiempo agotado
  if (sessionId) {
    await db.rpc("mark_order_failed", { p_order: sessionId, p_detail: { provider: "webpay", status: "ABORTED" } });
    return backTo(sessionId);
  }
  return redirect(`${SITE_URL}/?pago=error`);
});
