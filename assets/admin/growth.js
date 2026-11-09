/* =====================================================================
   Panel · Crecimiento: promociones automáticas, reseñas, recompra,
   campañas de correo, grupos de clientes, tráfico y búsquedas
   ===================================================================== */
(() => {
  const { $, $$, esc, clp, num } = A;
  const toLocal = (iso) => { if (!iso) return ""; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
  const fromLocal = (v) => (v ? new Date(v).toISOString() : null);
  const invoke = async (fn, body) => {
    const { data, error } = await A.sb.functions.invoke(fn, { body });
    if (error) { let msg = error.message; try { msg = (await error.context.json()).error || msg; } catch { /* sin detalle */ } throw new Error(msg); }
    return data;
  };

  // ================================================================ PROMOCIONES AUTOMÁTICAS
  const KINDS = {
    percent: ["% de descuento en productos", "Ej: 10% en alimento para gatos"],
    buy_x_pay_y: ["Lleva X y paga Y", "Ej: 3x2 en snacks (gratis el de menor precio)"],
    fixed_order: ["$ de descuento en el pedido", "Ej: $5.000 en compras sobre $50.000"],
    free_shipping: ["Despacho gratis", "Ej: despacho gratis si lleva un saco de 15 kg"],
  };
  const SCOPES = { all: "Toda la tienda", category: "Categorías", brand: "Marcas", products: "Productos específicos" };
  const promoStatus = (p) => {
    const now = Date.now();
    if (!p.active) return ["Desactivada", "b-gray"];
    if (p.starts_at && new Date(p.starts_at) > now) return ["Programada", "b-info"];
    if (p.ends_at && new Date(p.ends_at) < now) return ["Terminada", "b-gray"];
    return ["Activa", "b-green"];
  };
  const promoSummary = (p) => {
    const what = p.kind === "percent" ? `${p.value}% de descuento` : p.kind === "buy_x_pay_y" ? `Lleva ${p.buy_qty} paga ${p.pay_qty}` : p.kind === "fixed_order" ? `${clp(p.value)} de descuento` : "Despacho gratis";
    const scope = p.scope === "all" ? "toda la tienda" : p.scope === "category" ? (p.scope_values || []).map((s) => A.catName(s) || s).join(", ")
      : p.scope === "brand" ? (p.scope_values || []).join(", ") : `${(p.scope_values || []).length} producto(s)`;
    return `${what} · ${scope}${p.min_subtotal ? ` · desde ${clp(p.min_subtotal)}` : ""}${p.min_qty ? ` · mín. ${p.min_qty} unid.` : ""}`;
  };

  async function promoForm(pr = null) {
    await A.loadCatalog();
    const brands = [...new Set(A.state.products.map((p) => p.brand).filter(Boolean))].sort();
    const st = { kind: pr?.kind || "percent", scope: pr?.scope || "category", values: new Set(pr?.scope_values || []) };
    const m = A.modal({
      title: pr ? "Editar promoción" : "Crear promoción automática", wide: true,
      body: `<form id="prf">
        <label class="f">Nombre <small>Lo ve el cliente en el carrito (ej: "3x2 en Churu")</small><input name="name" value="${esc(pr?.name || "")}" required maxlength="60"></label>
        <label class="f">Tipo de promoción<select name="kind">${Object.entries(KINDS).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join("")}</select><small id="prf-kind-help"></small></label>
        <div class="row2" id="prf-value-row">
          <label class="f" id="prf-value">Valor<input name="value" type="number" min="0" value="${pr?.value ?? 10}"></label>
          <label class="f" id="prf-buy">Lleva<input name="buy_qty" type="number" min="2" value="${pr?.buy_qty ?? 3}"></label>
          <label class="f" id="prf-pay">Paga<input name="pay_qty" type="number" min="1" value="${pr?.pay_qty ?? 2}"></label>
        </div>
        <label class="f">Aplica a<select name="scope">${Object.entries(SCOPES).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label>
        <div id="prf-scope"></div>
        <div class="row2">
          <label class="f">Compra mínima <small>0 = sin mínimo</small><div class="prefix"><span>$</span><input name="min_subtotal" type="number" min="0" value="${pr?.min_subtotal ?? 0}"></div></label>
          <label class="f">Unidades mínimas de esos productos <small>0 = sin mínimo</small><input name="min_qty" type="number" min="0" value="${pr?.min_qty ?? 0}"></label>
        </div>
        <div class="row2">
          <label class="f">Desde <small>Vacío = desde ahora</small><input name="starts_at" type="datetime-local" value="${toLocal(pr?.starts_at)}"></label>
          <label class="f">Hasta <small>Vacío = sin término</small><input name="ends_at" type="datetime-local" value="${toLocal(pr?.ends_at)}"></label>
        </div>
        <div class="row2">
          <label class="f">Etiqueta en la foto <small>Opcional. Por defecto "-10%" o "3x2"</small><input name="badge" maxlength="14" value="${esc(pr?.badge || "")}" placeholder="Ej: CYBER"></label>
          <label class="f">Prioridad <small>Menor número se aplica primero</small><input name="sort" type="number" value="${pr?.sort ?? 0}"></label>
        </div>
        <label class="check"><input type="checkbox" name="active" ${pr ? (pr.active ? "checked" : "") : "checked"}> Activa</label>
        <p class="help">Se aplica sola en el carrito, sin código. Cada producto recibe como máximo una promoción de producto (% o lleva X paga Y); las de pedido y despacho se suman.</p>
        <p class="form-error" id="prf-err"></p></form>`,
      foot: `${pr ? `<button class="btn btn-plain danger" id="prf-del" style="margin-right:auto">Eliminar</button>` : ""}<button class="btn" data-x>Cancelar</button><button class="btn btn-primary" id="prf-save">Guardar</button>`,
    });
    const f = m.el.querySelector("#prf");
    f.kind.value = st.kind; f.scope.value = st.scope;
    const drawScope = () => {
      const box = m.el.querySelector("#prf-scope");
      if (st.scope === "all") { box.innerHTML = ""; return; }
      if (st.scope === "category") box.innerHTML = `<div class="chips">${A.state.categories.map((c) => `<label class="chip"><input type="checkbox" value="${esc(c.slug)}" ${st.values.has(c.slug) ? "checked" : ""}> ${esc(c.emoji || "")} ${esc(c.name)}</label>`).join("")}</div>`;
      if (st.scope === "brand") box.innerHTML = `<div class="chips">${brands.map((b) => `<label class="chip"><input type="checkbox" value="${esc(b)}" ${st.values.has(b) ? "checked" : ""}> ${esc(b)}</label>`).join("")}</div>`;
      if (st.scope === "products") {
        const chosen = A.state.products.filter((p) => st.values.has(p.id));
        box.innerHTML = `<div class="chips">${chosen.map((p) => `<span class="tag">${esc(p.name)}<button type="button" data-unpick="${p.id}" aria-label="Quitar">✕</button></span>`).join("") || `<span class="muted small">Ningún producto elegido</span>`}</div>
          <button type="button" class="btn btn-sm" id="prf-pick" style="margin-top:6px">＋ Elegir producto</button>`;
        box.querySelector("#prf-pick").onclick = async () => { const hit = await A.pickVariant({ title: "Elegir producto" }); if (hit) { st.values.add(hit.p.id); drawScope(); } };
      }
    };
    const sync = () => {
      st.kind = f.kind.value;
      m.el.querySelector("#prf-kind-help").textContent = KINDS[st.kind][1];
      m.el.querySelector("#prf-value").hidden = !["percent", "fixed_order"].includes(st.kind);
      m.el.querySelector("#prf-value").firstChild.textContent = st.kind === "percent" ? "Porcentaje (%)" : "Monto ($)";
      m.el.querySelector("#prf-buy").hidden = m.el.querySelector("#prf-pay").hidden = st.kind !== "buy_x_pay_y";
    };
    f.kind.onchange = sync; sync();
    f.scope.onchange = () => { st.scope = f.scope.value; st.values.clear(); drawScope(); };
    m.el.querySelector("#prf-scope").addEventListener("change", (e) => { if (e.target.type === "checkbox") e.target.checked ? st.values.add(e.target.value) : st.values.delete(e.target.value); });
    m.el.querySelector("#prf-scope").addEventListener("click", (e) => { const b = e.target.closest("[data-unpick]"); if (b) { st.values.delete(b.dataset.unpick); drawScope(); } });
    drawScope();
    return new Promise((res) => {
      m.el.querySelector("#prf-save").onclick = async () => {
        const err = (t) => (m.el.querySelector("#prf-err").textContent = t);
        const row = {
          name: f.name.value.trim(), kind: st.kind, value: Math.max(0, A.int(f.value.value) || 0),
          buy_qty: st.kind === "buy_x_pay_y" ? A.int(f.buy_qty.value) : null, pay_qty: st.kind === "buy_x_pay_y" ? A.int(f.pay_qty.value) : null,
          scope: st.scope, scope_values: st.scope === "all" ? [] : [...st.values],
          min_subtotal: Math.max(0, A.int(f.min_subtotal.value) || 0), min_qty: Math.max(0, A.int(f.min_qty.value) || 0),
          starts_at: fromLocal(f.starts_at.value), ends_at: fromLocal(f.ends_at.value),
          badge: f.badge.value.trim() || null, sort: A.int(f.sort.value) || 0, active: f.active.checked,
        };
        if (row.name.length < 3) return err("Escribe un nombre para la promoción");
        if (row.kind === "percent" && (row.value < 1 || row.value > 100)) return err("El porcentaje debe estar entre 1 y 100");
        if (row.kind === "fixed_order" && row.value < 1) return err("Indica el monto del descuento");
        if (row.kind === "buy_x_pay_y" && !(row.buy_qty >= 2 && row.pay_qty >= 1 && row.pay_qty < row.buy_qty)) return err("'Paga' debe ser menor que 'Lleva' (ej: lleva 3 paga 2)");
        if (row.scope !== "all" && !row.scope_values.length) return err("Elige a qué productos aplica");
        try {
          if (pr) await A.q(A.sb.from("promotions").update(row).eq("id", pr.id)); else await A.q(A.sb.from("promotions").insert(row));
          m.close(); res(true); A.toast("Promoción guardada");
        } catch (e) { err(e.message); }
      };
      m.el.querySelector("#prf-del")?.addEventListener("click", async () => {
        if (!(await A.confirm({ title: "Eliminar promoción", message: "Los pedidos que ya la usaron conservan su descuento.", ok: "Eliminar", danger: true }))) return;
        try { await A.q(A.sb.from("promotions").delete().eq("id", pr.id)); m.close(); res(true); A.toast("Promoción eliminada"); } catch (e) { A.fail(e); }
      });
    });
  }

  A.route("/promociones", "promociones", async () => {
    await A.loadCatalog();
    let list = [];
    const load = async () => { list = await A.q(A.sb.from("promotions").select("*").order("sort").order("created_at", { ascending: false })); };
    const draw = () => {
      if (!document.getElementById("pr-body")) return;
      $("#pr-body").innerHTML = list.length ? list.map((p) => { const [s, c] = promoStatus(p); return `<tr class="click" data-id="${p.id}">
        <td><b>${esc(p.name)}</b><br><small class="muted">${esc(promoSummary(p))}</small></td><td>${A.badge(s, c)}</td>
        <td class="num">${num(p.used_count)}</td><td class="hide-sm small">${p.starts_at || p.ends_at ? `${p.starts_at ? A.date(p.starts_at) : "Ahora"} → ${p.ends_at ? A.date(p.ends_at) : "sin término"}` : "Sin fecha de término"}</td></tr>`; }).join("")
        : `<tr><td colspan="4"><div class="empty-state"><div class="emo">🎁</div><h3>Crea tu primera promoción automática</h3><p>Se aplican solas en el carrito, sin que el cliente escriba un código: 2x1, 3x2, % en una marca o categoría, despacho gratis…</p><button class="btn btn-primary" id="pr-new2">Crear promoción</button></div></td></tr>`;
      $("#pr-new2")?.addEventListener("click", create);
    };
    const create = async () => { if (await promoForm()) { await load(); draw(); } };
    A.render(`<div class="page">
      ${A.head({ title: "Promociones automáticas", back: "/descuentos", actions: `<button class="btn btn-primary" id="pr-new">Crear promoción</button>`,
        sub: "Descuentos que se aplican solos en el carrito (sin código). Se calculan en el servidor y se muestran con una etiqueta en la tienda." })}
      <div class="card flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Promoción</th><th>Estado</th><th class="num">Pedidos</th><th class="hide-sm">Vigencia</th></tr></thead><tbody id="pr-body"><tr><td colspan="4"><div class="spinner"></div></td></tr></tbody></table></div></div>
      <div class="card" style="margin-top:16px"><h2 style="margin-bottom:8px">💡 Ideas para un pet shop</h2>
        <ul style="margin:0;padding-left:18px;line-height:1.8">
          <li><b>3x2 en snacks</b> (Lleva 3 paga 2 · categoría Snacks): sube las unidades por pedido.</li>
          <li><b>10% en alimento de gato</b> durante una semana para rotar stock.</li>
          <li><b>Despacho gratis</b> llevando 2 sacos o más de alimento (unidades mínimas 2).</li>
          <li><b>$3.000 de descuento</b> en compras sobre $45.000.</li>
        </ul></div></div>`);
    await load(); draw();
    $("#pr-new").onclick = create;
    $("#pr-body").onclick = async (e) => { const tr = e.target.closest("tr[data-id]"); if (tr && (await promoForm(list.find((x) => x.id === tr.dataset.id)))) { await load(); draw(); } };
  });

  // ================================================================ CÓDIGOS ÚNICOS (desde Descuentos)
  A.uniqueCodes = async (d) => {
    const codes = await A.q(A.sb.from("discount_codes").select("*").eq("discount_id", d.id).order("created_at", { ascending: false }).limit(2000));
    const used = codes.filter((c) => c.used_at).length;
    const m = A.modal({
      title: `Códigos únicos · ${d.code}`, wide: true,
      body: `<p style="margin-top:0">Cada código sirve <b>una sola vez</b> y tiene las mismas reglas que <b>${esc(d.code)}</b>. Ideales para volantes, sorteos, influencers o regalar a clientes.</p>
        <div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="kpi"><small>Generados</small><b>${num(codes.length)}</b></div><div class="kpi"><small>Usados</small><b>${num(used)}</b></div><div class="kpi"><small>Disponibles</small><b>${num(codes.length - used)}</b></div></div>
        <form id="uc-f" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
          <label class="f" style="margin:0">Cantidad<input name="n" type="number" min="1" max="1000" value="20" style="width:110px"></label>
          <label class="f" style="margin:0">Prefijo<input name="prefix" value="${esc(d.code.slice(0, 6))}" maxlength="8" style="width:140px;text-transform:uppercase"></label>
          <button class="btn btn-primary">Generar códigos</button></form>
        <div class="tbl-wrap" style="margin-top:12px;max-height:320px;overflow:auto"><table class="tbl"><thead><tr><th>Código</th><th>Para</th><th>Estado</th></tr></thead><tbody>
          ${codes.slice(0, 300).map((c) => `<tr><td class="mono">${esc(c.code)}</td><td class="small">${esc(c.email || "—")}</td><td>${c.used_at ? A.badge(`Usado ${A.date(c.used_at)}`, "b-gray") : A.badge("Disponible", "b-green")}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">Aún no hay códigos únicos</td></tr>`}
        </tbody></table></div>`,
      foot: `<button class="btn" id="uc-csv" ${codes.length ? "" : "disabled"}>Exportar a Excel</button><button class="btn" data-x>Cerrar</button>`,
    });
    m.el.querySelector("#uc-csv").onclick = () => A.csv(`codigos-${d.code}.csv`, [["Código", "Correo", "Usado"], ...codes.map((c) => [c.code, c.email || "", c.used_at ? A.date(c.used_at) : ""])]);
    m.el.querySelector("#uc-f").onsubmit = async (e) => {
      e.preventDefault();
      try {
        const out = await A.rpc("generate_discount_codes", { p_discount: d.id, p_count: A.int(e.target.n.value) || 0, p_prefix: e.target.prefix.value.trim() || null });
        m.close(); A.toast(`${out.length} códigos generados`); A.uniqueCodes(d);
      } catch (err) { A.fail(err); }
    };
  };

  // ================================================================ RESEÑAS
  A.route("/resenas", "resenas", async (_, query) => {
    await Promise.all([A.loadSettings(true), A.loadCatalog()]);
    const st = { tab: query.tab || "pendiente" };
    let list = [];
    const load = async () => { list = await A.q(A.sb.from("product_reviews").select("*").order("created_at", { ascending: false }).limit(1000)); };
    const prod = (id) => A.state.products.find((p) => p.id === id);
    const draw = () => {
      if (!document.getElementById("rv-body")) return;
      const l = list.filter((r) => st.tab === "todas" || r.status === st.tab);
      $$("#rv-tabs [data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === st.tab));
      $("#rv-tabs [data-tab=pendiente]").innerHTML = `Por revisar${list.filter((r) => r.status === "pendiente").length ? ` <span class="count">${list.filter((r) => r.status === "pendiente").length}</span>` : ""}`;
      $("#rv-body").innerHTML = l.length ? l.map((r) => { const p = prod(r.product_id); return `<div class="rv-item" data-id="${r.id}">
        <div class="rv-item-head"><span class="stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span><b>${esc(r.name)}</b>${r.verified ? A.badge("Compra verificada", "b-green") : ""}
          <small class="muted">${esc(r.email || "")} · ${A.ago(r.created_at)}</small></div>
        <div class="small">${p ? `<a href="#/productos/${p.id}">${esc(p.name)}</a>` : "Producto eliminado"}</div>
        ${r.comment ? `<p>${esc(r.comment)}</p>` : `<p class="muted small">Sin comentario</p>`}
        ${r.reply ? `<p class="rv-reply-a"><b>Tu respuesta:</b> ${esc(r.reply)}</p>` : ""}
        <div class="btn-group">${r.status !== "aprobada" ? `<button class="btn btn-sm btn-primary" data-act="aprobada">✓ Publicar</button>` : ""}
          ${r.status !== "rechazada" ? `<button class="btn btn-sm" data-act="rechazada">Ocultar</button>` : ""}
          <button class="btn btn-sm" data-act="reply">💬 ${r.reply ? "Editar respuesta" : "Responder"}</button>
          <button class="btn btn-sm btn-plain danger" data-act="delete">Eliminar</button></div></div>`; }).join("")
        : `<div class="empty-state"><div class="emo">⭐</div><h3>${st.tab === "pendiente" ? "No hay opiniones por revisar" : "Sin opiniones"}</h3><p>Los clientes pueden opinar desde la ficha de cada producto en la tienda.</p></div>`;
    };
    const s = A.state.settings;
    A.render(`<div class="page">
      ${A.head({ title: "Opiniones de clientes", back: "/productos", sub: "Las opiniones aparecen en la tienda solo cuando las publicas (o automáticamente si lo activas)." })}
      <div class="card" style="margin-bottom:16px;display:flex;gap:10px 24px;flex-wrap:wrap">
        <label class="switch"><input type="checkbox" id="rv-en" ${s.reviews_enabled ? "checked" : ""}> Permitir opiniones en la tienda</label>
        <label class="switch"><input type="checkbox" id="rv-auto" ${s.reviews_auto_approve ? "checked" : ""}> Publicar automáticamente (sin revisar)</label>
      </div>
      <div class="card flush"><div class="tabs" id="rv-tabs">${[["pendiente", "Por revisar"], ["aprobada", "Publicadas"], ["rechazada", "Ocultas"], ["todas", "Todas"]].map(([k, l]) => `<button data-tab="${k}">${l}</button>`).join("")}</div>
        <div id="rv-body" style="padding:8px 16px 16px"><div class="spinner"></div></div></div></div>`);
    await load(); draw();
    $("#rv-tabs").onclick = (e) => { const b = e.target.closest("[data-tab]"); if (b) { st.tab = b.dataset.tab; draw(); } };
    const saveS = async (patch) => { try { await A.q(A.sb.from("store_settings").update(patch).eq("id", 1)); await A.loadSettings(true); A.toast("Guardado"); } catch (err) { A.fail(err); } };
    $("#rv-en").onchange = (e) => saveS({ reviews_enabled: e.target.checked });
    $("#rv-auto").onchange = (e) => saveS({ reviews_auto_approve: e.target.checked });
    $("#rv-body").onclick = async (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const r = list.find((x) => x.id === b.closest("[data-id]").dataset.id);
      try {
        if (b.dataset.act === "delete") {
          if (!(await A.confirm({ title: "Eliminar opinión", message: "Se borrará definitivamente.", ok: "Eliminar", danger: true }))) return;
          await A.q(A.sb.from("product_reviews").delete().eq("id", r.id)); list.splice(list.indexOf(r), 1);
        } else if (b.dataset.act === "reply") {
          const a = await A.ask({ title: `Responder a ${r.name}`, fields: [{ name: "reply", label: "Respuesta pública", type: "textarea", value: r.reply || "" }], ok: "Guardar" });
          if (!a) return;
          await A.q(A.sb.from("product_reviews").update({ reply: a.reply || null }).eq("id", r.id)); r.reply = a.reply || null;
        } else {
          await A.q(A.sb.from("product_reviews").update({ status: b.dataset.act }).eq("id", r.id)); r.status = b.dataset.act;
        }
        draw(); A.refreshBadges?.();
      } catch (err) { A.fail(err); }
    };
  });

  // ================================================================ RECOMPRA
  A.route("/recompra", "recompra", async () => {
    await Promise.all([A.loadSettings(true), A.loadCatalog()]);
    const st = { f: "pendientes" };
    let rows = [], mail = { configured: false };
    const load = async () => {
      [rows, mail] = await Promise.all([
        A.rpc("replenish_due", { p_ahead: 7, p_back: 30 }),
        invoke("marketing", { action: "status" }).catch(() => ({ configured: false })),
      ]);
    };
    const waText = (r) => `¡Hola ${String(r.name || "").split(" ")[0]}! 🐾 Te escribimos de Planeta 4 Patas. Ya pasaron unas semanas desde que llevaste ${r.product_name} ${r.variant_label || ""}. ¿Te lo preparamos de nuevo? Lo podemos despachar o lo retiras en tienda 😊`;
    const visible = () => rows.filter((r) => st.f === "todos" || (st.f === "pendientes" ? !r.reminded_at : !!r.reminded_at));
    const draw = () => {
      if (!document.getElementById("rc-body")) return;
      const l = visible();
      $("#rc-body").innerHTML = l.length ? l.map((r, i) => { const d = Math.round((new Date(r.due_date) - Date.now()) / 864e5); return `<tr data-i="${rows.indexOf(r)}">
        <td><b>${esc(r.name)}</b><br><small class="muted">${esc(r.email)}</small></td>
        <td>${esc(r.product_name)}<br><small class="muted">${esc(r.variant_label || "")} · compró hace ${Math.round((Date.now() - new Date(r.last_date)) / 864e5)} días</small></td>
        <td class="nowrap">${d > 0 ? `en ${d} día${d === 1 ? "" : "s"}` : d === 0 ? A.badge("Hoy", "b-amber") : A.badge(`hace ${-d} día${d === -1 ? "" : "s"}`, "b-red")}</td>
        <td class="nowrap">${r.reminded_at ? `<small class="muted">Avisado ${A.ago(r.reminded_at)}</small>` : ""}</td>
        <td class="num nowrap"><button class="btn btn-sm btn-green" data-wa>WhatsApp</button>${mail.configured ? ` <button class="btn btn-sm" data-mail>Correo</button>` : ""}</td></tr>`; }).join("")
        : `<tr><td colspan="5"><div class="empty-state"><div class="emo">🔁</div><h3>${rows.length ? "Nada en este filtro" : "Aún no hay clientes por recordar"}</h3><p>Aparecen cuando se acerca la fecha en que se les acaba un producto (según los días de recompra de cada categoría o producto).</p></div></td></tr>`;
      $("#rc-count").textContent = `${l.length} recordatorio${l.length === 1 ? "" : "s"}`;
    };
    A.render(`<div class="page">
      ${A.head({ title: "Recordatorios de recompra", back: "/clientes", actions: mail.configured ? `<button class="btn btn-primary" id="rc-mailall">✉️ Enviar correo a pendientes</button>` : "",
        sub: "Clientes a los que se les está acabando el alimento (o lo que compraron). Escríbeles en el momento justo." })}
      <div id="rc-banner"></div>
      <div class="cols">
        <div class="card flush">
          <div class="toolbar"><select id="rc-f"><option value="pendientes">Sin avisar</option><option value="avisados">Ya avisados</option><option value="todos">Todos</option></select><div class="grow"></div><small class="muted" id="rc-count"></small></div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cliente</th><th>Producto</th><th>Se acaba</th><th></th><th></th></tr></thead><tbody id="rc-body"><tr><td colspan="5"><div class="spinner"></div></td></tr></tbody></table></div>
        </div>
        <div class="stack">
          <div class="card"><h2 style="margin-bottom:8px">Envío automático</h2>
            <label class="switch"><input type="checkbox" id="rc-auto" ${A.state.settings.reminders_auto ? "checked" : ""}> Enviar un correo automático cada día a quienes se les acaba</label>
            <p class="help" id="rc-auto-help"></p></div>
          <div class="card"><h2 style="margin-bottom:8px">Días de recompra por categoría</h2>
            <p class="help" style="margin-top:0">Cada cuántos días se acaba. Vacío = no recordar. También puedes fijarlo por producto.</p>
            <div id="rc-cats">${A.state.categories.map((c) => `<label class="f" style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="flex:1">${esc(c.emoji || "")} ${esc(c.name)}</span><input type="number" min="1" max="365" data-cat="${esc(c.slug)}" value="${c.replenish_days ?? ""}" style="width:80px" placeholder="—"></label>`).join("")}</div>
          </div>
        </div>
      </div></div>`);
    await load();
    $("#rc-banner").innerHTML = mail.configured ? "" : `<div class="banner info"><span>✉️</span><div><b>Correo no conectado</b>Puedes avisar por WhatsApp. Para enviar correos (manuales y automáticos) conecta el servicio en <a href="#/configuracion/correo">Configuración → Correo</a>.</div></div>`;
    $("#rc-auto-help").textContent = mail.configured ? "Se envía alrededor de las 10:00, una sola vez por compra." : "Requiere conectar el correo.";
    if (mail.configured && !$("#rc-mailall")) $(".page-head .btn-group").innerHTML = `<button class="btn btn-primary" id="rc-mailall">✉️ Enviar correo a pendientes</button>`;
    draw();
    $("#rc-f").onchange = (e) => { st.f = e.target.value; draw(); };
    const sendMail = async (list) => {
      if (!list.length) return A.toast("No hay recordatorios pendientes", true);
      try {
        const r = await invoke("marketing", { action: "send_reminders", items: list.map((x) => ({ email: x.email, product_id: x.product_id })) });
        if (!r.ok) throw new Error(r.error || "No se pudo enviar");
        A.toast(`${r.sent} correo${r.sent === 1 ? "" : "s"} enviado${r.sent === 1 ? "" : "s"}`); await load(); draw();
      } catch (err) { A.fail(err); }
    };
    $("#rc-mailall")?.addEventListener("click", async () => {
      const pend = rows.filter((r) => !r.reminded_at);
      if (await A.confirm({ title: "Enviar recordatorios", message: `Se enviará un correo a ${pend.length} cliente(s).`, ok: "Enviar" })) sendMail(pend);
    });
    $("#rc-body").onclick = async (e) => {
      const tr = e.target.closest("tr[data-i]"); if (!tr) return;
      const r = rows[+tr.dataset.i];
      if (e.target.closest("[data-wa]")) {
        window.open(A.wa(r.phone, waText(r)), "_blank", "noopener");
        try { await A.rpc("log_reminder", { p_email: r.email, p_product: r.product_id, p_order: r.last_order, p_channel: "whatsapp" }); r.reminded_at = new Date().toISOString(); draw(); } catch { /* no crítico */ }
      }
      if (e.target.closest("[data-mail]")) sendMail([r]);
    };
    $("#rc-auto").onchange = async (e) => {
      if (e.target.checked && !mail.configured) { e.target.checked = false; return A.toast("Primero conecta el correo en Configuración → Correo", true); }
      try { await A.q(A.sb.from("store_settings").update({ reminders_auto: e.target.checked }).eq("id", 1)); await A.loadSettings(true); A.toast(e.target.checked ? "Recordatorios automáticos activados" : "Recordatorios automáticos desactivados"); }
      catch (err) { A.fail(err); }
    };
    $("#rc-cats").onchange = async (e) => {
      const slug = e.target.dataset.cat; if (!slug) return;
      try { await A.q(A.sb.from("categories").update({ replenish_days: A.int(e.target.value) || null }).eq("slug", slug)); await A.loadCatalog(true); await load(); draw(); A.toast("Guardado"); }
      catch (err) { A.fail(err); }
    };
  });

  // ================================================================ CAMPAÑAS DE CORREO
  const AUDIENCES = { suscriptores: "Suscriptores del pop-up", clientes: "Clientes que han comprado", todos: "Suscriptores y clientes", perro: "Suscriptores con perro", gato: "Suscriptores con gato", sin_compra: "Suscriptores que aún no compran", inactivos: "Clientes sin comprar hace 60+ días" };
  const CSTATUS = { borrador: ["Borrador", "b-gray"], enviando: ["Enviando", "b-amber"], enviada: ["Enviada", "b-green"], error: ["Error", "b-red"] };

  A.route("/campanas", "campanas", async () => {
    await A.loadSettings();
    const [list, mail] = await Promise.all([
      A.q(A.sb.from("email_campaigns").select("*").order("created_at", { ascending: false })),
      invoke("marketing", { action: "status" }).catch(() => ({ configured: false })),
    ]);
    A.render(`<div class="page">
      ${A.head({ title: "Campañas de correo", actions: `<a class="btn btn-primary" href="#/campanas/nueva">Crear campaña</a>`, sub: "Envía novedades, ofertas y códigos de descuento a tus suscriptores y clientes. Todos los correos incluyen el enlace para darse de baja." })}
      ${mail.configured ? "" : `<div class="banner warn"><span>✉️</span><div><b>Falta conectar el correo</b>Puedes preparar campañas, pero para enviarlas conecta el servicio en <a href="#/configuracion/correo">Configuración → Correo</a> (5 minutos, gratis hasta 3.000 correos al mes).</div></div>`}
      <div class="card flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Campaña</th><th>Estado</th><th class="hide-sm">Audiencia</th><th class="num">Enviados</th></tr></thead><tbody>
        ${list.map((c) => `<tr class="click" data-id="${c.id}"><td><b>${esc(c.subject)}</b><br><small class="muted">${c.sent_at ? `Enviada ${A.dateTime(c.sent_at)}` : `Creada ${A.ago(c.created_at)}`}</small></td>
          <td>${A.badge(...(CSTATUS[c.status] || CSTATUS.borrador))}</td><td class="hide-sm small">${esc(AUDIENCES[c.audience] || c.audience)}</td><td class="num">${c.sent ? `${num(c.sent)} / ${num(c.recipients)}` : "—"}</td></tr>`).join("")
        || `<tr><td colspan="4"><div class="empty-state"><div class="emo">📨</div><h3>Crea tu primera campaña</h3><p>Ej: "Llegó el nuevo alimento", "10% este fin de semana" o "Te extrañamos: 5.000 de regalo".</p><a class="btn btn-primary" href="#/campanas/nueva">Crear campaña</a></div></td></tr>`}
      </tbody></table></div></div></div>`);
    $("tbody").onclick = (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) A.go(`/campanas/${tr.dataset.id}`); };
  });

  A.route("/campanas/:id", "campanas", async ({ id }) => {
    const s = await A.loadSettings();
    const [discounts, mail, existing] = await Promise.all([
      A.q(A.sb.from("discounts").select("code, active").order("created_at", { ascending: false })),
      invoke("marketing", { action: "status" }).catch(() => ({ configured: false })),
      id === "nueva" ? null : A.q(A.sb.from("email_campaigns").select("*").eq("id", id).single()),
    ]);
    const c = existing || { subject: "", heading: "", body: "¡Hola {nombre}!\n\n", button_text: "Ver en la tienda", button_url: A.storeUrl(), image_url: null, discount_code: "", audience: "suscriptores", status: "borrador" };
    const locked = c.status === "enviada" || c.status === "enviando";
    const preview = () => `<div class="mail-prev"><div class="mp-top">🐾 ${esc(s.store_name || "Planeta 4 Patas")}</div>
      ${c.image_url ? `<img src="${esc(c.image_url)}" alt="">` : ""}<div class="mp-body">${c.heading ? `<h3>${esc(c.heading.replace(/\{nombre\}/g, "Camila"))}</h3>` : ""}
      ${esc(c.body.replace(/\{nombre\}/g, "Camila")).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("")}
      ${c.discount_code ? `<div class="mp-code"><small>Tu código</small><b>${esc(c.discount_code)}</b></div>` : ""}
      ${c.button_text ? `<span class="mp-btn">${esc(c.button_text)}</span>` : ""}</div><div class="mp-foot">${esc(s.address || "")} · Darse de baja</div></div>`;
    A.render(`<div class="page">
      ${A.head({ title: existing ? esc(c.subject) : "Nueva campaña", back: "/campanas", badges: ` ${A.badge(...(CSTATUS[c.status] || CSTATUS.borrador))}`,
        actions: locked ? "" : `<button class="btn" id="cp-test">Enviarme una prueba</button><button class="btn btn-primary" id="cp-send">Enviar campaña</button>` })}
      ${locked ? `<div class="banner ok"><span>✓</span><div><b>Campaña enviada a ${num(c.sent)} de ${num(c.recipients)} personas</b>${c.sent_at ? A.dateTime(c.sent_at) : ""}${c.error ? ` · ${esc(c.error)}` : ""}</div></div>` : ""}
      ${!mail.configured && !locked ? `<div class="banner warn"><span>✉️</span><div><b>Correo no conectado</b>Guarda el borrador y conecta el servicio en <a href="#/configuracion/correo">Configuración → Correo</a> para enviarla.</div></div>` : ""}
      <div class="cols">
        <form id="cp" class="stack">
          <div class="card">
            <label class="f">Asunto<input name="subject" value="${esc(c.subject)}" maxlength="120" placeholder="Ej: 🐾 10% en alimento para gatos este fin de semana" ${locked ? "disabled" : ""}></label>
            <label class="f">Título <small>Opcional. Usa {nombre} para personalizar</small><input name="heading" value="${esc(c.heading || "")}" maxlength="120" ${locked ? "disabled" : ""}></label>
            <label class="f">Mensaje <small>Deja una línea en blanco entre párrafos. {nombre} = primer nombre</small><textarea name="body" rows="8" ${locked ? "disabled" : ""}>${esc(c.body)}</textarea></label>
            <label class="f">Imagen <small>Opcional</small><input type="file" id="cp-img" accept="image/*" ${locked ? "disabled" : ""}></label>
            ${c.image_url && !locked ? `<button type="button" class="btn btn-plain danger btn-sm" id="cp-img-rm">Quitar imagen</button>` : ""}
          </div>
          <div class="card">
            <div class="row2"><label class="f">Código de descuento <small>Opcional</small><select name="discount_code" ${locked ? "disabled" : ""}><option value="">— Sin código —</option>${discounts.map((d) => `<option ${d.code === c.discount_code ? "selected" : ""}>${esc(d.code)}</option>`).join("")}</select></label>
            <label class="f">Destinatarios<select name="audience" ${locked ? "disabled" : ""}>${Object.entries(AUDIENCES).map(([k, l]) => `<option value="${k}" ${k === c.audience ? "selected" : ""}>${l}</option>`).join("")}</select><small id="cp-count"></small></label></div>
            <div class="row2"><label class="f">Texto del botón<input name="button_text" value="${esc(c.button_text || "")}" ${locked ? "disabled" : ""}></label>
            <label class="f">Enlace del botón<input name="button_url" value="${esc(c.button_url || "")}" ${locked ? "disabled" : ""}></label></div>
          </div>
          ${locked ? "" : `<div style="display:flex;justify-content:flex-end;gap:8px">${existing ? `<button type="button" class="btn btn-plain danger" id="cp-del">Eliminar</button>` : ""}<button class="btn">Guardar borrador</button></div>`}
        </form>
        <div><div class="card" style="position:sticky;top:76px"><h2 style="margin-bottom:10px">Vista previa</h2><div id="cp-prev">${preview()}</div></div></div>
      </div></div>`);
    if (locked) return;
    const f = $("#cp");
    const read = () => Object.assign(c, { subject: f.subject.value.trim(), heading: f.heading.value.trim() || null, body: f.body.value, button_text: f.button_text.value.trim() || null,
      button_url: f.button_url.value.trim() || null, discount_code: f.discount_code.value || null, audience: f.audience.value });
    const count = async () => { $("#cp-count").textContent = "Calculando…"; try { const r = await invoke("marketing", { action: "audience", audience: f.audience.value }); $("#cp-count").textContent = `${num(r.count)} persona${r.count === 1 ? "" : "s"} (sin contar quienes se dieron de baja)`; } catch { $("#cp-count").textContent = ""; } };
    f.addEventListener("input", () => { read(); $("#cp-prev").innerHTML = preview(); });
    f.audience.addEventListener("change", count); count();
    $("#cp-img").onchange = async (e) => { const file = e.target.files[0]; if (!file) return; try { c.image_url = await A.upload(file, "correos"); $("#cp-prev").innerHTML = preview(); A.toast("Imagen lista"); } catch (err) { A.fail(err); } };
    $("#cp-img-rm")?.addEventListener("click", () => { c.image_url = null; $("#cp-prev").innerHTML = preview(); });
    const save = async () => {
      read();
      if (c.subject.length < 3) throw new Error("Escribe el asunto del correo");
      if (c.body.trim().length < 5) throw new Error("Escribe el mensaje");
      const row = { subject: c.subject, heading: c.heading, body: c.body, button_text: c.button_text, button_url: c.button_url, image_url: c.image_url, discount_code: c.discount_code, audience: c.audience };
      if (c.id) await A.q(A.sb.from("email_campaigns").update(row).eq("id", c.id));
      else c.id = (await A.q(A.sb.from("email_campaigns").insert({ ...row, created_by: A.state.user?.email }).select("id").single())).id;
    };
    f.onsubmit = async (e) => { e.preventDefault(); try { await save(); A.toast("Borrador guardado"); if (id === "nueva") A.go(`/campanas/${c.id}`); } catch (err) { A.fail(err); } };
    $("#cp-del")?.addEventListener("click", async () => {
      if (!(await A.confirm({ title: "Eliminar campaña", message: "Se borrará el borrador.", ok: "Eliminar", danger: true }))) return;
      try { await A.q(A.sb.from("email_campaigns").delete().eq("id", c.id)); A.go("/campanas"); } catch (err) { A.fail(err); }
    });
    $("#cp-test").onclick = async () => {
      read();
      try { const r = await invoke("marketing", { action: "test", campaign: c }); if (!r.ok) throw new Error(r.error); A.toast(`Prueba enviada a ${r.to}`); } catch (err) { A.fail(err); }
    };
    $("#cp-send").onclick = async () => {
      try {
        await save();
        const r0 = await invoke("marketing", { action: "audience", audience: c.audience });
        if (!(await A.confirm({ title: "Enviar campaña", message: `Se enviará "<b>${esc(c.subject)}</b>" a <b>${num(r0.count)}</b> persona(s). No se puede deshacer.`, ok: "Enviar ahora" }))) return;
        A.toast("Enviando…");
        const r = await invoke("marketing", { action: "send_campaign", campaign_id: c.id });
        if (!r.ok) throw new Error(r.error || "No se pudo enviar");
        A.toast(`Campaña enviada a ${r.sent} persona(s)`); A.go(`/campanas/${c.id}`); A.navigate();
      } catch (err) { A.fail(err); }
    };
  });

  // ================================================================ GRUPOS DE CLIENTES
  A.route("/grupos", "grupos", async () => {
    let groups = [], members = [];
    const load = async () => {
      [groups, members] = await Promise.all([
        A.q(A.sb.from("customer_groups").select("*").order("created_at")),
        A.q(A.sb.from("customer_group_members").select("*").order("created_at", { ascending: false })),
      ]);
    };
    await load();
    const groupForm = async (g = null) => {
      const r = await A.ask({
        title: g ? `Editar ${g.name}` : "Nuevo grupo de clientes", ok: "Guardar",
        intro: "Los clientes del grupo ven el precio especial al pagar, usando su correo. No se suma a las promociones del mismo producto.",
        fields: [{ name: "name", label: "Nombre", value: g?.name || "", required: true, placeholder: "Ej: Criadores, Veterinarias, Refugios" },
          { name: "percent", label: "Descuento en todos los productos (%)", type: "number", value: g?.percent ?? 10, min: 0 },
          { name: "free_shipping", label: "Despacho gratis siempre", type: "checkbox", value: g?.free_shipping },
          { name: "description", label: "Nota interna", value: g?.description || "" },
          { name: "active", label: "Activo", type: "checkbox", value: g ? g.active : true }],
      });
      if (!r) return;
      const row = { name: r.name, percent: Math.min(100, Math.max(0, A.int(r.percent) || 0)), free_shipping: r.free_shipping, description: r.description || null, active: r.active };
      try { if (g) await A.q(A.sb.from("customer_groups").update(row).eq("id", g.id)); else await A.q(A.sb.from("customer_groups").insert(row)); await load(); draw(); A.toast("Grupo guardado"); }
      catch (err) { A.fail(err); }
    };
    const draw = () => {
      $("#gr-body").innerHTML = groups.length ? groups.map((g) => { const ms = members.filter((m) => m.group_id === g.id); return `<div class="card" data-g="${g.id}" style="margin-bottom:12px">
        <div class="card-head"><h2>${esc(g.name)} ${g.active ? "" : A.badge("Inactivo", "b-gray")}</h2><div class="btn-group"><button class="btn btn-sm" data-edit>Editar</button><button class="btn btn-sm btn-primary" data-add>＋ Agregar cliente</button></div></div>
        <p class="muted" style="margin-top:0">${g.percent ? `${g.percent}% de descuento` : "Sin descuento"}${g.free_shipping ? " · despacho gratis" : ""}${g.description ? ` · ${esc(g.description)}` : ""}</p>
        ${ms.length ? `<div class="chips">${ms.map((m) => `<span class="tag"><a href="#/clientes/${encodeURIComponent(m.email)}">${esc(m.email)}</a><button data-rm="${esc(m.email)}" aria-label="Quitar">✕</button></span>`).join("")}</div>` : `<p class="muted small">Sin clientes todavía</p>`}
        <div style="margin-top:10px"><button class="btn btn-plain danger btn-sm" data-delg>Eliminar grupo</button></div></div>`; }).join("")
        : `<div class="card"><div class="empty-state"><div class="emo">🏷️</div><h3>Crea tu primer grupo</h3><p>Precios especiales para criaderos, veterinarias, refugios o clientes mayoristas.</p></div></div>`;
    };
    A.render(`<div class="page narrow">
      ${A.head({ title: "Grupos de clientes", back: "/clientes", actions: `<button class="btn btn-primary" id="gr-new">Crear grupo</button>` })}
      <div id="gr-body"></div></div>`);
    draw();
    $("#gr-new").onclick = () => groupForm();
    $("#gr-body").onclick = async (e) => {
      const card = e.target.closest("[data-g]"); if (!card) return;
      const g = groups.find((x) => x.id === card.dataset.g);
      try {
        if (e.target.closest("[data-edit]")) return groupForm(g);
        if (e.target.closest("[data-add]")) {
          const r = await A.ask({ title: `Agregar a ${g.name}`, fields: [{ name: "email", label: "Correo del cliente (el que usa al comprar)", type: "email", required: true }], ok: "Agregar" });
          if (!r) return;
          await A.q(A.sb.from("customer_group_members").upsert({ email: r.email.toLowerCase(), group_id: g.id }, { onConflict: "email" }));
        }
        const rm = e.target.closest("[data-rm]");
        if (rm) await A.q(A.sb.from("customer_group_members").delete().eq("email", rm.dataset.rm));
        if (e.target.closest("[data-delg]")) {
          if (!(await A.confirm({ title: `Eliminar ${g.name}`, message: "Sus clientes dejarán de tener el precio especial.", ok: "Eliminar", danger: true }))) return;
          await A.q(A.sb.from("customer_groups").delete().eq("id", g.id));
        }
        await load(); draw();
      } catch (err) { A.fail(err); }
    };
  });

  // Selector de grupo en la ficha del cliente
  A.customerGroupBox = async (email, el) => {
    const [groups, mem] = await Promise.all([
      A.q(A.sb.from("customer_groups").select("id, name, percent, free_shipping").eq("active", true).order("name")),
      A.q(A.sb.from("customer_group_members").select("group_id").eq("email", email).maybeSingle()),
    ]);
    el.innerHTML = `<label class="f" style="margin:0">Grupo<select id="cg-sel"><option value="">Ninguno (precio normal)</option>${groups.map((g) => `<option value="${g.id}" ${mem?.group_id === g.id ? "selected" : ""}>${esc(g.name)}${g.percent ? ` (-${g.percent}%)` : ""}${g.free_shipping ? " · despacho gratis" : ""}</option>`).join("")}</select></label>
      <small class="muted">${groups.length ? "" : `Crea grupos en <a href="#/grupos">Clientes → Grupos</a>`}</small>`;
    el.querySelector("#cg-sel").onchange = async (e) => {
      try {
        if (e.target.value) await A.q(A.sb.from("customer_group_members").upsert({ email, group_id: e.target.value }, { onConflict: "email" }));
        else await A.q(A.sb.from("customer_group_members").delete().eq("email", email));
        A.toast("Grupo actualizado");
      } catch (err) { A.fail(err); }
    };
  };

  // ================================================================ TRÁFICO Y BÚSQUEDAS
  A.route("/trafico", "trafico", async (_, query) => {
    const s = await A.loadSettings(true);
    await A.loadCatalog();
    const days = +(query.d || 30);
    const to = new Date(), from = new Date(Date.now() - days * 864e5);
    const [rep, terms] = await Promise.all([
      A.rpc("traffic_report", { p_from: from.toISOString(), p_to: to.toISOString() }),
      A.q(A.sb.from("search_terms").select("*").order("searches", { ascending: false }).limit(300)),
    ]);
    const f = rep.funnel || {};
    const steps = [["visit", "Visitas"], ["view_product", "Vieron un producto"], ["add_to_cart", "Agregaron al carrito"], ["begin_checkout", "Iniciaron el pago"], ["purchase", "Compraron"]];
    const pct = (a, b) => (b ? A.pct(a / b) : "—");
    const prodName = (id) => A.state.products.find((p) => p.id === id)?.name || "Producto eliminado";
    const series = [];
    for (let i = days - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5); const k = A.dayKey(d); series.push({ label: A.dateShort(d), value: (rep.days.find((x) => x.day === k) || {}).visits || 0 }); }
    const zero = terms.filter((t) => t.zero_results > 0 && t.last_results === 0).sort((a, b) => b.zero_results - a.zero_results);
    A.render(`<div class="page">
      ${A.head({ title: "Tráfico y búsquedas", back: "/analisis", actions: `<select id="tr-d">${[7, 30, 90].map((d) => `<option value="${d}" ${d === days ? "selected" : ""}>Últimos ${d} días</option>`).join("")}</select>`,
        sub: `Medición propia, sin cookies ni datos personales.${rep.since && new Date(rep.since) > from ? ` Contando desde el ${A.date(rep.since)}.` : ""}` })}
      <div class="kpis">
        <div class="kpi"><small>Visitas</small><b>${num(f.visit)}</b></div>
        <div class="kpi"><small>Agregaron al carrito</small><b>${pct(f.add_to_cart, f.visit)}</b></div>
        <div class="kpi"><small>Conversión</small><b>${pct(f.purchase, f.visit)}</b></div>
        <div class="kpi"><small>Pop-up: se registraron</small><b>${pct(f.popup_submit, f.popup_view)}</b></div>
      </div>
      <div class="card" style="margin-bottom:16px"><h2 style="margin-bottom:8px">Visitas por día</h2>${A.barChart(series, { height: 170, money: false })}</div>
      <div class="cols">
        <div class="stack">
          <div class="card"><h2 style="margin-bottom:10px">Embudo de compra</h2>
            <div class="funnel">${steps.map(([k, l], i) => `<div class="fn-row"><span>${l}</span><div class="fn-bar"><i style="width:${f.visit ? Math.max(2, (f[k] / f.visit) * 100) : 0}%"></i></div><b>${num(f[k])}</b><small class="muted">${i ? pct(f[k], f[steps[i - 1][0]]) : ""}</small></div>`).join("")}</div>
            <p class="help">El porcentaje de la derecha es cuántos pasan del paso anterior al siguiente. Si cae mucho en "Iniciaron el pago → Compraron", revisa los medios de pago o el costo de despacho.</p></div>
          <div class="card"><h2 style="margin-bottom:10px">Productos más vistos</h2>
            <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Producto</th><th class="num">Vistas</th><th class="num">Al carrito</th><th class="num">%</th></tr></thead><tbody>
            ${rep.products.slice(0, 15).map((p) => `<tr><td><a href="#/productos/${p.product_id}">${esc(prodName(p.product_id))}</a></td><td class="num">${num(p.views)}</td><td class="num">${num(p.adds)}</td><td class="num">${pct(p.adds, p.views)}</td></tr>`).join("") || `<tr><td colspan="4" class="muted">Sin datos aún</td></tr>`}
            </tbody></table></div><p class="help">Muchas vistas y pocos "al carrito" suele indicar precio alto, falta de foto o de información.</p></div>
        </div>
        <div class="stack">
          <div class="card"><h2 style="margin-bottom:10px">De dónde llegan</h2>${A.barsList(rep.sources.map((x) => ({ label: esc(x.source), value: x.sessions, extra: x.purchases ? `${x.purchases} compra${x.purchases === 1 ? "" : "s"}` : "" })), { money: false })}
            <p class="help">Agrega <span class="mono">?utm_source=instagram</span> a los enlaces que publiques para distinguir cada campaña.</p></div>
          <div class="card"><h2 style="margin-bottom:10px">Dispositivo</h2>${A.barsList(rep.devices.map((x) => ({ label: x.device === "movil" ? "📱 Celular" : x.device === "pc" ? "💻 Computador" : esc(x.device), value: x.sessions })), { money: false })}</div>
          <div class="card"><h2 style="margin-bottom:10px">🔎 Buscaron y no encontraron</h2>
            ${zero.length ? `<div class="chips">${zero.slice(0, 40).map((t) => `<span class="tag">${esc(t.term)} <b>${t.zero_results}</b></span>`).join("")}</div><p class="help">Oportunidades: productos que tus clientes buscan y no tienes (o que están escritos distinto: agrégalos como etiqueta).</p>` : `<p class="muted">Nada por ahora 👍</p>`}</div>
          <div class="card"><h2 style="margin-bottom:10px">Lo más buscado</h2>
            ${terms.length ? A.barsList(terms.slice(0, 12).map((t) => ({ label: esc(t.term), value: t.searches })), { money: false }) : `<p class="muted">Sin búsquedas aún</p>`}</div>
          <div class="card"><h2 style="margin-bottom:8px">Ajustes</h2>
            <button class="btn btn-sm" id="tr-reset">Reiniciar estadísticas desde hoy</button>
            <p class="help">Útil después de hacer pruebas. Las búsquedas no se reinician.</p>
            <label class="f" style="margin-top:10px">Umami (opcional) <small>ID de sitio de <a href="https://umami.is" target="_blank" rel="noopener">umami.is</a> si quieres un panel de analítica adicional</small>
              <div style="display:flex;gap:6px"><input id="tr-umami" value="${esc(s.umami_website_id || "")}" placeholder="xxxxxxxx-xxxx-…"><button class="btn btn-sm" id="tr-umami-save">Guardar</button></div></label>
          </div>
        </div>
      </div></div>`);
    $("#tr-d").onchange = (e) => A.go(`/trafico?d=${e.target.value}`);
    $("#tr-reset").onclick = async () => {
      if (!(await A.confirm({ title: "Reiniciar estadísticas", message: "Las visitas anteriores a hoy dejarán de contarse en esta pantalla.", ok: "Reiniciar" }))) return;
      try { await A.q(A.sb.from("store_settings").update({ analytics_since: new Date().toISOString() }).eq("id", 1)); A.navigate(); } catch (err) { A.fail(err); }
    };
    $("#tr-umami-save").onclick = async () => {
      try { await A.q(A.sb.from("store_settings").update({ umami_website_id: $("#tr-umami").value.trim() || null }).eq("id", 1)); A.toast("Guardado"); } catch (err) { A.fail(err); }
    };
  });
})();
