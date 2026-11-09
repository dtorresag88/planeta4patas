// Planeta 4 Patas · Edge Function "marketing"
// Correos con Resend: campañas, recordatorios de recompra y enlace para darse de baja.
//   GET  ?unsub=<token>                       → página "te diste de baja" (público)
//   POST { action: "cron_reminders" }         → tarea diaria (pg_cron). Como máximo una vez cada 20 h.
//   POST { action: "status" | "test" | "audience" | "send_campaign" | "send_reminders" } → solo administradores
// La API key de Resend se lee del secreto RESEND_API_KEY (Supabase → Edge Functions → Secrets)
// o de Vault (p4p_resend_api_key).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const db = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const FN_URL = `${SUPABASE_URL}/functions/v1/marketing`;

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function resendKey(): Promise<string> {
  const env = Deno.env.get("RESEND_API_KEY");
  if (env) return env;
  const { data } = await db.rpc("get_payment_secret", { p_name: "resend_api_key" });
  return (data as string) ?? "";
}
async function settings() {
  const { data } = await db.from("store_settings").select("*").eq("id", 1).single();
  return data ?? {};
}
const fromOf = (s: any) => (s.email_from || "").trim() || `${s.store_name || "Planeta 4 Patas"} <onboarding@resend.dev>`;
const siteOf = (s: any) => String(s.site_url || "").replace(/\/$/, "");

async function unsubUrl(email: string) {
  const { data } = await db.rpc("email_token", { p_email: email });
  return `${FN_URL}?unsub=${data}`;
}

// ---------------------------------------------------------------- plantilla
function layout(s: any, o: { heading?: string; body: string; image?: string; code?: string; button?: string; url?: string; unsub?: string; preheader?: string }) {
  const site = siteOf(s);
  const paras = esc(o.body).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.6">${p.replace(/\n/g, "<br>")}</p>`).join("");
  const wa = String(s.whatsapp || "").replace(/\D/g, "");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f2f7fc;font-family:Arial,Helvetica,sans-serif;color:#13233f">
<span style="display:none;max-height:0;overflow:hidden">${esc(o.preheader || o.heading || "")}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f7fc;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
  <tr><td style="background:#0f2a52;padding:18px 24px"><a href="${esc(site)}" style="color:#fff;text-decoration:none;font-size:20px;font-weight:bold">🐾 ${esc(s.store_name || "Planeta 4 Patas")}</a></td></tr>
  ${o.image ? `<tr><td><img src="${esc(o.image)}" alt="" width="560" style="display:block;width:100%;height:auto"></td></tr>` : ""}
  <tr><td style="padding:26px 24px 8px">
    ${o.heading ? `<h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#0f2a52">${esc(o.heading)}</h1>` : ""}
    ${paras}
    ${o.code ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;width:100%"><tr><td align="center" style="border:2px dashed #f7931e;background:#fff8ef;border-radius:12px;padding:14px">
      <div style="font-size:12px;color:#5b6b85">Tu código</div><div style="font-size:26px;font-weight:bold;letter-spacing:2px;color:#0f2a52">${esc(o.code)}</div></td></tr></table>` : ""}
    ${o.button && o.url ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 22px"><tr><td style="background:#f7931e;border-radius:999px">
      <a href="${esc(o.url)}" style="display:inline-block;padding:13px 28px;color:#fff;font-weight:bold;text-decoration:none">${esc(o.button)}</a></td></tr></table>` : ""}
  </td></tr>
  <tr><td style="padding:16px 24px 22px;border-top:1px solid #dfe8f3;font-size:12px;color:#5b6b85;line-height:1.6">
    ${esc(s.address || "")}${wa ? ` · <a href="https://wa.me/${wa}" style="color:#1f63c6">WhatsApp</a>` : ""}${s.instagram ? ` · <a href="https://instagram.com/${esc(s.instagram)}" style="color:#1f63c6">Instagram</a>` : ""}
    ${o.unsub ? `<br>¿No quieres recibir más correos? <a href="${esc(o.unsub)}" style="color:#5b6b85">Darse de baja</a>` : ""}
  </td></tr>
</table></td></tr></table></body></html>`;
}

async function sendBatch(key: string, emails: any[]) {
  let sent = 0; const errors: string[] = [];
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100);
    const r = await fetch("https://api.resend.com/emails/batch", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(chunk),
    });
    const res = await r.json().catch(() => ({}));
    if (r.ok) sent += chunk.length; else errors.push(res?.message || `Error ${r.status}`);
  }
  return { sent, errors };
}

// ---------------------------------------------------------------- recordatorios de recompra
async function reminderEmails(s: any, rows: any[]) {
  const site = siteOf(s);
  const ids = [...new Set(rows.map((r) => r.product_id))];
  const { data: prods } = await db.from("products").select("id, slug, image_url").in("id", ids);
  const out = [];
  for (const r of rows) {
    const p = prods?.find((x) => x.id === r.product_id);
    const first = String(r.name || "").split(" ")[0];
    out.push({
      from: fromOf(s), to: [r.email],
      subject: `${first ? first + ", ¿" : "¿"}se está acabando el ${r.product_name}? 🐾`,
      html: layout(s, {
        heading: `¿Se está acabando el ${r.product_name}?`,
        preheader: "Repite tu compra en un par de clics",
        body: `¡Hola${first ? " " + first : ""}!\n\nYa pasaron unas semanas desde que compraste ${r.product_name} ${r.variant_label || ""}. Para que a tu regalón no le falte nada, puedes repetir tu pedido ahora mismo.\n\nDespachamos a domicilio o puedes retirarlo en nuestra tienda.`,
        image: p?.image_url || undefined,
        button: "Repetir mi compra", url: p ? `${site}/?p=${encodeURIComponent(p.slug)}` : site,
        unsub: await unsubUrl(r.email),
      }),
      _row: r,
    });
  }
  return out;
}

async function sendReminders(s: any, rows: any[], key: string) {
  const { data: outs } = await db.from("email_optouts").select("email");
  const blocked = new Set((outs ?? []).map((x) => x.email));
  rows = rows.filter((r) => !blocked.has(r.email));
  if (!rows.length) return { sent: 0, errors: [] as string[] };
  const emails = await reminderEmails(s, rows);
  const res = await sendBatch(key, emails.map(({ _row, ...e }) => e));
  if (res.sent) {
    for (const e of emails.slice(0, res.sent)) {
      await db.rpc("log_reminder", { p_email: e._row.email, p_product: e._row.product_id, p_order: e._row.last_order, p_channel: "email" });
    }
  }
  return res;
}

// ---------------------------------------------------------------- servidor
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);

  // Darse de baja (enlace del correo)
  if (req.method === "GET" && url.searchParams.get("unsub")) {
    const token = url.searchParams.get("unsub")!;
    const ok = /^[0-9a-f-]{36}$/i.test(token) ? (await db.rpc("unsubscribe", { p_token: token })).data?.ok : false;
    const s = await settings();
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(s.store_name || "Planeta 4 Patas")}</title></head>
      <body style="margin:0;font-family:Arial,sans-serif;background:#f2f7fc;color:#13233f;display:grid;place-items:center;min-height:100vh;padding:16px">
      <div style="background:#fff;border-radius:18px;padding:28px;max-width:420px;text-align:center">
      <div style="font-size:42px">${ok ? "👋" : "🔎"}</div>
      <h1 style="color:#0f2a52;font-size:22px">${ok ? "Listo, ya no te enviaremos correos" : "No encontramos tu suscripción"}</h1>
      <p style="color:#5b6b85">${ok ? "Si fue un error, puedes volver a registrarte en la tienda cuando quieras." : "Es posible que ya te hayas dado de baja."}</p>
      <a href="${esc(siteOf(s))}" style="display:inline-block;margin-top:8px;background:#f7931e;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Ir a la tienda</a></div></body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* vacío */ }
  const s = await settings();

  // Tarea diaria automática
  if (body.action === "cron_reminders") {
    if (!s.reminders_auto) return json({ ok: true, skipped: "desactivado" });
    if (s.reminders_last_run && Date.now() - new Date(s.reminders_last_run).getTime() < 20 * 3600e3) return json({ ok: true, skipped: "ya se ejecutó hoy" });
    const key = await resendKey();
    if (!key) return json({ ok: true, skipped: "sin correo configurado" });
    await db.from("store_settings").update({ reminders_last_run: new Date().toISOString() }).eq("id", 1);
    const { data: due } = await db.rpc("replenish_due", { p_ahead: 1, p_back: 14 });
    const rows = (due ?? []).filter((r: any) => !r.reminded_at);
    const res = await sendReminders(s, rows, key);
    return json({ ok: true, ...res });
  }

  // Resto: solo administradores
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const { data: u } = await db.auth.getUser(token);
  if (!u?.user) return json({ error: "No autorizado" }, 401);
  const { data: admin } = await db.from("admins").select("user_id").eq("user_id", u.user.id).is("disabled_at", null).maybeSingle();
  if (!admin) return json({ error: "No autorizado" }, 403);
  const key = await resendKey();

  if (body.action === "status") return json({ ok: true, configured: !!key, from: fromOf(s), custom_from: !!(s.email_from || "").trim() });

  if (body.action === "audience") {
    const { data } = await db.rpc("campaign_audience", { p_audience: body.audience || "suscriptores" });
    return json({ ok: true, count: (data ?? []).length });
  }

  if (!key) return json({ ok: false, error: "Falta conectar el servicio de correo (Resend). Revisa Configuración → Correo." });

  if (body.action === "test") {
    const c = body.campaign ?? {};
    const res = await sendBatch(key, [{
      from: fromOf(s), to: [u.user.email], subject: `[Prueba] ${c.subject || "Correo de prueba"}`,
      html: layout(s, { heading: c.heading || "¡Tu correo funciona! 🐾", body: c.body || "Este es un correo de prueba enviado desde el panel de la tienda.",
        image: c.image_url, code: c.discount_code, button: c.button_text, url: c.button_url, unsub: await unsubUrl(u.user.email!) }),
    }]);
    return json(res.sent ? { ok: true, to: u.user.email } : { ok: false, error: res.errors[0] });
  }

  if (body.action === "send_campaign") {
    const { data: c } = await db.from("email_campaigns").select("*").eq("id", body.campaign_id).single();
    if (!c) return json({ ok: false, error: "Campaña no encontrada" });
    if (c.status === "enviada" || c.status === "enviando") return json({ ok: false, error: "Esta campaña ya fue enviada" });
    const { data: people } = await db.rpc("campaign_audience", { p_audience: c.audience });
    const list = people ?? [];
    if (!list.length) return json({ ok: false, error: "No hay destinatarios para esta audiencia" });
    await db.from("email_campaigns").update({ status: "enviando", recipients: list.length }).eq("id", c.id);
    const emails = [];
    for (const p of list) {
      const first = String(p.name || "").split(" ")[0];
      emails.push({
        from: fromOf(s), to: [p.email], subject: c.subject,
        html: layout(s, {
          heading: (c.heading || "").replace(/\{nombre\}/g, first || ""), body: c.body.replace(/\{nombre\}/g, first || ""),
          image: c.image_url, code: c.discount_code, button: c.button_text, url: c.button_url || siteOf(s), unsub: await unsubUrl(p.email),
        }),
      });
    }
    const res = await sendBatch(key, emails);
    await db.from("email_campaigns").update({
      status: res.sent ? "enviada" : "error", sent: res.sent, sent_at: new Date().toISOString(), error: res.errors.join(" · ") || null,
    }).eq("id", c.id);
    return json({ ok: res.sent > 0, sent: res.sent, total: list.length, error: res.errors[0] });
  }

  if (body.action === "send_reminders") {
    const wanted: any[] = Array.isArray(body.items) ? body.items : [];
    const { data: due } = await db.rpc("replenish_due", { p_ahead: 60, p_back: 120 });
    const rows = (due ?? []).filter((r: any) => wanted.some((w) => w.email === r.email && w.product_id === r.product_id));
    const res = await sendReminders(s, rows, key);
    return json({ ok: res.sent > 0, ...res, error: res.errors[0] });
  }

  return json({ error: "Acción desconocida" }, 400);
});
