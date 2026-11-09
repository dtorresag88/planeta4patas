/* =====================================================================
   PLANETA 4 PATAS · Tienda
   ===================================================================== */
(() => {
  const CFG = window.P4P_CONFIG || {};
  const LIVE = Boolean(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  const API = (CFG.SUPABASE_URL || "").replace(/\/$/, "");
  const HEADERS = { apikey: CFG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CFG.SUPABASE_ANON_KEY}` };
  const CART_KEY = "p4p_cart_v1";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clp = (n) => "$" + Math.round(n || 0).toLocaleString("es-CL");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const waNumber = () => (state.settings.whatsapp || CFG.WHATSAPP || "").replace(/\D/g, "");
  const waLink = (text) => `https://wa.me/${waNumber()}?text=${encodeURIComponent(text)}`;

  const state = {
    products: [], categories: [],
    settings: { shipping_fee: 1990, free_shipping_from: 60000, delivery_zones: [], pickup_enabled: true },
    filters: { q: "", species: "", category: "", brand: "", sort: "featured" },
    selected: {}, // productId -> variantId
    limit: 24,
    cart: loadCart(),
    discount: null, // { code, amount, free_shipping, kind, value }
  };

  // Medios de pago disponibles según la configuración del panel
  function payOptions() {
    const s = state.settings;
    const out = [];
    if (s.mp_enabled && s.mp_configured) out.push(["mercadopago", "Mercado Pago", "Crédito, débito o saldo Mercado Pago"]);
    if (s.webpay_enabled && (s.webpay_env === "integration" || s.webpay_configured)) out.push(["webpay", "Webpay", "Débito, crédito y prepago"]);
    if (s.transfer_enabled) out.push(["transferencia", "Transferencia bancaria", "Te mostramos los datos al confirmar"]);
    return out;
  }

  // ---------------------------------------------------------------- data
  async function rest(path, opts = {}) {
    const r = await fetch(`${API}/rest/v1/${path}`, { ...opts, headers: { ...HEADERS, "Content-Type": "application/json", ...(opts.headers || {}) } });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async function loadData() {
    if (!LIVE) {
      const d = window.P4P_DEMO;
      state.products = d.products; state.categories = d.categories; state.settings = d.settings;
      $("#demo-bar").hidden = false;
      return;
    }
    const [products, categories, settings] = await Promise.all([
      rest("products?select=*,product_variants(*)&active=eq.true&order=name"),
      rest("categories?select=*&order=sort"),
      rest("store_settings?select=*&id=eq.1"),
    ]);
    products.forEach((p) => {
      p.product_variants = (p.product_variants || []).filter((v) => v.active).sort((a, b) => a.sort - b.sort || a.price - b.price);
    });
    state.products = products.filter((p) => p.product_variants.length);
    state.categories = categories;
    if (settings[0]) state.settings = settings[0];
  }
  const allImages = (p) => [p.image_url, ...(p.gallery || [])].filter(Boolean);

  // ---------------------------------------------------------------- helpers
  const catOf = (slug) => state.categories.find((c) => c.slug === slug);
  const emojiOf = (p) => catOf(p.category)?.emoji || (p.species === "gato" ? "🐱" : "🐶");
  const minPrice = (p) => Math.min(...p.product_variants.map((v) => v.price));
  const isOut = (v) => v.stock !== null && v.stock !== undefined && v.stock <= 0;
  const hasOffer = (p) => p.product_variants.some((v) => v.compare_at_price && v.compare_at_price > v.price);
  const findVariant = (vid) => {
    for (const p of state.products) {
      const v = p.product_variants.find((x) => x.id === vid);
      if (v) return { p, v };
    }
    return null;
  };
  const selectedVariant = (p) => {
    const id = state.selected[p.id];
    return p.product_variants.find((v) => v.id === id) || p.product_variants.find((v) => !isOut(v)) || p.product_variants[0];
  };
  const placeholder = (p, hidden = false) =>
    `<div class="ph ph-${esc(p.species)}"${hidden ? " hidden" : ""}><span class="emo">${emojiOf(p)}</span><span class="ph-brand">${esc(p.brand || "Planeta 4 Patas")}</span></div>`;
  const media = (p) => p.image_url
    ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">${placeholder(p, true)}`
    : placeholder(p);

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // ---------------------------------------------------------------- cart
  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch { /* sin almacenamiento */ }
    renderCart();
  }
  function addToCart(vid, qty = 1) {
    const hit = findVariant(vid);
    if (!hit) return;
    const line = state.cart.find((l) => l.variant_id === vid);
    const current = line ? line.qty : 0;
    if (hit.v.stock != null && current + qty > hit.v.stock) { toast(`Solo quedan ${hit.v.stock} unidades`); return; }
    if (line) line.qty += qty; else state.cart.push({ variant_id: vid, qty });
    saveCart();
    const b = $("#open-cart"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
    toast(`🐾 ${hit.p.name} agregado`);
  }
  function setQty(vid, qty) {
    const hit = findVariant(vid);
    const line = state.cart.find((l) => l.variant_id === vid);
    if (!line) return;
    if (qty <= 0) state.cart = state.cart.filter((l) => l.variant_id !== vid);
    else line.qty = hit && hit.v.stock != null ? Math.min(qty, hit.v.stock) : qty;
    saveCart();
  }
  function cartLines() {
    return state.cart.map((l) => ({ ...l, ...findVariant(l.variant_id) })).filter((l) => l.p);
  }
  const cartSubtotal = () => cartLines().reduce((s, l) => s + l.v.price * l.qty, 0);

  function renderCart() {
    const lines = cartLines();
    if (lines.length !== state.cart.length) { state.cart = lines.map(({ variant_id, qty }) => ({ variant_id, qty })); }
    const count = lines.reduce((s, l) => s + l.qty, 0);
    $("#cart-count").textContent = count;
    const sub = cartSubtotal();
    $("#cart-subtotal").textContent = clp(sub);
    $("#go-checkout").disabled = !lines.length;

    const free = state.settings.free_shipping_from;
    const pct = Math.min(100, (sub / free) * 100);
    $("#free-ship").innerHTML = sub >= free
      ? `🎉 ¡Tienes <b>despacho GRATIS</b>!<div class="bar"><i style="width:100%"></i></div>`
      : `🚚 Te faltan <b>${clp(free - sub)}</b> para despacho <b>GRATIS</b><div class="bar"><i style="width:${pct}%"></i></div>`;

    $("#cart-items").innerHTML = lines.length ? lines.map((l) => `
      <div class="ci">
        <div class="ci-thumb">${media(l.p)}</div>
        <div><b>${esc(l.p.name)}</b><small>${esc(l.v.label)} · ${clp(l.v.price)}</small></div>
        <div class="ci-right">
          <b>${clp(l.v.price * l.qty)}</b>
          <div class="qty"><button data-dec="${l.variant_id}" aria-label="Quitar uno">−</button><span>${l.qty}</span><button data-inc="${l.variant_id}" aria-label="Agregar uno">+</button></div>
          <button class="remove" data-rm="${l.variant_id}">Eliminar</button>
        </div>
      </div>`).join("")
      : `<div class="cart-empty"><div class="emo">🛒</div><p>Tu carrito está vacío</p><button class="btn btn-blue" data-close>Ver productos</button></div>`;
  }

  function openCart() { $("#cart").classList.add("open"); $("#cart").setAttribute("aria-hidden", "false"); $("#scrim").hidden = false; }
  function closeCart() { $("#cart").classList.remove("open"); $("#cart").setAttribute("aria-hidden", "true"); $("#scrim").hidden = true; }

  // ---------------------------------------------------------------- catalog
  function cardHTML(p) {
    const v = selectedVariant(p);
    const out = p.product_variants.every(isOut);
    const off = v.compare_at_price && v.compare_at_price > v.price ? Math.round((1 - v.price / v.compare_at_price) * 100) : 0;
    return `
      <article class="card" data-pid="${p.id}">
        <button class="card-media" data-open="${p.id}" aria-label="Ver ${esc(p.name)}">
          ${media(p)}
          ${out ? `<span class="badge out">Agotado</span>` : off ? `<span class="badge">-${off}%</span>` : ""}
        </button>
        <div class="card-body">
          <span class="card-brand">${esc(p.brand || "")}</span>
          <button class="card-name" data-open="${p.id}">${esc(p.name)}</button>
          ${p.product_variants.length > 1 ? `<div class="variants">${p.product_variants.map((x) =>
            `<button data-variant="${x.id}" data-p="${p.id}" class="${x.id === v.id ? "on" : ""}" ${isOut(x) ? "disabled" : ""}>${esc(x.label)}</button>`).join("")}</div>`
            : `<div class="variants"><button class="on" tabindex="-1">${esc(v.label)}</button></div>`}
          <div class="price-row"><span class="price">${clp(v.price)}</span>${off ? `<span class="compare">${clp(v.compare_at_price)}</span>` : ""}</div>
          <button class="btn btn-orange add-btn" data-add="${v.id}" ${isOut(v) ? "disabled" : ""}>${isOut(v) ? "Sin stock" : "Agregar al carrito"}</button>
        </div>
      </article>`;
  }

  function filtered() {
    const f = state.filters;
    const q = f.q.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    let list = state.products.filter((p) => {
      if (f.species && p.species !== f.species && p.species !== "ambos") return false;
      if (f.category && p.category !== f.category) return false;
      if (f.brand && p.brand !== f.brand) return false;
      if (q) {
        const hay = `${p.name} ${p.brand || ""} ${catOf(p.category)?.name || ""} ${p.life_stage || ""} ${p.description || ""} ${(p.tags || []).join(" ")} ${p.product_variants.map((v) => `${v.sku || ""} ${v.label}`).join(" ")}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    const s = f.sort;
    list.sort((a, b) =>
      s === "price-asc" ? minPrice(a) - minPrice(b) :
      s === "price-desc" ? minPrice(b) - minPrice(a) :
      s === "name" ? a.name.localeCompare(b.name, "es") :
      (b.featured - a.featured) || (!!b.image_url - !!a.image_url) || (hasOffer(b) - hasOffer(a)) || a.name.localeCompare(b.name, "es"));
    return list;
  }

  function renderGrid() {
    const list = filtered();
    $("#grid").innerHTML = list.slice(0, state.limit).map(cardHTML).join("");
    const rest = list.length - state.limit;
    $("#more").hidden = rest <= 0;
    $("#more").textContent = `Ver más productos (${rest})`;
    $("#empty").hidden = list.length > 0;
    $("#result-count").textContent = `${list.length} producto${list.length === 1 ? "" : "s"}`;
    const offers = state.products.filter(hasOffer);
    $("#ofertas").hidden = !offers.length;
    $("#offers-grid").innerHTML = offers.slice(0, 8).map((p) => {
      if (!state.selected[p.id]) {
        const ov = p.product_variants.find((v) => v.compare_at_price > v.price && !isOut(v));
        if (ov) state.selected[p.id] = ov.id;
      }
      return cardHTML(p);
    }).join("");
  }

  function renderStatic() {
    $("#cats").innerHTML = state.categories.map((c) =>
      `<button class="cat" data-cat="${esc(c.slug)}"><div class="emo">${esc(c.emoji || "🐾")}</div><b>${esc(c.name)}</b></button>`).join("");
    $("#f-category").innerHTML = `<option value="">Todas las categorías</option>` +
      state.categories.map((c) => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join("");
    const brands = [...new Set(state.products.map((p) => p.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    $("#f-brand").innerHTML = `<option value="">Todas las marcas</option>` + brands.map((b) => `<option>${esc(b)}</option>`).join("");
    $("#brands").innerHTML = brands.map((b) => `<button data-brand="${esc(b)}">${esc(b)}</button>`).join("");

    const s = state.settings;
    const wa = waLink("¡Hola Planeta 4 Patas! 🐾 Tengo una consulta");
    ["#wa-float", "#wa-foot", "#wa-ship"].forEach((x) => ($(x).href = wa));
    const igUser = s.instagram || CFG.INSTAGRAM;
    const ig = `https://www.instagram.com/${igUser}/`;
    $("#ig-link").href = ig; $("#ig-foot").href = ig; $("#ig-foot").textContent = `@${igUser}`;
    const n = waNumber();
    if (n.length === 11) $("#wa-foot").textContent = `WhatsApp +${n.slice(0, 2)} ${n.slice(2, 3)} ${n.slice(3, 7)} ${n.slice(7)}`;
    $("#year").textContent = new Date().getFullYear();

    // Textos que dependen de la configuración del panel
    $$("[data-ship-fee]").forEach((el) => (el.textContent = clp(s.shipping_fee)));
    $$("[data-free-from]").forEach((el) => (el.textContent = clp(s.free_shipping_from)));
    $("#opt-ship-txt").textContent = s.free_shipping_from ? `${clp(s.shipping_fee)} · gratis sobre ${clp(s.free_shipping_from)}` : clp(s.shipping_fee);
    if (s.announcement !== undefined) {
      $("#announce").hidden = s.announcement_active === false || !s.announcement;
      if (s.announcement) $("#announce-text").textContent = s.announcement;
    }
    if (s.hours) $("#visit-hours").innerHTML = `<br>🕐 ${esc(s.hours)}`;
    const zones = s.delivery_zones || [];
    if (zones.length) {
      $("#perk-comunas").textContent = zones.map((z) => z.comuna).join(", ").replace(/, ([^,]*)$/, " y $1");
      const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
      const byDay = DIAS.map((d) => [d, zones.filter((z) => (z.dias || []).includes(d)).map((z) => z.comuna)]).filter(([, c]) => c.length);
      if (byDay.length) {
        $("#days").innerHTML = byDay.map(([d, c]) => `<li><b>${d}</b><span>${esc(c.join(" y "))}</span></li>`).join("");
        $("#days").style.gridTemplateColumns = `repeat(${Math.min(byDay.length, 5)}, 1fr)`;
      }
    }
    const pays = payOptions();
    $("#pay-badges").innerHTML = (pays.length ? pays.map(([, l]) => l) : ["Transferencia", "Pago en tienda"]).map((l) => `<span>${esc(l)}</span>`).join("");
    $("#perk-pay").textContent = pays.length ? pays.map(([, l]) => l).join(" · ") : "Coordinamos el pago por WhatsApp";
    $("#opt-pickup").hidden = s.pickup_enabled === false;
    if (s.pickup_enabled === false) $("#checkout-form").delivery.value = "despacho";
    $("#pay-options").innerHTML = pays.map(([k, l, d], i) => `<label class="opt"><input type="radio" name="payment" value="${k}" ${i === 0 ? "checked" : ""}><span><b>${esc(l)}</b><small>${esc(d)}</small></span></label>`).join("");
    $("#pay-none").hidden = pays.length > 0;
  }

  function syncFilterUI() {
    const f = state.filters;
    $$("[data-f-species]").forEach((b) => b.classList.toggle("on", b.dataset.fSpecies === f.species));
    $("#f-category").value = f.category; $("#f-brand").value = f.brand; $("#f-sort").value = f.sort;
    $("#search").value = f.q;
  }
  function setFilter(patch, scroll = true) {
    Object.assign(state.filters, patch);
    state.limit = 24;
    syncFilterUI(); renderGrid();
    if (scroll) $("#catalogo").scrollIntoView({ behavior: "smooth" });
  }

  // ---------------------------------------------------------------- product modal
  const productUrl = (p) => `${location.origin}${location.pathname}?p=${encodeURIComponent(p.slug)}`;
  function related(p) {
    const score = (x) => (x.category === p.category ? 2 : 0) + (x.brand && x.brand === p.brand ? 1 : 0) + (x.species === p.species || x.species === "ambos" ? 1 : 0) + (x.image_url ? 0.5 : 0);
    return state.products.filter((x) => x.id !== p.id && !x.product_variants.every(isOut)).sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, "es")).slice(0, 4);
  }
  function openProduct(pid, imgIdx = 0) {
    const p = state.products.find((x) => x.id === pid);
    if (!p) return;
    const v = selectedVariant(p);
    const off = v.compare_at_price > v.price;
    const imgs = allImages(p);
    const main = imgs[imgIdx] || null;
    const stockTxt = isOut(v) ? ["no", "Sin stock"] : v.stock != null && v.stock <= 5 ? ["low", `¡Últimas ${v.stock} unidades!`] : ["ok", "✓ Disponible"];
    const rel = related(p);
    const relMinPrice = (x) => Math.min(...x.product_variants.map((y) => y.price));
    if (new URLSearchParams(location.search).get("p") !== p.slug && !new URLSearchParams(location.search).get("pedido")) history.replaceState({}, "", `?p=${encodeURIComponent(p.slug)}`);
    document.title = `${p.name} · Planeta 4 Patas`;
    $("#product-body").innerHTML = `
      <button class="icon-btn modal-x" data-close-modal aria-label="Cerrar">✕</button>
      <div><div class="pd-media">${main ? `<img src="${esc(main)}" alt="${esc(p.name)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false">${placeholder(p, true)}` : placeholder(p)}</div>
        ${imgs.length > 1 ? `<div class="pd-thumbs">${imgs.map((u, i) => `<button data-pimg="${i}" data-p="${p.id}" class="${i === imgIdx ? "on" : ""}" aria-label="Foto ${i + 1}"><img src="${esc(u)}" alt=""></button>`).join("")}</div>` : ""}</div>
      <div class="pd-body">
        <span class="card-brand">${esc(p.brand || "")}</span>
        <h2>${esc(p.name)}</h2>
        <div class="pd-tags">
          <span>${p.species === "perro" ? "🐶 Perros" : p.species === "gato" ? "🐱 Gatos" : "🐶🐱 Perros y gatos"}</span>
          ${p.life_stage ? `<span>${esc(p.life_stage)}</span>` : ""}
          <span>${esc(catOf(p.category)?.name || "")}</span>
        </div>
        <p>${esc(p.description || "")}</p>
        <div class="variants">${p.product_variants.map((x) =>
          `<button data-pvariant="${x.id}" data-p="${p.id}" class="${x.id === v.id ? "on" : ""}" ${isOut(x) ? "disabled" : ""}>${esc(x.label)}</button>`).join("")}</div>
        <div class="price-row"><span class="price">${clp(v.price)}</span>${off ? `<span class="compare">${clp(v.compare_at_price)}</span>` : ""}</div>
        <span class="pd-stock ${stockTxt[0]}">${stockTxt[1]}</span>${v.sku ? `<small class="muted">Código: ${esc(v.sku)}</small>` : ""}
        <div class="pd-buy">
          <div class="qty"><button data-pq="-1" aria-label="Menos">−</button><span id="pd-qty">1</span><button data-pq="1" aria-label="Más">+</button></div>
          <button class="btn btn-orange btn-lg" data-padd="${v.id}" ${isOut(v) ? "disabled" : ""}>Agregar al carrito</button>
        </div>
        <a class="pd-share" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`Mira este producto en Planeta 4 Patas 🐾 ${p.name}: ${productUrl(p)}`)}">💬 Compartir por WhatsApp</a>
      </div>
      ${rel.length ? `<div class="related"><h3>También te puede gustar</h3><div class="related-row">${rel.map((x) => `
        <button class="rel" data-open="${x.id}"><div class="rel-img">${x.image_url ? `<img src="${esc(x.image_url)}" alt="" loading="lazy">` : placeholder(x)}</div><b>${esc(x.name)}</b><span>${x.product_variants.length > 1 ? "desde " : ""}${clp(relMinPrice(x))}</span></button>`).join("")}</div></div>` : ""}`;
    $("#product-modal").hidden = false;
    $("#product-modal").scrollTop = 0;
    document.body.style.overflow = "hidden";
  }
  function closeModals() {
    $$(".modal").forEach((m) => (m.hidden = true));
    document.body.style.overflow = "";
    if (new URLSearchParams(location.search).get("p")) history.replaceState({}, "", location.pathname);
    document.title = "Planeta 4 Patas · Pet Shop en La Florida";
  }

  // ---------------------------------------------------------------- checkout
  function shippingCost() {
    const f = $("#checkout-form");
    if (f.delivery.value !== "despacho") return 0;
    if (state.discount?.free_shipping) return 0;
    const sub = cartSubtotal();
    return state.settings.free_shipping_from && sub >= state.settings.free_shipping_from ? 0 : state.settings.shipping_fee;
  }
  const discountAmount = () => Math.min(state.discount?.amount || 0, cartSubtotal());

  async function applyCoupon() {
    const code = $("#co-code").value.trim().toUpperCase();
    const msg = $("#co-code-msg");
    if (!code) { state.discount = null; msg.textContent = ""; renderCheckout(); return; }
    if (!LIVE) { msg.className = "coupon-msg bad"; msg.textContent = "Los códigos funcionan con la tienda conectada"; return; }
    $("#co-apply").disabled = true;
    try {
      const d = await rest("rpc/eval_discount", { method: "POST", body: JSON.stringify({ p_code: code, p_subtotal: cartSubtotal(), p_email: $("#checkout-form").email.value.trim() || null }) });
      if (d.ok) {
        state.discount = d;
        msg.className = "coupon-msg ok";
        msg.textContent = `✓ ${d.kind === "free_shipping" ? "¡Despacho gratis aplicado!" : `Descuento de ${clp(d.amount)} aplicado`}`;
      } else { state.discount = null; msg.className = "coupon-msg bad"; msg.textContent = d.error; }
    } catch { msg.className = "coupon-msg bad"; msg.textContent = "No pudimos validar el código"; }
    $("#co-apply").disabled = false;
    renderCheckout();
  }

  function whatsappOrder(f) {
    const lines = cartLines(), ship = shippingCost(), disc = discountAmount(), sub = cartSubtotal();
    const isShip = f.delivery.value === "despacho";
    const txt = [
      "¡Hola Planeta 4 Patas! 🐾 Quiero hacer este pedido:", "",
      ...lines.map((l) => `• ${l.qty} × ${l.p.name} ${l.v.label}${l.v.sku ? ` [${l.v.sku}]` : ""} — ${clp(l.v.price * l.qty)}`), "",
      `Subtotal: ${clp(sub)}`, disc ? `Descuento ${state.discount.code}: -${clp(disc)}` : "", isShip ? `Despacho: ${ship ? clp(ship) : "gratis"}` : "Retiro en tienda",
      `*Total: ${clp(sub - disc + ship)}*`, "",
      `Nombre: ${f.name.value.trim()}`, `Teléfono: ${f.phone.value.trim()}`, `Correo: ${f.email.value.trim()}`,
      isShip ? `Dirección: ${f.address.value.trim()}${f.detail.value.trim() ? `, ${f.detail.value.trim()}` : ""}, ${f.comuna.value}` : "",
      f.notes.value.trim() ? `Comentario: ${f.notes.value.trim()}` : "",
    ].filter((x) => x !== "").join("\n");
    const url = waLink(txt);
    const w = window.open(url, "_blank");
    if (w) w.opener = null; else location.href = url; // si el navegador bloquea la ventana, abre WhatsApp aquí mismo
  }
  function renderCheckout() {
    const f = $("#checkout-form");
    const isShip = f.delivery.value === "despacho";
    $("#ship-fields").hidden = !isShip;
    const zone = state.settings.delivery_zones.find((z) => z.comuna === f.comuna.value);
    $("#ship-day").textContent = zone ? `📅 Despachamos en ${zone.comuna} los días ${zone.dias.join(" y ")}` : "";
    const sub = cartSubtotal(), ship = shippingCost(), disc = discountAmount();
    $("#co-items").innerHTML = cartLines().map((l) =>
      `<div class="co-line"><span>${l.qty} × ${esc(l.p.name)} ${esc(l.v.label)}</span><span>${clp(l.v.price * l.qty)}</span></div>`).join("");
    $("#co-subtotal").textContent = clp(sub);
    $("#co-disc-row").hidden = !disc;
    $("#co-discount").textContent = `-${clp(disc)}`;
    $("#co-disc-code").textContent = state.discount?.code ? `(${state.discount.code})` : "";
    $("#co-shipping").textContent = !isShip ? "Retiro gratis" : ship === 0 ? "¡GRATIS!" : clp(ship);
    $("#co-total").textContent = clp(sub - disc + ship);
    const pays = payOptions();
    const pm = f.payment?.value;
    $("#co-submit").textContent = !pays.length ? "💬 Enviar pedido por WhatsApp" : pm === "transferencia" ? `Confirmar pedido · ${clp(sub - disc + ship)}` : `Pagar ${clp(sub - disc + ship)}`;
    $(".secure").textContent = !pays.length ? "Te abriremos WhatsApp con tu pedido listo para enviar." : pm === "transferencia" ? "🏦 Te mostraremos los datos para transferir." : "🔒 Serás redirigido al sitio seguro de pago.";
  }
  function openCheckout() {
    if (!state.cart.length) return;
    closeCart();
    const sel = $("#co-comuna");
    sel.innerHTML = state.settings.delivery_zones.map((z) => `<option>${esc(z.comuna)}</option>`).join("");
    $("#co-error").textContent = "";
    renderCheckout();
    prefillFromPromo();
    $("#checkout-modal").hidden = false;
    document.body.style.overflow = "hidden";
  }

  function validate(f) {
    const errs = [];
    const mark = (el, bad) => { el.classList.toggle("invalid", bad); if (bad) errs.push(el); };
    mark(f.name, f.name.value.trim().length < 3);
    mark(f.email, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim()));
    mark(f.phone, f.phone.value.replace(/\D/g, "").length < 8);
    if (f.delivery.value === "despacho") mark(f.address, f.address.value.trim().length < 5);
    else f.address.classList.remove("invalid");
    return errs;
  }

  async function submitCheckout(e) {
    e.preventDefault();
    const f = e.target;
    const errs = validate(f);
    if (errs.length) { $("#co-error").textContent = "Revisa los campos marcados en rojo."; errs[0].focus(); return; }
    const btn = $("#co-submit");
    btn.disabled = true; btn.textContent = "Procesando…"; $("#co-error").textContent = "";

    if (LIVE && !payOptions().length) {
      whatsappOrder(f);
      btn.disabled = false; renderCheckout();
      $("#co-error").textContent = "";
      toast("¡Listo! Envía el mensaje en WhatsApp para confirmar tu pedido 🐾");
      return;
    }

    const payload = {
      items: state.cart,
      customer: { name: f.name.value, email: f.email.value, phone: f.phone.value, rut: f.rut.value },
      delivery: { method: f.delivery.value, comuna: f.comuna.value, address: f.address.value, detail: f.detail.value, notes: f.notes.value },
      payment_method: f.payment?.value || "mercadopago",
      discount_code: state.discount?.code || null,
    };

    if (!LIVE) {
      // Modo demo: simula un pedido pagado
      const lines = cartLines();
      const sub = cartSubtotal() - discountAmount(), ship = shippingCost();
      sessionDemoOrder = {
        number: 1001, status: "pagado", payment_method: payload.payment_method, customer_name: payload.customer.name,
        delivery_method: payload.delivery.method, comuna: payload.delivery.comuna, address: payload.delivery.address,
        delivery_day: state.settings.delivery_zones.find((z) => z.comuna === payload.delivery.comuna)?.dias.join(" / "),
        subtotal: sub, shipping: ship, total: sub + ship,
        items: lines.map((l) => ({ name: l.p.name, variant: l.v.label, qty: l.qty, line_total: l.v.price * l.qty })),
      };
      closeModals();
      history.pushState({}, "", "?pedido=demo&t=demo");
      route();
      return;
    }

    try {
      const r = await fetch(`${API}/functions/v1/checkout`, {
        method: "POST", headers: { ...HEADERS, "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "No pudimos procesar tu pedido");
      if (data.redirect_url) { location.href = data.redirect_url; return; }
      if (data.webpay) {
        const form = document.createElement("form");
        form.method = "POST"; form.action = data.webpay.url;
        form.innerHTML = `<input type="hidden" name="token_ws" value="${esc(data.webpay.token)}">`;
        document.body.appendChild(form); form.submit(); return;
      }
      throw new Error("Respuesta inesperada del servidor");
    } catch (err) {
      $("#co-error").textContent = err.message;
      btn.disabled = false; renderCheckout();
    }
  }

  // ---------------------------------------------------------------- order status
  let sessionDemoOrder = null;
  const STATUS = {
    pendiente_pago: ["⏳", "Estamos confirmando tu pago", "Esto toma solo unos segundos…"],
    pagado: ["🎉", "¡Gracias por tu compra!", "Tu pago fue aprobado y ya estamos preparando tu pedido."],
    preparando: ["📦", "Preparando tu pedido", "Estamos armando tu pedido con mucho cariño."],
    despachado: ["🚚", "¡Tu pedido va en camino!", "Pronto llegará a tu casa."],
    entregado: ["✅", "Pedido entregado", "¡Que lo disfrute tu mascota!"],
    rechazado: ["😿", "El pago no se completó", "No se realizó ningún cobro. Puedes intentarlo nuevamente."],
    cancelado: ["❌", "Pedido cancelado", "Si tienes dudas, escríbenos por WhatsApp."],
  };

  async function fetchOrder(id, token) {
    if (id === "demo") return sessionDemoOrder;
    if (!LIVE) return null;
    return rest("rpc/get_order_status", { method: "POST", body: JSON.stringify({ p_id: id, p_token: token }) });
  }

  function renderOrder(o) {
    const view = $("#order-view");
    if (!o) {
      view.innerHTML = `<div class="wrap"><div class="order-card"><div class="order-icon">🔎</div><h1>No encontramos tu pedido</h1>
        <p class="muted">Revisa el enlace o escríbenos por WhatsApp.</p><div class="order-actions"><a class="btn btn-blue" href="./">Volver a la tienda</a></div></div></div>`;
      return;
    }
    const transfer = o.payment_method === "transferencia" && o.status === "pendiente_pago";
    const [icon, title, sub] = transfer
      ? ["🏦", "¡Pedido recibido!", "Transfiere el total para que lo preparemos."]
      : STATUS[o.status] || STATUS.pendiente_pago;
    const ok = ["pagado", "preparando", "despachado", "entregado"].includes(o.status);
    if (ok) { state.cart = []; saveCart(); }
    const entrega = o.delivery_method === "despacho"
      ? `🚚 Despacho a ${esc(o.address || "")}, ${esc(o.comuna || "")}${o.delivery_day ? ` · días de reparto: ${esc(o.delivery_day)}` : ""}`
      : "🏪 Retiro en tienda · Vicuña Mackenna 10492, La Florida";
    view.innerHTML = `<div class="wrap"><div class="order-card">
      <div class="order-icon">${icon}</div>
      <h1>${title}</h1>
      <p>Pedido <span class="num">#${esc(o.number)}</span> · ${esc(sub)}</p>
      ${o.status === "pendiente_pago" && !transfer ? `<div class="spinner" aria-label="Cargando"></div>` : ""}
      ${transfer ? `<div class="transfer-box"><b>Datos para transferir ${clp(o.total)}</b>\n${esc(o.transfer_info || "Te enviaremos los datos por WhatsApp.")}\n\n<small>Envíanos el comprobante por WhatsApp indicando el pedido #${esc(o.number)}.</small></div>` : ""}
      <div class="order-items">
        ${(o.items || []).map((i) => `<div class="co-line"><span>${i.qty} × ${esc(i.name)} ${esc(i.variant || "")}</span><span>${clp(i.line_total)}</span></div>`).join("")}
        ${o.discount ? `<div class="co-line"><span>Descuento${o.discount_code ? ` (${esc(o.discount_code)})` : ""}</span><span>-${clp(o.discount)}</span></div>` : ""}
        <div class="co-line"><span>Despacho</span><span>${o.shipping ? clp(o.shipping) : "Gratis"}</span></div>
        <div class="row total"><span>Total</span><b>${clp(o.total)}</b></div>
      </div>
      <p class="muted">${entrega}</p>
      <div class="order-actions">
        ${o.status === "rechazado" ? `<button class="btn btn-orange" id="retry">Intentar nuevamente</button>` : ""}
        <a class="btn btn-green" target="_blank" rel="noopener" href="${waLink(`¡Hola Planeta 4 Patas! 🐾 Hice el pedido #${o.number}`)}">💬 Escribir por WhatsApp</a>
        <a class="btn btn-blue" href="./">Seguir comprando</a>
      </div>
    </div></div>`;
    const retry = $("#retry");
    if (retry) retry.onclick = () => { history.pushState({}, "", "./"); route(); openCart(); };
  }

  async function showOrder(params) {
    $("#store").hidden = true;
    const view = $("#order-view");
    view.hidden = false;
    view.innerHTML = `<div class="wrap"><div class="order-card"><div class="spinner"></div><p>Cargando tu pedido…</p></div></div>`;
    window.scrollTo(0, 0);
    const id = params.get("pedido"), token = params.get("t");

    // Retorno de Mercado Pago: pide al servidor verificar el pago de inmediato
    const mpPayment = params.get("payment_id") || params.get("collection_id");
    if (LIVE && mpPayment && mpPayment !== "null") {
      fetch(`${API}/functions/v1/mp-webhook`, {
        method: "POST", headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "payment", data: { id: mpPayment } }),
      }).catch(() => {});
    }

    let tries = 0, o = null;
    const tick = async () => {
      try { o = await fetchOrder(id, token); } catch { o = null; }
      renderOrder(o);
      if (o && o.status === "pendiente_pago" && o.payment_method !== "transferencia" && tries++ < 20) setTimeout(tick, 3000);
    };
    tick();
  }

  function route() {
    const params = new URLSearchParams(location.search);
    if (params.get("pedido")) { showOrder(params); return; }
    $("#order-view").hidden = true;
    $("#store").hidden = false;
    if (params.get("pago") === "error") toast("No pudimos completar el pago. Intenta nuevamente.");
    const slug = params.get("p");
    if (slug) {
      const p = state.products.find((x) => x.slug === slug);
      if (p) openProduct(p.id); else history.replaceState({}, "", location.pathname);
    }
  }

  // ---------------------------------------------------------------- pop-up promocional
  const PROMO_KEY = "p4p_promo_v1";
  const promoGet = () => { try { return JSON.parse(localStorage.getItem(PROMO_KEY)) || {}; } catch { return {}; } };
  const promoSet = (o) => { try { localStorage.setItem(PROMO_KEY, JSON.stringify({ ...promoGet(), ...o })); } catch { /* sin almacenamiento */ } };
  const busy = () => !$("#order-view").hidden || !$("#checkout-modal").hidden || !$("#product-modal").hidden || $("#cart").classList.contains("open");

  function setupPromo() {
    const s = state.settings;
    const force = new URLSearchParams(location.search).has("popup"); // vista previa desde el panel
    if (!LIVE || (!s.popup_enabled && !force)) return;
    const ps = promoGet();
    if (!force && (ps.subscribed || (ps.closedAt && Date.now() - ps.closedAt < (s.popup_frequency_days || 7) * 864e5))) return;
    let shown = false, waiting = false;
    const show = () => {
      if (shown || waiting) return;
      if (busy()) { waiting = true; setTimeout(() => { waiting = false; show(); }, 4000); return; } // no interrumpir una compra
      shown = true; openPromo();
    };
    setTimeout(show, force ? 300 : Math.max(0, s.popup_delay ?? 6) * 1000);
    if (matchMedia("(pointer: fine)").matches) document.addEventListener("mouseout", (e) => { if (!e.relatedTarget && e.clientY <= 0) show(); });
  }

  function openPromo() {
    const s = state.settings, el = $("#promo");
    el.innerHTML = `<div class="promo-box">
      <button class="promo-x" type="button" data-promo-close aria-label="Cerrar">✕</button>
      ${s.popup_image ? `<img class="promo-img" src="${esc(s.popup_image)}" alt="">` : `<div class="promo-emo" aria-hidden="true">🐾</div>`}
      <div class="promo-body" id="promo-body">
        <h2 id="promo-title">${esc(s.popup_title || "¡Únete a la manada! 🐾")}</h2>
        ${s.popup_text ? `<p>${esc(s.popup_text)}</p>` : ""}
        <form id="promo-form" novalidate>
          <input name="name" placeholder="Tu nombre" autocomplete="given-name" maxlength="80" aria-label="Tu nombre">
          <input name="email" type="email" placeholder="Tu correo" autocomplete="email" maxlength="120" aria-label="Tu correo">
          ${s.popup_ask_phone ? `<input name="phone" type="tel" placeholder="WhatsApp (opcional)" autocomplete="tel" maxlength="20" aria-label="WhatsApp">` : ""}
          ${s.popup_ask_pet ? `<fieldset class="promo-pets"><legend>¿Qué mascota tienes?</legend>
            ${[["perro", "🐶 Perro"], ["gato", "🐱 Gato"], ["ambos", "🐶🐱 Ambos"], ["otro", "🐾 Otro"]].map(([v, l]) => `<label><input type="radio" name="pet" value="${v}"><span>${l}</span></label>`).join("")}</fieldset>` : ""}
          <p class="promo-err" id="promo-err" role="alert"></p>
          <button class="btn btn-orange btn-block" type="submit">${esc(s.popup_button || "Quiero mi descuento")}</button>
          <small class="promo-legal">Al registrarte aceptas recibir novedades y promociones de ${esc(s.store_name || "Planeta 4 Patas")}. Puedes pedir la baja cuando quieras.</small>
        </form>
        <button class="promo-no" type="button" data-promo-close>No, gracias</button>
      </div></div>`;
    el.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => el.classList.add("show"), 10);
    $("#promo-form").addEventListener("submit", submitPromo);
  }

  function closePromo() {
    const el = $("#promo");
    if (el.hidden) return;
    if (!promoGet().subscribed) promoSet({ closedAt: Date.now() });
    el.hidden = true; el.classList.remove("show");
    if ($("#checkout-modal").hidden && $("#product-modal").hidden) document.body.style.overflow = "";
  }

  async function submitPromo(e) {
    e.preventDefault();
    const f = e.target, err = $("#promo-err"), btn = f.querySelector("button[type=submit]");
    const name = f.elements.name.value.trim(), email = f.elements.email.value.trim();
    f.querySelectorAll(".invalid").forEach((x) => x.classList.remove("invalid"));
    if (!name) { f.elements.name.classList.add("invalid"); err.textContent = "Cuéntanos tu nombre"; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) { f.elements.email.classList.add("invalid"); err.textContent = "Revisa que tu correo esté bien escrito"; return; }
    err.textContent = ""; btn.disabled = true; btn.textContent = "Enviando…";
    try {
      const r = await rest("rpc/subscribe", { method: "POST", body: JSON.stringify({
        p_email: email, p_name: name, p_phone: f.elements.phone?.value.trim() || null, p_pet: f.elements.pet?.value || null, p_source: "popup" }) });
      if (!r.ok) throw new Error(r.error);
      promoSet({ subscribed: true, email, name, code: r.code || null });
      const s = state.settings;
      $("#promo-body").innerHTML = `<h2 id="promo-title">¡Gracias, ${esc(name.split(" ")[0])}! 🎉</h2>
        ${r.code ? `<p>${esc(s.popup_success || "Usa este código al pagar:")}</p>
          <div class="promo-code"><b>${esc(r.code)}</b><button class="btn btn-blue" type="button" id="promo-copy">Copiar</button></div>
          <p class="promo-legal">Lo aplicamos automáticamente al pagar. Usa el mismo correo (${esc(email)}).</p>`
          : `<p>Te avisaremos de nuestras novedades y promociones.</p>`}
        <button class="btn btn-orange btn-block" type="button" data-promo-close>Ir a comprar</button>`;
      $("#promo-copy")?.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(r.code); toast("Código copiado ✓"); } catch { toast(`Tu código: ${r.code}`); }
      });
    } catch (ex) {
      err.textContent = ex.message && !/^\{/.test(ex.message) ? ex.message : "No pudimos registrarte. Intenta de nuevo.";
      btn.disabled = false; btn.textContent = state.settings.popup_button || "Quiero mi descuento";
    }
  }

  // Al abrir el checkout: completa correo/nombre y aplica el código del pop-up
  function prefillFromPromo() {
    const ps = promoGet(), f = $("#checkout-form");
    if (!ps.subscribed) return;
    if (ps.email && !f.email.value) f.email.value = ps.email;
    if (ps.name && !f.elements.name.value) f.elements.name.value = ps.name;
    if (ps.code && !state.discount && !$("#co-code").value) { $("#co-code").value = ps.code; applyCoupon(); }
  }

  // ---------------------------------------------------------------- events
  function bind() {
    document.addEventListener("click", (e) => {
      const t = e.target.closest("button, a");
      if (!t) {
        if (e.target.classList.contains("modal")) closeModals();
        return;
      }
      const d = t.dataset;
      if (d.add) addToCart(d.add);
      else if (d.variant) { state.selected[d.p] = d.variant; renderGrid(); }
      else if (d.open) openProduct(d.open);
      else if (d.pvariant) { state.selected[d.p] = d.pvariant; openProduct(d.p, +($(".pd-thumbs .on")?.dataset.pimg || 0)); renderGrid(); }
      else if (d.pimg) openProduct(d.p, +d.pimg);
      else if (d.pq) { const el = $("#pd-qty"); el.textContent = Math.max(1, Math.min(99, +el.textContent + +d.pq)); }
      else if (d.padd) { addToCart(d.padd, +$("#pd-qty").textContent); closeModals(); }
      else if (d.inc) { const l = state.cart.find((x) => x.variant_id === d.inc); setQty(d.inc, l.qty + 1); }
      else if (d.dec) { const l = state.cart.find((x) => x.variant_id === d.dec); setQty(d.dec, l.qty - 1); }
      else if (d.rm) setQty(d.rm, 0);
      else if (d.cat) setFilter({ category: d.cat, species: "", brand: "", q: "" });
      else if (d.brand) setFilter({ brand: d.brand, category: "", species: "", q: "" });
      else if (d.fSpecies !== undefined) setFilter({ species: d.fSpecies }, false);
      else if (d.species && t.tagName === "A") { e.preventDefault(); setFilter({ species: d.species, category: "", brand: "" }); }
      else if ("close" in d) closeCart();
      else if ("closeModal" in d) closeModals();
    });
    $("#open-cart").onclick = openCart;
    $("#more").onclick = () => { state.limit += 24; renderGrid(); };
    $("#scrim").onclick = closeCart;
    $("#go-checkout").onclick = openCheckout;
    $("#clear-filters").onclick = () => setFilter({ q: "", species: "", category: "", brand: "", sort: "featured" }, false);
    $("#f-category").onchange = (e) => setFilter({ category: e.target.value }, false);
    $("#f-brand").onchange = (e) => setFilter({ brand: e.target.value }, false);
    $("#f-sort").onchange = (e) => setFilter({ sort: e.target.value }, false);
    let deb;
    $("#search").addEventListener("input", (e) => {
      clearTimeout(deb);
      deb = setTimeout(() => {
        if ($("#store").hidden) { history.pushState({}, "", "./"); route(); }
        setFilter(e.target.value ? { q: e.target.value, category: "", species: "", brand: "" } : { q: "" }, e.target.value.length > 1);
      }, 250);
    });
    const form = $("#checkout-form");
    form.addEventListener("change", renderCheckout);
    form.addEventListener("input", (e) => { e.target.classList.remove("invalid"); $("#co-error").textContent = ""; });
    form.addEventListener("submit", submitCheckout);
    $("#co-apply").onclick = applyCoupon;
    $("#co-code").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!$("#promo").hidden) return closePromo(); closeModals(); closeCart(); } });
    $("#promo").addEventListener("click", (e) => { if (e.target.id === "promo" || e.target.closest("[data-promo-close]")) closePromo(); });
    window.addEventListener("popstate", route);
  }

  // ---------------------------------------------------------------- init
  (async function init() {
    bind();
    try { await loadData(); }
    catch (err) {
      console.error(err);
      $("#grid").innerHTML = `<p class="empty">No pudimos cargar los productos. Recarga la página 🐾</p>`;
    }
    renderStatic(); renderGrid(); renderCart(); route();
    setupPromo();
  })();
})();
