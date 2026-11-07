/* =====================================================================
   Panel · Productos, inventario y categorías
   ===================================================================== */
(() => {
  const { $, $$, esc, clp, num } = A;
  const PAGE = 50;

  const stockInfo = (p) => {
    const vs = A.liveVariants(p);
    const tracked = vs.filter((v) => v.stock != null);
    if (!vs.length) return ["Sin formatos", "b-red"];
    if (!tracked.length) return ["Sin control de stock", "muted"];
    const total = tracked.reduce((s, v) => s + v.stock, 0);
    const out = tracked.filter((v) => v.stock <= 0).length;
    if (total <= 0) return ["Agotado", "b-red"];
    const txt = `${num(total)} en stock${vs.length > 1 ? ` · ${vs.length} formatos` : ""}`;
    return [out ? `${txt} (${out} agotado${out > 1 ? "s" : ""})` : txt, tracked.some((v) => v.stock <= A.lowStock()) ? "b-amber" : ""];
  };
  const priceRange = (p) => {
    const ps = A.liveVariants(p).map((v) => v.price);
    if (!ps.length) return "—";
    const mn = Math.min(...ps), mx = Math.max(...ps);
    return mn === mx ? clp(mn) : `${clp(mn)} – ${clp(mx)}`;
  };
  const TABS = [
    ["todos", "Todos", () => true],
    ["visibles", "Visibles", (p) => p.active],
    ["ocultos", "Ocultos", (p) => !p.active],
    ["destacados", "Destacados", (p) => p.featured],
    ["sinfoto", "Sin foto", (p) => !p.image_url],
    ["ofertas", "En oferta", (p) => A.liveVariants(p).some((v) => v.compare_at_price > v.price)],
    ["stock", "Stock bajo o agotado", (p) => A.liveVariants(p).some((v) => v.stock != null && v.stock <= A.lowStock())],
  ];

  // ------------------------------------------------------------ listado
  A.route("/productos", "productos", async (_, query) => {
    await Promise.all([A.loadSettings(), A.loadCatalog(true)]);
    const st = { tab: TABS.find((t) => t[0] === query.f) ? query.f : "todos", q: query.q || "", cat: "", brand: "", sort: "name", page: 0, sel: new Set() };
    const brands = [...new Set(A.state.products.map((p) => p.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));

    const visible = () => {
      const fn = TABS.find((t) => t[0] === st.tab)[2];
      const list = A.state.products.filter((p) => fn(p) && (!st.cat || p.category === st.cat) && (!st.brand || p.brand === st.brand) &&
        (!st.q || A.match(`${p.name} ${p.brand || ""} ${(p.tags || []).join(" ")} ${p.product_variants.map((v) => `${v.sku || ""} ${v.label}`).join(" ")}`, st.q)));
      const minP = (p) => Math.min(...A.liveVariants(p).map((v) => v.price), Infinity);
      const stockT = (p) => A.liveVariants(p).reduce((s, v) => s + (v.stock ?? 9999), 0);
      list.sort((a, b) => st.sort === "price-asc" ? minP(a) - minP(b) : st.sort === "price-desc" ? minP(b) - minP(a)
        : st.sort === "stock" ? stockT(a) - stockT(b) : st.sort === "recent" ? new Date(b.created_at) - new Date(a.created_at) : a.name.localeCompare(b.name, "es"));
      return list;
    };

    function draw() {
      if (!document.getElementById("p-body")) return;
      const list = visible();
      const pages = Math.max(1, Math.ceil(list.length / PAGE));
      st.page = Math.min(st.page, pages - 1);
      const rows = list.slice(st.page * PAGE, st.page * PAGE + PAGE);
      $("#p-body").innerHTML = rows.length ? rows.map((p) => {
        const [stxt, scls] = stockInfo(p);
        return `<tr class="click ${st.sel.has(p.id) ? "sel" : ""}" data-id="${p.id}">
          <td class="chk"><input type="checkbox" data-sel="${p.id}" ${st.sel.has(p.id) ? "checked" : ""} aria-label="Seleccionar"></td>
          <td><div class="pcell">${A.thumb(p.image_url, A.catEmoji(p.category))}<div><b>${esc(p.name)}</b><small class="muted">${esc(p.brand || "")}${p.featured ? " · ⭐ destacado" : ""}</small></div></div></td>
          <td>${p.active ? A.badge("Visible", "b-green") : A.badge("Oculto", "b-gray")}</td>
          <td class="${scls === "muted" ? "muted" : ""}">${scls && scls !== "muted" ? A.badge(stxt, scls) : esc(stxt)}</td>
          <td class="hide-sm">${esc(A.catName(p.category))}</td>
          <td class="num">${priceRange(p)}</td>
        </tr>`;
      }).join("") : `<tr><td colspan="6"><div class="empty-state"><div class="emo">🔎</div><h3>No hay productos con estos filtros</h3></div></td></tr>`;
      $("#p-all").checked = rows.length && rows.every((p) => st.sel.has(p.id));
      $$("#p-tabs button").forEach((b) => { b.classList.toggle("on", b.dataset.tab === st.tab); b.querySelector(".c").textContent = A.state.products.filter(TABS.find((t) => t[0] === b.dataset.tab)[2]).length; });
      $("#p-bulk").hidden = !st.sel.size;
      $("#p-bulk-n").textContent = `${st.sel.size} seleccionado${st.sel.size > 1 ? "s" : ""}`;
      $("#p-pager").innerHTML = pages > 1 ? `<button class="btn btn-sm" data-pg="-1" ${st.page === 0 ? "disabled" : ""}>←</button><span>Página ${st.page + 1} de ${pages} · ${list.length} productos</span><button class="btn btn-sm" data-pg="1" ${st.page >= pages - 1 ? "disabled" : ""}>→</button>` : `<small class="muted">${list.length} producto${list.length === 1 ? "" : "s"}</small>`;
    }

    A.render(`<div class="page">
      ${A.head({ title: "Productos", actions: `<div class="dd"><button class="btn" id="p-io">Importar / exportar ▾</button><div class="dd-menu" id="p-io-menu" hidden>
          <button id="p-export">⬇️ Exportar catálogo (CSV)</button><button id="p-import">⬆️ Actualizar precios y stock desde CSV</button><button id="p-photos">🖼️ Copiar fotos externas a la tienda</button></div></div>
        <a class="btn btn-primary" href="#/productos/nuevo">Agregar producto</a>` })}
      <div class="card flush">
        <div class="tabs" id="p-tabs">${TABS.map(([k, l]) => `<button data-tab="${k}">${l}<span class="c"></span></button>`).join("")}</div>
        <div class="toolbar">
          <div class="grow"><input id="p-q" type="search" placeholder="Buscar por nombre, marca, etiqueta o código" value="${esc(st.q)}"></div>
          <select id="p-cat"><option value="">Todas las categorías</option>${A.state.categories.map((c) => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join("")}</select>
          <select id="p-brand"><option value="">Todas las marcas</option>${brands.map((b) => `<option>${esc(b)}</option>`).join("")}</select>
          <select id="p-sort"><option value="name">Nombre A–Z</option><option value="recent">Más recientes</option><option value="price-asc">Precio menor</option><option value="price-desc">Precio mayor</option><option value="stock">Menos stock</option></select>
        </div>
        <div class="bulkbar" id="p-bulk" hidden>
          <b id="p-bulk-n"></b>
          <button class="btn btn-sm" data-bulk="show">Mostrar</button>
          <button class="btn btn-sm" data-bulk="hide">Ocultar</button>
          <button class="btn btn-sm" data-bulk="feature">⭐ Destacar</button>
          <button class="btn btn-sm" data-bulk="unfeature">Quitar destacado</button>
          <button class="btn btn-sm" data-bulk="category">Cambiar categoría</button>
          <button class="btn btn-sm" data-bulk="price">Ajustar precios</button>
          <button class="btn btn-sm btn-plain danger" data-bulk="delete">Eliminar</button>
        </div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th class="chk"><input type="checkbox" id="p-all" aria-label="Seleccionar todos"></th><th>Producto</th><th>Estado</th><th>Inventario</th><th class="hide-sm">Categoría</th><th class="num">Precio</th></tr></thead>
          <tbody id="p-body"></tbody></table></div>
        <div class="pager" id="p-pager"></div>
      </div></div>`);
    draw();

    A.dropdown($("#p-io"), $("#p-io-menu"));
    $("#p-tabs").onclick = (e) => { const b = e.target.closest("[data-tab]"); if (!b) return; st.tab = b.dataset.tab; st.page = 0; st.sel.clear(); draw(); };
    $("#p-q").oninput = A.debounce((e) => { st.q = e.target.value; st.page = 0; draw(); }, 150);
    $("#p-cat").onchange = (e) => { st.cat = e.target.value; st.page = 0; draw(); };
    $("#p-brand").onchange = (e) => { st.brand = e.target.value; st.page = 0; draw(); };
    $("#p-sort").onchange = (e) => { st.sort = e.target.value; draw(); };
    $("#p-pager").onclick = (e) => { const b = e.target.closest("[data-pg]"); if (b) { st.page += +b.dataset.pg; draw(); window.scrollTo(0, 0); } };
    $("#p-body").onclick = (e) => {
      const c = e.target.closest("[data-sel]");
      if (c) { c.checked ? st.sel.add(c.dataset.sel) : st.sel.delete(c.dataset.sel); draw(); return; }
      if (e.target.closest(".chk")) return;
      const tr = e.target.closest("tr[data-id]"); if (tr) A.go(`/productos/${tr.dataset.id}`);
    };
    $("#p-all").onchange = (e) => { visible().slice(st.page * PAGE, st.page * PAGE + PAGE).forEach((p) => (e.target.checked ? st.sel.add(p.id) : st.sel.delete(p.id))); draw(); };

    const ids = () => [...st.sel];
    const reload = async (msg) => { await A.loadCatalog(true); st.sel.clear(); draw(); A.toast(msg); };
    $$("[data-bulk]").forEach((b) => (b.onclick = async () => {
      const kind = b.dataset.bulk;
      try {
        if (kind === "show" || kind === "hide") { await A.q(A.sb.from("products").update({ active: kind === "show" }).in("id", ids())); return reload(kind === "show" ? "Productos visibles en la tienda" : "Productos ocultos"); }
        if (kind === "feature" || kind === "unfeature") { await A.q(A.sb.from("products").update({ featured: kind === "feature" }).in("id", ids())); return reload("Listo"); }
        if (kind === "category") {
          const r = await A.ask({ title: "Cambiar categoría", fields: [{ name: "cat", label: "Nueva categoría", type: "select", options: A.state.categories.map((c) => [c.slug, c.name]) }], ok: "Cambiar" });
          if (!r) return;
          await A.q(A.sb.from("products").update({ category: r.cat }).in("id", ids())); return reload("Categoría actualizada");
        }
        if (kind === "price") {
          const r = await A.ask({
            title: `Ajustar precios de ${st.sel.size} producto${st.sel.size > 1 ? "s" : ""}`, ok: "Aplicar",
            intro: "Se aplica a todos los formatos. El resultado se redondea a la decena terminada en 90 (ej: $12.490).",
            fields: [
              { name: "mode", label: "Tipo de ajuste", type: "select", options: [["up", "Subir %"], ["down", "Bajar %"], ["sale", "Poner en oferta (% de descuento, guarda precio anterior)"], ["unsale", "Quitar oferta (volver al precio anterior)"]] },
              { name: "pct", label: "Porcentaje", type: "number", value: "10", min: 0 },
            ],
          });
          if (!r) return;
          const pct = Math.max(0, +r.pct || 0) / 100;
          const round90 = (n) => Math.max(90, Math.round(n / 100) * 100 - 10);
          const vs = A.state.products.filter((p) => st.sel.has(p.id)).flatMap((p) => A.liveVariants(p));
          const changes = vs.map((v) => {
            if (r.mode === "up") return { id: v.id, price: round90(v.price * (1 + pct)) };
            if (r.mode === "down") return { id: v.id, price: round90(v.price * (1 - pct)) };
            if (r.mode === "sale") { const base = v.compare_at_price > v.price ? v.compare_at_price : v.price; return { id: v.id, price: round90(base * (1 - pct)), compare_at_price: base }; }
            return v.compare_at_price > v.price ? { id: v.id, price: v.compare_at_price, compare_at_price: null } : null;
          }).filter(Boolean);
          if (!(await A.confirm({ title: "Confirmar ajuste", message: `Se modificarán ${changes.length} precios. Ejemplo: ${vs[0] ? `${clp(vs[0].price)} → ${clp(changes[0]?.price ?? vs[0].price)}` : ""}`, ok: "Aplicar" }))) return;
          for (const c of changes) { const { id, ...patch } = c; await A.q(A.sb.from("product_variants").update(patch).eq("id", id)); }
          return reload(`${changes.length} precios actualizados`);
        }
        if (kind === "delete") {
          if (!(await A.confirm({ title: `Eliminar ${st.sel.size} producto${st.sel.size > 1 ? "s" : ""}`, message: "Esta acción no se puede deshacer. Los pedidos antiguos conservan el nombre y precio.<br><br>Si solo quieres sacarlos de la tienda, mejor usa <b>Ocultar</b>.", ok: "Eliminar", danger: true }))) return;
          await A.q(A.sb.from("products").delete().in("id", ids())); return reload("Productos eliminados");
        }
      } catch (err) { A.fail(err); }
    }));

    $("#p-export").onclick = () => {
      const rows = [["Código", "Producto", "Formato", "Marca", "Categoría", "Mascota", "Etapa", "Precio", "Precio antes", "Stock", "Visible", "Destacado", "Foto"]];
      A.state.products.forEach((p) => A.liveVariants(p).forEach((v) => rows.push([v.sku, p.name, v.label, p.brand, A.catName(p.category), p.species, p.life_stage, v.price, v.compare_at_price, v.stock ?? "", p.active ? "sí" : "no", p.featured ? "sí" : "no", p.image_url])));
      A.csv(`catalogo-${A.dayKey(new Date())}.csv`, rows);
    };
    $("#p-import").onclick = () => importCsv(reload);
    $("#p-photos").onclick = async () => {
      if (!(await A.confirm({ title: "Copiar fotos a la tienda", message: "Las fotos enlazadas desde otros sitios se copiarán a tu propio almacenamiento, así no dependes de esos sitios.", ok: "Copiar fotos" }))) return;
      A.toast("Copiando fotos… puede tardar un minuto");
      const { data, error } = await A.sb.functions.invoke("import-images");
      if (error) return A.fail(error);
      reload(`${data.copied} fotos copiadas${data.failed.length ? ` · ${data.failed.length} no se pudieron copiar` : ""}`);
    };
  });

  // Actualización masiva de precios y stock por código (SKU) desde CSV / Excel
  function importCsv(done) {
    const m = A.modal({
      title: "Actualizar precios y stock desde CSV", wide: true,
      body: `<p style="margin-top:0">Sube un archivo <b>CSV</b> (desde Excel: <i>Guardar como → CSV</i>) con una columna <b>Código</b> y al menos una de: <b>Precio</b>, <b>Precio antes</b>, <b>Stock</b>.
        Puedes partir del archivo de <i>Exportar catálogo</i>. Se buscan los formatos por su código.</p>
        <input type="file" id="imp-file" accept=".csv,text/csv">
        <div id="imp-preview" style="margin-top:14px"></div>`,
      foot: `<button class="btn" data-x>Cancelar</button><button class="btn btn-primary" id="imp-apply" disabled>Aplicar cambios</button>`,
    });
    let changes = [];
    const parse = (text) => {
      const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
      const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ";" : ",";
      const split = (l) => { const out = []; let cur = "", q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map((s) => s.trim()); };
      const head = split(lines[0]).map((h) => A.norm(h));
      const idx = (...names) => head.findIndex((h) => names.some((n) => h === n || h.includes(n)));
      return { rows: lines.slice(1).map(split), iSku: idx("codigo", "sku"), iPrice: head.findIndex((h) => h === "precio"), iCmp: idx("precio antes", "precio anterior"), iStock: idx("stock") };
    };
    m.el.querySelector("#imp-file").onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const { rows, iSku, iPrice, iCmp, iStock } = parse(await file.text());
      const prev = m.el.querySelector("#imp-preview");
      if (iSku < 0) { prev.innerHTML = `<div class="banner bad">No encontré la columna "Código".</div>`; return; }
      const bySku = new Map();
      A.state.products.forEach((p) => p.product_variants.forEach((v) => v.sku && bySku.set(String(v.sku).trim().toLowerCase(), { p, v })));
      const missing = [];
      changes = [];
      rows.forEach((r) => {
        const sku = (r[iSku] || "").trim(); if (!sku) return;
        const hit = bySku.get(sku.toLowerCase()); if (!hit) { missing.push(sku); return; }
        const patch = {}; let stock;
        if (iPrice >= 0 && r[iPrice] !== "" && r[iPrice] != null) { const n = A.int(r[iPrice]); if (n != null && n !== hit.v.price) patch.price = n; }
        if (iCmp >= 0 && r[iCmp] != null) { const n = r[iCmp] === "" ? null : A.int(r[iCmp]); if (n !== hit.v.compare_at_price) patch.compare_at_price = n; }
        if (iStock >= 0 && r[iStock] != null) { const n = r[iStock] === "" ? null : A.int(r[iStock]); if (n !== hit.v.stock) stock = n; }
        if (Object.keys(patch).length || stock !== undefined) changes.push({ ...hit, patch, stock });
      });
      prev.innerHTML = `${missing.length ? `<div class="banner warn"><div><b>${missing.length} código${missing.length > 1 ? "s" : ""} no encontrado${missing.length > 1 ? "s" : ""}</b>${esc(missing.slice(0, 15).join(", "))}${missing.length > 15 ? "…" : ""}</div></div>` : ""}
        ${changes.length ? `<p><b>${changes.length} formato${changes.length > 1 ? "s" : ""} cambiarán:</b></p><div class="tbl-wrap" style="max-height:340px;overflow:auto"><table class="tbl"><thead><tr><th>Código</th><th>Producto</th><th>Precio</th><th>Precio antes</th><th>Stock</th></tr></thead><tbody>
        ${changes.map((c) => `<tr><td class="mono">${esc(c.v.sku)}</td><td>${esc(c.p.name)} · ${esc(c.v.label)}</td>
          <td>${"price" in c.patch ? `${clp(c.v.price)} → <b>${clp(c.patch.price)}</b>` : "—"}</td>
          <td>${"compare_at_price" in c.patch ? `${c.v.compare_at_price ? clp(c.v.compare_at_price) : "—"} → <b>${c.patch.compare_at_price ? clp(c.patch.compare_at_price) : "—"}</b>` : "—"}</td>
          <td>${c.stock !== undefined ? `${c.v.stock ?? "∞"} → <b>${c.stock ?? "sin control"}</b>` : "—"}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">No hay cambios respecto al catálogo actual.</p>`}`;
      m.el.querySelector("#imp-apply").disabled = !changes.length;
    };
    m.el.querySelector("#imp-apply").onclick = async (e) => {
      e.target.disabled = true; e.target.textContent = "Aplicando…";
      try {
        for (const c of changes) {
          if (Object.keys(c.patch).length) await A.q(A.sb.from("product_variants").update(c.patch).eq("id", c.v.id));
          if (c.stock !== undefined) await A.rpc("set_stock", { p_variant: c.v.id, p_stock: c.stock, p_reason: "Importación CSV" });
        }
        m.close(); done(`${changes.length} formatos actualizados`);
      } catch (err) { A.fail(err); e.target.disabled = false; e.target.textContent = "Aplicar cambios"; }
    };
  }

  // ------------------------------------------------------------ ficha de producto
  A.route("/productos/:id", "productos", async ({ id }) => {
    await Promise.all([A.loadSettings(), A.loadCatalog(true)]);
    const isNew = id === "nuevo";
    const orig = isNew ? null : A.state.products.find((p) => p.id === id);
    if (!isNew && !orig) throw new Error("Producto no encontrado");
    const dupSrc = isNew && sessionStorage.getItem("p4p_dup") ? JSON.parse(sessionStorage.getItem("p4p_dup")) : null;
    sessionStorage.removeItem("p4p_dup");
    const base = orig || dupSrc || { name: "", description: "", brand: "", category: A.state.categories[0]?.slug, species: "perro", life_stage: "", tags: [], gallery: [], image_url: null, active: true, featured: false, product_variants: [] };
    const fresh = () => ({
      ...base, tags: [...(base.tags || [])],
      media: [base.image_url, ...(base.gallery || [])].filter(Boolean),
      variants: (orig ? A.liveVariants(orig) : base.product_variants || []).map((v) => ({ id: orig ? v.id : undefined, label: v.label, price: v.price, compare_at_price: v.compare_at_price, sku: dupSrc ? "" : v.sku, stock: v.stock, _stock0: orig ? v.stock : undefined })),
    });
    let p = fresh();
    if (!p.variants.length) p.variants.push({ label: "Unidad", price: "", compare_at_price: null, sku: "", stock: null });

    const brands = [...new Set(A.state.products.map((x) => x.brand).filter(Boolean))].sort();
    const stages = [...new Set(["Cachorro", "Gatito", "Adulto", "Senior", "Todas", ...A.state.products.map((x) => x.life_stage).filter(Boolean)])];

    const mediaHtml = () => `<div class="media-grid">${p.media.map((u, i) => `<div class="m ${i === 0 ? "main" : ""}"><img src="${esc(u)}" alt=""><button class="x" data-rm-media="${i}" aria-label="Quitar">✕</button>${i ? `<button class="star" data-main="${i}">Principal</button>` : ""}</div>`).join("")}
      <label class="drop" id="pf-drop"><input type="file" id="pf-files" accept="image/*" multiple hidden>＋ Agregar fotos<br><small>o arrástralas aquí</small></label></div>
      <button class="btn btn-plain btn-sm" id="pf-url" style="margin-top:8px">Agregar desde URL</button>`;
    const variantsHtml = () => `<table class="vt"><thead><tr><th>Formato</th><th>Precio</th><th>Precio antes <span class="help">(oferta)</span></th><th>Código (SKU)</th><th>Stock <span class="help">(vacío = sin control)</span></th><th></th></tr></thead><tbody>
      ${p.variants.map((v, i) => `<tr>
        <td><input data-v="${i}" data-k="label" value="${esc(v.label)}" placeholder="Ej: 15 kg"></td>
        <td><div class="prefix"><span>$</span><input data-v="${i}" data-k="price" type="number" min="0" value="${v.price ?? ""}"></div></td>
        <td><div class="prefix"><span>$</span><input data-v="${i}" data-k="compare_at_price" type="number" min="0" value="${v.compare_at_price ?? ""}"></div></td>
        <td><input data-v="${i}" data-k="sku" value="${esc(v.sku || "")}"></td>
        <td><input data-v="${i}" data-k="stock" type="number" value="${v.stock ?? ""}" placeholder="∞"></td>
        <td><button class="btn btn-plain danger btn-sm" data-rm-v="${i}" aria-label="Quitar formato" ${p.variants.length < 2 ? "disabled" : ""}>✕</button></td></tr>`).join("")}
      </tbody></table><button class="btn btn-plain btn-sm" id="pf-addv" style="margin-top:6px">＋ Agregar formato</button>`;

    const storeLink = orig ? `${A.storeUrl()}/?p=${encodeURIComponent(orig.slug)}` : "";
    A.render(`<div class="page">
      ${A.head({
        title: isNew ? (dupSrc ? "Duplicar producto" : "Agregar producto") : esc(orig.name), back: "/productos",
        badges: orig ? ` ${orig.active ? A.badge("Visible", "b-green") : A.badge("Oculto", "b-gray")}` : "",
        actions: orig ? `<a class="btn" href="${esc(storeLink)}" target="_blank" rel="noopener">Ver en tienda ↗</a>
          <div class="dd"><button class="btn" id="pf-more">Más acciones ▾</button><div class="dd-menu" id="pf-more-menu" hidden>
            <button id="pf-dup">📄 Duplicar</button><button id="pf-share">🔗 Copiar enlace del producto</button><button class="danger" id="pf-del">🗑️ Eliminar producto</button></div></div>` : "",
      })}
      <div class="cols">
        <div class="stack">
          <div class="card">
            <label class="f">Título<input id="pf-name" value="${esc(p.name)}" placeholder="Ej: Nómade Adulto Razas Medianas"></label>
            <label class="f">Descripción<textarea id="pf-desc" rows="6" placeholder="Beneficios, ingredientes, recomendaciones…">${esc(p.description || "")}</textarea></label>
          </div>
          <div class="card"><h2 style="margin-bottom:10px">Multimedia</h2><div id="pf-media">${mediaHtml()}</div></div>
          <div class="card"><h2 style="margin-bottom:10px">Formatos, precios e inventario</h2><div class="tbl-wrap" id="pf-variants">${variantsHtml()}</div>
            ${orig ? `<p class="help" style="margin:8px 0 0">Los cambios de stock quedan registrados en el historial de <a href="#/inventario">Inventario</a>.</p>` : ""}</div>
        </div>
        <div class="stack">
          <div class="card"><h2 style="margin-bottom:10px">Estado</h2>
            <select id="pf-active"><option value="1" ${p.active ? "selected" : ""}>✅ Visible en la tienda</option><option value="0" ${!p.active ? "selected" : ""}>🙈 Oculto</option></select>
            <label class="check" style="margin-top:12px"><input type="checkbox" id="pf-featured" ${p.featured ? "checked" : ""}> ⭐ Destacado (aparece primero)</label>
          </div>
          <div class="card"><h2 style="margin-bottom:10px">Organización</h2>
            <label class="f">Categoría<select id="pf-cat">${A.state.categories.map((c) => `<option value="${esc(c.slug)}" ${c.slug === p.category ? "selected" : ""}>${esc(c.emoji || "")} ${esc(c.name)}</option>`).join("")}</select></label>
            <label class="f">Marca<input id="pf-brand" list="dl-brands" value="${esc(p.brand || "")}"></label>
            <label class="f">Mascota<select id="pf-species"><option value="perro">🐶 Perro</option><option value="gato">🐱 Gato</option><option value="ambos">🐶🐱 Ambos</option></select></label>
            <label class="f">Etapa de vida<input id="pf-stage" list="dl-stages" value="${esc(p.life_stage || "")}"></label>
            <label class="f">Etiquetas <small>Separadas por coma. Ayudan a la búsqueda (ej: sin granos, hipoalergénico)</small><input id="pf-tags" value="${esc((p.tags || []).join(", "))}"></label>
            <datalist id="dl-brands">${brands.map((b) => `<option value="${esc(b)}">`).join("")}</datalist>
            <datalist id="dl-stages">${stages.map((b) => `<option value="${esc(b)}">`).join("")}</datalist>
          </div>
          ${orig ? `<div class="card"><h2 style="margin-bottom:8px">Ventas</h2><div id="pf-sales" class="muted">Cargando…</div></div>` : ""}
        </div>
      </div>
      ${isNew ? `<div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="btn btn-orange" id="pf-create" style="padding:11px 22px">Guardar producto</button></div>` : ""}
      </div>`);
    $("#pf-species").value = p.species || "perro";

    const markDirty = () => { if (!isNew) A.setDirty(save, () => { p = fresh(); A.navigate(); }); };
    const readForm = () => {
      p.name = $("#pf-name").value.trim(); p.description = $("#pf-desc").value.trim();
      p.active = $("#pf-active").value === "1"; p.featured = $("#pf-featured").checked;
      p.category = $("#pf-cat").value; p.brand = $("#pf-brand").value.trim(); p.species = $("#pf-species").value;
      p.life_stage = $("#pf-stage").value.trim(); p.tags = $("#pf-tags").value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    };
    const drawMedia = () => { $("#pf-media").innerHTML = mediaHtml(); bindMedia(); };
    const drawVariants = () => { $("#pf-variants").innerHTML = variantsHtml(); };

    const root = $("#main .page");
    root.addEventListener("input", (e) => {
      if (e.target.dataset.v != null) {
        const v = p.variants[+e.target.dataset.v], k = e.target.dataset.k;
        v[k] = ["price", "compare_at_price", "stock"].includes(k) ? (e.target.value === "" ? null : A.int(e.target.value)) : e.target.value;
      }
      if (e.target.closest(".cols")) markDirty();
    });
    root.addEventListener("change", (e) => { if (e.target.closest(".cols") && e.target.type !== "file") markDirty(); });
    $("#pf-variants").onclick = (e) => {
      if (e.target.closest("#pf-addv")) { p.variants.push({ label: "", price: null, compare_at_price: null, sku: "", stock: null }); drawVariants(); markDirty(); }
      const rm = e.target.closest("[data-rm-v]");
      if (rm && p.variants.length > 1) { p.variants.splice(+rm.dataset.rmV, 1); drawVariants(); markDirty(); }
    };

    async function addFiles(files) {
      const list = [...files].filter((f) => f.type.startsWith("image/"));
      if (!list.length) return;
      A.toast(`Subiendo ${list.length} foto${list.length > 1 ? "s" : ""}…`);
      try { for (const f of list) p.media.push(await A.upload(f)); drawMedia(); markDirty(); }
      catch (err) { A.fail(err, "No se pudo subir la foto"); }
    }
    function bindMedia() {
      $("#pf-files").onchange = (e) => addFiles(e.target.files);
      const drop = $("#pf-drop");
      drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
      drop.ondragleave = () => drop.classList.remove("over");
      drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove("over"); addFiles(e.dataTransfer.files); };
      $("#pf-media").onclick = async (e) => {
        const rm = e.target.closest("[data-rm-media]"), mn = e.target.closest("[data-main]");
        if (rm) { p.media.splice(+rm.dataset.rmMedia, 1); drawMedia(); markDirty(); }
        if (mn) { const [u] = p.media.splice(+mn.dataset.main, 1); p.media.unshift(u); drawMedia(); markDirty(); }
        if (e.target.closest("#pf-url")) {
          const r = await A.ask({ title: "Agregar foto desde URL", fields: [{ name: "url", label: "Dirección de la imagen", type: "url", placeholder: "https://…", required: true }], ok: "Agregar" });
          if (r?.url) { p.media.push(r.url); drawMedia(); markDirty(); }
        }
      };
    }
    bindMedia();

    async function save() {
      readForm();
      if (p.name.length < 2) { A.toast("Escribe el título del producto", true); $("#pf-name").focus(); throw new Error("sin título"); }
      const vs = p.variants.filter((v) => v.label?.trim() || v.price != null);
      if (!vs.length || vs.some((v) => !v.label?.trim() || v.price == null || v.price < 0)) { A.toast("Cada formato necesita nombre y precio", true); throw new Error("formatos"); }
      const row = {
        name: p.name, description: p.description || null, brand: p.brand || null, category: p.category, species: p.species,
        life_stage: p.life_stage || null, tags: p.tags, image_url: p.media[0] || null, gallery: p.media.slice(1), active: p.active, featured: p.featured,
      };
      try {
        let pid = orig?.id;
        if (pid) await A.q(A.sb.from("products").update(row).eq("id", pid));
        else {
          let slug = A.slugify(p.name) || "producto";
          if (A.state.products.some((x) => x.slug === slug)) slug += "-" + Date.now().toString(36).slice(-4);
          pid = (await A.q(A.sb.from("products").insert({ ...row, slug }).select("id").single())).id;
        }
        const keep = vs.filter((v) => v.id).map((v) => v.id);
        const removed = (orig ? A.liveVariants(orig) : []).filter((v) => !keep.includes(v.id)).map((v) => v.id);
        if (removed.length) await A.q(A.sb.from("product_variants").update({ active: false }).in("id", removed));
        for (const [i, v] of vs.entries()) {
          const data = { label: v.label.trim(), price: v.price, compare_at_price: v.compare_at_price || null, sku: v.sku?.trim() || null, sort: i, active: true };
          if (v.id) {
            await A.q(A.sb.from("product_variants").update(data).eq("id", v.id));
            if ((v.stock ?? null) !== (v._stock0 ?? null)) await A.rpc("set_stock", { p_variant: v.id, p_stock: v.stock, p_reason: "Editado en la ficha del producto" });
          } else {
            await A.q(A.sb.from("product_variants").insert({ ...data, product_id: pid, stock: v.stock }));
          }
        }
        A.clearDirty();
        A.toast(isNew ? "Producto creado" : "Producto guardado");
        A.state.products = null;
        if (isNew) A.go(`/productos/${pid}`); else A.navigate();
      } catch (err) { A.fail(err, "No se pudo guardar"); throw err; }
    }
    $("#pf-create")?.addEventListener("click", (e) => { e.target.disabled = true; save().catch(() => (e.target.disabled = false)); });

    if (orig) {
      A.dropdown($("#pf-more"), $("#pf-more-menu"));
      $("#pf-dup").onclick = () => {
        readForm();
        sessionStorage.setItem("p4p_dup", JSON.stringify({ ...orig, ...p, name: `${p.name} (copia)`, image_url: p.media[0] || null, gallery: p.media.slice(1), active: false, featured: false,
          product_variants: p.variants.map((v) => ({ ...v, id: undefined })) }));
        A.clearDirty(); A.go("/productos/nuevo");
      };
      $("#pf-share").onclick = async () => { try { await navigator.clipboard.writeText(storeLink); A.toast("Enlace copiado"); } catch { prompt("Copia el enlace:", storeLink); } };
      $("#pf-del").onclick = async () => {
        if (!(await A.confirm({ title: `Eliminar "${esc(orig.name)}"`, message: "Esta acción no se puede deshacer. Los pedidos antiguos conservan el nombre y precio.<br><br>Si solo quieres sacarlo de la tienda por un tiempo, mejor déjalo <b>Oculto</b>.", ok: "Eliminar", danger: true }))) return;
        try { await A.q(A.sb.from("products").delete().eq("id", orig.id)); A.clearDirty(); A.state.products = null; A.toast("Producto eliminado"); A.go("/productos"); }
        catch (err) { A.fail(err); }
      };
      const since = new Date(Date.now() - 90 * 864e5).toISOString();
      A.q(A.sb.from("order_items").select("qty, line_total, orders!inner(status, created_at)").eq("product_id", orig.id).gte("orders.created_at", since))
        .then((items) => {
          const ok = items.filter((i) => A.SOLD.includes(i.orders.status));
          if (!$("#pf-sales")) return;
          $("#pf-sales").innerHTML = ok.length ? `<dl class="kv"><dt>Unidades (90 días)</dt><dd><b>${num(ok.reduce((s, i) => s + i.qty, 0))}</b></dd><dt>Ventas (90 días)</dt><dd><b>${clp(ok.reduce((s, i) => s + i.line_total, 0))}</b></dd></dl>` : "Sin ventas en los últimos 90 días";
        }).catch(() => { if ($("#pf-sales")) $("#pf-sales").textContent = "—"; });
    }
  });

  // ------------------------------------------------------------ inventario
  A.route("/inventario", "inventario", async (_, query) => {
    await Promise.all([A.loadSettings(), A.loadCatalog(true)]);
    const st = { q: "", f: query.f || "todos", reason: "Recepción de mercadería" };
    const rows = [];
    A.state.products.forEach((p) => A.liveVariants(p).forEach((v) => rows.push({ p, v })));
    const FILTERS = { todos: "Todos", controlados: "Con control de stock", bajo: "Stock bajo", agotado: "Agotados", sincontrol: "Sin control" };
    const visible = () => rows.filter(({ p, v }) => {
      if (st.f === "controlados" && v.stock == null) return false;
      if (st.f === "bajo" && !(v.stock != null && v.stock <= A.lowStock())) return false;
      if (st.f === "agotado" && !(v.stock != null && v.stock <= 0)) return false;
      if (st.f === "sincontrol" && v.stock != null) return false;
      return !st.q || A.match(`${p.name} ${p.brand || ""} ${v.label} ${v.sku || ""}`, st.q);
    });

    function draw() {
      if (!document.getElementById("i-body")) return;
      const list = visible();
      $("#i-body").innerHTML = list.length ? list.map(({ p, v }) => `<tr data-vid="${v.id}">
        <td><div class="pcell">${A.thumb(p.image_url, A.catEmoji(p.category))}<div><a href="#/productos/${p.id}"><b>${esc(p.name)}</b></a><small class="muted">${esc(v.label)}${!p.active ? " · oculto" : ""}</small></div></div></td>
        <td class="mono hide-sm">${esc(v.sku || "—")}</td>
        <td><label class="switch" title="Controlar stock"><input type="checkbox" data-track ${v.stock != null ? "checked" : ""}></label></td>
        <td style="width:210px">${v.stock != null ? `<div style="display:flex;gap:4px;align-items:center">
          <button class="btn btn-sm" data-step="-1" aria-label="Restar">−</button>
          <input type="number" data-stock value="${v.stock}" style="width:80px;text-align:center" class="${v.stock <= 0 ? "" : ""}">
          <button class="btn btn-sm" data-step="1" aria-label="Sumar">+</button>
          ${v.stock <= 0 ? A.badge("Agotado", "b-red") : v.stock <= A.lowStock() ? A.badge("Bajo", "b-amber") : ""}</div>` : `<span class="muted">Sin control (siempre disponible)</span>`}</td>
        <td class="num"><button class="btn btn-plain btn-sm" data-hist>Historial</button></td></tr>`).join("")
        : `<tr><td colspan="5"><div class="empty-state"><div class="emo">📦</div><h3>Nada por aquí</h3></div></td></tr>`;
      $("#i-count").textContent = `${list.length} formato${list.length === 1 ? "" : "s"}`;
    }

    A.render(`<div class="page">
      ${A.head({ title: "Inventario", back: "/productos", sub: "Ajusta el stock disponible. Se descuenta solo con cada venta pagada y se repone al cancelar un pedido." })}
      <div class="card flush">
        <div class="toolbar">
          <div class="grow"><input id="i-q" type="search" placeholder="Buscar producto o código"></div>
          <select id="i-f">${Object.entries(FILTERS).map(([k, l]) => `<option value="${k}" ${k === st.f ? "selected" : ""}>${l}</option>`).join("")}</select>
          <label class="small" style="display:flex;gap:6px;align-items:center">Motivo
            <select id="i-reason">${["Recepción de mercadería", "Corrección de inventario", "Merma o producto dañado", "Devolución de cliente", "Venta en tienda"].map((r) => `<option>${r}</option>`).join("")}</select></label>
        </div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Producto</th><th class="hide-sm">Código</th><th>Controlar</th><th>Disponible</th><th></th></tr></thead><tbody id="i-body"></tbody></table></div>
        <div class="pager"><small class="muted" id="i-count"></small></div>
      </div></div>`);
    draw();

    $("#i-q").oninput = A.debounce((e) => { st.q = e.target.value; draw(); }, 150);
    $("#i-f").onchange = (e) => { st.f = e.target.value; draw(); };
    $("#i-reason").onchange = (e) => (st.reason = e.target.value);
    const findRow = (tr) => rows.find((r) => r.v.id === tr.dataset.vid);
    const commit = async (row, value) => {
      if (value === row.v.stock) return;
      try {
        await A.rpc("set_stock", { p_variant: row.v.id, p_stock: value, p_reason: st.reason });
        row.v.stock = value; draw();
        A.toast(value == null ? "Stock sin control" : `Stock actualizado: ${value}`);
      } catch (err) { A.fail(err); draw(); }
    };
    $("#i-body").onclick = async (e) => {
      const tr = e.target.closest("tr[data-vid]"); if (!tr) return;
      const row = findRow(tr);
      const step = e.target.closest("[data-step]");
      if (step) commit(row, Math.max(0, (row.v.stock || 0) + +step.dataset.step));
      if (e.target.closest("[data-hist]")) {
        const hist = await A.q(A.sb.from("inventory_adjustments").select("*").eq("variant_id", row.v.id).order("created_at", { ascending: false }).limit(100));
        A.modal({ title: `Historial · ${row.p.name} ${row.v.label}`, wide: true,
          body: hist.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Motivo</th><th class="num">Cambio</th><th class="num">Quedó</th><th>Por</th></tr></thead><tbody>
            ${hist.map((h) => `<tr><td class="nowrap">${A.dateTime(h.created_at)}</td><td>${esc(h.reason)}</td><td class="num">${h.delta == null ? "—" : `<b style="color:${h.delta < 0 ? "var(--red)" : "var(--green)"}">${h.delta > 0 ? "+" : ""}${h.delta}</b>`}</td><td class="num">${h.stock_after ?? "sin control"}</td><td class="small muted">${esc(h.actor || "")}</td></tr>`).join("")}
            </tbody></table></div>` : `<p class="muted">Aún no hay movimientos registrados para este formato.</p>` });
      }
    };
    $("#i-body").onchange = (e) => {
      const tr = e.target.closest("tr[data-vid]"); if (!tr) return;
      const row = findRow(tr);
      if (e.target.matches("[data-track]")) commit(row, e.target.checked ? 0 : null);
      if (e.target.matches("[data-stock]")) commit(row, Math.max(0, A.int(e.target.value) || 0));
    };
    $("#i-body").onkeydown = (e) => { if (e.key === "Enter" && e.target.matches("[data-stock]")) e.target.blur(); };
  });

  // ------------------------------------------------------------ categorías
  A.route("/categorias", "categorias", async () => {
    await A.loadCatalog(true);
    const draw = () => {
      const cats = A.state.categories;
      $("#c-body").innerHTML = cats.map((c, i) => {
        const n = A.state.products.filter((p) => p.category === c.slug).length;
        return `<tr data-slug="${esc(c.slug)}"><td style="font-size:22px;width:40px">${esc(c.emoji || "🐾")}</td><td><b>${esc(c.name)}</b><br><small class="muted mono">${esc(c.slug)}</small></td>
          <td><a href="#/productos">${n} producto${n === 1 ? "" : "s"}</a></td>
          <td class="num nowrap"><button class="btn btn-sm" data-mv="-1" ${i === 0 ? "disabled" : ""} aria-label="Subir">↑</button> <button class="btn btn-sm" data-mv="1" ${i === cats.length - 1 ? "disabled" : ""} aria-label="Bajar">↓</button>
          <button class="btn btn-sm" data-edit>Editar</button> <button class="btn btn-plain danger btn-sm" data-del ${n ? `disabled title="Tiene productos"` : ""}>Eliminar</button></td></tr>`;
      }).join("");
    };
    A.render(`<div class="page narrow">
      ${A.head({ title: "Categorías", back: "/productos", actions: `<button class="btn btn-primary" id="c-new">Agregar categoría</button>`, sub: "El orden aquí es el orden en que aparecen en la tienda." })}
      <div class="card flush"><div class="tbl-wrap"><table class="tbl"><tbody id="c-body"></tbody></table></div></div></div>`);
    draw();
    const form = (c = {}) => A.ask({
      title: c.slug ? "Editar categoría" : "Nueva categoría",
      fields: [{ name: "name", label: "Nombre", value: c.name, required: true }, { name: "emoji", label: "Emoji", value: c.emoji || "🐾", help: "Se muestra en la tienda (ej: 🐶 🐱 🦴 🧸)" }],
    });
    $("#c-new").onclick = async () => {
      const r = await form(); if (!r) return;
      let slug = A.slugify(r.name); if (A.state.categories.some((c) => c.slug === slug)) slug += "-2";
      try { await A.q(A.sb.from("categories").insert({ slug, name: r.name, emoji: r.emoji, sort: A.state.categories.length + 1 })); await A.loadCatalog(true); draw(); A.toast("Categoría creada"); }
      catch (err) { A.fail(err); }
    };
    $("#c-body").onclick = async (e) => {
      const tr = e.target.closest("tr[data-slug]"); if (!tr) return;
      const i = A.state.categories.findIndex((c) => c.slug === tr.dataset.slug), c = A.state.categories[i];
      try {
        if (e.target.closest("[data-edit]")) {
          const r = await form(c); if (!r) return;
          await A.q(A.sb.from("categories").update({ name: r.name, emoji: r.emoji }).eq("slug", c.slug));
        } else if (e.target.closest("[data-mv]")) {
          const j = i + +e.target.closest("[data-mv]").dataset.mv, o = A.state.categories[j];
          await A.q(A.sb.from("categories").update({ sort: j + 1 }).eq("slug", c.slug));
          await A.q(A.sb.from("categories").update({ sort: i + 1 }).eq("slug", o.slug));
        } else if (e.target.closest("[data-del]")) {
          if (!(await A.confirm({ title: `Eliminar "${esc(c.name)}"`, message: "La categoría no tiene productos.", ok: "Eliminar", danger: true }))) return;
          await A.q(A.sb.from("categories").delete().eq("slug", c.slug));
        } else return;
        await A.loadCatalog(true); draw(); A.toast("Listo");
      } catch (err) { A.fail(err); }
    };
  });
})();
