/* =====================================================================
   Panel · Pedidos (listado, detalle, crear pedido, impresión)
   ===================================================================== */
(() => {
  const { $, $$, esc, clp, num } = A;

  const TABS = [
    ["todos", "Todos", () => true],
    ["pagado", "Por preparar", (o) => o.status === "pagado"],
    ["preparando", "Preparando", (o) => o.status === "preparando"],
    ["despachado", "Despachados", (o) => o.status === "despachado"],
    ["entregado", "Entregados", (o) => o.status === "entregado"],
    ["transferencias", "Transferencias por confirmar", (o) => o.status === "pendiente_pago" && o.payment_method === "transferencia"],
    ["abandonados", "Pagos no completados", (o) => (o.status === "pendiente_pago" && o.payment_method !== "transferencia") || o.status === "rechazado"],
    ["cancelados", "Cancelados", (o) => o.status === "cancelado"],
  ];
  const RANGE = { 7: "Últimos 7 días", 30: "Últimos 30 días", 90: "Últimos 90 días", 365: "Último año", 0: "Todo" };
  const PAGE = 50;

  // ------------------------------------------------------------ plantillas de WhatsApp
  A.waTemplates = (o) => {
    const s = A.state.settings || {};
    const first = (o.customer_name || "").split(" ")[0];
    const track = `${A.storeUrl()}/?pedido=${o.id}&t=${o.access_token}`;
    const list = [
      ["Saludo", `¡Hola ${first}! Te escribimos de Planeta 4 Patas 🐾 por tu pedido #${o.number}.`],
      ["Pedido confirmado", `¡Hola ${first}! 🐾 Recibimos tu pedido #${o.number} por ${A.clp(o.total)}. Te avisamos cuando vaya en camino. ¡Gracias por preferirnos!`],
      ["Preparando", `¡Hola ${first}! Estamos preparando tu pedido #${o.number} 📦. Pronto te contamos cuando salga.`],
      o.delivery_method === "retiro"
        ? ["Listo para retiro", `¡Hola ${first}! Tu pedido #${o.number} está listo para retiro en ${s.address || "nuestra tienda"} 🏪.${s.hours ? ` Horario: ${s.hours}.` : ""} ¡Te esperamos!`]
        : ["En camino", `¡Hola ${first}! Tu pedido #${o.number} va en camino 🚚${o.delivery_day ? ` (reparto ${o.delivery_day})` : ""}. ¡Que lo disfrute tu mascota!`],
      ["Entregado / gracias", `¡Hola ${first}! Esperamos que tu mascota disfrute su pedido #${o.number} 🐶🐱. Si tienes un minuto, nos encantaría que nos etiquetes en Instagram @${s.instagram || "planeta4patas_tienda"}. ¡Gracias!`],
    ];
    if (o.status === "pendiente_pago" || o.status === "rechazado") {
      list.splice(1, 0, o.payment_method === "transferencia"
        ? ["Datos de transferencia", `¡Hola ${first}! Para completar tu pedido #${o.number} por ${A.clp(o.total)} puedes transferir a:\n${s.transfer_info || "(configura los datos en Configuración → Pagos)"}\nEnvíanos el comprobante por aquí 🙌`]
        : ["Recuperar compra", `¡Hola ${first}! Vimos que tu pedido #${o.number} en Planeta 4 Patas quedó sin pagar. ¿Te ayudamos a completarlo? 🐾 Puedes revisarlo aquí: ${track}`]);
    }
    list.push(["Enlace de seguimiento", `¡Hola ${first}! Puedes ver el estado de tu pedido #${o.number} aquí: ${track}`]);
    return list;
  };

  // ------------------------------------------------------------ impresión (hoja de preparación)
  A.printOrders = (orders) => {
    const s = A.state.settings || {};
    const w = window.open("", "_blank");
    if (!w) return A.toast("Permite las ventanas emergentes para imprimir", true);
    const page = (o) => `<section>
      <header><img src="${location.href.replace(/admin\.html.*$/, "")}assets/logo.jpg" alt=""><div><h1>${esc(s.store_name || "Planeta 4 Patas")}</h1><p>${esc(s.address || "")} · WhatsApp +${esc(s.whatsapp || A.CFG.WHATSAPP || "")}</p></div>
        <div class="num"><b>Pedido #${o.number}</b><br>${A.date(o.created_at)} ${A.time(o.created_at)}</div></header>
      <div class="two"><div><h3>Cliente</h3><p><b>${esc(o.customer_name)}</b><br>${esc(o.customer_phone)}<br>${esc(o.customer_email)}${o.customer_rut ? `<br>RUT ${esc(o.customer_rut)}` : ""}</p></div>
        <div><h3>${o.delivery_method === "despacho" ? "Despacho" : "Retiro en tienda"}</h3><p>${o.delivery_method === "despacho" ? `${esc(o.address || "")}${o.address_detail ? `, ${esc(o.address_detail)}` : ""}<br><b>${esc(o.comuna || "")}</b>${o.delivery_day ? `<br>Reparto: ${esc(o.delivery_day)}` : ""}` : esc(s.address || "")}</p></div></div>
      ${o.notes ? `<p class="note"><b>Comentario del cliente:</b> ${esc(o.notes)}</p>` : ""}
      <table><thead><tr><th>✓</th><th>Producto</th><th>Código</th><th>Cant.</th><th>Total</th></tr></thead><tbody>
      ${(o.order_items || []).filter((i) => i.qty > 0).map((i) => `<tr><td class="box">☐</td><td>${esc(i.name)} · ${esc(i.variant_label || "")}</td><td>${esc(i.sku || "")}</td><td class="c">${i.qty}</td><td class="r">${clp(i.line_total)}</td></tr>`).join("")}
      </tbody><tfoot>
      <tr><td colspan="4" class="r">Subtotal</td><td class="r">${clp(o.subtotal)}</td></tr>
      ${(o.promotions || []).filter((x) => x.amount > 0).map((x) => `<tr><td colspan="4" class="r">${esc(x.name)}</td><td class="r">-${clp(x.amount)}</td></tr>`).join("")}
      ${o.discount ? `<tr><td colspan="4" class="r">Descuento ${esc(o.discount_code || "")}</td><td class="r">-${clp(o.discount)}</td></tr>` : ""}
      <tr><td colspan="4" class="r">Despacho</td><td class="r">${o.shipping ? clp(o.shipping) : "Gratis"}</td></tr>
      <tr class="t"><td colspan="4" class="r">Total</td><td class="r">${clp(o.total)}</td></tr></tfoot></table>
      <p class="foot">Pago: ${esc(A.PAY[o.payment_method] || o.payment_method)} · ${A.isPaid(o) ? "PAGADO" : "PENDIENTE"} &nbsp;·&nbsp; ¡Gracias por tu compra! 🐾</p>
    </section>`;
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Pedidos ${orders.map((o) => "#" + o.number).join(" ")}</title><style>
      body{font-family:Arial,sans-serif;color:#111;margin:0;font-size:13px} section{padding:28px;page-break-after:always;max-width:780px;margin:auto}
      header{display:flex;gap:14px;align-items:center;border-bottom:2px solid #0f2a52;padding-bottom:12px;margin-bottom:14px} header img{width:56px;height:56px;border-radius:50%}
      h1{margin:0;font-size:20px;color:#0f2a52} header p{margin:2px 0 0;color:#555} .num{margin-left:auto;text-align:right;font-size:14px}
      .two{display:grid;grid-template-columns:1fr 1fr;gap:20px} h3{margin:0 0 4px;font-size:12px;text-transform:uppercase;color:#666} p{margin:0 0 10px}
      .note{background:#fff6dd;padding:8px 10px;border-radius:6px} table{width:100%;border-collapse:collapse;margin-top:10px} th,td{padding:7px 6px;border-bottom:1px solid #ddd;text-align:left}
      th{font-size:11px;text-transform:uppercase;color:#666} .r{text-align:right} .c{text-align:center} .box{font-size:16px;width:20px} tfoot td{border:0;padding:4px 6px} .t td{font-weight:bold;font-size:15px;border-top:2px solid #111}
      .foot{margin-top:18px;color:#555;text-align:center}
      </style></head><body>${orders.map(page).join("")}<script>window.onload=()=>{window.print()}<\/script></body></html>`);
    w.document.close();
  };

  // ------------------------------------------------------------ listado
  A.route("/pedidos", (p, q) => (q.f === "abandonados" ? "abandonados" : "pedidos"), async (_, query) => {
    await A.loadSettings();
    const st = { tab: TABS.find((t) => t[0] === query.f) ? query.f : "todos", q: query.q || "", days: query.d != null ? +query.d : 30, page: 0, sel: new Set() };
    let all = [];

    async function load() {
      let req = A.sb.from("orders").select("*, order_items(name, variant_label, sku, qty, line_total)").order("created_at", { ascending: false }).limit(3000);
      if (st.days) req = req.gte("created_at", A.startOfDay(new Date(Date.now() - (st.days - 1) * 864e5)).toISOString());
      all = await A.q(req);
    }
    const searchHay = (o) => `${o.number} ${o.customer_name} ${o.customer_email} ${o.customer_phone} ${o.customer_rut || ""} ${o.comuna || ""} ${o.discount_code || ""} ${(o.tags || []).join(" ")}`;
    const visible = () => {
      const fn = TABS.find((t) => t[0] === st.tab)[2];
      const q = st.q.replace(/^#/, "");
      return all.filter((o) => fn(o) && (!q || A.match(searchHay(o), q)));
    };

    function draw() {
      if (!document.getElementById("o-body")) return;
      const list = visible();
      const pages = Math.max(1, Math.ceil(list.length / PAGE));
      st.page = Math.min(st.page, pages - 1);
      const rows = list.slice(st.page * PAGE, st.page * PAGE + PAGE);
      const allSel = rows.length && rows.every((o) => st.sel.has(o.id));
      $("#o-body").innerHTML = rows.length ? rows.map((o) => `
        <tr class="click ${st.sel.has(o.id) ? "sel" : ""}" data-id="${o.id}">
          <td class="chk"><input type="checkbox" data-sel="${o.id}" ${st.sel.has(o.id) ? "checked" : ""} aria-label="Seleccionar"></td>
          <td><b>#${o.number}</b>${o.source === "manual" ? ` <span title="Creado desde el panel">🧾</span>` : ""}</td>
          <td class="nowrap">${A.dateTime(o.created_at)}</td>
          <td class="nowrap">${esc(o.customer_name)}<br><small class="muted">${esc(o.customer_phone)}</small></td>
          <td class="num"><b>${clp(o.total)}</b></td>
          <td>${A.payBadge(o)}</td>
          <td>${A.fulfillBadge(o)}</td>
          <td class="hide-sm">${o.order_items.reduce((s, i) => s + i.qty, 0)} art.</td>
          <td class="hide-sm nowrap">${A.deliveryText(o)}</td>
          <td class="hide-sm nowrap">${esc(A.PAY[o.payment_method] || o.payment_method)}</td>
        </tr>`).join("")
        : `<tr><td colspan="10"><div class="empty-state"><div class="emo">📭</div><h3>No hay pedidos aquí</h3><p>${st.q ? "Prueba con otra búsqueda." : "Prueba con otro período o pestaña."}</p></div></td></tr>`;
      $("#o-all").checked = !!allSel;
      $$("#o-tabs button").forEach((b) => {
        b.classList.toggle("on", b.dataset.tab === st.tab);
        const fn = TABS.find((t) => t[0] === b.dataset.tab)[2];
        b.querySelector(".c").textContent = all.filter(fn).length;
      });
      $("#o-bulk").hidden = !st.sel.size;
      $("#o-bulk-n").textContent = `${st.sel.size} seleccionado${st.sel.size > 1 ? "s" : ""}`;
      $("#o-pager").innerHTML = pages > 1 ? `<button class="btn btn-sm" data-pg="-1" ${st.page === 0 ? "disabled" : ""}>←</button><span>Página ${st.page + 1} de ${pages} · ${list.length} pedidos</span><button class="btn btn-sm" data-pg="1" ${st.page >= pages - 1 ? "disabled" : ""}>→</button>` : `<small class="muted">${list.length} pedido${list.length === 1 ? "" : "s"}</small>`;
    }

    A.render(`<div class="page">
      ${A.head({ title: "Pedidos", actions: `<button class="btn" id="o-export">Exportar</button><a class="btn btn-primary" href="#/pedidos/nuevo">Crear pedido</a>` })}
      <div class="card flush">
        <div class="tabs" id="o-tabs">${TABS.map(([k, l]) => `<button data-tab="${k}">${l}<span class="c"></span></button>`).join("")}</div>
        <div class="toolbar">
          <div class="grow"><input id="o-q" type="search" placeholder="Buscar por #, nombre, teléfono, correo, RUT o comuna" value="${esc(st.q)}"></div>
          <select id="o-days">${Object.entries(RANGE).map(([k, l]) => `<option value="${k}" ${+k === st.days ? "selected" : ""}>${l}</option>`).join("")}</select>
        </div>
        <div class="bulkbar" id="o-bulk" hidden>
          <b id="o-bulk-n"></b>
          <button class="btn btn-sm" data-bulk="preparando">Marcar preparando</button>
          <button class="btn btn-sm" data-bulk="despachado">Marcar despachados</button>
          <button class="btn btn-sm" data-bulk="entregado">Marcar entregados</button>
          <button class="btn btn-sm" id="o-print">🖨️ Imprimir</button>
          <button class="btn btn-sm btn-plain" id="o-clear">Quitar selección</button>
        </div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th class="chk"><input type="checkbox" id="o-all" aria-label="Seleccionar todos"></th><th>Pedido</th><th>Fecha</th><th>Cliente</th><th class="num">Total</th><th>Pago</th><th>Preparación</th><th class="hide-sm">Artículos</th><th class="hide-sm">Entrega</th><th class="hide-sm">Medio</th></tr></thead>
          <tbody id="o-body"><tr><td colspan="10"><div class="spinner"></div></td></tr></tbody>
        </table></div>
        <div class="pager" id="o-pager"></div>
      </div></div>`);

    await load(); draw();

    $("#o-tabs").onclick = (e) => { const b = e.target.closest("[data-tab]"); if (!b) return; st.tab = b.dataset.tab; st.page = 0; st.sel.clear(); history.replaceState(null, "", `#/pedidos?f=${st.tab}`); draw(); };
    $("#o-q").oninput = A.debounce((e) => { st.q = e.target.value; st.page = 0; draw(); }, 200);
    $("#o-days").onchange = async (e) => { st.days = +e.target.value; st.sel.clear(); $("#o-body").innerHTML = `<tr><td colspan="10"><div class="spinner"></div></td></tr>`; await load(); draw(); };
    $("#o-pager").onclick = (e) => { const b = e.target.closest("[data-pg]"); if (b) { st.page += +b.dataset.pg; draw(); window.scrollTo(0, 0); } };
    $("#o-body").onclick = (e) => {
      const c = e.target.closest("[data-sel]");
      if (c) { c.checked ? st.sel.add(c.dataset.sel) : st.sel.delete(c.dataset.sel); draw(); return; }
      if (e.target.closest(".chk")) return;
      const tr = e.target.closest("tr[data-id]"); if (tr) A.go(`/pedidos/${tr.dataset.id}`);
    };
    $("#o-all").onchange = (e) => { const rows = visible().slice(st.page * PAGE, st.page * PAGE + PAGE); rows.forEach((o) => (e.target.checked ? st.sel.add(o.id) : st.sel.delete(o.id))); draw(); };
    $("#o-clear").onclick = () => { st.sel.clear(); draw(); };
    $("#o-print").onclick = () => A.printOrders(all.filter((o) => st.sel.has(o.id)));
    $$("[data-bulk]").forEach((b) => (b.onclick = async () => {
      const status = b.dataset.bulk;
      const ids = all.filter((o) => st.sel.has(o.id) && A.SOLD.includes(o.status)).map((o) => o.id);
      const skipped = st.sel.size - ids.length;
      if (!ids.length) return A.toast("Solo se pueden mover pedidos pagados", true);
      try {
        await A.q(A.sb.from("orders").update({ status }).in("id", ids));
        all.forEach((o) => { if (ids.includes(o.id)) o.status = status; });
        st.sel.clear(); draw(); A.refreshBadges();
        A.toast(`${ids.length} pedido${ids.length > 1 ? "s" : ""} actualizado${ids.length > 1 ? "s" : ""}${skipped ? ` · ${skipped} sin pagar omitido${skipped > 1 ? "s" : ""}` : ""}`);
      } catch (err) { A.fail(err); }
    }));
    $("#o-export").onclick = () => {
      const list = st.sel.size ? all.filter((o) => st.sel.has(o.id)) : visible();
      A.csv(`pedidos-${A.dayKey(new Date())}.csv`, [
        ["Pedido", "Fecha", "Estado", "Canal", "Cliente", "RUT", "Correo", "Teléfono", "Entrega", "Comuna", "Dirección", "Día reparto", "Medio de pago", "Productos", "Subtotal", "Descuento", "Código", "Despacho", "Total", "Comentario cliente", "Notas internas"],
        ...list.map((o) => [o.number, new Date(o.created_at).toLocaleString("es-CL"), A.STATUS[o.status], o.source === "manual" ? "Panel" : "Web", o.customer_name, o.customer_rut, o.customer_email, o.customer_phone,
          o.delivery_method === "despacho" ? "Despacho" : "Retiro", o.comuna, [o.address, o.address_detail].filter(Boolean).join(", "), o.delivery_day, A.PAY[o.payment_method],
          o.order_items.filter((i) => i.qty > 0).map((i) => `${i.qty} x ${i.name} ${i.variant_label || ""}${i.sku ? ` [${i.sku}]` : ""}`).join(" | "),
          o.subtotal, o.discount, o.discount_code, o.shipping, o.total, o.notes, o.admin_notes]),
      ]);
    };
  });

  // ------------------------------------------------------------ crear pedido
  A.route("/pedidos/nuevo", "pedidos-nuevo", async (_, query) => {
    const [settings] = await Promise.all([A.loadSettings(), A.loadCatalog()]);
    const st = { lines: [], customer: { name: "", email: "", phone: "", rut: "" }, delivery: "retiro", comuna: "", address: "", detail: "", day: "", notes: "",
      discount: 0, shipping: 0, shipTouched: false, payment: "efectivo", paid: true };
    if (query.cliente) {
      const c = await A.q(A.sb.from("admin_customers").select("*").eq("email", query.cliente).maybeSingle());
      if (c) st.customer = { name: c.name || "", email: c.email, phone: c.phone || "", rut: c.rut || "" };
    }
    const variants = [];
    A.state.products.forEach((p) => A.liveVariants(p).forEach((v) => variants.push({ p, v })));
    const zones = settings.delivery_zones || [];

    const sub = () => st.lines.reduce((s, l) => s + l.price * l.qty, 0);
    const autoShip = () => st.delivery === "despacho" ? (sub() >= settings.free_shipping_from ? 0 : settings.shipping_fee) : 0;

    function drawLines() {
      if (!st.shipTouched) st.shipping = autoShip();
      $("#n-lines").innerHTML = st.lines.length ? `<table class="tbl"><thead><tr><th>Producto</th><th style="width:90px">Cant.</th><th style="width:130px">Precio</th><th class="num">Total</th><th></th></tr></thead><tbody>
        ${st.lines.map((l, i) => `<tr><td><div class="pcell">${A.thumb(l.p.image_url, A.catEmoji(l.p.category))}<div><b>${esc(l.p.name)}</b><small class="muted">${esc(l.v.label)}${l.v.sku ? ` · ${esc(l.v.sku)}` : ""}${l.v.stock != null ? ` · stock ${l.v.stock}` : ""}</small></div></div></td>
          <td><input type="number" min="1" value="${l.qty}" data-qty="${i}"></td>
          <td><div class="prefix"><span>$</span><input type="number" min="0" value="${l.price}" data-price="${i}"></div>${l.price !== l.v.price ? `<small class="muted">Lista: ${clp(l.v.price)}</small>` : ""}</td>
          <td class="num"><b>${clp(l.price * l.qty)}</b></td><td><button class="btn btn-plain danger btn-sm" data-rm="${i}" aria-label="Quitar">✕</button></td></tr>`).join("")}
        </tbody></table>` : `<div class="empty-state" style="padding:20px"><p>Busca y agrega productos al pedido</p></div>`;
      drawTotals();
    }
    function drawTotals() {
      const s = sub(), total = Math.max(0, s - st.discount) + st.shipping;
      $("#n-sub").textContent = clp(s);
      $("#n-total").textContent = clp(total);
      $("#n-ship").value = st.shipping;
      $("#n-submit").disabled = !st.lines.length;
      $("#n-submit").textContent = `Crear pedido · ${clp(total)}`;
    }

    A.render(`<div class="page">
      ${A.head({ title: "Crear pedido", back: "/pedidos", sub: "Para ventas en el local, por WhatsApp o teléfono. El stock se descuenta al marcarlo como pagado." })}
      <div class="cols">
        <div class="stack">
          <div class="card"><h2 style="margin-bottom:10px">Productos</h2>
            <div style="position:relative;display:flex;gap:6px"><input id="n-search" type="search" placeholder="Buscar producto, marca o código…" autocomplete="off" style="flex:1"><button type="button" class="btn" id="n-scan" title="Escanear código de barras">📷</button>
            <div class="gs-results" id="n-results" hidden style="z-index:5"></div></div>
            <div id="n-lines" style="margin-top:12px"></div>
          </div>
          <div class="card"><h2 style="margin-bottom:10px">Pago</h2>
            <dl class="kv" style="align-items:center">
              <dt>Subtotal</dt><dd id="n-sub">$0</dd>
              <dt>Descuento</dt><dd><div class="prefix" style="max-width:160px;margin-left:auto"><span>-$</span><input id="n-disc" type="number" min="0" value="0"></div></dd>
              <dt>Despacho</dt><dd><div class="prefix" style="max-width:160px;margin-left:auto"><span>$</span><input id="n-ship" type="number" min="0" value="0"></div></dd>
              <dt><b>Total</b></dt><dd><b id="n-total" style="font-size:1.2rem">$0</b></dd>
            </dl>
            <div class="sep"></div>
            <div class="row2">
              <label class="f">Medio de pago<select id="n-pay">${["efectivo", "transferencia", "mercadopago", "webpay", "otro"].map((k) => `<option value="${k}">${A.PAY[k]}</option>`).join("")}</select></label>
              <label class="f">Estado del pago<select id="n-paid"><option value="1">Pago recibido</option><option value="0">Pago pendiente</option></select></label>
            </div>
          </div>
        </div>
        <div class="stack">
          <div class="card"><h2 style="margin-bottom:10px">Cliente</h2>
            <div style="position:relative"><input id="n-csearch" type="search" placeholder="Buscar cliente existente…" autocomplete="off"><div class="gs-results" id="n-cresults" hidden style="z-index:5"></div></div>
            <div style="margin-top:10px">
              <label class="f">Nombre<input id="n-name" value="${esc(st.customer.name)}" placeholder="Cliente en tienda"></label>
              <label class="f">Teléfono<input id="n-phone" type="tel" value="${esc(st.customer.phone)}" placeholder="+56 9…"></label>
              <label class="f">Correo<input id="n-email" type="email" value="${esc(st.customer.email)}" placeholder="opcional"></label>
              <label class="f">RUT<input id="n-rut" value="${esc(st.customer.rut)}" placeholder="opcional"></label>
            </div>
          </div>
          <div class="card"><h2 style="margin-bottom:10px">Entrega</h2>
            <label class="f"><select id="n-del"><option value="retiro">🏪 Retiro / venta en tienda</option><option value="despacho">🚚 Despacho a domicilio</option></select></label>
            <div id="n-shipfields" hidden>
              <label class="f">Comuna<select id="n-comuna">${zones.map((z) => `<option>${esc(z.comuna)}</option>`).join("")}<option value="__otra">Otra…</option></select></label>
              <label class="f" id="n-comuna-otra-wrap" hidden>Otra comuna<input id="n-comuna-otra"></label>
              <label class="f">Dirección<input id="n-address"></label>
              <label class="f">Depto / referencia<input id="n-detail"></label>
              <label class="f">Día de reparto<input id="n-day"></label>
            </div>
            <label class="f">Notas<textarea id="n-notes" rows="2" placeholder="Visible en el pedido"></textarea></label>
          </div>
          <button class="btn btn-orange" id="n-submit" disabled style="padding:12px">Crear pedido</button>
          <p class="form-error" id="n-error"></p>
        </div>
      </div></div>`);

    drawLines();

    // búsqueda de productos
    const res = $("#n-results");
    const showResults = () => {
      const q = $("#n-search").value.trim();
      if (!q) { res.hidden = true; return; }
      const hits = variants.filter(({ p, v }) => A.match(`${p.name} ${p.brand || ""} ${v.label} ${v.sku || ""} ${v.barcode || ""}`, q)).slice(0, 12);
      res.innerHTML = hits.length ? hits.map(({ p, v }, i) => `<a href="javascript:void 0" data-i="${variants.indexOf(hits[i])}">${A.thumb(p.image_url, A.catEmoji(p.category))}<div style="flex:1"><b>${esc(p.name)}</b><br><small class="muted">${esc(v.label)}${v.sku ? ` · ${esc(v.sku)}` : ""} · ${v.stock == null ? "sin control" : `stock ${v.stock}`}${!p.active ? " · oculto" : ""}</small></div><b>${clp(v.price)}</b></a>`).join("") : `<p class="muted" style="padding:10px;margin:0">Sin resultados</p>`;
      res.hidden = false;
    };
    $("#n-search").oninput = showResults;
    $("#n-search").onfocus = showResults;
    res.onmousedown = (e) => {
      const a = e.target.closest("[data-i]"); if (!a) return;
      e.preventDefault();
      const { p, v } = variants[+a.dataset.i];
      const ex = st.lines.find((l) => l.v.id === v.id);
      if (ex) ex.qty++; else st.lines.push({ p, v, qty: 1, price: v.price });
      $("#n-search").value = ""; res.hidden = true; drawLines(); $("#n-search").focus();
    };
    $("#n-search").onblur = () => setTimeout(() => (res.hidden = true), 150);
    $("#n-scan").onclick = async () => {
      // Escaneo continuo: cada producto leído se agrega al pedido
      while (true) {
        const code = await A.scan("Escanear producto para el pedido");
        if (!code) break;
        const hit = A.findByCode(code);
        if (!hit) { A.toast(`No hay ningún producto con el código ${code}`, true); continue; }
        const ex = st.lines.find((l) => l.v.id === hit.v.id);
        if (ex) ex.qty++; else st.lines.push({ p: hit.p, v: hit.v, qty: 1, price: hit.v.price });
        drawLines(); A.toast(`＋ ${hit.p.name} ${hit.v.label}`);
      }
    };
    $("#n-lines").oninput = (e) => {
      const q = e.target.dataset.qty, pr = e.target.dataset.price;
      if (q != null) st.lines[+q].qty = Math.max(1, A.int(e.target.value) || 1);
      if (pr != null) st.lines[+pr].price = Math.max(0, A.int(e.target.value) || 0);
      if (!st.shipTouched) st.shipping = autoShip();
      drawTotals();
      const row = e.target.closest("tr"); const i = +(q ?? pr);
      row.querySelector(".num b").textContent = clp(st.lines[i].price * st.lines[i].qty);
    };
    $("#n-lines").onclick = (e) => { const b = e.target.closest("[data-rm]"); if (b) { st.lines.splice(+b.dataset.rm, 1); drawLines(); } };
    $("#n-disc").oninput = (e) => { st.discount = Math.max(0, A.int(e.target.value) || 0); drawTotals(); };
    $("#n-ship").oninput = (e) => { st.shipping = Math.max(0, A.int(e.target.value) || 0); st.shipTouched = true; drawTotals(); };

    // clientes
    const cres = $("#n-cresults");
    $("#n-csearch").oninput = A.debounce(async (e) => {
      const q = e.target.value.trim();
      if (q.length < 2) { cres.hidden = true; return; }
      const safe = q.replace(/[%,()]/g, " ");
      const list = await A.q(A.sb.from("admin_customers").select("*").or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`).limit(8)).catch(() => []);
      cres.innerHTML = list.length ? list.map((c, i) => `<a href="javascript:void 0" data-c="${i}"><span class="avatar">${esc(A.initials(c.name))}</span><div><b>${esc(c.name)}</b><br><small class="muted">${esc(c.email)} · ${esc(c.phone || "")}</small></div></a>`).join("") : `<p class="muted" style="padding:10px;margin:0">Sin resultados</p>`;
      cres.hidden = false;
      cres.onmousedown = (ev) => {
        const a = ev.target.closest("[data-c]"); if (!a) return; ev.preventDefault();
        const c = list[+a.dataset.c];
        $("#n-name").value = c.name || ""; $("#n-phone").value = c.phone || ""; $("#n-email").value = c.email || ""; $("#n-rut").value = c.rut || "";
        if (c.address) { $("#n-address").value = c.address; }
        if (c.comuna && zones.some((z) => z.comuna === c.comuna)) $("#n-comuna").value = c.comuna;
        $("#n-csearch").value = ""; cres.hidden = true;
      };
    }, 250);
    $("#n-csearch").onblur = () => setTimeout(() => (cres.hidden = true), 150);

    // entrega
    const syncDelivery = () => {
      st.delivery = $("#n-del").value;
      $("#n-shipfields").hidden = st.delivery !== "despacho";
      const z = zones.find((x) => x.comuna === $("#n-comuna").value);
      $("#n-comuna-otra-wrap").hidden = $("#n-comuna").value !== "__otra";
      if (z && !$("#n-day").dataset.touched) $("#n-day").value = (z.dias || []).join(" / ");
      if (!st.shipTouched) st.shipping = autoShip();
      drawTotals();
    };
    $("#n-del").onchange = syncDelivery; $("#n-comuna").onchange = syncDelivery;
    $("#n-day").oninput = (e) => (e.target.dataset.touched = "1");
    syncDelivery();

    $("#n-submit").onclick = async () => {
      const btn = $("#n-submit"); btn.disabled = true; $("#n-error").textContent = "";
      const comuna = $("#n-comuna").value === "__otra" ? $("#n-comuna-otra").value : $("#n-comuna").value;
      const payload = {
        customer_name: $("#n-name").value, customer_email: $("#n-email").value, customer_phone: $("#n-phone").value, customer_rut: $("#n-rut").value,
        delivery_method: st.delivery, comuna: st.delivery === "despacho" ? comuna : null, address: st.delivery === "despacho" ? $("#n-address").value : null,
        address_detail: st.delivery === "despacho" ? $("#n-detail").value : null, delivery_day: st.delivery === "despacho" ? $("#n-day").value : null,
        notes: $("#n-notes").value, shipping: st.shipping, discount: st.discount, payment_method: $("#n-pay").value, paid: $("#n-paid").value === "1",
        items: st.lines.map((l) => ({ variant_id: l.v.id, qty: l.qty, unit_price: l.price })),
      };
      if (payload.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.customer_email)) { $("#n-error").textContent = "El correo no es válido"; btn.disabled = false; return; }
      try {
        const r = await A.rpc("create_manual_order", { p: payload });
        A.state.products = null; // el stock pudo cambiar
        A.toast(`Pedido #${r.number} creado`);
        A.refreshBadges();
        A.go(`/pedidos/${r.id}`);
      } catch (err) { $("#n-error").textContent = err.message; btn.disabled = false; }
    };
  });

  // ------------------------------------------------------------ detalle
  A.route("/pedidos/:id", "pedidos", async ({ id }) => {
    const [settings] = await Promise.all([A.loadSettings(), A.loadCatalog()]);
    let o, events, returns;
    const load = async () => {
      [o, events, returns] = await Promise.all([
        A.q(A.sb.from("orders").select("*, order_items(*)").eq("id", id).single()),
        A.q(A.sb.from("order_events").select("*").eq("order_id", id).order("created_at", { ascending: false })),
        A.q(A.sb.from("order_returns").select("*").eq("order_id", id).order("created_at", { ascending: false })).catch(() => []),
      ]);
      o.order_items = o.order_items.filter((i) => i.qty > 0);
    };
    await load();

    const productOf = (i) => (A.state.products || []).find((p) => p.id === i.product_id);
    const fb = () => (["pagado", "preparando", "despachado", "entregado"].includes(o.status) ? A.fulfillBadge(o) : "");

    function draw() {
      const pd = o.payment_detail || {};
      const next = {
        pagado: ["preparando", "📦 Marcar como preparando"],
        preparando: ["despachado", o.delivery_method === "retiro" ? "🏪 Marcar listo para retiro" : "🚚 Marcar como despachado"],
        despachado: ["entregado", "✅ Marcar como entregado"],
      }[o.status];
      const payInfo = [
        pd.provider === "mercadopago" && `Mercado Pago · ID ${esc(pd.payment_id)}${pd.installments > 1 ? ` · ${pd.installments} cuotas` : ""}${pd.card ? ` · **** ${esc(pd.card)}` : ""}`,
        pd.provider === "webpay" && `Webpay${pd.env === "integration" ? " (PRUEBA)" : ""} · Aut. ${esc(pd.authorization_code || "-")}${pd.card ? ` · **** ${esc(pd.card)}` : ""}${pd.installments > 0 ? ` · ${pd.installments} cuotas` : ""}`,
        pd.provider === "manual" && `Registrado a mano${pd.by ? ` por ${esc(pd.by)}` : ""}${pd.note ? ` · ${esc(pd.note)}` : ""}`,
      ].find(Boolean);
      const mapQ = encodeURIComponent(`${o.address || ""}, ${o.comuna || ""}, Chile`);
      const custHref = `#/clientes/${encodeURIComponent(o.customer_email.toLowerCase())}`;

      A.render(`<div class="page">
        ${A.head({
          title: `#${o.number}`, back: "/pedidos",
          badges: ` ${A.payBadge(o)} ${fb()}`,
          sub: `${A.date(o.created_at)} a las ${A.time(o.created_at)} · ${o.source === "manual" ? "Creado desde el panel" : "Tienda online"}`,
          actions: `<button class="btn" id="d-print">🖨️ Imprimir</button>
            <div class="dd"><button class="btn btn-green" id="d-wa">WhatsApp ▾</button><div class="dd-menu" id="d-wa-menu" hidden>${A.waTemplates(o).map(([l, t]) => `<a target="_blank" rel="noopener" href="${A.wa(o.customer_phone, t)}">${esc(l)}</a>`).join("")}</div></div>
            <div class="dd"><button class="btn" id="d-more">Más acciones ▾</button><div class="dd-menu" id="d-more-menu" hidden>
              <button id="d-copy">🔗 Copiar enlace de seguimiento</button>
              <a href="#/pedidos/nuevo?cliente=${encodeURIComponent(o.customer_email)}">🧾 Nuevo pedido para este cliente</a>
              ${["pendiente_pago", "pagado", "preparando"].includes(o.status) ? `<button id="d-edit">✏️ Editar productos</button>` : ""}
              ${o.paid_at && o.status !== "cancelado" ? `<button id="d-return">↩️ Devolución o cambio</button>` : ""}
              ${o.status !== "cancelado" ? `<button id="d-status">✏️ Cambiar estado manualmente</button><button class="danger" id="d-cancel">✕ Cancelar pedido</button>` : ""}
            </div></div>`,
        })}
        ${o.status === "cancelado" ? `<div class="banner bad"><span>✕</span><div><b>Pedido cancelado${o.cancelled_at ? ` el ${A.date(o.cancelled_at)}` : ""}</b>${esc(o.cancel_reason || "")}${o.paid_at ? "<br>Este pedido estaba pagado: si corresponde, realiza la devolución desde Mercado Pago / Transbank." : ""}</div></div>` : ""}
        ${o.status === "pendiente_pago" && o.payment_method === "transferencia" ? `<div class="banner warn"><span>🏦</span><div><b>Esperando transferencia</b>Cuando recibas el dinero, registra el pago para descontar stock y pasarlo a "Por preparar".</div><div class="actions"><button class="btn btn-sm btn-orange" id="d-markpaid2">Registrar pago</button></div></div>` : ""}
        ${o.status === "pendiente_pago" && o.payment_method !== "transferencia" && Date.now() - new Date(o.created_at) > 3600e3 ? `<div class="banner info"><span>🛒</span><div><b>El cliente no completó el pago</b>Escríbele por WhatsApp con la plantilla "Recuperar compra".</div></div>` : ""}
        ${o.status === "pendiente_pago" && o.reserved_until ? `<div class="banner info"><span>📦</span><div><b>Stock reservado hasta el ${A.date(o.reserved_until)} a las ${A.time(o.reserved_until)}</b>Si el pago no llega antes, el stock vuelve a quedar disponible automáticamente.</div></div>` : ""}
        ${["pendiente_pago", "rechazado"].includes(o.status) && !o.stock_applied && o.source === "web" ? `<div class="banner"><span>ℹ️</span><div>La reserva de stock de este pedido ya se liberó. Si el pago llega igual, el stock se descontará en ese momento.</div></div>` : ""}
        ${o.refunded ? `<div class="banner warn"><span>↩️</span><div><b>Reembolsado: ${clp(o.refunded)}</b>${o.refunded >= o.total ? "Reembolso total." : `De un total de ${clp(o.total)}.`}</div></div>` : ""}
        ${pd.env === "integration" ? `<div class="banner warn"><span>🧪</span><div><b>Pago de PRUEBA (Webpay integración)</b>No hubo cobro real.</div></div>` : ""}
        <div class="cols">
          <div class="stack">
            <div class="card">
              <div class="card-head"><h2>${fb()} <span style="margin-left:6px">${o.order_items.reduce((s, i) => s + i.qty, 0)} artículo${o.order_items.reduce((s, i) => s + i.qty, 0) === 1 ? "" : "s"}</span></h2></div>
              <div class="tbl-wrap"><table class="tbl"><tbody>${o.order_items.map((i) => { const p = productOf(i); return `<tr>
                <td><div class="pcell">${A.thumb(p?.image_url, A.catEmoji(p?.category))}<div>${p ? `<a href="#/productos/${p.id}"><b>${esc(i.name)}</b></a>` : `<b>${esc(i.name)}</b>`}<small class="muted">${esc(i.variant_label || "")}${i.sku ? ` · ${esc(i.sku)}` : ""}</small></div></div></td>
                <td class="num">${clp(i.unit_price)} × ${i.qty}</td><td class="num"><b>${clp(i.line_total)}</b></td></tr>`; }).join("")}</tbody></table></div>
              ${next ? `<div class="sep"></div><div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" id="d-next" data-to="${next[0]}">${next[1]}</button></div>` : ""}
            </div>
            <div class="card">
              <div class="card-head"><h2>${A.payBadge(o)}</h2></div>
              <dl class="kv">
                <dt>Subtotal</dt><dd>${clp(o.subtotal)}</dd>
                ${(o.promotions || []).filter((x) => x.amount > 0).map((x) => `<dt>🎁 ${esc(x.name)}</dt><dd>-${clp(x.amount)}</dd>`).join("")}
                ${(o.promotions || []).filter((x) => x.free_shipping).map((x) => `<dt>🎁 ${esc(x.name)}</dt><dd>✓</dd>`).join("")}
                ${o.discount ? `<dt>Descuento ${o.discount_code ? `<span class="tag">${esc(o.discount_code)}</span>` : ""}</dt><dd>-${clp(o.discount)}</dd>` : ""}
                <dt>Despacho</dt><dd>${o.delivery_method === "despacho" ? (o.shipping ? clp(o.shipping) : "Gratis") : "Retiro"}</dd>
                <dt><b>Total</b></dt><dd><b>${clp(o.total)}</b></dd>
                <dt>Medio de pago</dt><dd>${esc(A.PAY[o.payment_method] || o.payment_method)}</dd>
                ${o.paid_at ? `<dt>Pagado</dt><dd>${A.date(o.paid_at)} ${A.time(o.paid_at)}</dd>` : ""}
                ${o.refunded ? `<dt>Reembolsado</dt><dd style="color:var(--red)">-${clp(o.refunded)}</dd><dt><b>Neto</b></dt><dd><b>${clp(o.total - o.refunded)}</b></dd>` : ""}
              </dl>
              ${payInfo ? `<p class="muted small" style="margin:10px 0 0">${payInfo}</p>` : ""}
              ${["pendiente_pago", "rechazado"].includes(o.status) ? `<div class="sep"></div><div style="display:flex;justify-content:flex-end"><button class="btn btn-orange" id="d-markpaid">Registrar pago recibido</button></div>` : ""}
            </div>
            ${returns.length ? `<div class="card"><h2 style="margin-bottom:10px">Devoluciones y cambios</h2>
              ${returns.map((r) => `<div class="ret"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>${r.kind === "cambio" ? "🔄 Cambio" : "↩️ Devolución"} · ${A.date(r.created_at)}</b>${r.refund_amount ? `<b>${clp(r.refund_amount)}${r.refund_method ? ` · ${esc(r.refund_method)}` : ""}</b>` : ""}</div>
                <small class="muted">${r.items.map((i) => `${i.qty} × ${esc(i.name)} ${esc(i.variant_label || "")}`).join(", ")}${r.restock ? " · stock repuesto" : ""}${r.reason ? ` · ${esc(r.reason)}` : ""}${r.actor ? ` · ${esc(r.actor)}` : ""}</small></div>`).join("")}</div>` : ""}
            <div class="card"><h2 style="margin-bottom:12px">Historial</h2>
              <form class="note-box" id="d-note-form"><input id="d-note" placeholder="Escribe un comentario (solo lo ve tu equipo)…"><button class="btn btn-primary">Publicar</button></form>
              <ul class="timeline">${events.map((e) => `<li class="k-${esc(e.kind)}">${esc(e.message)}<small>${A.dateTime(e.created_at)}${e.actor ? ` · ${esc(e.actor)}` : ""}</small></li>`).join("") || `<li>Sin eventos</li>`}</ul>
            </div>
          </div>
          <div class="stack">
            <div class="card"><div class="card-head"><h2>Notas</h2></div>
              <textarea id="d-anotes" rows="3" placeholder="Notas internas del pedido">${esc(o.admin_notes || "")}</textarea>
              <div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn btn-sm" id="d-anotes-save" hidden>Guardar nota</button></div>
              ${o.notes ? `<div class="sep"></div><b>Comentario del cliente</b><p style="margin:4px 0 0">${esc(o.notes)}</p>` : ""}
            </div>
            <div class="card"><div class="card-head"><h2>Cliente</h2></div>
              <div class="pcell" style="margin-bottom:10px"><span class="avatar">${esc(A.initials(o.customer_name))}</span><div><a href="${custHref}"><b>${esc(o.customer_name)}</b></a><small class="muted" id="d-cust-count"></small></div></div>
              <p style="margin:0 0 4px">✉️ <a href="mailto:${esc(o.customer_email)}">${esc(o.customer_email)}</a></p>
              <p style="margin:0 0 4px">📱 <a target="_blank" rel="noopener" href="${A.wa(o.customer_phone)}">${esc(o.customer_phone)}</a></p>
              ${o.customer_rut ? `<p style="margin:0">🪪 RUT ${esc(o.customer_rut)}</p>` : ""}
            </div>
            <div class="card"><div class="card-head"><h2>Entrega</h2></div>
              ${o.delivery_method === "despacho" ? `<p style="margin:0 0 6px"><b>🚚 Despacho a domicilio</b></p>
                <p style="margin:0">${esc(o.address || "")}${o.address_detail ? `<br>${esc(o.address_detail)}` : ""}<br><b>${esc(o.comuna || "")}</b></p>
                ${o.delivery_day ? `<p class="muted" style="margin:6px 0 0">📅 Reparto: ${esc(o.delivery_day)}</p>` : ""}
                <p style="margin:8px 0 0"><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${mapQ}">Ver en mapa ↗</a> · <a target="_blank" rel="noopener" href="https://waze.com/ul?q=${mapQ}">Waze ↗</a></p>`
                : `<p style="margin:0"><b>🏪 Retiro en tienda</b><br>${esc(settings.address || "")}</p>`}
            </div>
            <div class="card"><div class="card-head"><h2>Etiquetas</h2></div>
              <div id="d-tags">${(o.tags || []).map((t) => `<span class="tag">${esc(t)}<button data-untag="${esc(t)}" aria-label="Quitar">✕</button></span>`).join("") || `<span class="muted small">Sin etiquetas</span>`}</div>
              <form id="d-tag-form" style="display:flex;gap:6px;margin-top:8px"><input id="d-tag" placeholder="Ej: regalo, mayorista"><button class="btn btn-sm">Agregar</button></form>
            </div>
          </div>
        </div></div>`);
      bind();
    }

    const refresh = async (msg) => { await Promise.all([load(), A.loadCatalog()]); draw(); if (msg) A.toast(msg); A.refreshBadges(); };
    const setStatus = async (status) => {
      try { await A.q(A.sb.from("orders").update({ status }).eq("id", o.id)); await refresh(`Pedido marcado como ${A.STATUS[status].toLowerCase()}`); }
      catch (err) { A.fail(err); }
    };
    const markPaid = async () => {
      const r = await A.ask({
        title: "Registrar pago recibido", ok: "Registrar pago",
        intro: `Confirma que recibiste <b>${clp(o.total)}</b>. El stock se descontará y el pedido pasará a "Por preparar".`,
        fields: [{ name: "note", label: "Referencia (opcional)", placeholder: "Ej: transferencia BancoEstado 14:05" }],
      });
      if (!r) return;
      try { await A.rpc("admin_mark_paid", { p_order: o.id, p_note: r.note || null }); A.state.products = null; await refresh("Pago registrado"); }
      catch (err) { A.fail(err); }
    };

    // ---- Editar productos del pedido (antes del despacho)
    async function editItems() {
      const lines = o.order_items.map((i) => ({ variant_id: i.variant_id, name: i.name, label: i.variant_label, qty: i.qty, price: i.unit_price }));
      let shipping = o.shipping;
      const m = A.modal({
        title: `Editar productos · #${o.number}`, wide: true,
        body: `<div id="ei-lines"></div><button type="button" class="btn btn-sm" id="ei-add" style="margin-top:8px">＋ Agregar producto</button>
          <div class="sep"></div>
          <div class="row2"><label class="f">Despacho<div class="prefix"><span>$</span><input id="ei-ship" type="number" min="0" value="${shipping}"></div></label>
          <label class="f">Motivo <small>Queda en el historial</small><input id="ei-reason" placeholder="Ej: cliente cambió el tamaño"></label></div>
          <div id="ei-total" class="banner info" style="margin-top:8px"></div>
          ${o.stock_applied ? `<p class="help">El stock se ajusta automáticamente según los cambios.</p>` : ""}<p class="form-error" id="ei-err"></p>`,
        foot: `<button class="btn" data-x>Cancelar</button><button class="btn btn-primary" id="ei-save">Guardar cambios</button>`,
      });
      const drawTotal = () => {
        const sub = lines.reduce((s, l) => s + l.qty * l.price, 0);
        const total = Math.max(0, sub - Math.min(o.promo_discount, sub) - Math.min(o.discount, sub)) + shipping;
        const diff = total - o.total;
        m.el.querySelector("#ei-total").innerHTML = `<span>🧾</span><div><b>Nuevo total: ${clp(total)}</b>${diff && o.paid_at ? (diff > 0 ? `Debes cobrar ${clp(diff)} adicionales al cliente.` : `Debes devolver ${clp(-diff)} al cliente.`) : `Antes: ${clp(o.total)}`}</div>`;
      };
      const draw = () => {
        m.el.querySelector("#ei-lines").innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th class="num">Total</th><th></th></tr></thead><tbody>
          ${lines.map((l, i) => `<tr><td><b>${esc(l.name)}</b><br><small class="muted">${esc(l.label || "")}</small></td>
            <td><div class="prefix" style="max-width:120px"><span>$</span><input type="number" min="0" data-price="${i}" value="${l.price}"></div></td>
            <td><input type="number" min="0" data-qty="${i}" value="${l.qty}" style="width:70px"></td>
            <td class="num"><b data-lt="${i}">${clp(l.qty * l.price)}</b></td><td><button type="button" class="btn btn-plain danger btn-sm" data-del="${i}" aria-label="Quitar">✕</button></td></tr>`).join("")}</tbody></table></div>`;
        drawTotal();
      };
      draw();
      m.el.querySelector("#ei-lines").addEventListener("input", (e) => {
        const q = e.target.dataset.qty, pr = e.target.dataset.price, i = q ?? pr;
        if (i == null) return;
        if (q != null) lines[+q].qty = Math.max(0, A.int(e.target.value) || 0);
        if (pr != null) lines[+pr].price = Math.max(0, A.int(e.target.value) || 0);
        m.el.querySelector(`[data-lt="${i}"]`).textContent = clp(lines[+i].qty * lines[+i].price);
        drawTotal();
      });
      m.el.querySelector("#ei-lines").addEventListener("click", (e) => { const b = e.target.closest("[data-del]"); if (b) { lines.splice(+b.dataset.del, 1); draw(); } });
      m.el.querySelector("#ei-ship").oninput = (e) => { shipping = Math.max(0, A.int(e.target.value) || 0); drawTotal(); };
      m.el.querySelector("#ei-add").onclick = async () => {
        const hit = await A.pickVariant();
        if (!hit) return;
        const ex = lines.find((l) => l.variant_id === hit.v.id);
        if (ex) ex.qty++; else lines.push({ variant_id: hit.v.id, name: hit.p.name, label: hit.v.label, qty: 1, price: hit.v.price });
        draw();
      };
      m.el.querySelector("#ei-save").onclick = async () => {
        const items = lines.filter((l) => l.qty > 0 && l.variant_id).map((l) => ({ variant_id: l.variant_id, qty: l.qty, unit_price: l.price }));
        if (!items.length) { m.el.querySelector("#ei-err").textContent = "El pedido debe tener al menos un producto. Para anularlo usa Cancelar pedido."; return; }
        try {
          await A.rpc("edit_order_items", { p_order: o.id, p_items: items, p_shipping: shipping, p_reason: m.el.querySelector("#ei-reason").value.trim() || null });
          m.close(); A.state.products = null; await refresh("Pedido actualizado");
        } catch (err) { m.el.querySelector("#ei-err").textContent = err.message; }
      };
    }

    // ---- Devolución o cambio
    async function registerReturn() {
      const done = {};
      returns.forEach((r) => r.items.forEach((i) => (done[i.variant_id] = (done[i.variant_id] || 0) + i.qty)));
      const items = o.order_items.map((i) => ({ ...i, max: i.qty - (done[i.variant_id] || 0) })).filter((i) => i.max > 0 && i.variant_id);
      if (!items.length) return A.toast("Todos los productos de este pedido ya fueron devueltos", true);
      const canMp = o.payment_method === "mercadopago" && o.payment_detail?.payment_id && A.state.settings?.mp_configured;
      const left = o.total - (o.refunded || 0);
      const m = A.modal({
        title: `Devolución o cambio · #${o.number}`, wide: true,
        body: `<div class="row2"><label class="f">Tipo<select id="rt-kind"><option value="devolucion">↩️ Devolución (el cliente devuelve productos)</option><option value="cambio">🔄 Cambio (por otro producto o tamaño)</option></select></label>
            <label class="f">Motivo<select id="rt-reason">${["Producto dañado o vencido", "Tamaño o sabor equivocado", "A la mascota no le gustó", "Error en el despacho", "Arrepentimiento", "Otro"].map((x) => `<option>${x}</option>`).join("")}</select></label></div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Producto</th><th class="num">Comprado</th><th>Devuelve</th></tr></thead><tbody>
          ${items.map((i, k) => `<tr><td><b>${esc(i.name)}</b><br><small class="muted">${esc(i.variant_label || "")} · ${clp(i.unit_price)} c/u</small></td><td class="num">${i.max}</td>
            <td><input type="number" min="0" max="${i.max}" value="0" data-rq="${k}" style="width:80px"></td></tr>`).join("")}</tbody></table></div>
          <label class="check"><input type="checkbox" id="rt-restock" checked> Volver a sumar al stock (el producto está en buen estado)</label>
          <div class="sep"></div>
          <div class="row2"><label class="f">Reembolso <small>Quedan ${clp(left)} por reembolsar</small><div class="prefix"><span>$</span><input id="rt-amount" type="number" min="0" max="${left}" value="0"></div></label>
            <label class="f">Cómo se devuelve el dinero<select id="rt-method">
              ${canMp ? `<option value="mp">Mercado Pago (automático a la tarjeta del cliente)</option>` : ""}
              <option value="Transferencia">Transferencia</option><option value="Efectivo">Efectivo</option><option value="Nota de crédito">Nota de crédito / saldo a favor</option><option value="">Sin reembolso (cambio)</option></select></label></div>
          <p class="form-error" id="rt-err"></p>`,
        foot: `<button class="btn" data-x>Cancelar</button><button class="btn btn-primary" id="rt-save">Registrar</button>`,
      });
      const qtys = () => items.map((i, k) => ({ i, q: Math.min(i.max, Math.max(0, A.int(m.el.querySelector(`[data-rq="${k}"]`).value) || 0)) }));
      let touched = false;
      m.el.querySelector("#rt-amount").oninput = () => (touched = true);
      m.el.addEventListener("input", (e) => {
        if (!e.target.dataset.rq || touched) return;
        m.el.querySelector("#rt-amount").value = Math.min(left, qtys().reduce((s, x) => s + x.q * x.i.unit_price, 0));
      });
      m.el.querySelector("#rt-kind").onchange = (e) => { if (e.target.value === "cambio") { m.el.querySelector("#rt-method").value = ""; m.el.querySelector("#rt-amount").value = 0; touched = true; } };
      m.el.querySelector("#rt-save").onclick = async () => {
        const err = m.el.querySelector("#rt-err");
        const sel = qtys().filter((x) => x.q > 0);
        if (!sel.length) { err.textContent = "Indica cuántas unidades devuelve"; return; }
        const amount = Math.min(left, Math.max(0, A.int(m.el.querySelector("#rt-amount").value) || 0));
        let method = m.el.querySelector("#rt-method").value;
        const btn = m.el.querySelector("#rt-save"); btn.disabled = true;
        try {
          if (method === "mp" && amount > 0) {
            if (!(await A.confirm({ title: "Reembolsar por Mercado Pago", message: `Se devolverán <b>${clp(amount)}</b> a la tarjeta del cliente. Esta acción no se puede deshacer.`, ok: "Reembolsar", danger: true }))) { btn.disabled = false; return; }
            const { data, error } = await A.sb.functions.invoke("admin-tools", { body: { action: "mp_refund", order_id: o.id, amount } });
            if (error || !data?.ok) throw new Error(data?.error || error?.message || "Mercado Pago rechazó el reembolso");
            method = "Mercado Pago";
          }
          await A.rpc("register_return", { p: {
            order_id: o.id, kind: m.el.querySelector("#rt-kind").value, restock: m.el.querySelector("#rt-restock").checked,
            items: sel.map((x) => ({ variant_id: x.i.variant_id, qty: x.q })), refund_amount: method === "" ? 0 : amount,
            refund_method: method || null, reason: m.el.querySelector("#rt-reason").value } });
          m.close(); A.state.products = null; await refresh("Devolución registrada");
        } catch (e2) { err.textContent = e2.message; btn.disabled = false; }
      };
    }

    function bind() {
      A.dropdown($("#d-wa"), $("#d-wa-menu"));
      A.dropdown($("#d-more"), $("#d-more-menu"));
      $("#d-print").onclick = () => A.printOrders([o]);
      $("#d-copy").onclick = async () => {
        const url = `${A.storeUrl()}/?pedido=${o.id}&t=${o.access_token}`;
        try { await navigator.clipboard.writeText(url); A.toast("Enlace copiado"); } catch { prompt("Copia el enlace:", url); }
      };
      $("#d-next")?.addEventListener("click", (e) => setStatus(e.currentTarget.dataset.to));
      $("#d-markpaid")?.addEventListener("click", markPaid);
      $("#d-markpaid2")?.addEventListener("click", markPaid);
      $("#d-status")?.addEventListener("click", async () => {
        const opts = (A.isPaid(o) ? ["pagado", "preparando", "despachado", "entregado"] : ["pendiente_pago", "rechazado"]).map((k) => [k, A.STATUS[k]]);
        const r = await A.ask({ title: "Cambiar estado", fields: [{ name: "status", label: "Nuevo estado", type: "select", options: opts, value: o.status }],
          intro: A.isPaid(o) ? "" : "Para marcar un pedido como pagado usa <b>Registrar pago recibido</b> (así se descuenta el stock)." });
        if (r && r.status !== o.status) setStatus(r.status);
      });
      $("#d-cancel")?.addEventListener("click", async () => {
        const r = await A.ask({
          title: `Cancelar pedido #${o.number}`, ok: "Cancelar pedido", danger: true,
          intro: o.paid_at ? "⚠️ Este pedido está pagado. La devolución del dinero debes hacerla desde Mercado Pago o Transbank." : "",
          fields: [
            { name: "reason", label: "Motivo", type: "select", options: [["Cliente cambió de opinión", "Cliente cambió de opinión"], ["Sin stock", "Sin stock"], ["Pago no recibido", "Pago no recibido"], ["Pedido de prueba", "Pedido de prueba"], ["Otro", "Otro"]] },
            { name: "restock", label: "Reponer el stock de los productos", type: "checkbox", value: true },
          ],
        });
        if (!r) return;
        try { await A.rpc("cancel_order", { p_order: o.id, p_restock: r.restock, p_reason: r.reason }); A.state.products = null; await refresh("Pedido cancelado"); }
        catch (err) { A.fail(err); }
      });
      $("#d-edit")?.addEventListener("click", editItems);
      $("#d-return")?.addEventListener("click", registerReturn);
      $("#d-note-form").onsubmit = async (e) => {
        e.preventDefault();
        const msg = $("#d-note").value.trim(); if (!msg) return;
        try { await A.q(A.sb.from("order_events").insert({ order_id: o.id, kind: "note", message: msg, actor: A.state.user?.email })); await refresh(); }
        catch (err) { A.fail(err); }
      };
      $("#d-anotes").oninput = () => ($("#d-anotes-save").hidden = false);
      $("#d-anotes-save").onclick = async () => {
        try { await A.q(A.sb.from("orders").update({ admin_notes: $("#d-anotes").value.trim() || null }).eq("id", o.id)); $("#d-anotes-save").hidden = true; A.toast("Nota guardada"); }
        catch (err) { A.fail(err); }
      };
      const saveTags = async (tags) => {
        try { await A.q(A.sb.from("orders").update({ tags }).eq("id", o.id)); o.tags = tags; draw(); } catch (err) { A.fail(err); }
      };
      $("#d-tag-form").onsubmit = (e) => { e.preventDefault(); const t = $("#d-tag").value.trim().toLowerCase(); if (t && !(o.tags || []).includes(t)) saveTags([...(o.tags || []), t]); };
      $("#d-tags").onclick = (e) => { const b = e.target.closest("[data-untag]"); if (b) saveTags((o.tags || []).filter((t) => t !== b.dataset.untag)); };
      A.q(A.sb.from("admin_customers").select("orders_count, total_spent").eq("email", o.customer_email.toLowerCase()).maybeSingle())
        .then((c) => { if (c && $("#d-cust-count")) $("#d-cust-count").textContent = `${c.orders_count} pedido${c.orders_count === 1 ? "" : "s"} · ${clp(c.total_spent)}`; }).catch(() => {});
    }
    draw();
  });
})();
