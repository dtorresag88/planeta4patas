/* =====================================================================
   Panel · Códigos de barras: escanear con la cámara, buscar formatos e imprimir etiquetas
   ===================================================================== */
(() => {
  const { $, esc, clp } = A;
  const QR_LIB = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
  const BARCODE_LIB = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js";
  const loaded = {};
  const loadScript = (src) => (loaded[src] ||= new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => { delete loaded[src]; rej(new Error("No se pudo cargar " + src)); };
    document.head.appendChild(s);
  }));

  // Busca un formato por código de barras o SKU
  A.findByCode = (code) => {
    const c = String(code || "").trim().toLowerCase();
    if (!c) return null;
    for (const p of A.state.products || []) for (const v of p.product_variants) {
      if (!v.active) continue;
      if ((v.barcode && v.barcode.toLowerCase() === c) || (v.sku && String(v.sku).toLowerCase() === c)) return { p, v };
    }
    return null;
  };

  // Abre la cámara y devuelve el código leído (o el que se escriba a mano). null si se cierra.
  A.scan = (title = "Escanear código de barras") => new Promise((res) => {
    let done = false, scanner = null;
    const m = A.modal({
      title,
      body: `<div id="scan-view" class="scan-view"><p class="muted" style="color:#fff;padding:20px;margin:0">Abriendo la cámara…</p></div>
        <p class="help">Apunta la cámara trasera al código de barras. Si no funciona, escríbelo:</p>
        <form id="scan-manual" style="display:flex;gap:6px"><input id="scan-code" placeholder="Código de barras o SKU" autocomplete="off"><button class="btn btn-primary">Usar</button></form>
        <p class="form-error" id="scan-err"></p>`,
      onClose: () => { try { scanner?.stop().catch(() => {}); } catch { /* ya detenido */ } if (!done) res(null); },
    });
    const finish = (code) => { if (done) return; done = true; res(String(code).trim()); m.close(); };
    m.el.querySelector("#scan-manual").onsubmit = (e) => { e.preventDefault(); const v = m.el.querySelector("#scan-code").value.trim(); if (v) finish(v); };
    loadScript(QR_LIB).then(async () => {
      if (!m.el.isConnected) return;
      scanner = new window.Html5Qrcode("scan-view");
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: (w, h) => ({ width: Math.min(300, w * 0.85), height: Math.min(160, h * 0.6) }) },
        (text) => { if (navigator.vibrate) navigator.vibrate(80); finish(text); }, () => {});
    }).catch((err) => {
      const el = m.el.querySelector("#scan-err");
      if (el) el.textContent = `No pudimos abrir la cámara (${err?.message || err}). Revisa los permisos del navegador o escribe el código.`;
      const v = m.el.querySelector("#scan-view"); if (v) v.hidden = true;
    });
  });

  // Selector de producto/formato con buscador y escáner. Devuelve { p, v } o null.
  A.pickVariant = ({ title = "Agregar producto" } = {}) => new Promise((res) => {
    let picked = null;
    const m = A.modal({
      title, wide: true,
      body: `<div style="display:flex;gap:6px"><input id="pv-q" type="search" placeholder="Buscar por nombre, marca o código" style="flex:1"><button type="button" class="btn" id="pv-scan">📷 Escanear</button></div>
        <div id="pv-list" class="pv-list"></div>`,
      onClose: () => res(picked),
    });
    const rows = [];
    (A.state.products || []).forEach((p) => A.liveVariants(p).forEach((v) => rows.push({ p, v })));
    const draw = (q = "") => {
      const list = rows.filter(({ p, v }) => !q || A.match(`${p.name} ${p.brand || ""} ${v.label} ${v.sku || ""} ${v.barcode || ""}`, q)).slice(0, 40);
      m.el.querySelector("#pv-list").innerHTML = list.map(({ p, v }, i) => `<button type="button" class="pv-item" data-i="${rows.indexOf(list[i])}">
        ${A.thumb(p.image_url, A.catEmoji(p.category))}<span><b>${esc(p.name)}</b><small class="muted">${esc(v.label)}${v.sku ? ` · ${esc(v.sku)}` : ""}${v.stock != null ? ` · stock ${v.stock}` : ""}</small></span><b class="num">${clp(v.price)}</b></button>`).join("")
        || `<p class="muted">Sin resultados</p>`;
    };
    draw();
    m.el.querySelector("#pv-q").oninput = A.debounce((e) => draw(e.target.value), 120);
    m.el.querySelector("#pv-list").onclick = (e) => { const b = e.target.closest("[data-i]"); if (b) { picked = rows[+b.dataset.i]; m.close(); } };
    m.el.querySelector("#pv-scan").onclick = async () => {
      const code = await A.scan();
      if (!code) return;
      const hit = A.findByCode(code);
      if (hit) { picked = hit; m.close(); } else { A.toast(`No hay ningún producto con el código ${code}`, true); m.el.querySelector("#pv-q").value = code; draw(code); }
    };
  });

  // Asigna un código de barras leído a un formato
  A.assignBarcode = async (code) => {
    const hit = await A.pickVariant({ title: `¿A qué producto pertenece el código ${code}?` });
    if (!hit) return null;
    await A.q(A.sb.from("product_variants").update({ barcode: code }).eq("id", hit.v.id));
    hit.v.barcode = code;
    A.toast(`Código guardado en ${hit.p.name} ${hit.v.label}`);
    return hit;
  };

  // Etiquetas con precio y código de barras (hoja A4, 3 columnas)
  A.printLabels = async (items) => {
    if (!items.length) return A.toast("Nada que imprimir", true);
    try { await loadScript(BARCODE_LIB); } catch (err) { return A.fail(err); }
    const svgFor = (value) => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const ean = /^\d{13}$/.test(value);
      try { window.JsBarcode(svg, value, { format: ean ? "EAN13" : "CODE128", height: 42, width: 1.6, fontSize: 13, margin: 0, displayValue: true }); }
      catch { window.JsBarcode(svg, value, { format: "CODE128", height: 42, width: 1.6, fontSize: 13, margin: 0 }); }
      return svg.outerHTML;
    };
    const labels = [];
    items.forEach(({ p, v, qty = 1 }) => {
      const code = v.barcode || v.sku;
      const html = `<div class="lb"><b>${esc(p.name)}</b><span>${esc(v.label)}</span><div class="pr">${clp(v.price)}</div>${code ? svgFor(String(code)) : ""}</div>`;
      for (let i = 0; i < Math.min(qty, 200); i++) labels.push(html);
    });
    const w = window.open("", "_blank");
    if (!w) return A.toast("Permite las ventanas emergentes para imprimir", true);
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etiquetas</title><style>
      @page { size: A4; margin: 8mm; } body { margin: 0; font-family: Arial, sans-serif; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
      .lb { border: 1px dashed #bbb; border-radius: 2mm; padding: 2.5mm; height: 34mm; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; overflow: hidden; break-inside: avoid; }
      .lb b { font-size: 9pt; line-height: 1.15; max-height: 2.3em; overflow: hidden; } .lb span { font-size: 8pt; color: #444; }
      .pr { font-size: 15pt; font-weight: bold; } svg { max-width: 100%; height: 13mm; }
    </style></head><body><div class="grid">${labels.join("")}</div><script>setTimeout(() => print(), 300);<\/script></body></html>`);
    w.document.close();
  };
})();
