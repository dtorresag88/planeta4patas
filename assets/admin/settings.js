/* =====================================================================
   Panel · Configuración (general, pagos, despacho, equipo)
   ===================================================================== */
(() => {
  const { $, $$, esc, clp } = A;
  const TABS = [["general", "🏪 General"], ["pagos", "💳 Pagos"], ["despacho", "🚚 Despacho y retiro"], ["equipo", "👥 Equipo"]];
  const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  const saveSettings = async (patch, msg = "Configuración guardada") => {
    await A.q(A.sb.from("store_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1));
    await A.loadSettings(true);
    A.toast(msg);
  };

  const shell = (tab, body) => `<div class="page narrow">
    ${A.head({ title: "Configuración" })}
    <div class="card flush" style="margin-bottom:16px"><div class="tabs" style="border:0;padding:6px 8px">${TABS.map(([k, l]) => `<button data-go="${k}" class="${k === tab ? "on" : ""}">${l}</button>`).join("")}</div></div>
    ${body}</div>`;

  // Mensaje listo para enviar a la persona invitada
  const shareInvite = (email) => {
    const url = location.href.split("#")[0];
    const txt = `¡Hola! Te di acceso al panel de administración de Planeta 4 Patas 🐾

1. Entra a ${url}
2. Pulsa "¿Primera vez? Crear cuenta" y usa este correo: ${email}
3. Confirma el correo que te llega y vuelve a ingresar.`;
    const m = A.modal({ title: "Invitación creada ✓", body: `<p style="margin-top:0">Envíale estas instrucciones a <b>${esc(email)}</b>:</p><textarea rows="7" id="inv-t">${esc(txt)}</textarea>`,
      foot: `<a class="btn btn-green" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">Enviar por WhatsApp</a><a class="btn" href="mailto:${esc(email)}?subject=${encodeURIComponent("Acceso al panel de Planeta 4 Patas")}&body=${encodeURIComponent(txt)}">Enviar por correo</a><button class="btn btn-primary" id="inv-copy">Copiar</button>` });
    m.el.querySelector("#inv-copy").onclick = async () => { try { await navigator.clipboard.writeText(m.el.querySelector("#inv-t").value); A.toast("Copiado"); } catch { m.el.querySelector("#inv-t").select(); } };
  };

  const bindTabs = () => $$("[data-go]").forEach((b) => (b.onclick = () => A.go(`/configuracion/${b.dataset.go}`)));

  async function render(tab) {
    const s = await A.loadSettings(true);

    if (tab === "general") {
      A.render(shell(tab, `<form id="sg" class="stack">
        <div class="card"><h2 style="margin-bottom:12px">Datos de la tienda</h2>
          <div class="row2"><label class="f">Nombre de la tienda<input name="store_name" value="${esc(s.store_name || "")}"></label>
          <label class="f">Correo de contacto<input name="contact_email" type="email" value="${esc(s.contact_email || "")}"></label></div>
          <div class="row2"><label class="f">WhatsApp <small>Con código de país, solo números (ej: 56981203671)</small><input name="whatsapp" value="${esc(s.whatsapp || "")}"></label>
          <label class="f">Instagram <small>Sin @</small><input name="instagram" value="${esc(s.instagram || "")}"></label></div>
          <label class="f">Dirección del local<input name="address" value="${esc(s.address || "")}"></label>
          <label class="f">Horario de atención<input name="hours" value="${esc(s.hours || "")}" placeholder="Ej: Lunes a sábado de 10:00 a 20:00"></label>
        </div>
        <div class="card"><h2 style="margin-bottom:12px">Barra de anuncios</h2>
          <label class="switch" style="margin-bottom:12px"><input type="checkbox" name="announcement_active" ${s.announcement_active ? "checked" : ""}> Mostrar barra de anuncios en la tienda</label>
          <label class="f">Texto del anuncio<input name="announcement" value="${esc(s.announcement || "")}" placeholder="Ej: 🎉 Usa BIENVENIDA10 y obtén 10% en tu primera compra"></label>
        </div>
        <div class="card"><h2 style="margin-bottom:12px">Avanzado</h2>
          <div class="row2"><label class="f">Alerta de stock bajo <small>Avisar cuando queden estas unidades o menos</small><input name="low_stock_threshold" type="number" min="0" value="${s.low_stock_threshold ?? 3}"></label>
          <label class="f">Dirección (URL) de la tienda <small>Se usa en los enlaces de pago y seguimiento</small><input name="site_url" type="url" value="${esc(s.site_url || "")}"></label></div>
        </div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-orange">Guardar cambios</button></div></form>`));
      bindTabs();
      $("#sg").onsubmit = async (e) => {
        e.preventDefault(); const f = e.target;
        try {
          await saveSettings({
            store_name: f.store_name.value.trim() || "Planeta 4 Patas", contact_email: f.contact_email.value.trim() || null, whatsapp: f.whatsapp.value.replace(/\D/g, "") || null,
            instagram: f.instagram.value.replace(/^@/, "").trim() || null, address: f.address.value.trim() || null, hours: f.hours.value.trim() || null,
            announcement_active: f.announcement_active.checked, announcement: f.announcement.value.trim() || null,
            low_stock_threshold: Math.max(0, A.int(f.low_stock_threshold.value) || 0), site_url: f.site_url.value.trim().replace(/\/$/, "") || null,
          });
        } catch (err) { A.fail(err); }
      };
    }

    if (tab === "pagos") {
      const mpOk = s.mp_configured, wpTest = s.webpay_env === "integration";
      A.render(shell(tab, `<div class="stack">
        <div class="card">
          <div class="card-head"><h2>Mercado Pago</h2>${mpOk ? A.badge("Conectado", "b-green") : A.badge("No conectado", "b-amber")}</div>
          <p class="muted" style="margin-top:0">Tus clientes pagan con tarjetas de crédito, débito o saldo de Mercado Pago. El dinero llega a tu cuenta de Mercado Pago.</p>
          <label class="switch" style="margin-bottom:14px"><input type="checkbox" id="mp-en" ${s.mp_enabled ? "checked" : ""}> Ofrecer Mercado Pago en la tienda</label>
          <div id="mp-status"></div>
          <label class="f">Access Token de producción <small>Empieza con <span class="mono">APP_USR-</span>. Se guarda encriptado y nunca se muestra.</small>
            <input type="password" id="mp-token" placeholder="${mpOk ? "•••••••• (guardado) — pega uno nuevo para reemplazarlo" : "APP_USR-…"}" autocomplete="off"></label>
          <div class="btn-group"><button class="btn btn-primary" id="mp-save">Guardar token</button>${mpOk ? `<button class="btn" id="mp-test">Probar conexión</button><button class="btn btn-plain danger" id="mp-off">Desconectar</button>` : ""}</div>
          <details style="margin-top:14px"><summary style="cursor:pointer;font-weight:800">¿Cómo obtengo mi Access Token? (5 minutos)</summary>
            <ol style="line-height:1.8;padding-left:18px">
              <li>Entra a <a href="https://www.mercadopago.cl/developers/panel/app" target="_blank" rel="noopener">mercadopago.cl/developers</a> con la cuenta de Mercado Pago de la tienda.</li>
              <li>Pulsa <b>Crear aplicación</b>. Nombre: <i>Planeta 4 Patas web</i>. Tipo de pago: <b>Pagos online</b> → <b>Checkout Pro</b>.</li>
              <li>En la aplicación, abre <b>Credenciales de producción</b> (puede pedirte completar datos del negocio).</li>
              <li>Copia el <b>Access Token</b> (empieza con <span class="mono">APP_USR-</span>) y pégalo arriba.</li>
              <li>Pulsa <b>Probar conexión</b>. Luego haz una compra real de bajo monto para confirmar que el pedido aparece como <b>Pagado</b>.</li>
            </ol>
            <p class="help">Para pruebas sin dinero real puedes usar las <b>credenciales de prueba</b> (empiezan con <span class="mono">TEST-</span>) y pagar con las tarjetas de prueba de Mercado Pago.</p>
          </details>
        </div>

        <div class="card">
          <div class="card-head"><h2>Transferencia bancaria</h2>${s.transfer_enabled ? A.badge("Activa", "b-green") : A.badge("Desactivada", "b-gray")}</div>
          <p class="muted" style="margin-top:0">El pedido queda <b>pendiente</b> hasta que confirmes el pago en el panel. Sin comisiones.</p>
          <label class="switch" style="margin-bottom:14px"><input type="checkbox" id="tr-en" ${s.transfer_enabled ? "checked" : ""}> Ofrecer transferencia en la tienda</label>
          <label class="f">Datos para transferir <small>Se muestran al cliente al finalizar la compra</small>
            <textarea id="tr-info" rows="5" placeholder="Banco: …&#10;Tipo de cuenta: Cuenta corriente / vista&#10;N° de cuenta: …&#10;RUT: …&#10;Nombre: …&#10;Correo: …">${esc(s.transfer_info || "")}</textarea></label>
          <button class="btn btn-primary" id="tr-save">Guardar</button>
        </div>

        <div class="card">
          <div class="card-head"><h2>Webpay Plus (Transbank)</h2>${!s.webpay_enabled ? A.badge("Desactivado", "b-gray") : wpTest ? A.badge("Modo prueba", "b-amber") : s.webpay_configured ? A.badge("Producción", "b-green") : A.badge("Faltan credenciales", "b-red")}</div>
          <p class="muted" style="margin-top:0">Débito, crédito y prepago chilenos. Requiere contratar Webpay Plus con Transbank (con inicio de actividades).</p>
          <label class="switch" style="margin-bottom:14px"><input type="checkbox" id="wp-en" ${s.webpay_enabled ? "checked" : ""}> Ofrecer Webpay en la tienda</label>
          <label class="f">Ambiente<select id="wp-env"><option value="integration" ${wpTest ? "selected" : ""}>Integración (pruebas, NO cobra)</option><option value="production" ${!wpTest ? "selected" : ""}>Producción (cobros reales)</option></select></label>
          <div class="banner warn" id="wp-warn" ${wpTest && s.webpay_enabled ? "" : "hidden"}><span>⚠️</span><div><b>Cuidado: en modo integración los pagos NO son reales.</b>Úsalo solo para probar. Desactívalo o pasa a producción antes de recibir clientes.</div></div>
          <div class="row2"><label class="f">Código de comercio<input type="password" id="wp-code" placeholder="${s.webpay_configured ? "•••• (guardado)" : "5970…"}" autocomplete="off"></label>
          <label class="f">API Key secreta<input type="password" id="wp-key" placeholder="${s.webpay_configured ? "•••• (guardada)" : ""}" autocomplete="off"></label></div>
          <button class="btn btn-primary" id="wp-save">Guardar Webpay</button>
          <p class="help" style="margin-bottom:0">Transbank entrega estas credenciales al terminar el proceso de validación de la integración.</p>
        </div>
      </div>`));
      bindTabs();
      const run = async (fn) => { try { await fn(); render("pagos"); } catch (err) { A.fail(err); } };
      $("#mp-en").onchange = (e) => run(() => saveSettings({ mp_enabled: e.target.checked }));
      $("#mp-save").onclick = () => {
        const v = $("#mp-token").value.trim();
        if (!/^(APP_USR|TEST)-/.test(v)) return A.toast("El Access Token debe empezar con APP_USR- (o TEST- para pruebas)", true);
        run(async () => { await A.rpc("set_payment_secret", { p_name: "mp_access_token", p_value: v }); A.toast("Token guardado. Probando conexión…"); setTimeout(() => $("#mp-test")?.click(), 400); });
      };
      $("#mp-test")?.addEventListener("click", async () => {
        $("#mp-status").innerHTML = `<div class="banner info"><span>⏳</span><div>Probando conexión con Mercado Pago…</div></div>`;
        const { data, error } = await A.sb.functions.invoke("admin-tools", { body: { action: "mp_check" } });
        $("#mp-status").innerHTML = error || !data?.ok
          ? `<div class="banner bad"><span>✕</span><div><b>No se pudo conectar</b>${esc(data?.error || error?.message || "Revisa el Access Token")}</div></div>`
          : `<div class="banner ok"><span>✓</span><div><b>Conectado a la cuenta ${esc(data.nickname || "")}</b>${esc(data.email || "")}${data.test ? " · <b>credenciales de PRUEBA</b> (no se cobra dinero real)" : ""}${data.site_id && data.site_id !== "MLC" ? ` · ⚠️ la cuenta no es de Chile (${esc(data.site_id)})` : ""}</div></div>`;
      });
      $("#mp-off")?.addEventListener("click", async () => {
        if (await A.confirm({ title: "Desconectar Mercado Pago", message: "La tienda dejará de ofrecer Mercado Pago hasta que pegues un nuevo token.", ok: "Desconectar", danger: true }))
          run(() => A.rpc("set_payment_secret", { p_name: "mp_access_token", p_value: "" }));
      });
      $("#tr-en").onchange = (e) => {
        if (e.target.checked && !$("#tr-info").value.trim()) { e.target.checked = false; return A.toast("Primero escribe los datos para transferir", true); }
        run(() => saveSettings({ transfer_enabled: e.target.checked, transfer_info: $("#tr-info").value.trim() || null }));
      };
      $("#tr-save").onclick = () => run(() => saveSettings({ transfer_info: $("#tr-info").value.trim() || null }));
      $("#wp-env").onchange = () => { $("#wp-warn").hidden = !($("#wp-env").value === "integration" && $("#wp-en").checked); };
      $("#wp-en").onchange = (e) => run(() => saveSettings({ webpay_enabled: e.target.checked, webpay_env: $("#wp-env").value }));
      $("#wp-save").onclick = () => run(async () => {
        const code = $("#wp-code").value.trim(), key = $("#wp-key").value.trim();
        if (code) await A.rpc("set_payment_secret", { p_name: "webpay_commerce_code", p_value: code });
        if (key) await A.rpc("set_payment_secret", { p_name: "webpay_api_key", p_value: key });
        await saveSettings({ webpay_env: $("#wp-env").value }, "Webpay guardado");
      });
    }

    if (tab === "despacho") {
      const zones = s.delivery_zones || [];
      const zoneRow = (z = { comuna: "", dias: [] }) => `<div class="card zone" style="padding:12px;margin-bottom:10px;box-shadow:none;border:1px solid var(--line)">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input name="comuna" value="${esc(z.comuna)}" placeholder="Comuna" style="flex:1"><button type="button" class="btn btn-plain danger btn-sm" data-rmz>Quitar</button></div>
        <div style="display:flex;flex-wrap:wrap;gap:4px 14px">${DIAS.map((d) => `<label class="check" style="margin:0;font-weight:600"><input type="checkbox" value="${d}" ${(z.dias || []).includes(d) ? "checked" : ""}> ${d}</label>`).join("")}</div></div>`;
      A.render(shell(tab, `<form id="sd" class="stack">
        <div class="card"><h2 style="margin-bottom:12px">Costo de despacho</h2>
          <div class="row2"><label class="f">Costo de despacho<div class="prefix"><span>$</span><input name="shipping_fee" type="number" min="0" step="10" value="${s.shipping_fee}"></div></label>
          <label class="f">Despacho gratis desde <small>0 = nunca gratis</small><div class="prefix"><span>$</span><input name="free_shipping_from" type="number" min="0" step="1000" value="${s.free_shipping_from}"></div></label></div>
        </div>
        <div class="card"><h2 style="margin-bottom:6px">Comunas y días de reparto</h2><p class="muted" style="margin-top:0">Solo se puede pedir despacho a estas comunas.</p>
          <div id="zones">${zones.map(zoneRow).join("")}</div>
          <button type="button" class="btn" id="addz">＋ Agregar comuna</button></div>
        <div class="card"><h2 style="margin-bottom:12px">Retiro en tienda</h2>
          <label class="switch"><input type="checkbox" name="pickup_enabled" ${s.pickup_enabled ? "checked" : ""}> Permitir retiro gratis en ${esc(s.address || "el local")}</label></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-orange">Guardar cambios</button></div></form>`));
      bindTabs();
      $("#addz").onclick = () => $("#zones").insertAdjacentHTML("beforeend", zoneRow());
      $("#zones").onclick = (e) => { if (e.target.closest("[data-rmz]")) e.target.closest(".zone").remove(); };
      $("#sd").onsubmit = async (e) => {
        e.preventDefault(); const f = e.target;
        const delivery_zones = $$("#zones .zone").map((z) => ({ comuna: z.querySelector("[name=comuna]").value.trim(), dias: $$("input[type=checkbox]:checked", z).map((c) => c.value) })).filter((z) => z.comuna);
        try { await saveSettings({ shipping_fee: Math.max(0, A.int(f.shipping_fee.value) || 0), free_shipping_from: Math.max(0, A.int(f.free_shipping_from.value) || 0), delivery_zones, pickup_enabled: f.pickup_enabled.checked }); render("despacho"); }
        catch (err) { A.fail(err); }
      };
    }

    if (tab === "equipo") {
      const team = await A.rpc("admin_team");
      A.render(shell(tab, `<div class="stack">
        <div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Personas con acceso al panel</h2><button class="btn btn-primary btn-sm" id="t-inv">＋ Agregar administrador</button></div>
          <div class="tbl-wrap"><table class="tbl"><tbody>${team.map((t) => `<tr><td><div class="pcell"><span class="avatar">${esc(A.initials(t.email))}</span><div><b>${esc(t.email)}</b><small class="muted">${t.pending ? "Invitación pendiente: debe crear su cuenta en el panel" : t.last_sign_in_at ? `Último ingreso ${A.ago(t.last_sign_in_at)}` : "Aún no ingresa"}</small></div></div></td>
            <td class="num"><div style="display:flex;flex-wrap:wrap;gap:4px 8px;justify-content:flex-end;align-items:center">${t.pending ? A.badge("Pendiente", "b-amber") : t.user_id === A.state.user?.id ? A.badge("Tú", "b-info") : A.badge("Administrador", "b-green")}
              ${t.user_id === A.state.user?.id ? "" : `<button class="btn btn-sm btn-plain danger" data-rm="${esc(t.email)}">${t.pending ? "Cancelar invitación" : "Quitar acceso"}</button>`}</div></td></tr>`).join("")}</tbody></table></div></div>
        <div class="card"><h2 style="margin-bottom:8px">¿Cómo invito a alguien?</h2>
          <ol style="margin:0;padding-left:18px;line-height:1.8"><li>Pulsa <b>Agregar administrador</b> y escribe su correo.</li>
          <li>Envíale el enlace del panel: <a style="overflow-wrap:anywhere" href="${esc(location.href.split("#")[0])}">${esc(location.href.split("#")[0])}</a></li>
          <li>Esa persona elige <b>Crear cuenta</b> con ese mismo correo, confirma el correo que le llega y entra.</li></ol>
          <p class="help">Todas las personas del equipo tienen acceso completo. Puedes quitar el acceso en cualquier momento con <b>Quitar acceso</b> y volver a invitarla después.</p></div>
      </div>`));
      bindTabs();
      $$("[data-rm]").forEach((b) => (b.onclick = async () => {
        if (!(await A.confirm({ title: "Quitar acceso al panel", message: `${b.dataset.rm} ya no podrá entrar al panel. Puedes volver a invitarla cuando quieras.`, ok: "Quitar acceso", danger: true }))) return;
        try { await A.rpc("admin_remove", { p_email: b.dataset.rm }); A.toast("Acceso quitado"); render("equipo"); } catch (err) { A.fail(err); }
      }));
      $("#t-inv").onclick = async () => {
        const r = await A.ask({ title: "Agregar administrador", ok: "Agregar", fields: [{ name: "email", label: "Correo", type: "email", required: true }],
          intro: "Tendrá acceso completo: pedidos, productos, clientes y configuración." });
        if (!r) return;
        try { const res = await A.rpc("admin_invite", { p_email: r.email }); if (res === "added") A.toast("Listo: ya tiene acceso al panel"); else shareInvite(r.email); render("equipo"); }
        catch (err) { A.fail(err); }
      };
    }
  }

  A.route("/configuracion", "configuracion", () => render("general"));
  A.route("/configuracion/:tab", ({ tab }) => (tab === "equipo" ? "equipo" : "configuracion"), ({ tab }) => render(TABS.some(([k]) => k === tab) ? tab : "general"));
})();
