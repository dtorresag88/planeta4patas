/* =====================================================================
   Panel · Pop-up promocional y Suscriptores
   ===================================================================== */
(() => {
  const { $, $$, esc, num } = A;
  const PETS = { perro: "🐶 Perro", gato: "🐱 Gato", ambos: "🐶🐱 Ambos", otro: "🐾 Otro" };
  const SOLD = new Set(A.SOLD);

  // Vista previa: misma estructura que el pop-up de la tienda
  const preview = (s) => `<div class="pp-prev">
    <div class="pp-box">
      <button class="pp-x" type="button" tabindex="-1">✕</button>
      ${s.popup_image ? `<img class="pp-img" src="${esc(s.popup_image)}" alt="">` : `<div class="pp-emo">🐾</div>`}
      <div class="pp-body">
        <h3>${esc(s.popup_title || "")}</h3>
        <p>${esc(s.popup_text || "")}</p>
        <div class="pp-in">Tu nombre</div>
        <div class="pp-in">Tu correo</div>
        ${s.popup_ask_phone ? `<div class="pp-in">WhatsApp (opcional)</div>` : ""}
        ${s.popup_ask_pet ? `<div class="pp-pets">${Object.values(PETS).map((p) => `<span>${p}</span>`).join("")}</div>` : ""}
        <div class="pp-btn">${esc(s.popup_button || "Enviar")}</div>
        <small>No gracias</small>
      </div>
    </div></div>`;

  A.route("/popup", "popup", async () => {
    const [s0, discounts, subs] = await Promise.all([
      A.loadSettings(true),
      A.q(A.sb.from("discounts").select("code, kind, value, active, first_order_only, subscribers_only").order("created_at", { ascending: false })),
      A.q(A.sb.from("subscribers").select("created_at, source").eq("source", "popup")),
    ]);
    const s = { ...s0 };
    const week = subs.filter((x) => Date.now() - new Date(x.created_at) < 7 * 864e5).length;
    const dLabel = (d) => `${d.code} · ${d.kind === "percent" ? `${d.value}%` : d.kind === "fixed" ? A.clp(d.value) : "despacho gratis"}${d.active ? "" : " (desactivado)"}`;

    A.render(`<div class="page">
      ${A.head({ title: "Pop-up promocional", badges: s.popup_enabled ? A.badge("Activo", "b-green") : A.badge("Apagado", "b-gray"),
        actions: `<a class="btn" href="#/suscriptores">Ver suscriptores (${num(subs.length)})</a><a class="btn" href="./?popup=1" target="_blank" rel="noopener">Ver en la tienda ↗</a>`,
        sub: "Aparece a los visitantes nuevos de la tienda, les ofrece una promoción y guarda sus datos en Suscriptores." })}
      <div class="kpis">
        <div class="kpi"><small>Suscriptores por pop-up</small><b>${num(subs.length)}</b></div>
        <div class="kpi"><small>Últimos 7 días</small><b>${num(week)}</b></div>
        <div class="kpi"><small>Código entregado</small><b class="mono" style="font-size:1.2rem">${esc(s.popup_code || "—")}</b></div>
        <div class="kpi"><small>Estado</small><b style="font-size:1.2rem">${s.popup_enabled ? "🟢 Visible" : "⚪ Apagado"}</b></div>
      </div>
      <div class="cols">
        <form id="pf" class="stack">
          <div class="card">
            <label class="switch"><input type="checkbox" name="popup_enabled" ${s.popup_enabled ? "checked" : ""}> <b>Mostrar el pop-up en la tienda</b></label>
          </div>
          <div class="card"><h2 style="margin-bottom:12px">Contenido</h2>
            <label class="f">Título<input name="popup_title" maxlength="80" value="${esc(s.popup_title || "")}" placeholder="¡10% en tu primera compra! 🐾"></label>
            <label class="f">Texto<textarea name="popup_text" rows="3" maxlength="300">${esc(s.popup_text || "")}</textarea></label>
            <div class="row2"><label class="f">Texto del botón<input name="popup_button" maxlength="40" value="${esc(s.popup_button || "")}"></label>
            <label class="f">Mensaje al registrarse<input name="popup_success" maxlength="120" value="${esc(s.popup_success || "")}"></label></div>
            <label class="f">Imagen <small>Opcional · formato horizontal se ve mejor</small>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <input type="file" id="pf-img" accept="image/*" style="flex:1;min-width:0">
                ${s.popup_image ? `<button type="button" class="btn btn-plain danger btn-sm" id="pf-img-rm">Quitar imagen</button>` : ""}
              </div></label>
          </div>
          <div class="card"><h2 style="margin-bottom:12px">Promoción y datos</h2>
            <label class="f">Código de descuento que se entrega <small>Se muestra solo después de dejar sus datos. Créalos en Descuentos.</small>
              <select name="popup_code"><option value="">— Sin código (solo captar datos) —</option>
              ${discounts.map((d) => `<option value="${esc(d.code)}" ${d.code === s.popup_code ? "selected" : ""}>${esc(dLabel(d))}</option>`).join("")}</select></label>
            <div id="pf-code-help"></div>
            <label class="check"><input type="checkbox" name="popup_ask_phone" ${s.popup_ask_phone ? "checked" : ""}> Pedir WhatsApp (opcional para el cliente)</label>
            <label class="check"><input type="checkbox" name="popup_ask_pet" ${s.popup_ask_pet ? "checked" : ""}> Preguntar qué mascota tiene</label>
            <label class="check"><input type="checkbox" name="popup_unique_codes" ${s.popup_unique_codes !== false ? "checked" : ""}> Entregar un código personal de un solo uso a cada persona (recomendado)</label>
            <p class="help" style="margin-bottom:0">Siempre se pide nombre y correo.</p>
          </div>
          <div class="card"><h2 style="margin-bottom:12px">Cuándo aparece</h2>
            <div class="row2"><label class="f">Segundos después de entrar<input name="popup_delay" type="number" min="0" max="120" value="${s.popup_delay ?? 6}"></label>
            <label class="f">Si lo cierra, volver a mostrar después de <small>días</small><input name="popup_frequency_days" type="number" min="1" max="365" value="${s.popup_frequency_days ?? 7}"></label></div>
            <p class="help" style="margin-bottom:0">Quien ya se registró no lo vuelve a ver. En computador también aparece si el visitante intenta salir de la página.</p>
          </div>
          <div style="display:flex;justify-content:flex-end"><button class="btn btn-orange">Guardar cambios</button></div>
        </form>
        <div><div class="card" style="position:sticky;top:76px"><h2 style="margin-bottom:12px">Vista previa</h2><div id="pf-prev">${preview(s)}</div></div></div>
      </div></div>`);

    const f = $("#pf");
    const read = () => ({
      popup_enabled: f.popup_enabled.checked, popup_title: f.popup_title.value.trim(), popup_text: f.popup_text.value.trim(),
      popup_button: f.popup_button.value.trim() || "Quiero mi descuento", popup_success: f.popup_success.value.trim(),
      popup_code: f.popup_code.value || null, popup_ask_phone: f.popup_ask_phone.checked, popup_ask_pet: f.popup_ask_pet.checked, popup_unique_codes: f.popup_unique_codes.checked,
      popup_delay: Math.min(120, Math.max(0, A.int(f.popup_delay.value) ?? 6)), popup_frequency_days: Math.min(365, Math.max(1, A.int(f.popup_frequency_days.value) || 7)),
      popup_image: s.popup_image || null,
    });
    const codeHelp = () => {
      const d = discounts.find((x) => x.code === f.popup_code.value);
      $("#pf-code-help").innerHTML = !f.popup_code.value ? "" : !d?.active
        ? `<div class="banner warn"><span>⚠️</span><div>Este código está desactivado: actívalo en Descuentos o no se entregará.</div></div>`
        : `<p class="help">${d.first_order_only ? "✓ Solo primera compra. " : "Sirve en cualquier compra. "}${d.subscribers_only ? "✓ Solo para correos registrados en el pop-up (no sirve si se comparte)." : "Cualquiera que conozca el código puede usarlo."} <a href="#/descuentos">Editar en Descuentos</a></p>`;
    };
    const redraw = () => { Object.assign(s, read()); $("#pf-prev").innerHTML = preview(s); codeHelp(); };
    f.addEventListener("input", redraw); f.addEventListener("change", redraw); codeHelp();
    $("#pf-img").onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try { A.toast("Subiendo imagen…"); s.popup_image = await A.upload(file, "popup"); redraw(); A.toast("Imagen lista: recuerda guardar"); }
      catch (err) { A.fail(err, "No se pudo subir la imagen"); }
    };
    $("#pf-img-rm")?.addEventListener("click", () => { s.popup_image = null; redraw(); });
    f.onsubmit = async (e) => {
      e.preventDefault();
      const patch = read();
      if (!patch.popup_title) return A.toast("Escribe un título", true);
      try {
        await A.q(A.sb.from("store_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1));
        await A.loadSettings(true); A.toast(patch.popup_enabled ? "Pop-up guardado y visible en la tienda" : "Pop-up guardado (apagado)");
        A.navigate();
      } catch (err) { A.fail(err); }
    };
  });

  // ------------------------------------------------------------ suscriptores
  A.route("/suscriptores", "suscriptores", async () => {
    const [subs, buyers] = await Promise.all([
      A.q(A.sb.from("subscribers").select("*").order("created_at", { ascending: false }).limit(10000)),
      A.q(A.sb.from("orders").select("customer_email, status, total, created_at").in("status", A.SOLD).limit(10000)),
    ]);
    const bought = new Map();
    buyers.forEach((o) => { const k = String(o.customer_email || "").toLowerCase(); if (SOLD.has(o.status)) bought.set(k, (bought.get(k) || 0) + o.total); });
    const st = { q: "", f: "todos" };
    const FILTERS = { todos: "Todos", compraron: "Ya compraron", sincompra: "Aún no compran", perro: "Tienen perro", gato: "Tienen gato", conwa: "Con WhatsApp" };
    const visible = () => subs.filter((x) => {
      if (st.f === "compraron" && !bought.has(x.email)) return false;
      if (st.f === "sincompra" && bought.has(x.email)) return false;
      if (st.f === "perro" && !["perro", "ambos"].includes(x.pet)) return false;
      if (st.f === "gato" && !["gato", "ambos"].includes(x.pet)) return false;
      if (st.f === "conwa" && !x.phone) return false;
      return !st.q || A.match(`${x.name || ""} ${x.email} ${x.phone || ""}`, st.q);
    });
    const conv = subs.filter((x) => bought.has(x.email)).length;
    const waText = (x) => `¡Hola${x.name ? ` ${x.name.split(" ")[0]}` : ""}! 🐾 Te escribimos de Planeta 4 Patas. ${x.discount_code ? `Te recordamos que tienes tu código ${x.discount_code} para tu primera compra en ` : "Te invitamos a ver nuestra tienda: "}${A.storeUrl()}`;
    const draw = () => {
      if (!document.getElementById("s-body")) return;
      const l = visible();
      $("#s-body").innerHTML = l.length ? l.map((x) => `<tr>
        <td><div class="pcell"><span class="avatar">${esc(A.initials(x.name || x.email))}</span><div><b>${esc(x.name || "Sin nombre")}</b><small class="muted">${esc(x.email)}</small></div></div></td>
        <td class="hide-sm">${esc(x.phone || "—")}</td>
        <td class="hide-sm">${esc(PETS[x.pet] || "—")}</td>
        <td>${bought.has(x.email) ? A.badge(`Compró ${A.clp(bought.get(x.email))}`, "b-green") : A.badge("Sin compra", "b-gray")}</td>
        <td class="hide-sm nowrap">${A.ago(x.created_at)}</td>
        <td class="num nowrap">${x.phone ? `<a class="btn btn-sm btn-green" target="_blank" rel="noopener" href="${A.wa(x.phone, waText(x))}">WhatsApp</a>` : ""}
          <button class="btn btn-sm btn-plain danger" data-del="${x.id}" title="Eliminar">✕</button></td></tr>`).join("")
        : `<tr><td colspan="6"><div class="empty-state"><div class="emo">📬</div><h3>${subs.length ? "Sin resultados" : "Aún no hay suscriptores"}</h3><p>Activa el <a href="#/popup">pop-up promocional</a> para empezar a captar datos de tus visitantes.</p></div></td></tr>`;
      $("#s-count").textContent = `${l.length} suscriptor${l.length === 1 ? "" : "es"}`;
    };
    A.render(`<div class="page">
      ${A.head({ title: "Suscriptores", actions: `<a class="btn" href="#/popup">Configurar pop-up</a><button class="btn" id="s-export">Exportar</button>`,
        sub: "Personas que dejaron sus datos en la tienda. Úsalos para campañas por WhatsApp o correo." })}
      <div class="kpis">
        <div class="kpi"><small>Suscriptores</small><b>${num(subs.length)}</b></div>
        <div class="kpi"><small>Ya compraron</small><b>${num(conv)}</b></div>
        <div class="kpi"><small>Conversión</small><b>${subs.length ? A.pct(conv / subs.length) : "0%"}</b></div>
        <div class="kpi"><small>Con WhatsApp</small><b>${num(subs.filter((x) => x.phone).length)}</b></div>
      </div>
      <div class="card flush">
        <div class="toolbar">
          <div class="grow"><input id="s-q" type="search" placeholder="Buscar por nombre, correo o teléfono"></div>
          <select id="s-f">${Object.entries(FILTERS).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select>
        </div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Suscriptor</th><th class="hide-sm">WhatsApp</th><th class="hide-sm">Mascota</th><th>Compras</th><th class="hide-sm">Registro</th><th></th></tr></thead><tbody id="s-body"></tbody></table></div>
        <div class="pager"><small class="muted" id="s-count"></small></div>
      </div></div>`);
    draw();
    $("#s-q").oninput = A.debounce((e) => { st.q = e.target.value; draw(); }, 150);
    $("#s-f").onchange = (e) => { st.f = e.target.value; draw(); };
    $("#s-body").onclick = async (e) => {
      const b = e.target.closest("[data-del]"); if (!b) return;
      const x = subs.find((y) => y.id === b.dataset.del);
      if (!(await A.confirm({ title: "Eliminar suscriptor", message: `Se eliminarán los datos de ${x.email}.`, ok: "Eliminar", danger: true }))) return;
      try { await A.q(A.sb.from("subscribers").delete().eq("id", x.id)); subs.splice(subs.indexOf(x), 1); draw(); A.toast("Suscriptor eliminado"); } catch (err) { A.fail(err); }
    };
    $("#s-export").onclick = () => A.csv(`suscriptores-${A.dayKey(new Date())}.csv`, [
      ["Nombre", "Correo", "WhatsApp", "Mascota", "Código", "Compró", "Total comprado", "Fecha registro", "Origen"],
      ...visible().map((x) => [x.name, x.email, x.phone, PETS[x.pet]?.replace(/^\S+\s/, "") || "", x.discount_code, bought.has(x.email) ? "Sí" : "No", bought.get(x.email) || 0, A.date(x.created_at), x.source]),
    ]);
  });
})();
