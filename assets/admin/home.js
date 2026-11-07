/* =====================================================================
   Panel · Inicio (resumen del negocio)
   ===================================================================== */
(() => {
  const { $, esc, clp, num } = A;

  const RANGES = { hoy: ["Hoy", 1], "7d": ["Últimos 7 días", 7], "30d": ["Últimos 30 días", 30], "90d": ["Últimos 90 días", 90] };

  A.salesSeries = (orders, from, days) => {
    const map = new Map();
    for (let i = 0; i < days; i++) { const d = new Date(from); d.setDate(d.getDate() + i); map.set(A.dayKey(d), { label: A.dateShort(d), value: 0, n: 0 }); }
    orders.forEach((o) => { const k = A.dayKey(o.created_at); const p = map.get(k); if (p) { p.value += o.total; p.n++; } });
    return [...map.values()];
  };

  A.route("/", "inicio", async (_, q) => {
    const range = RANGES[q.r] ? q.r : "7d";
    const [label, days] = RANGES[range];
    const to = new Date();
    const from = A.startOfDay(new Date(Date.now() - (days - 1) * 864e5));
    const prevFrom = new Date(from - days * 864e5);

    const [settings] = await Promise.all([A.loadSettings(), A.loadCatalog()]);
    const [orders, toPrepare, transfers, abandoned] = await Promise.all([
      A.q(A.sb.from("orders").select("id, number, status, total, discount, created_at, customer_name, payment_method, delivery_method, comuna, order_items(name, variant_label, qty, line_total, product_id)")
        .gte("created_at", prevFrom.toISOString()).order("created_at", { ascending: false }).limit(5000)),
      A.q(A.sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "pagado")),
      A.q(A.sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "pendiente_pago").eq("payment_method", "transferencia")),
      A.q(A.sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "pendiente_pago").neq("payment_method", "transferencia")
        .lt("created_at", new Date(Date.now() - 3600e3).toISOString()).gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString())),
    ]);

    const sold = (o) => A.SOLD.includes(o.status);
    const cur = orders.filter((o) => new Date(o.created_at) >= from && sold(o));
    const prev = orders.filter((o) => new Date(o.created_at) < from && sold(o));
    const sum = (l) => l.reduce((s, o) => s + o.total, 0);
    const delta = (a, b) => {
      if (!b) return a ? `<span class="delta up">nuevo</span>` : "";
      const d = (a - b) / b;
      return `<span class="delta ${d >= 0 ? "up" : "down"}">${d >= 0 ? "▲" : "▼"} ${A.pct(Math.abs(d))}</span>`;
    };
    const units = (l) => l.reduce((s, o) => s + o.order_items.reduce((t, i) => t + i.qty, 0), 0);

    // Más vendidos
    const top = new Map();
    cur.forEach((o) => o.order_items.forEach((i) => {
      const k = i.product_id || i.name;
      const t = top.get(k) || { label: esc(i.name), value: 0, qty: 0 };
      t.value += i.line_total; t.qty += i.qty; top.set(k, t);
    }));
    const topRows = [...top.values()].sort((a, b) => b.value - a.value).slice(0, 6).map((t) => ({ ...t, extra: `${t.qty} u.` }));

    // Inventario y catálogo
    const low = [];
    A.state.products.filter((p) => p.active).forEach((p) => A.liveVariants(p).forEach((v) => { if (v.stock != null && v.stock <= A.lowStock()) low.push(v); }));
    const noPhoto = A.state.products.filter((p) => p.active && !p.image_url).length;

    const hour = new Date().getHours();
    const hi = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
    const name = (A.state.user?.email || "").split("@")[0];

    const payReady = (settings.mp_enabled && settings.mp_configured) || (settings.webpay_enabled && (settings.webpay_env === "integration" || settings.webpay_configured)) || settings.transfer_enabled;

    const todo = [
      toPrepare && [`#/pedidos?f=pagado`, "📦", `<b>${toPrepare} pedido${toPrepare > 1 ? "s" : ""}</b> por preparar`, toPrepare],
      transfers && [`#/pedidos?f=transferencias`, "🏦", `<b>${transfers} transferencia${transfers > 1 ? "s" : ""}</b> por confirmar`, transfers],
      abandoned && [`#/pedidos?f=abandonados`, "🛒", `<b>${abandoned}</b> pago${abandoned > 1 ? "s" : ""} no completado${abandoned > 1 ? "s" : ""} (últimos 7 días) · recupéralos por WhatsApp`, abandoned],
      low.length && [`#/inventario?f=bajo`, "⚠️", `<b>${low.length} formato${low.length > 1 ? "s" : ""}</b> con stock bajo`, low.length],
      noPhoto && [`#/productos?f=sinfoto`, "📷", `<b>${noPhoto} producto${noPhoto > 1 ? "s" : ""}</b> sin foto`, noPhoto],
    ].filter(Boolean);

    A.render(`<div class="page">
      ${A.head({
        title: `${hi}${name ? `, ${esc(name)}` : ""} 🐾`,
        actions: `<select id="h-range" class="btn" style="width:auto">${Object.entries(RANGES).map(([k, [l]]) => `<option value="${k}" ${k === range ? "selected" : ""}>${l}</option>`).join("")}</select>
          <a class="btn btn-primary" href="#/pedidos/nuevo">+ Crear pedido</a>`,
      })}
      ${!payReady ? `<div class="banner warn"><span>💳</span><div><b>Activa un medio de pago para empezar a vender</b>Conecta tu cuenta de Mercado Pago en un minuto.</div><div class="actions"><a class="btn btn-sm btn-orange" href="#/configuracion/pagos">Conectar Mercado Pago</a></div></div>` : ""}
      <div class="kpis">
        <div class="kpi"><small>Ventas · ${label.toLowerCase()}</small><b>${clp(sum(cur))}</b>${delta(sum(cur), sum(prev))}</div>
        <div class="kpi"><small>Pedidos pagados</small><b>${num(cur.length)}</b>${delta(cur.length, prev.length)}</div>
        <div class="kpi"><small>Ticket promedio</small><b>${clp(cur.length ? sum(cur) / cur.length : 0)}</b>${delta(cur.length ? sum(cur) / cur.length : 0, prev.length ? sum(prev) / prev.length : 0)}</div>
        <div class="kpi"><small>Unidades vendidas</small><b>${num(units(cur))}</b>${delta(units(cur), units(prev))}</div>
      </div>
      <div class="cols">
        <div class="stack">
          <div class="card"><div class="card-head"><h2>Ventas por día</h2><a href="#/analisis">Ver análisis →</a></div>
            ${A.barChart(A.salesSeries(cur, from, days))}</div>
          <div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Pedidos recientes</h2><a href="#/pedidos">Ver todos →</a></div>
            ${orders.filter((o) => new Date(o.created_at) >= from).length ? `<div class="tbl-wrap"><table class="tbl"><tbody>${orders.filter((o) => new Date(o.created_at) >= from).slice(0, 8).map((o) => `
              <tr class="click" data-href="#/pedidos/${o.id}"><td><b>#${o.number}</b><br><small class="muted">${A.dateTime(o.created_at)}</small></td>
              <td>${esc(o.customer_name)}<br><small class="muted">${A.deliveryText(o)}</small></td>
              <td>${A.payBadge(o)}</td><td class="num"><b>${clp(o.total)}</b></td></tr>`).join("")}</tbody></table></div>`
              : `<div class="empty-state"><div class="emo">📭</div><h3>Aún no hay pedidos en este período</h3><p>Cuando alguien compre en tu tienda lo verás aquí al instante.</p></div>`}
          </div>
        </div>
        <div class="stack">
          <div class="card"><h2 style="margin-bottom:12px">Por hacer</h2>
            <div class="todo">${todo.length ? todo.map(([href, ico, txt]) => `<a href="${href}"><span>${ico}</span><span>${txt}</span><span class="n">→</span></a>`).join("") : `<p class="muted" style="margin:0">¡Todo al día! 🎉</p>`}</div>
          </div>
          <div class="card"><h2 style="margin-bottom:12px">Más vendidos</h2>${A.barsList(topRows)}</div>
          <div class="card"><h2 style="margin-bottom:8px">Tu tienda</h2>
            <dl class="kv"><dt>Productos visibles</dt><dd>${A.state.products.filter((p) => p.active).length}</dd>
            <dt>Ocultos</dt><dd>${A.state.products.filter((p) => !p.active).length}</dd>
            <dt>Despacho</dt><dd>${clp(settings.shipping_fee)} · gratis desde ${clp(settings.free_shipping_from)}</dd></dl>
            <div class="sep"></div>
            <a class="btn btn-sm" href="./" target="_blank" rel="noopener">Ver tienda online ↗</a>
          </div>
        </div>
      </div></div>`);

    $("#h-range").onchange = (e) => A.go(`/?r=${e.target.value}`);
    A.$$("[data-href]").forEach((tr) => (tr.onclick = () => (location.hash = tr.dataset.href)));
  });
})();
