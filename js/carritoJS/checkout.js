// === Utilidades ===
function safeParsePrice(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const s = String(value).trim();
  const cleaned = s.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(num) {
  return Number(num || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getSubtotal() {
  try {
    const cart = JSON.parse(localStorage.getItem("mutaCart")) || [];
    return cart.reduce((s, p) => s + (Number(p.price || 0) * Number(p.quantity || 0)), 0);
  } catch {
    return 0;
  }
}

// === Overlay helpers ===
function mostrarOverlay(ruta, openerEl = null) {
  const overlayContainer = document.getElementById("checkout-overlay");

  // Si no existe overlay, crearlo
  let overlay = overlayContainer.querySelector(".overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "overlay";
    overlayContainer.appendChild(overlay);
    document.body.classList.add("modal-open");
  }

  overlay.innerHTML = `<div class="loading">Cargando...</div>`;

  return fetch(ruta)
    .then(r => r.text())
    .then(html => {
      overlay.innerHTML = html;
      overlay.style.display = "flex";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      if (openerEl && openerEl.id) overlay.dataset.openerId = openerEl.id;
      trapFocus(overlay);
      return overlay;
    });
}

function waitForOverlayElement(selector, timeout = 5000) {
  const container = document.getElementById("checkout-overlay");
  return new Promise((resolve, reject) => {
    const found = container.querySelector(selector);
    if (found) return resolve(found);
    const obs = new MutationObserver(() => {
      const el = container.querySelector(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });
    obs.observe(container, { childList: true, subtree: true });
    setTimeout(() => {
      obs.disconnect();
      reject(new Error("Timeout esperando elemento en overlay"));
    }, timeout);
  });
}

// === Focus trap ===
function trapFocus(modal) {
  const focusableSelector = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
  const focusables = Array.from(modal.querySelectorAll(focusableSelector)).filter(el => !el.disabled);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  first.focus();

  function handleKey(e) {
    if (e.key === "Tab") {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    } else if (e.key === "Escape") {
      const close = modal.querySelector(".cerrar-modal, .cerrar-mapa");
      if (close) close.click();
    }
  }
  modal.__focusHandler = handleKey;
  document.addEventListener("keydown", handleKey);
}

function releaseFocus(modal) {
  if (!modal) return;
  const handler = modal.__focusHandler;
  if (handler) document.removeEventListener("keydown", handler);
  const openerId = modal.dataset?.openerId;
  if (openerId) {
    const opener = document.getElementById(openerId);
    opener?.focus();
  }
}

// === Inicializadores ===
function inicializarEnvios() {
  const label = document.querySelector(".envio-punto .punto-seleccionado");
  const savedName = localStorage.getItem("selectedPuntoName");
  const savedDireccion = localStorage.getItem("selectedPuntoDireccion");

  if (label) {
    if (savedName && savedDireccion) {
      label.textContent = `${savedName} — ${savedDireccion}`;
    } else {
      label.textContent = "No hay punto seleccionado";
    }
  }
  
  const subtotal = getSubtotal();
  document.querySelectorAll(".envio-costos").forEach(costos => {
    const envio = safeParsePrice(costos.querySelector(".costo-envio")?.dataset?.envio);
    const total = subtotal + envio;
    const totalEl = costos.querySelector(".total-envio");
    if (totalEl) totalEl.textContent = `Total: $${formatCurrency(total)}`;
  });
}

function actualizarTotalesPago(envio = 0) {
  const subtotal = getSubtotal();
  const total = subtotal + Number(envio || 0);
  document.querySelectorAll(".total-pago").forEach(el => {
    el.textContent = formatCurrency(total);
  });
  return total;
}

function inicializarPago() {
  const envio = safeParsePrice(localStorage.getItem("selectedEnvio") || 0);
  const total = actualizarTotalesPago(envio);

  const cuotasSelect = document.getElementById("cuotas");
  if (cuotasSelect) {
    cuotasSelect.addEventListener("change", () => {
      const cuotas = parseInt(cuotasSelect.value, 10);
      const detalle = document.getElementById("detalle-cuotas");
      if (!Number.isInteger(cuotas) || cuotas < 1) {
        detalle.textContent = "Seleccioná un número válido de cuotas";
        return;
      }
      if (cuotas > 1) {
        const montoPorCuota = total / cuotas;
        detalle.textContent = `${cuotas} cuotas de $${formatCurrency(montoPorCuota)} (Total $${formatCurrency(total)})`;
      } else {
        detalle.textContent = `1 pago de $${formatCurrency(total)}`;
      }
    });
    cuotasSelect.dispatchEvent(new Event("change"));
  }
}

// === Event listeners ===

// Abrir selección de envíos desde botón checkout
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".checkout-btn");
  if (!btn) return;
  e.preventDefault();
  mostrarOverlay("../componentesHTML/carritoHTML/seleccion-envios.html", btn)
    .then(() => waitForOverlayElement(".envio-costos", 4000))
    .then(() => inicializarEnvios());
});

// Seleccionar opción de envío → abrir pago
document.addEventListener("click", (e) => {
  const opcion = e.target.closest(".opcion-envio");
  if (!opcion) return;
  e.preventDefault();
  const envio = safeParsePrice(opcion.querySelector(".costo-envio")?.dataset?.envio);
  localStorage.setItem("selectedEnvio", String(envio));
  mostrarOverlay("../componentesHTML/carritoHTML/seleccion-pago.html", e.target)
    .then(() => waitForOverlayElement(".pago-modal", 4000))
    .then(() => inicializarPago());
});

// Botón "Ver ubicación" → abrir mapa
document.addEventListener("click", (e) => {
  const btnMapa = e.target.closest(".btn-ver-tienda");
  if (!btnMapa) return;
  e.preventDefault();
  mostrarOverlay("../componentesHTML/mapaHTML/mapa-tienda.html", btnMapa);
});

// Alternar método de pago (tarjeta / Mercado Pago)
document.addEventListener("click", (e) => {
  const opcion = e.target.closest(".opcion-pago");
  if (!opcion) return;
  e.preventDefault();

  document.querySelectorAll(".opcion-pago").forEach(c => c.classList.remove("activo"));
  opcion.classList.add("activo");

  const metodo = opcion.dataset.metodo;
  const tarjeta = document.querySelector(".contenido-tarjeta");
  const mp = document.querySelector(".contenido-mercadopago");
  if (tarjeta && mp) {
    tarjeta.style.display = (metodo === "tarjeta") ? "block" : "none";
    mp.style.display = (metodo === "mercadopago") ? "block" : "none";
  }
});

// Volver de pago a envíos
document.addEventListener("click", (e) => {
  const volver = e.target.closest(".volver-envios");
  if (!volver) return;
  e.preventDefault();
  mostrarOverlay("../componentesHTML/carritoHTML/seleccion-envios.html", volver)
    .then(() => waitForOverlayElement(".envio-costos", 4000))
    .then(() => inicializarEnvios());
});

// Cerrar modal (solo cerrar, no volver)
document.addEventListener("click", (e) => {
  const cerrarBtn = e.target.closest(".cerrar-modal, .cerrar-mapa");
  if (!cerrarBtn) return;

  const overlayContainer = document.getElementById("checkout-overlay");
  const overlay = overlayContainer?.querySelector(".overlay");
  if (overlay) {
    releaseFocus(overlay);
    overlay.style.display = "none";
    document.body.classList.remove("modal-open");
    overlayContainer.innerHTML = "";
  }
});

// Seleccionar opción de envío → abrir pago
document.addEventListener("click", (e) => {
  // Si el click vino de un botón de acción dentro del grupo, ignorar
  if (e.target.closest(".envio-accion")) return;

  const opcion = e.target.closest(".opcion-envio");
  if (!opcion) return;
  e.preventDefault();

  const envio = safeParsePrice(opcion.querySelector(".costo-envio")?.dataset?.envio);
  localStorage.setItem("selectedEnvio", String(envio));
  mostrarOverlay("../componentesHTML/carritoHTML/seleccion-pago.html", e.target)
    .then(() => waitForOverlayElement(".pago-modal", 4000))
    .then(() => inicializarPago());
});

// Abrir mapa-puntos desde botón "ver o cambiar en el mapa"
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".ver-cambiar-mapa");
  if (!btn) return;
  e.preventDefault();
  mostrarOverlay("componentesHTML/mapaHTML/mapa-puntos.html", btn)
    .then(() => {
      if (typeof initMapaPuntos === "function") {
        initMapaPuntos();
      }
    });
});

// Abrir mapa-tienda desde botón "Ver ubicación"
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-ver-tienda");
  if (!btn) return;
  e.preventDefault();
  mostrarOverlay("../componentesHTML/mapaHTML/mapa-tienda.html", btn);
});

// Volver a envíos desde cualquier submodal (mapa-puntos, mapa-tienda, pago)
document.addEventListener("click", (e) => {
  const volver = e.target.closest(".volver-envios");
  if (!volver) return;
  e.preventDefault();
  mostrarOverlay("../componentesHTML/carritoHTML/seleccion-envios.html", volver)
    .then(() => waitForOverlayElement(".envio-modal", 4000))
    .then(() => inicializarEnvios());
});

// Inicializador de mapa-puntos (solo renderiza lista/iframe si hace falta)
function inicializarMapaPuntos() {
  const lista = document.getElementById("puntos-lista");
  const iframe = document.getElementById("iframe-puntos");
  const info = document.getElementById("seleccion-info");

  const puntos = window.getAllPuntos && window.getAllPuntos();
  const seleccionado = window.getSelectedPuntoId && window.getSelectedPuntoId();

  if (lista && puntos) {
    lista.innerHTML = "";
    puntos.forEach(p => {
      const el = document.createElement("div");
      el.className = "punto-item" + (seleccionado === p.id ? " activo" : "");
      el.dataset.id = p.id;
      el.dataset.lat = p.lat;
      el.dataset.lng = p.lng;
      el.innerHTML = `<strong>${p.nombre}</strong><div class="dir">${p.direccion}</div>`;

      el.addEventListener("click", () => {
        window.setSelectedPuntoId && window.setSelectedPuntoId(p.id);
        info.textContent = `${p.nombre} — ${p.direccion}`;
        iframe.src = `https://www.google.com/maps?q=${p.lat},${p.lng}&z=16&output=embed`;
      });

      lista.appendChild(el);

      if (seleccionado === p.id) {
        iframe.src = `https://www.google.com/maps?q=${p.lat},${p.lng}&z=16&output=embed`;
        info.textContent = `${p.nombre} — ${p.direccion}`;
      }
    });
  }
}

// (opcional) Botón directo para abrir envíos desde fuera
document.getElementById('abrir-envios')?.addEventListener('click', (e) => {
  e.preventDefault();
  mostrarOverlay("../componentesHTML/carritoHTML/seleccion-envios.html", e.currentTarget)
    .then(()=> console.log('seleccion-envios abierto'))
    .catch(err => console.error('error abrir seleccion-envios', err));
});
