/* =====================================================================
   Panel · Descuentos y Análisis
   ===================================================================== */
(() => {
  const { $, $$, esc, clp, num } = A;

  // ------------------------------------------------------------ descuentos
  const dStatus = (d) => {
    const now = Date.now();
    if (!d.active) return ["Desactivado", "b-gray"];
    if (d.starts_at && new Date(d.starts_at) > now) return ["Programado", "b-info"];
    if (d.ends_at && new Date(d.ends_at) < now) return ["Expirado", "b-gray"];
    if (d.usage_limit && d.used_count >= d.usage_limit) return ["Agotado", "b-amber"];
    return ["Activo", "b-green"];
  };
  const dSummary = (d) => (d.kind === "percent" ? `${d.value}% de descuento` : d.kind === "fixed" ? `${clp(d.value)} de descuento` : "Despacho gratis") +
    (d.min_subtotal ? ` · compras desde ${clp(d.min_subtotal)}` : "") + (d.once_per_customer ? " · 1 vez por cliente" : "") +
    (d.first_order_only ? " · solo primera compra" : "") + (d.subscribers_only ? " · solo suscriptores" : "");
  const toLocal = (iso) => { if (!iso) return ""; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
  const randomCode = () => "P4P" + Math.random().toString(36).slice(2, 7).toUpperCase();

  async function discountForm(d = null) {
    const m = A.modal({
      title: d ? `Editar ${d.code}` : "Crear descuento", wide: true,
      body: `<form id="df">
        <div class="row2">
          <label class="f">Código <small>Lo que el cliente escribe al pagar</small><div style="display:flex;gap:6px"><input name="code" value="${esc(d?.code || "")}" placeholder="Ej: BIENVENIDA10" style="text-transform:uppercase" required><button type="button" class="btn" id="df-gen">Generar</button></div></label>
          <label class="f">Descripción interna <small>Opcional</small><input name="description" value="${esc(d?.description || "")}" placeholder="Ej: campaña Instagram noviembre"></label>
        </div>
        <div class="row2">
          <label class="f">Tipo<select name="kind"><option value="percent">Porcentaje (%)</option><option value="fixed">Monto fijo ($)</option><option value="free_shipping">Despacho gratis</option></select></label>
          <label class="f" id="df-value-wrap">Valor<input name="value" type="number" min="0" value="${d?.value ?? 10}"></label>
        </div>
        <div class="row2">
          <label class="f">Compra mínima <small>0 = sin mínimo</small><div class="prefix"><span>$</span><input name="min_subtotal" type="number" min="0" value="${d?.min_subtotal ?? 0}"></div></label>
          <label class="f">Límite total de usos <small>Vacío = ilimitado</small><input name="usage_limit" type="number" min="1" value="${d?.usage_limit ?? ""}"></label>
        </div>
        <div class="row2">
          <label class="f">Desde <small>Vacío = desde ahora</small><input name="starts_at" type="datetime-local" value="${toLocal(d?.starts_at)}"></label>
          <label class="f">Hasta <small>Vacío = sin fecha de término</small><input name="ends_at" type="datetime-local" value="${toLocal(d?.ends_at)}"></label>
        </div>
        <label class="check"><input type="checkbox" name="once_per_customer" ${d?.once_per_customer ? "checked" : ""}> Una vez por cliente (según correo)</label>
        <label class="check"><input type="checkbox" name="first_order_only" ${d?.first_order_only ? "checked" : ""}> Solo en la primera compra del cliente</label>
        <label class="check"><input type="checkbox" name="subscribers_only" ${d?.subscribers_only ? "checked" : ""}> Solo para suscriptores (correos registrados en el pop-up)</label>
        <label class="check"><input type="checkbox" name="active" ${d ? (d.active ? "checked" : "") : "checked"}> Activo</label>
        <p class="form-error" id="df-err"></p></form>`,
      foot: `${d ? `<button class="btn btn-plain danger" id="df-del" style="margin-right:auto">Eliminar</button>` : ""}<button class="btn" data-x>Cancelar</button><button class="btn btn-primary" id="df-save">Guardar</button>`,
    });
    const f = m.el.querySelector("#df");
    f.kind.value = d?.kind || "percent";
    const sync = () => { m.el.querySelector("#df-value-wrap").hidden = f.kind.value === "free_shipping"; };
    f.kind.onchange = sync; sync();
    m.el.querySelector("#df-gen").onclick = () => (f.code.value = randomCode());
    return new Promise((res) => {
      m.el.querySelector("#df-save").onclick = async () => {
        const code = f.code.value.trim().toUpperCase().replace(/\s+/g, "");
        const err = (t) => (m.el.querySelector("#df-err").textContent = t);
        if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return err("El código debe tener entre 3 y 30 letras o números, sin espacios");
        const value = f.kind.value === "free_shipping" ? 0 : Math.max(0, A.int(f.value.value) || 0);
        if (f.kind.value === "percent" && (value < 1 || value > 100)) return err("El porcentaje debe estar entre 1 y 100");
        if (f.kind.value === "fixed" && value < 1) return err("Ingresa el monto del descuento");
        const row = {
          code, description: f.description.value.trim() || null, kind: f.kind.value, value,
          min_subtotal: Math.max(0, A.int(f.min_subtotal.value) || 0), usage_limit: A.int(f.usage_limit.value) || null,
          starts_at: f.starts_at.value ? new Date(f.starts_at.value).toISOString() : null, ends_at: f.ends_at.value ? new Date(f.ends_at.value).toISOString() : null,
          once_per_customer: f.once_per_customer.checked, first_order_only: f.first_order_only.checked, subscribers_only: f.subscribers_only.checked, active: f.active.checked,
        };
        try {
          if (d) await A.q(A.sb.from("discounts").update(row).eq("id", d.id)); else await A.q(A.sb.from("discounts").insert(row));
          m.close(); res(true); A.toast("Descuento guardado");
        } catch (e) { err(e.message.includes("duplicate") ? "Ya existe un descuento con ese código" : e.message); }
      };
      m.el.querySelector("#df-del")?.addEventListener("click", async () => {
        if (!(await A.confirm({ title: `Eliminar ${d.code}`, message: "Los pedidos que ya lo usaron conservan el descuento aplicado.", ok: "Eliminar", danger: true }))) return;
        try { await A.q(A.sb.from("discounts").delete().eq("id", d.id)); m.close(); res(true); A.toast("Descuento eliminado"); } catch (e) { A.fail(e); }
      });
    });
  }

  A.route("/descuentos", "descuentos", async () => {
    await A.loadSettings();
    let list = [];
    const load = async () => { list = await A.q(A.sb.from("discounts").select("*").order("created_at", { ascending: false })); };
    const draw = () => {
      $("#d-body").innerHTML = list.length ? list.map((d) => { const [s, cls] = dStatus(d); return `<tr class="click" data-id="${d.id}">
        <td><b class="mono" style="font-size:1rem">${esc(d.code)}</b><br><small class="muted">${esc(dSummary(d))}</small>${d.description ? `<br><small class="muted">${esc(d.description)}</small>` : ""}</td>
        <td>${A.badge(s, cls)}</td>
        <td class="num">${d.used_count}${d.usage_limit ? ` / ${d.usage_limit}` : ""}</td>
        <td class="hide-sm small">${d.starts_at || d.ends_at ? `${d.starts_at ? A.date(d.starts_at) : "Ahora"} → ${d.ends_at ? A.date(d.ends_at) : "sin término"}` : "Sin fecha de término"}</td>
        <td class="num"><button class="btn btn-sm" data-share="${d.id}">Compartir</button></td></tr>`; }).join("")
        : `<tr><td colspan="5"><div class="empty-state"><div class="emo">🎟️</div><h3>Crea tu primer código de descuento</h3><p>Ideal para campañas en Instagram, clientes nuevos o fidelizar a tus clientes frecuentes.</p><button class="btn btn-primary" id="d-new2">Crear descuento</button></div></td></tr>`;
      $("#d-new2")?.addEventListener("click", create);
    };
    const create = async () => { if (await discountForm()) { await load(); draw(); } };
    A.render(`<div class="page">
      ${A.head({ title: "Descuentos", actions: `<button class="btn btn-primary" id="d-new">Crear descuento</button>`, sub: "Los clientes ingresan el código en el paso de pago. El descuento se valida en el servidor." })}
      <div class="card flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Código</th><th>Estado</th><th class="num">Usos</th><th class="hide-sm">Vigencia</th><th></th></tr></thead><tbody id="d-body"><tr><td colspan="5"><div class="spinner"></div></td></tr></tbody></table></div></div>
      <div class="card" style="margin-top:16px"><h2 style="margin-bottom:8px">💡 Ideas de campañas</h2>
        <ul style="margin:0;padding-left:18px;line-height:1.8">
          <li><b>BIENVENIDA10</b>: 10% en la primera compra, solo para quienes se registran en el <a href="#/popup">pop-up promocional</a>.</li>
          <li><b>DESPACHOGRATIS</b>: despacho gratis desde $35.000 para mover el ticket promedio.</li>
          <li><b>VUELVE5000</b>: $5.000 para clientes que no compran hace 60 días (filtra en Clientes → "Sin comprar hace 60+ días").</li>
        </ul></div></div>`);
    await load(); draw();
    $("#d-new").onclick = create;
    $("#d-body").onclick = async (e) => {
      const sh = e.target.closest("[data-share]");
      if (sh) {
        e.stopPropagation();
        const d = list.find((x) => x.id === sh.dataset.share);
        const txt = `🐾 ¡Usa el código ${d.code} en planeta4patas y obtén ${d.kind === "percent" ? `${d.value}% de descuento` : d.kind === "fixed" ? `${clp(d.value)} de descuento` : "despacho gratis"}${d.min_subtotal ? ` en compras desde ${clp(d.min_subtotal)}` : ""}! ${A.storeUrl()}`;
        A.modal({ title: "Compartir descuento", body: `<textarea rows="4" id="sh-t">${esc(txt)}</textarea>`, foot: `<a class="btn btn-green" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">Enviar por WhatsApp</a><button class="btn btn-primary" id="sh-copy">Copiar texto</button>` });
        $("#sh-copy").onclick = async () => { try { await navigator.clipboard.writeText($("#sh-t").value); A.toast("Texto copiado"); } catch { $("#sh-t").select(); } };
        return;
      }
      const tr = e.target.closest("tr[data-id]");
      if (tr && (await discountForm(list.find((x) => x.id === tr.dataset.id)))) { await load(); draw(); }
    };
  });

  // ------------------------------------------------------------ análisis
  A.route("/analisis", "analisis", async (_, query) => {
    await Promise.all([A.loadSettings(), A.loadCatalog()]);
    const PRE = { 7: "Últimos 7 días", 30: "Últimos 30 días", 90: "Últimos 90 días", 365: "Últimos 12 meses", mes: "Este mes", mesant: "Mes anterior", custom: "Personalizado…" };
    const r = query.r || "30";
    let from, to = new Date();
    if (r === "mes") from = new Date(to.getFullYear(), to.getMonth(), 1);
    else if (r === "mesant") { from = new Date(to.getFullYear(), to.getMonth() - 1, 1); to = new Date(to.getFullYear(), to.getMonth(), 0, 23, 59, 59); }
    else if (r === "custom" && query.from && query.to) { from = new Date(query.from + "T00:00:00"); to = new Date(query.to + "T23:59:59"); }
    else from = A.startOfDay(new Date(Date.now() - ((+r || 30) - 1) * 864e5));
    const days = Math.max(1, Math.round((A.startOfDay(to) - A.startOfDay(from)) / 864e5) + 1);

    const orders = (await A.q(A.sb.from("orders").select("*, order_items(name, variant_label, qty, line_total, product_id, sku)")
      .gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).order("created_at").limit(10000)));
    const sold = orders.filter((o) => A.SOLD.includes(o.status));
    const sum = (l, k) => l.reduce((s, o) => s + (o[k] || 0), 0);
    const gross = sum(sold, "subtotal"), disc = sum(sold, "discount"), ship = sum(sold, "shipping"), total = sum(sold, "total");
    const units = sold.reduce((s, o) => s + o.order_items.reduce((t, i) => t + i.qty, 0), 0);
    const emails = new Map(); sold.forEach((o) => emails.set(o.customer_email, (emails.get(o.customer_email) || 0) + 1));
    const started = orders.filter((o) => o.source === "web").length;
    const conv = started ? sold.filter((o) => o.source === "web").length / started : 0;

    const group = (keyFn, valFn = (o) => o.total) => { const m = new Map(); sold.forEach((o) => { const k = keyFn(o); const g = m.get(k) || { value: 0, n: 0 }; g.value += valFn(o); g.n++; m.set(k, g); }); return [...m.entries()].sort((a, b) => b[1].value - a[1].value); };
    const byProduct = new Map();
    sold.forEach((o) => o.order_items.forEach((i) => {
      const k = i.product_id || i.name;
      const g = byProduct.get(k) || { name: i.name, qty: 0, value: 0, orders: 0, cat: A.state.products.find((p) => p.id === i.product_id)?.category };
      g.qty += i.qty; g.value += i.line_total; g.orders++; byProduct.set(k, g);
    }));
    const prods = [...byProduct.values()].sort((a, b) => b.value - a.value);
    const byCat = new Map(); prods.forEach((p) => byCat.set(p.cat || "—", (byCat.get(p.cat || "—") || 0) + p.value));
    const WD = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const byWd = WD.map((l, i) => ({ label: l, value: sold.filter((o) => new Date(o.created_at).getDay() === i).reduce((s, o) => s + o.total, 0) }));
    const byHour = Array.from({ length: 24 }, (_, h) => ({ label: `${h}h`, value: sold.filter((o) => new Date(o.created_at).getHours() === h).length }));
    const series = days > 120
      ? (() => { const m = new Map(); sold.forEach((o) => { const d = new Date(o.created_at); const k = `${d.getFullYear()}-${d.getMonth()}`; const g = m.get(k) || { label: `${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][d.getMonth()]}`, value: 0 }; g.value += o.total; m.set(k, g); }); return [...m.values()]; })()
      : A.salesSeries(sold, A.startOfDay(from), days);

    A.render(`<div class="page">
      ${A.head({
        title: "Análisis",
        actions: `<select id="a-r" class="btn" style="width:auto">${Object.entries(PRE).map(([k, l]) => `<option value="${k}" ${k === r ? "selected" : ""}>${l}</option>`).join("")}</select>
          <span id="a-custom" ${r === "custom" ? "" : "hidden"} style="display:inline-flex;gap:6px"><input type="date" id="a-from" value="${A.dayKey(from)}" style="width:auto"><input type="date" id="a-to" value="${A.dayKey(to)}" style="width:auto"><button class="btn" id="a-apply">Ver</button></span>
          <button class="btn" id="a-export">Exportar ventas</button>`,
        sub: `${A.date(from)} – ${A.date(to)} · solo pedidos pagados`,
      })}
      <div class="kpis">
        <div class="kpi"><small>Ventas totales</small><b>${clp(total)}</b><span class="small muted">Productos ${clp(gross)} · Despacho ${clp(ship)}</span></div>
        <div class="kpi"><small>Pedidos</small><b>${num(sold.length)}</b><span class="small muted">${num(units)} unidades</span></div>
        <div class="kpi"><small>Ticket promedio</small><b>${clp(sold.length ? total / sold.length : 0)}</b><span class="small muted">${(sold.length ? units / sold.length : 0).toFixed(1).replace(".", ",")} art. por pedido</span></div>
        <div class="kpi"><small>Clientes</small><b>${num(emails.size)}</b><span class="small muted">${[...emails.values()].filter((n) => n > 1).length} repitieron</span></div>
      </div>
      <div class="kpis">
        <div class="kpi"><small>Descuentos otorgados</small><b>${clp(disc)}</b><span class="small muted">${sold.filter((o) => o.discount > 0).length} pedidos con código</span></div>
        <div class="kpi"><small>Conversión del pago (web)</small><b>${A.pct(conv)}</b><span class="small muted">${started} intentos de pago</span></div>
        <div class="kpi"><small>Despacho / retiro</small><b>${sold.filter((o) => o.delivery_method === "despacho").length} / ${sold.filter((o) => o.delivery_method === "retiro").length}</b></div>
        <div class="kpi"><small>Cancelados</small><b>${orders.filter((o) => o.status === "cancelado").length}</b></div>
      </div>
      <div class="card" style="margin-bottom:16px"><h2 style="margin-bottom:8px">Ventas ${days > 120 ? "por mes" : "por día"}</h2>${A.barChart(series)}</div>
      <div class="cols">
        <div class="stack">
          <div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Productos más vendidos</h2></div>
            <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Producto</th><th class="num">Unidades</th><th class="num">Pedidos</th><th class="num">Ventas</th></tr></thead><tbody>
            ${prods.slice(0, 25).map((p) => `<tr><td>${esc(p.name)}</td><td class="num">${num(p.qty)}</td><td class="num">${p.orders}</td><td class="num"><b>${clp(p.value)}</b></td></tr>`).join("") || `<tr><td colspan="4" class="muted center">Sin ventas</td></tr>`}
            </tbody></table></div></div>
          <div class="card"><h2 style="margin-bottom:10px">Ventas por día de la semana</h2>${A.barChart(byWd, { height: 160 })}</div>
          <div class="card"><h2 style="margin-bottom:10px">Pedidos por hora del día</h2>${A.barChart(byHour, { height: 160, money: false })}</div>
        </div>
        <div class="stack">
          <div class="card"><h2 style="margin-bottom:10px">Por categoría</h2>${A.barsList([...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: esc(A.catName(k) || "Otros"), value: v })))}</div>
          <div class="card"><h2 style="margin-bottom:10px">Por medio de pago</h2>${A.barsList(group((o) => A.PAY[o.payment_method] || o.payment_method).map(([k, g]) => ({ label: esc(k), value: g.value, extra: `${g.n}` })))}</div>
          <div class="card"><h2 style="margin-bottom:10px">Por comuna</h2>${A.barsList(group((o) => (o.delivery_method === "retiro" ? "Retiro en tienda" : o.comuna || "—")).map(([k, g]) => ({ label: esc(k), value: g.value, extra: `${g.n}` })))}</div>
          <div class="card"><h2 style="margin-bottom:10px">Por canal</h2>${A.barsList(group((o) => (o.source === "manual" ? "Panel / tienda física" : "Tienda online")).map(([k, g]) => ({ label: esc(k), value: g.value, extra: `${g.n}` })))}</div>
          <div class="card"><h2 style="margin-bottom:10px">Códigos de descuento</h2>${A.barsList(group((o) => o.discount_code || null, (o) => o.discount).filter(([k]) => k).map(([k, g]) => ({ label: `<span class="mono">${esc(k)}</span>`, value: g.value, extra: `${g.n} usos` })))}</div>
        </div>
      </div></div>`);

    $("#a-r").onchange = (e) => { if (e.target.value === "custom") $("#a-custom").hidden = false; else A.go(`/analisis?r=${e.target.value}`); };
    $("#a-apply")?.addEventListener("click", () => A.go(`/analisis?r=custom&from=${$("#a-from").value}&to=${$("#a-to").value}`));
    $("#a-export").onclick = () => A.csv(`ventas-${A.dayKey(from)}-a-${A.dayKey(to)}.csv`, [
      ["Pedido", "Fecha", "Código producto", "Producto", "Formato", "Cantidad", "Total línea", "Medio de pago", "Canal", "Comuna"],
      ...sold.flatMap((o) => o.order_items.map((i) => [o.number, new Date(o.created_at).toLocaleString("es-CL"), i.sku, i.name, i.variant_label, i.qty, i.line_total, A.PAY[o.payment_method], o.source === "manual" ? "Panel" : "Web", o.delivery_method === "retiro" ? "Retiro" : o.comuna])),
    ]);
  });
})();
