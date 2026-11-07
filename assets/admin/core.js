/* =====================================================================
   PLANETA 4 PATAS · Panel · núcleo (utilidades, router, modales, datos)
   ===================================================================== */
(() => {
  const CFG = window.P4P_CONFIG || {};
  const A = (window.A = {});
  A.CFG = CFG;
  A.sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  A.state = { settings: null, products: null, categories: null, user: null };

  // ------------------------------------------------------------ utilidades
  A.$ = (s, el = document) => el.querySelector(s);
  A.$$ = (s, el = document) => [...el.querySelectorAll(s)];
  A.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  A.clp = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n || 0)).toLocaleString("es-CL");
  A.num = (n) => Math.round(n || 0).toLocaleString("es-CL");
  A.pct = (n) => `${(n * 100).toFixed(1).replace(".", ",")}%`;
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
  A.date = (d) => { const x = new Date(d); return `${x.getDate()} ${MES[x.getMonth()]} ${x.getFullYear()}`; };
  A.dateShort = (d) => { const x = new Date(d); return `${x.getDate()} ${MES[x.getMonth()]}`; };
  A.time = (d) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  A.dateTime = (d) => {
    const x = new Date(d), now = new Date();
    const today = x.toDateString() === now.toDateString();
    const yest = x.toDateString() === new Date(now - 864e5).toDateString();
    return `${today ? "Hoy" : yest ? "Ayer" : A.dateShort(x)} a las ${A.time(x)}`;
  };
  A.ago = (d) => {
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 60) return "recién"; if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
    if (s < 86400) return `hace ${Math.floor(s / 3600)} h`; if (s < 86400 * 30) return `hace ${Math.floor(s / 86400)} d`;
    return A.date(d);
  };
  A.dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
  A.startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  A.slugify = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  A.norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  A.match = (hay, q) => { const h = A.norm(hay); return A.norm(q).split(/\s+/).filter(Boolean).every((w) => h.includes(w)); };
  A.debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  A.initials = (s) => String(s || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  A.int = (v) => (v === "" || v == null ? null : Math.round(Number(String(v).replace(/[^\d-]/g, ""))));
  A.phoneIntl = (p) => {
    let d = String(p || "").replace(/\D/g, "");
    if (d.length === 9 && d.startsWith("9")) d = "56" + d;
    else if (d.length === 8) d = "569" + d;
    return d;
  };
  A.wa = (phone, text = "") => `https://wa.me/${A.phoneIntl(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  A.storeUrl = () => (A.state.settings?.site_url || location.href.replace(/admin\.html.*$/, "")).replace(/\/$/, "");

  A.toast = (msg, bad = false) => {
    const t = document.createElement("div");
    t.className = "toast" + (bad ? " bad" : ""); t.textContent = msg;
    A.$("#toasts").appendChild(t);
    setTimeout(() => t.remove(), bad ? 5000 : 2600);
  };
  A.fail = (err, fallback = "Ocurrió un error") => {
    console.error(err);
    const m = err?.message || err?.error_description || (typeof err === "string" ? err : "") || fallback;
    A.toast(m.includes("Failed to fetch") ? "Sin conexión. Revisa tu internet." : m, true);
  };
  A.rpc = async (fn, args = {}) => {
    const { data, error } = await A.sb.rpc(fn, args);
    if (error) throw error;
    return data;
  };
  A.q = async (promise) => {
    const { data, error, count } = await promise;
    if (error) throw error;
    return count != null && data == null ? count : data;
  };

  // ------------------------------------------------------------ componentes
  A.badge = (text, cls = "b-gray") => `<span class="badge ${cls}">${A.esc(text)}</span>`;
  A.thumb = (url, emoji = "🐾", lg = false) => url
    ? `<img class="thumb${lg ? " lg" : ""}" src="${A.esc(url)}" alt="" loading="lazy" onerror="this.outerHTML='<span class=&quot;thumb${lg ? " lg" : ""}&quot;>${emoji}</span>'">`
    : `<span class="thumb${lg ? " lg" : ""}">${emoji}</span>`;

  A.STATUS = {
    pendiente_pago: "Pago pendiente", pagado: "Por preparar", preparando: "Preparando", despachado: "Despachado",
    entregado: "Entregado", cancelado: "Cancelado", rechazado: "Pago rechazado",
  };
  A.PAY = { mercadopago: "Mercado Pago", webpay: "Webpay", transferencia: "Transferencia", efectivo: "Efectivo", otro: "Otro" };
  A.isPaid = (o) => ["pagado", "preparando", "despachado", "entregado"].includes(o.status) || (o.status === "cancelado" && !!o.paid_at);
  A.SOLD = ["pagado", "preparando", "despachado", "entregado"];
  A.payBadge = (o) => {
    if (o.status === "cancelado") return o.paid_at ? A.badge("Pagado · cancelado", "b-gray") : A.badge("Cancelado", "b-gray");
    if (o.status === "rechazado") return A.badge("Pago rechazado", "b-red");
    if (o.status === "pendiente_pago") return A.badge(o.payment_method === "transferencia" ? "Esperando transferencia" : "Pago pendiente", "b-amber");
    return A.badge("Pagado", "b-green");
  };
  A.fulfillBadge = (o) => ({
    pagado: A.badge("Por preparar", "b-amber"), preparando: A.badge("Preparando", "b-info"),
    despachado: A.badge(o.delivery_method === "retiro" ? "Listo para retiro" : "Despachado", "b-violet"),
    entregado: A.badge("Entregado", "b-green"),
  }[o.status] || A.badge("—", "b-gray plain"));
  A.deliveryText = (o) => o.delivery_method === "despacho" ? `🚚 ${o.comuna || "Despacho"}` : "🏪 Retiro";

  // Modal genérico. Devuelve { el, close }.
  A.modal = ({ title, body = "", foot = "", wide = false, onClose } = {}) => {
    const wrap = document.createElement("div");
    wrap.className = "modal";
    wrap.innerHTML = `<div class="modal-card${wide ? " wide" : ""}" role="dialog" aria-modal="true">
      <div class="modal-head"><h2>${A.esc(title)}</h2><button class="modal-x" data-x aria-label="Cerrar">✕</button></div>
      <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ""}</div>`;
    A.$("#modal-root").appendChild(wrap);
    document.body.style.overflow = "hidden";
    const close = (v) => {
      if (!wrap.isConnected) return;
      wrap.remove();
      if (!A.$("#modal-root").children.length) document.body.style.overflow = "";
      onClose?.(v);
    };
    wrap.addEventListener("mousedown", (e) => { if (e.target === wrap) close(); });
    wrap.addEventListener("click", (e) => { if (e.target.closest("[data-x]")) close(); });
    const f = wrap.querySelector("input, select, textarea");
    if (f) setTimeout(() => f.focus(), 30);
    return { el: wrap, close };
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { const m = A.$("#modal-root").lastElementChild; if (m) m.querySelector("[data-x]")?.click(); }
  });

  A.confirm = ({ title = "¿Confirmar?", message = "", ok = "Confirmar", danger = false } = {}) => new Promise((res) => {
    const m = A.modal({
      title, body: `<p style="margin:0">${message}</p>`,
      foot: `<button class="btn" data-x>Cancelar</button><button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-ok>${A.esc(ok)}</button>`,
      onClose: (v) => res(v === true),
    });
    m.el.querySelector("[data-ok]").onclick = () => m.close(true);
  });

  // Formulario rápido en modal. fields: [{name,label,type,value,placeholder,options,help,required}]
  A.ask = ({ title, intro = "", fields = [], ok = "Guardar", danger = false, wide = false }) => new Promise((res) => {
    const input = (f) => {
      const v = f.value ?? "";
      if (f.type === "select") return `<select name="${f.name}">${f.options.map(([k, l]) => `<option value="${A.esc(k)}" ${String(k) === String(v) ? "selected" : ""}>${A.esc(l)}</option>`).join("")}</select>`;
      if (f.type === "textarea") return `<textarea name="${f.name}" rows="${f.rows || 3}" placeholder="${A.esc(f.placeholder || "")}">${A.esc(v)}</textarea>`;
      if (f.type === "checkbox") return "";
      return `<input name="${f.name}" type="${f.type || "text"}" value="${A.esc(v)}" placeholder="${A.esc(f.placeholder || "")}" ${f.required ? "required" : ""} ${f.min != null ? `min="${f.min}"` : ""}>`;
    };
    const body = `${intro ? `<p style="margin-top:0">${intro}</p>` : ""}<form id="ask-form">${fields.map((f) => f.type === "checkbox"
      ? `<label class="check"><input type="checkbox" name="${f.name}" ${f.value ? "checked" : ""}> ${A.esc(f.label)}</label>`
      : `<label class="f">${A.esc(f.label)}${input(f)}${f.help ? `<small>${f.help}</small>` : ""}</label>`).join("")}
      <p class="form-error" id="ask-error"></p><button hidden></button></form>`;
    const m = A.modal({
      title, body, wide,
      foot: `<button class="btn" data-x>Cancelar</button><button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-ok>${A.esc(ok)}</button>`,
      onClose: (v) => res(v && typeof v === "object" ? v : null),
    });
    const form = m.el.querySelector("form");
    const submit = (e) => {
      e?.preventDefault();
      const out = {};
      for (const f of fields) {
        const el = form.elements[f.name];
        out[f.name] = f.type === "checkbox" ? el.checked : el.value.trim();
        if (f.required && !out[f.name]) { m.el.querySelector("#ask-error").textContent = `Completa: ${f.label}`; el.focus(); return; }
      }
      m.close(out);
    };
    form.onsubmit = submit;
    m.el.querySelector("[data-ok]").onclick = submit;
  });

  A.dropdown = (btn, menu) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); const open = menu.hidden; A.$$(".dd-menu").forEach((m) => (m.hidden = true)); menu.hidden = !open; });
    menu.addEventListener("click", () => (menu.hidden = true));
  };
  document.addEventListener("click", () => A.$$(".dd-menu").forEach((m) => (m.hidden = true)));

  A.csv = (filename, rows) => {
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // Gráfico de barras SVG simple. points: [{label, value, title}]
  A.barChart = (points, { height = 220, money = true } = {}) => {
    if (!points.length) return `<p class="muted center">Sin datos en este período</p>`;
    const W = 800, H = height, padL = 54, padB = 24, padT = 10;
    const max = Math.max(1, ...points.map((p) => p.value));
    const nice = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); return Math.ceil(max / p) * p; })();
    const bw = (W - padL) / points.length;
    const y = (v) => padT + (H - padT - padB) * (1 - v / nice);
    const fmt = (v) => money ? (v >= 1e6 ? `$${(v / 1e6).toFixed(1).replace(".", ",")}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}k` : `$${v}`) : A.num(v);
    const grid = [0, .25, .5, .75, 1].map((t) => `<line class="grid" x1="${padL}" x2="${W}" y1="${y(nice * t)}" y2="${y(nice * t)}"/><text x="${padL - 6}" y="${y(nice * t) + 3}" text-anchor="end">${fmt(nice * t)}</text>`).join("");
    const every = Math.ceil(points.length / 12);
    const bars = points.map((p, i) => {
      const h = Math.max(0, H - padB - y(p.value));
      return `<rect class="bar" x="${padL + i * bw + bw * .15}" y="${y(p.value)}" width="${Math.max(1, bw * .7)}" height="${h}" rx="2"><title>${A.esc(p.title || p.label)}: ${money ? A.clp(p.value) : A.num(p.value)}</title></rect>` +
        (i % every === 0 ? `<text x="${padL + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${A.esc(p.label)}</text>` : "");
    }).join("");
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Gráfico">${grid}${bars}</svg>`;
  };

  A.barsList = (rows, { money = true } = {}) => {
    if (!rows.length) return `<p class="muted">Sin datos</p>`;
    const max = Math.max(...rows.map((r) => r.value), 1);
    return `<div class="bars-list">${rows.map((r) => `<div class="row"><span>${r.label}</span><b>${money ? A.clp(r.value) : A.num(r.value)}${r.extra ? ` <small class="muted">${r.extra}</small>` : ""}</b>
      <div class="track"><i style="width:${(r.value / max) * 100}%"></i></div></div>`).join("")}</div>`;
  };

  // ------------------------------------------------------------ imágenes
  // Reduce la foto en el navegador (máx. 1200 px) antes de subirla al Storage.
  A.upload = async (file, folder = "productos") => {
    let blob = file, ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    if (/^image\/(jpeg|png|webp)$/.test(file.type)) {
      try {
        const bmp = await createImageBitmap(file);
        const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
        const c = document.createElement("canvas");
        c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
        c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
        const out = await new Promise((r) => c.toBlob(r, "image/webp", 0.86));
        if (out && out.size < file.size) { blob = out; ext = "webp"; }
      } catch { /* se sube el original */ }
    }
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${A.slugify(file.name.replace(/\.[^.]+$/, "")).slice(0, 40) || "foto"}.${ext}`;
    const { error } = await A.sb.storage.from("productos").upload(path, blob, { cacheControl: "31536000", contentType: blob.type || file.type });
    if (error) throw error;
    return A.sb.storage.from("productos").getPublicUrl(path).data.publicUrl;
  };

  // ------------------------------------------------------------ datos compartidos
  A.loadSettings = async (force = false) => {
    if (A.state.settings && !force) return A.state.settings;
    A.state.settings = await A.q(A.sb.from("store_settings").select("*").eq("id", 1).single());
    return A.state.settings;
  };
  A.loadCatalog = async (force = false) => {
    if (A.state.products && !force) return A.state.products;
    const [p, c] = await Promise.all([
      A.q(A.sb.from("products").select("*, product_variants(*)").order("name")),
      A.q(A.sb.from("categories").select("*").order("sort")),
    ]);
    p.forEach((x) => x.product_variants.sort((a, b) => a.sort - b.sort));
    A.state.products = p; A.state.categories = c;
    return p;
  };
  A.catName = (slug) => A.state.categories?.find((c) => c.slug === slug)?.name || "";
  A.catEmoji = (slug) => A.state.categories?.find((c) => c.slug === slug)?.emoji || "🐾";
  A.liveVariants = (p) => p.product_variants.filter((v) => v.active);
  A.lowStock = () => A.state.settings?.low_stock_threshold ?? 3;

  // ------------------------------------------------------------ cambios sin guardar
  let dirty = null;
  A.setDirty = (onSave, onDiscard) => {
    dirty = { onSave, onDiscard };
    A.$("#savebar").classList.add("show");
  };
  A.clearDirty = () => { dirty = null; A.$("#savebar").classList.remove("show"); };
  A.isDirty = () => !!dirty;
  A.$("#savebar-save").onclick = async () => {
    if (!dirty) return;
    const b = A.$("#savebar-save"); b.disabled = true;
    try { await dirty.onSave(); } finally { b.disabled = false; }
  };
  A.$("#savebar-discard").onclick = () => { const d = dirty; A.clearDirty(); d?.onDiscard?.(); };
  window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  // ------------------------------------------------------------ router (#/ruta?param=valor)
  const routes = [];
  A.route = (pattern, nav, fn) => {
    const keys = [];
    const re = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "$");
    routes.push({ re, keys, nav, fn });
  };
  A.go = (path) => { location.hash = "#" + path; };
  A.render = (html) => { A.$("#main").innerHTML = html; };
  A.loading = () => A.render(`<div class="page"><div class="spinner"></div></div>`);
  let lastHash = location.hash, guard = false;
  A.navigate = async () => {
    if (guard) { guard = false; return; }
    if (dirty && !(await A.confirm({ title: "Cambios sin guardar", message: "Si sales de esta página perderás los cambios.", ok: "Salir sin guardar", danger: true }))) {
      guard = true; location.hash = lastHash; return;
    }
    A.clearDirty();
    lastHash = location.hash;
    const raw = location.hash.replace(/^#/, "") || "/";
    const [path, qs] = raw.split("?");
    const query = Object.fromEntries(new URLSearchParams(qs || ""));
    const clean = path.replace(/\/+$/, "") || "/";
    document.body.classList.remove("nav-open");
    A.$$(".gs-results").forEach((x) => (x.hidden = true));
    for (const r of routes) {
      const m = clean.match(r.re);
      if (!m) continue;
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const navKey = typeof r.nav === "function" ? r.nav(params, query) : r.nav;
      A.$$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === navKey));
      window.scrollTo(0, 0);
      A.loading();
      try { await r.fn(params, query); }
      catch (err) {
        A.render(`<div class="page"><div class="card empty-state"><div class="emo">😿</div><h3>No pudimos cargar esta sección</h3><p>${A.esc(err.message || err)}</p><button class="btn" onclick="location.reload()">Reintentar</button></div></div>`);
        console.error(err);
      }
      return;
    }
    A.go("/");
  };

  A.head = ({ title, back, badges = "", actions = "", sub = "" }) => `
    <div class="page-head">
      ${back ? `<a class="back" href="#${back}" aria-label="Volver">←</a>` : ""}
      <h1>${title}${badges}</h1>
      <div class="btn-group">${actions}</div>
      ${sub ? `<div style="flex-basis:100%" class="muted">${sub}</div>` : ""}
    </div>`;
})();
