/* =====================================================================
   Panel · Clientes
   ===================================================================== */
(() => {
  const { $, esc, clp, num } = A;
  const PAGE = 50;
  const NO_EMAIL = "sin-correo@planeta4patas.cl";

  A.route("/clientes", "clientes", async () => {
    const [list, notes] = await Promise.all([
      A.q(A.sb.from("admin_customers").select("*").order("last_order_at", { ascending: false }).limit(5000)),
      A.q(A.sb.from("customer_notes").select("email, tags")),
    ]);
    const tagsOf = new Map(notes.map((n) => [n.email, n.tags || []]));
    const st = { q: "", f: "todos", sort: "recent", page: 0 };
    const FILTERS = { todos: "Todos", compradores: "Con compras", recurrentes: "Recurrentes (2+ compras)", vip: "Mejores clientes (top 10%)", sincompra: "Sin compra pagada", inactivos: "Sin comprar hace 60+ días" };
    const sorted = [...list].sort((a, b) => b.total_spent - a.total_spent);
    const vipMin = sorted[Math.max(0, Math.floor(sorted.filter((c) => c.total_spent > 0).length * 0.1) - 1)]?.total_spent || Infinity;

    const visible = () => {
      const now = Date.now();
      const out = list.filter((c) => {
        if (st.f === "compradores" && !c.orders_count) return false;
        if (st.f === "recurrentes" && c.orders_count < 2) return false;
        if (st.f === "vip" && !(c.total_spent >= vipMin && c.total_spent > 0)) return false;
        if (st.f === "sincompra" && c.orders_count) return false;
        if (st.f === "inactivos" && !(c.orders_count && now - new Date(c.last_order_at) > 60 * 864e5)) return false;
        return !st.q || A.match(`${c.name} ${c.email} ${c.phone} ${c.rut || ""} ${c.comuna || ""} ${(tagsOf.get(c.email) || []).join(" ")}`, st.q);
      });
      out.sort((a, b) => st.sort === "spent" ? b.total_spent - a.total_spent : st.sort === "orders" ? b.orders_count - a.orders_count : st.sort === "name" ? String(a.name).localeCompare(b.name, "es") : new Date(b.last_order_at) - new Date(a.last_order_at));
      return out;
    };
    function draw() {
      if (!document.getElementById("c-body")) return;
      const l = visible();
      const pages = Math.max(1, Math.ceil(l.length / PAGE)); st.page = Math.min(st.page, pages - 1);
      $("#c-body").innerHTML = l.length ? l.slice(st.page * PAGE, st.page * PAGE + PAGE).map((c) => `<tr class="click" data-email="${esc(c.email)}">
        <td><div class="pcell"><span class="avatar">${esc(A.initials(c.name))}</span><div><b>${esc(c.name)}</b><small class="muted">${c.email === NO_EMAIL ? "Sin correo" : esc(c.email)}</small>
          ${(tagsOf.get(c.email) || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div></div></td>
        <td class="hide-sm">${esc(c.phone || "")}</td><td class="hide-sm">${esc(c.comuna || "—")}</td>
        <td class="num">${c.orders_count}${c.orders_count >= 2 ? " 🔁" : ""}</td><td class="num"><b>${clp(c.total_spent)}</b></td>
        <td class="hide-sm nowrap">${A.ago(c.last_order_at)}</td></tr>`).join("")
        : `<tr><td colspan="6"><div class="empty-state"><div class="emo">👤</div><h3>${list.length ? "Sin resultados" : "Aún no tienes clientes"}</h3><p>Los clientes aparecen automáticamente con su primer pedido.</p></div></td></tr>`;
      $("#c-pager").innerHTML = pages > 1 ? `<button class="btn btn-sm" data-pg="-1" ${st.page === 0 ? "disabled" : ""}>←</button><span>Página ${st.page + 1} de ${pages} · ${l.length} clientes</span><button class="btn btn-sm" data-pg="1" ${st.page >= pages - 1 ? "disabled" : ""}>→</button>` : `<small class="muted">${l.length} cliente${l.length === 1 ? "" : "s"}</small>`;
    }
    const buyers = list.filter((c) => c.orders_count > 0);
    A.render(`<div class="page">
      ${A.head({ title: "Clientes", actions: `<button class="btn" id="c-export">Exportar</button>` })}
      <div class="kpis">
        <div class="kpi"><small>Clientes</small><b>${num(list.length)}</b></div>
        <div class="kpi"><small>Con compras</small><b>${num(buyers.length)}</b></div>
        <div class="kpi"><small>Recurrentes</small><b>${buyers.length ? A.pct(buyers.filter((c) => c.orders_count >= 2).length / buyers.length) : "0%"}</b></div>
        <div class="kpi"><small>Gasto promedio por cliente</small><b>${clp(buyers.length ? buyers.reduce((s, c) => s + c.total_spent, 0) / buyers.length : 0)}</b></div>
      </div>
      <div class="card flush">
        <div class="toolbar">
          <div class="grow"><input id="c-q" type="search" placeholder="Buscar por nombre, correo, teléfono, RUT, comuna o etiqueta"></div>
          <select id="c-f">${Object.entries(FILTERS).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select>
          <select id="c-sort"><option value="recent">Último pedido</option><option value="spent">Más gasto</option><option value="orders">Más pedidos</option><option value="name">Nombre</option></select>
        </div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cliente</th><th class="hide-sm">Teléfono</th><th class="hide-sm">Comuna</th><th class="num">Pedidos</th><th class="num">Total gastado</th><th class="hide-sm">Último pedido</th></tr></thead><tbody id="c-body"></tbody></table></div>
        <div class="pager" id="c-pager"></div>
      </div></div>`);
    draw();
    $("#c-q").oninput = A.debounce((e) => { st.q = e.target.value; st.page = 0; draw(); }, 150);
    $("#c-f").onchange = (e) => { st.f = e.target.value; st.page = 0; draw(); };
    $("#c-sort").onchange = (e) => { st.sort = e.target.value; draw(); };
    $("#c-pager").onclick = (e) => { const b = e.target.closest("[data-pg]"); if (b) { st.page += +b.dataset.pg; draw(); } };
    $("#c-body").onclick = (e) => { const tr = e.target.closest("[data-email]"); if (tr) A.go(`/clientes/${encodeURIComponent(tr.dataset.email)}`); };
    $("#c-export").onclick = () => A.csv(`clientes-${A.dayKey(new Date())}.csv`, [
      ["Nombre", "Correo", "Teléfono", "RUT", "Comuna", "Dirección", "Pedidos pagados", "Total gastado", "Primer pedido", "Último pedido", "Etiquetas"],
      ...visible().map((c) => [c.name, c.email === NO_EMAIL ? "" : c.email, c.phone, c.rut, c.comuna, c.address, c.orders_count, c.total_spent, A.date(c.first_order_at), A.date(c.last_order_at), (tagsOf.get(c.email) || []).join(", ")]),
    ]);
  });

  A.route("/clientes/:email", "clientes", async ({ email }) => {
    let [c, orders, note] = await Promise.all([
      A.q(A.sb.from("admin_customers").select("*").eq("email", email).maybeSingle()),
      A.q(A.sb.from("orders").select("id, number, status, total, created_at, payment_method, delivery_method, comuna, paid_at, order_items(name, variant_label, qty, product_id)").eq("customer_email", email).order("created_at", { ascending: false })),
      A.q(A.sb.from("customer_notes").select("*").eq("email", email).maybeSingle()),
    ]);
    if (!c) throw new Error("Cliente no encontrado");
    let tags = note?.tags || [];
    const paid = orders.filter((o) => A.SOLD.includes(o.status));
    // Productos que más compra (para recomendar / avisar reposición)
    const fav = new Map();
    paid.forEach((o) => o.order_items.forEach((i) => { const k = `${i.name} · ${i.variant_label || ""}`; fav.set(k, (fav.get(k) || 0) + i.qty); }));
    const favs = [...fav.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const lastFav = favs[0]?.[0];
    const first = (c.name || "").split(" ")[0];

    const draw = () => A.render(`<div class="page">
      ${A.head({
        title: esc(c.name), back: "/clientes",
        sub: `Cliente desde ${A.date(c.first_order_at)}${c.comuna ? ` · ${esc(c.comuna)}` : ""}`,
        actions: `<a class="btn btn-green" target="_blank" rel="noopener" href="${A.wa(c.phone, `¡Hola ${first}! Te escribimos de Planeta 4 Patas 🐾`)}">WhatsApp</a>
          ${lastFav ? `<a class="btn" target="_blank" rel="noopener" href="${A.wa(c.phone, `¡Hola ${first}! 🐾 ¿Cómo va el ${lastFav.split(" · ")[0]}? Si se está acabando te lo podemos llevar esta semana. ¡Avísanos!`)}">🔁 Recordar reposición</a>` : ""}
          <a class="btn btn-primary" href="#/pedidos/nuevo?cliente=${encodeURIComponent(email)}">Crear pedido</a>`,
      })}
      <div class="kpis">
        <div class="kpi"><small>Total gastado</small><b>${clp(c.total_spent)}</b></div>
        <div class="kpi"><small>Pedidos pagados</small><b>${c.orders_count}</b></div>
        <div class="kpi"><small>Ticket promedio</small><b>${clp(c.orders_count ? c.total_spent / c.orders_count : 0)}</b></div>
        <div class="kpi"><small>Último pedido</small><b style="font-size:1.2rem">${A.ago(c.last_order_at)}</b></div>
      </div>
      <div class="cols">
        <div class="stack">
          <div class="card flush"><div class="card-head" style="padding:16px 16px 0"><h2>Pedidos</h2></div>
            <div class="tbl-wrap"><table class="tbl"><tbody>${orders.map((o) => `<tr class="click" data-href="#/pedidos/${o.id}">
              <td><b>#${o.number}</b><br><small class="muted">${A.date(o.created_at)}</small></td>
              <td>${o.order_items.map((i) => `${i.qty}× ${esc(i.name)}`).slice(0, 2).join("<br>")}${o.order_items.length > 2 ? `<br><small class="muted">+${o.order_items.length - 2} más</small>` : ""}</td>
              <td>${A.payBadge(o)}<br>${A.fulfillBadge(o)}</td><td class="num"><b>${clp(o.total)}</b></td></tr>`).join("")}</tbody></table></div></div>
        </div>
        <div class="stack">
          <div class="card"><h2 style="margin-bottom:10px">Contacto</h2>
            ${email !== NO_EMAIL ? `<p style="margin:0 0 4px">✉️ <a href="mailto:${esc(email)}">${esc(email)}</a></p>` : ""}
            <p style="margin:0 0 4px">📱 <a target="_blank" rel="noopener" href="${A.wa(c.phone)}">${esc(c.phone || "")}</a></p>
            ${c.rut ? `<p style="margin:0 0 4px">🪪 RUT ${esc(c.rut)}</p>` : ""}
            ${c.address ? `<p style="margin:0">📍 ${esc(c.address)}${c.comuna ? `, ${esc(c.comuna)}` : ""}</p>` : ""}
          </div>
          <div class="card"><h2 style="margin-bottom:10px">Lo que más compra</h2>
            ${favs.length ? A.barsList(favs.map(([l, q]) => ({ label: esc(l), value: q })), { money: false }) : `<p class="muted" style="margin:0">Sin compras pagadas</p>`}</div>
          <div class="card"><h2 style="margin-bottom:10px">Notas</h2>
            <textarea id="cn-notes" rows="4" placeholder="Ej: tiene 2 gatos, prefiere entregas en la tarde">${esc(note?.notes || "")}</textarea>
            <div style="margin-top:10px">${tags.map((t) => `<span class="tag">${esc(t)}<button data-untag="${esc(t)}" aria-label="Quitar">✕</button></span>`).join("")}</div>
            <form id="cn-tagf" style="display:flex;gap:6px;margin-top:6px"><input id="cn-tag" placeholder="Etiqueta (ej: vip, mayorista)"><button class="btn btn-sm">Agregar</button></form>
            <div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn btn-sm btn-primary" id="cn-save">Guardar notas</button></div>
          </div>
        </div>
      </div></div>`);

    const save = async (msg = "Guardado") => {
      const notes = $("#cn-notes").value.trim() || null;
      try { await A.q(A.sb.from("customer_notes").upsert({ email, notes, tags, updated_at: new Date().toISOString() })); note = { ...(note || {}), notes }; A.toast(msg); }
      catch (err) { A.fail(err); }
    };
    const bind = () => {
      A.$$("[data-href]").forEach((tr) => (tr.onclick = () => (location.hash = tr.dataset.href)));
      $("#cn-save").onclick = () => save("Notas guardadas");
      $("#cn-tagf").onsubmit = async (e) => { e.preventDefault(); const t = $("#cn-tag").value.trim().toLowerCase(); if (t && !tags.includes(t)) { tags = [...tags, t]; await save("Etiqueta agregada"); draw(); bind(); } };
      $("#main").querySelectorAll("[data-untag]").forEach((b) => (b.onclick = async () => { tags = tags.filter((t) => t !== b.dataset.untag); await save("Etiqueta quitada"); draw(); bind(); }));
    };
    draw(); bind();
  });
})();
