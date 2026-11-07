/* =====================================================================
   Panel · Arranque: acceso, avisos en tiempo real, búsqueda global
   ===================================================================== */
(() => {
  const { $, esc, clp } = A;
  const ADMIN_URL = location.href.split("#")[0].split("?")[0];

  if (!A.CFG.SUPABASE_URL || !A.CFG.SUPABASE_ANON_KEY) {
    document.body.innerHTML = `<div class="auth"><div class="auth-card"><h1>Panel no configurado</h1><p class="lead">Completa SUPABASE_URL y SUPABASE_ANON_KEY en assets/config.js.</p></div></div>`;
    return;
  }

  // ------------------------------------------------------------ acceso
  const card = (html) => { $("#app-view").hidden = true; $("#auth-view").hidden = false; $("#auth-card").innerHTML = `<img src="assets/logo.jpg" alt="Planeta 4 Patas">${html}`; };
  const passField = (name = "password", label = "Contraseña", ac = "current-password") =>
    `<label class="f">${label}<input name="${name}" type="password" required minlength="8" autocomplete="${ac}"></label>`;

  function viewLogin(msg = "", ok = false) {
    card(`<h1>Panel de la tienda</h1><p class="lead">Ingresa con tu cuenta de administrador</p>
      ${msg ? `<div class="banner ${ok ? "ok" : "bad"}"><div>${msg}</div></div>` : ""}
      <form id="f-login"><label class="f">Correo<input name="email" type="email" required autocomplete="username"></label>${passField()}
      <p class="form-error" id="f-err"></p><button class="btn btn-orange">Ingresar</button></form>
      <div class="auth-links"><button data-v="signup">¿Primera vez? Crear cuenta</button><button data-v="forgot">Olvidé mi contraseña</button></div>`);
    $("#f-login").onsubmit = async (e) => {
      e.preventDefault(); const f = e.target, b = f.querySelector("button"); b.disabled = true;
      const { error } = await A.sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
      b.disabled = false;
      if (error) { $("#f-err").textContent = /confirm/i.test(error.message) ? "Debes confirmar tu correo: revisa tu bandeja (y spam) y abre el enlace." : "Correo o contraseña incorrectos."; return; }
      start();
    };
    bindLinks();
  }
  function viewSignup() {
    card(`<h1>Crear cuenta</h1><p class="lead">Usa el correo con el que fuiste invitado al panel</p>
      <form id="f-signup"><label class="f">Correo<input name="email" type="email" required autocomplete="username"></label>
      ${passField("password", "Contraseña <small>(mínimo 8 caracteres)</small>", "new-password")}${passField("password2", "Repite la contraseña", "new-password")}
      <p class="form-error" id="f-err"></p><button class="btn btn-orange">Crear cuenta</button></form>
      <div class="auth-links"><button data-v="login">← Ya tengo cuenta</button></div>`);
    $("#f-signup").onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      if (f.password.value !== f.password2.value) { $("#f-err").textContent = "Las contraseñas no coinciden."; return; }
      const b = f.querySelector("button"); b.disabled = true;
      const { data, error } = await A.sb.auth.signUp({ email: f.email.value.trim(), password: f.password.value, options: { emailRedirectTo: ADMIN_URL } });
      b.disabled = false;
      if (error) { $("#f-err").textContent = /rate|limit/i.test(error.message) ? "Se enviaron demasiados correos. Espera unos minutos y vuelve a intentar." : error.message; return; }
      if (data.session) return start();
      viewLogin(`<b>¡Listo! Revisa tu correo</b>Te enviamos un enlace para confirmar tu cuenta (revisa también spam). Ábrelo y luego vuelve aquí a ingresar.
        <br><small>Si el enlace te lleva a una página que no carga, no importa: tu correo ya quedó confirmado.</small>`, true);
    };
    bindLinks();
  }
  function viewForgot() {
    card(`<h1>Recuperar contraseña</h1><p class="lead">Te enviaremos un enlace para crear una nueva</p>
      <form id="f-forgot"><label class="f">Correo<input name="email" type="email" required autocomplete="username"></label>
      <p class="form-error" id="f-err"></p><button class="btn btn-orange">Enviar enlace</button></form>
      <div class="auth-links"><button data-v="login">← Volver</button></div>`);
    $("#f-forgot").onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      const { error } = await A.sb.auth.resetPasswordForEmail(f.email.value.trim(), { redirectTo: ADMIN_URL });
      if (error) { $("#f-err").textContent = error.message; return; }
      viewLogin("<b>Revisa tu correo</b>Si el correo tiene cuenta, recibirás un enlace para crear una nueva contraseña.", true);
    };
    bindLinks();
  }
  function viewReset() {
    card(`<h1>Nueva contraseña</h1><p class="lead">Elige una contraseña nueva para tu cuenta</p>
      <form id="f-reset">${passField("password", "Nueva contraseña", "new-password")}${passField("password2", "Repite la contraseña", "new-password")}
      <p class="form-error" id="f-err"></p><button class="btn btn-orange">Guardar contraseña</button></form>`);
    $("#f-reset").onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      if (f.password.value !== f.password2.value) { $("#f-err").textContent = "Las contraseñas no coinciden."; return; }
      const { error } = await A.sb.auth.updateUser({ password: f.password.value });
      if (error) { $("#f-err").textContent = error.message; return; }
      history.replaceState(null, "", ADMIN_URL); A.toast("Contraseña actualizada"); start();
    };
  }
  function viewNoAccess(email) {
    card(`<h1>Sin acceso</h1><p class="lead">La cuenta <b>${esc(email)}</b> no tiene permisos de administrador.</p>
      <p class="muted center">Pide a un administrador que te invite desde Configuración → Equipo, y vuelve a ingresar.</p>
      <button class="btn" id="f-out">Cerrar sesión</button>`);
    $("#f-out").onclick = async () => { await A.sb.auth.signOut(); viewLogin(); };
  }
  function bindLinks() {
    $("#auth-card").querySelectorAll("[data-v]").forEach((b) => (b.onclick = () => ({ login: viewLogin, signup: viewSignup, forgot: viewForgot })[b.dataset.v]()));
  }

  // ------------------------------------------------------------ inicio de sesión correcto
  let started = false;
  async function start() {
    const { data: { session } } = await A.sb.auth.getSession();
    if (!session) return viewLogin();
    A.state.user = session.user;
    let isAdmin = false;
    try { isAdmin = await A.rpc("claim_admin_invite"); } catch { /* se verifica abajo */ }
    if (!isAdmin) {
      const row = await A.sb.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
      isAdmin = !!row.data;
    }
    if (!isAdmin) return viewNoAccess(session.user.email);

    $("#auth-view").hidden = true; $("#app-view").hidden = false;
    $("#who-email").textContent = session.user.email;
    $("#who-avatar").textContent = A.initials(session.user.email);
    if (started) return A.navigate();
    started = true;
    if (/access_token|type=|error=/.test(location.hash)) history.replaceState(null, "", ADMIN_URL + "#/");
    window.addEventListener("hashchange", A.navigate);
    A.navigate();
    A.refreshBadges();
    realtime();
    A.loadSettings().then((s) => { $("#side-foot").innerHTML = `${esc(s.store_name || "Planeta 4 Patas")}<br><a href="./" target="_blank" rel="noopener">${esc((s.site_url || "").replace(/^https?:\/\//, ""))}</a>`; }).catch(() => {});
  }

  A.refreshBadges = async () => {
    try {
      const n = await A.q(A.sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "pagado"));
      const el = $("#nav-orders-count"); el.hidden = !n; el.textContent = n;
      document.title = `${n ? `(${n}) ` : ""}Panel · Planeta 4 Patas`;
    } catch { /* sin conexión */ }
  };

  // ------------------------------------------------------------ avisos de pedidos en tiempo real
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [660, 880].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
        o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.18);
      });
    } catch { /* sin audio */ }
  }
  function notifyPaid(o) {
    beep();
    A.toast(`🎉 Nuevo pedido pagado #${o.number} · ${clp(o.total)}`);
    if ("Notification" in window && Notification.permission === "granted") {
      const n = new Notification(`Nuevo pedido #${o.number}`, { body: `${o.customer_name} · ${clp(o.total)}`, icon: "assets/logo.jpg", tag: o.id });
      n.onclick = () => { window.focus(); A.go(`/pedidos/${o.id}`); };
    }
    A.refreshBadges();
  }
  function realtime() {
    A.sb.channel("orders-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        const o = payload.new, old = payload.old || {};
        if (!o?.id) return;
        if (o.status === "pagado" && (payload.eventType === "INSERT" || old.status !== "pagado") && o.source === "web") notifyPaid(o);
        else A.refreshBadges();
      })
      .subscribe();
    if ("Notification" in window && Notification.permission === "default") {
      const b = document.createElement("button");
      b.className = "btn btn-sm"; b.style.cssText = "margin:0 10px 6px;justify-content:flex-start";
      b.title = "Te avisamos con sonido y notificación cuando entra un pedido pagado, aunque estés en otra pestaña";
      b.textContent = "🔔 Activar avisos de pedidos";
      b.onclick = async () => { const r = await Notification.requestPermission(); b.remove(); A.toast(r === "granted" ? "Avisos activados" : "Avisos no activados"); };
      $("#side-foot").before(b);
    }
    setInterval(A.refreshBadges, 120000);
  }

  // ------------------------------------------------------------ búsqueda global
  const gs = $("#gsearch"), gr = $("#gs-results");
  gs.addEventListener("input", A.debounce(async () => {
    const q = gs.value.trim();
    if (q.length < 2) { gr.hidden = true; return; }
    await A.loadCatalog();
    const prods = A.state.products.filter((p) => A.match(`${p.name} ${p.brand || ""} ${p.product_variants.map((v) => v.sku || "").join(" ")}`, q)).slice(0, 6);
    const safe = q.replace(/[%,()#]/g, " ").trim();
    const num = /^\d+$/.test(q.replace("#", "")) ? +q.replace("#", "") : null;
    let orders = [], custs = [];
    try {
      [orders, custs] = await Promise.all([
        A.q(A.sb.from("orders").select("id, number, customer_name, total, status, payment_method, paid_at, delivery_method").or(num ? `number.eq.${num},customer_phone.ilike.%${safe}%` : `customer_name.ilike.%${safe}%,customer_email.ilike.%${safe}%,customer_phone.ilike.%${safe}%`).order("created_at", { ascending: false }).limit(6)),
        A.q(A.sb.from("admin_customers").select("email, name, phone, orders_count").or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`).limit(5)),
      ]);
    } catch { /* búsqueda parcial */ }
    gr.innerHTML = (orders.length ? `<h4>Pedidos</h4>${orders.map((o) => `<a href="#/pedidos/${o.id}"><b>#${o.number}</b><span style="flex:1">${esc(o.customer_name)}</span>${A.payBadge(o)}<b>${clp(o.total)}</b></a>`).join("")}` : "") +
      (prods.length ? `<h4>Productos</h4>${prods.map((p) => `<a href="#/productos/${p.id}">${A.thumb(p.image_url, A.catEmoji(p.category))}<span style="flex:1"><b>${esc(p.name)}</b><br><small class="muted">${esc(p.brand || "")}</small></span>${p.active ? "" : A.badge("Oculto")}</a>`).join("")}` : "") +
      (custs.length ? `<h4>Clientes</h4>${custs.map((c) => `<a href="#/clientes/${encodeURIComponent(c.email)}"><span class="avatar">${esc(A.initials(c.name))}</span><span style="flex:1"><b>${esc(c.name)}</b><br><small class="muted">${esc(c.email)}</small></span><small>${c.orders_count} ped.</small></a>`).join("")}` : "") ||
      `<p class="muted" style="padding:10px;margin:0">Sin resultados para "${esc(q)}"</p>`;
    gr.hidden = false;
  }, 250));
  gs.addEventListener("keydown", (e) => { if (e.key === "Enter") { const a = gr.querySelector("a"); if (a) { location.hash = a.getAttribute("href"); gs.value = ""; gr.hidden = true; gs.blur(); } } if (e.key === "Escape") { gr.hidden = true; gs.blur(); } });
  gs.addEventListener("blur", () => setTimeout(() => (gr.hidden = true), 200));
  gr.addEventListener("click", () => { gs.value = ""; gr.hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); gs.focus(); } });

  // ------------------------------------------------------------ menú de usuario y móvil
  A.dropdown($("#who-btn"), $("#who-menu"));
  $("#logout").onclick = async () => { await A.sb.auth.signOut(); location.href = ADMIN_URL; };
  $("#change-pass").onclick = async () => {
    const r = await A.ask({ title: "Cambiar contraseña", ok: "Guardar", fields: [{ name: "p1", label: "Nueva contraseña (mínimo 8 caracteres)", type: "password", required: true }, { name: "p2", label: "Repite la contraseña", type: "password", required: true }] });
    if (!r) return;
    if (r.p1 !== r.p2 || r.p1.length < 8) return A.toast("Las contraseñas no coinciden o son muy cortas", true);
    const { error } = await A.sb.auth.updateUser({ password: r.p1 });
    error ? A.fail(error) : A.toast("Contraseña actualizada");
  };
  $("#menu-btn").onclick = (e) => { e.stopPropagation(); document.body.classList.toggle("nav-open"); };
  document.addEventListener("click", (e) => { if (document.body.classList.contains("nav-open") && !e.target.closest("#sidebar")) document.body.classList.remove("nav-open"); });

  // ------------------------------------------------------------ arranque
  const hashErr = new URLSearchParams(location.hash.replace(/^#/, "")).get("error_description");
  A.sb.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") viewReset(); });
  (async () => {
    const isRecovery = /type=recovery/.test(location.hash);
    const { data: { session } } = await A.sb.auth.getSession();
    if (hashErr) { history.replaceState(null, "", ADMIN_URL); return viewLogin(esc(hashErr.replace(/\+/g, " ")) + ". Vuelve a intentarlo."); }
    if (isRecovery && session) return viewReset();
    session ? start() : viewLogin();
  })();
})();
