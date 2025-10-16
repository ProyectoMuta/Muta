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

// =======================================================
// === ORQUESTADOR PRINCIPAL DEL PROCESO DE PAGO ===
// =======================================================
function inicializarProcesoDeCompra() {
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        const btnCheckout = target.closest(".checkout-btn");
        const opcionEnvio = target.closest(".opcion-envio");
        const btnDirecciones = target.closest(".btn-direcciones");
        const btnVerMapaPuntos = target.closest(".ver-cambiar-mapa");
        const btnVerTienda = target.closest(".btn-ver-tienda");
        const btnVolverEnvios = target.closest(".volver-envios");
        const btnCerrarModal = target.closest(".cerrar-modal");

        if (btnCheckout) {
            e.preventDefault();
            const cart = JSON.parse(localStorage.getItem("mutaCart")) || [];
            if (cart.length === 0) { alert("Tu carrito está vacío."); return; }
            mostrarOverlay("componentesHTML/carritoHTML/seleccion-envios.html", btnCheckout)
              .then(() => { if (typeof inicializarLogicaEnvios === 'function') inicializarLogicaEnvios(); });
            return;
        }

        if (opcionEnvio && !target.closest('.envio-accion')) {
            e.preventDefault();
            const metodo = opcionEnvio.dataset.metodo;
            localStorage.setItem("selectedMetodoEnvio", metodo);
            if (metodo === 'domicilio' && !localStorage.getItem('selectedDireccion')) { alert('Por favor, agrega y selecciona un domicilio.'); return; }
            if (metodo === 'punto' && !localStorage.getItem('selectedPunto')) { alert('Por favor, selecciona un punto de retiro.'); return; }
            localStorage.setItem("selectedEnvio", String(safeParsePrice(opcionEnvio.querySelector(".costo-envio")?.dataset.envio)));
            mostrarOverlay("componentesHTML/carritoHTML/seleccion-pago.html", opcionEnvio)
              .then(() => { if (typeof inicializarLogicaPago === 'function') inicializarLogicaPago(); });
            return;
        }
        
        if (btnDirecciones) { e.preventDefault(); mostrarOverlay("componentesHTML/carritoHTML/seleccion-direccion.html", btnDirecciones).then(() => { if (typeof inicializarGestionDirecciones === 'function') inicializarGestionDirecciones(); }); return; }
        if (btnVerMapaPuntos) { e.preventDefault(); mostrarOverlay("componentesHTML/mapaHTML/mapa-puntos.html", btnVerMapaPuntos).then(() => { if (typeof initMapaPuntos === 'function') initMapaPuntos(); }); return; }
        if (btnVerTienda) { e.preventDefault(); mostrarOverlay("componentesHTML/mapaHTML/mapa-tienda.html", btnVerTienda); return; }
        if (btnVolverEnvios) { e.preventDefault(); mostrarOverlay("componentesHTML/carritoHTML/seleccion-envios.html", btnVolverEnvios).then(() => { if (typeof inicializarLogicaEnvios === 'function') inicializarLogicaEnvios(); }); return; }
        if (btnCerrarModal) { const overlay = document.getElementById("checkout-overlay"); if (overlay) overlay.innerHTML = ""; document.body.classList.remove("modal-open"); return; }
    });
    
    document.addEventListener("submit", (e) => {
        if (e.target.id === 'payment-form') {
            e.preventDefault();
            finalizarCompra(e.target.querySelector('.finalizar-compra'));
        }
    });
}

// === LÓGICA DE ENVÍO DE EMAILJS ===
function getOrderData() {
    const cart = JSON.parse(localStorage.getItem("mutaCart")) || [];
    const subtotal = getSubtotal();
    const envioCosto = safeParsePrice(localStorage.getItem("selectedEnvio") || 0);
    const total = subtotal + envioCosto;
    
    const customerName = document.getElementById("nombre-cliente")?.value || "Cliente Muta";
    const customerEmail = document.getElementById("email-cliente")?.value;
    
    const orderId = `MUTA-${Math.floor(Math.random() * 90000) + 10000}`;
    
    const itemsHtml = cart.map(item => 
        `<li>${item.quantity}x ${item.name} (Talle: ${item.size}) - $${formatCurrency(item.price * item.quantity)}</li>`
    ).join('');

    let detallesPago = "No especificado";
    // ===== CORRECCIÓN CLAVE =====
    // Se usa la clase correcta: "activo"
    const metodoActivo = document.querySelector(".pago-card.opcion-pago.activo");
    // ===========================
    if (metodoActivo) {
        const metodo = metodoActivo.dataset.metodo;
        if (metodo === 'tarjeta') {
            const ultimosCuatroDigitos = document.getElementById("numero")?.value.slice(-4) || 'XXXX';
            detallesPago = `Tarjeta de Crédito/Débito terminada en ${ultimosCuatroDigitos}`;
        } else if (metodo === 'mercadopago') {
            detallesPago = "Mercado Pago";
        }
    }

    const metodoEnvio = localStorage.getItem("selectedMetodoEnvio");
    let detallesDireccion = "No especificado";
    let detallesEnvio = "No especificado";
    if (metodoEnvio === 'domicilio') {
        const direccionGuardada = JSON.parse(localStorage.getItem("selectedDireccion"));
        detallesEnvio = "Envío a domicilio";
        if (direccionGuardada) {
            detallesDireccion = `${direccionGuardada.calle}, ${direccionGuardada.ciudad}, ${direccionGuardada.provincia}`;
        }
    } else if (metodoEnvio === 'punto') {
        const puntoNombre = localStorage.getItem("selectedPuntoName");
        detallesEnvio = "Retiro en punto de entrega";
        detallesDireccion = puntoNombre || "Punto no especificado";
    } else if (metodoEnvio === 'tienda') {
        detallesEnvio = "Retiro en tienda MUTA";
        detallesDireccion = "Av. Colón 740, Mendoza";
    }

    return {
        customer_name: customerName,
        order_id: orderId,
        items_html: `<ul>${itemsHtml}</ul>`,
        subtotal: `$${formatCurrency(subtotal)}`,
        costo_envio: `$${formatCurrency(envioCosto)}`,
        total_amount: `$${formatCurrency(total)}`,
        detalles_pago: detallesPago,
        sdetalles_envio: detallesEnvio,
        detalles_direccion: detallesDireccion,
        email_cliente: customerEmail 
    };
}


function finalizarCompra(finishBtn) {
    const originalText = finishBtn.textContent;
    const templateParams = getOrderData();
    if (!templateParams.customer_name || !templateParams.email_cliente || !templateParams.email_cliente.includes('@')) { 
        alert("Por favor, completa tu nombre y un email válido."); 
        return; 
    }
    finishBtn.textContent = "Procesando...";
    finishBtn.disabled = true;
    emailjs.send('service_wqlyyxz', 'template_h4p8oiv', templateParams)
      .then((response) => { 
          alert(`¡Gracias por tu compra, ${templateParams.customer_name}! 📧 Se ha enviado un email de confirmación.`); 
          localStorage.removeItem("mutaCart"); 
          localStorage.removeItem("selectedMetodoEnvio");
          localStorage.removeItem("selectedDireccion");
          localStorage.removeItem("selectedPunto");
          window.location.href = "index.html"; 
      })
      .catch((error) => { 
          console.error('ERROR AL ENVIAR EMAIL:', error); 
          alert("Tu compra se completó, pero no pudimos enviar el email de confirmación."); 
      })
      .finally(() => { 
          finishBtn.textContent = originalText; 
          finishBtn.disabled = false; 
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
  // Punto de retiro
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

  // Totales
  const subtotal = getSubtotal();
  document.querySelectorAll(".envio-costos").forEach(costos => {
    const envio = safeParsePrice(costos.querySelector(".costo-envio")?.dataset?.envio);
    const total = subtotal + envio;
    const totalEl = costos.querySelector(".total-envio");
    if (totalEl) totalEl.textContent = `Total: $${formatCurrency(total)}`;
  });

  // Dirección de envío seleccionada
  const dirLabel = document.querySelector(".opcion-envio[data-metodo='domicilio'] .direccion");
  const seleccionada = JSON.parse(localStorage.getItem("selectedDireccion"));

  console.log("Dirección seleccionada:", seleccionada);

  if (dirLabel) {
    if (seleccionada && seleccionada.nombre && seleccionada.calle && seleccionada.ciudad) {
      dirLabel.textContent = `${seleccionada.nombre} - ${seleccionada.calle}, ${seleccionada.ciudad}`;
    } else {
      dirLabel.textContent = "No hay dirección seleccionada";
    }
  }
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
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-direcciones");
  if (!btn) return;
  e.preventDefault();
  mostrarOverlay("../componentesHTML/carritoHTML/seleccion-direccion.html", btn)
    .then(() => waitForOverlayElement(".envio-modal", 4000))
    .then(() => inicializarDirecciones());
});

// Abrir selección de envíos desde botón checkout
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".checkout-btn");
  if (!btn) return;
  e.preventDefault();

  // Validación extra
  const cart = JSON.parse(localStorage.getItem("mutaCart")) || [];
  if (cart.length === 0) {
    alert("Tu carrito está vacío. Agregá productos antes de continuar.");
    return;
  }

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

// Abrir gestión de direcciones desde botón "+ Agregar o modificar domicilio"
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-direcciones");
  if (!btn) return;
  e.preventDefault();
  mostrarOverlay("../componentesHTML/carritoHTML/seleccion-direccion.html", btn)
    .then(() => waitForOverlayElement(".envio-modal", 4000))
    .then(() => inicializarDirecciones());
});

function inicializarDirecciones() {
  const lista = document.querySelector(".direcciones-guardadas");
  const form = document.getElementById("form-nueva-direccion");
  const btnMostrarForm = document.getElementById("btn-mostrar-form");
  const btnCancelar = document.getElementById("cancelar-edicion");
  const tituloForm = document.getElementById("form-titulo");

  let direcciones = JSON.parse(localStorage.getItem("mutaDirecciones")) || [];
  let modoEdicion = false;
  let idEditando = null;

  // Renderizar lista
  lista.innerHTML = "<h4>Direcciones guardadas</h4>";
  if (direcciones.length === 0) {
    const vacio = document.createElement("p");
    vacio.textContent = "No hay direcciones guardadas";
    vacio.style.color = "#666";
    lista.appendChild(vacio);
  } else {
    direcciones.forEach((dir) => {
      const div = document.createElement("div");
      div.className = "direccion-item";
      div.innerHTML = `
        <div class="acciones-dir">
          <button class="seleccionar-dir" data-id="${dir.id}">Seleccionar</button>
          <button class="editar-dir" data-id="${dir.id}">Editar</button>
        </div>
        <label>
          <strong>${dir.nombre}</strong><br>
          ${dir.calle}, ${dir.ciudad}, ${dir.provincia}
        </label>
        <button class="eliminar-dir" data-id="${dir.id}" title="Eliminar">
          <i class="fas fa-trash"></i>
        </button>
      `;
      lista.appendChild(div);
    });
  }

  // Mostrar formulario
  btnMostrarForm.onclick = () => {
    form.classList.add("visible");
    btnMostrarForm.style.display = "none";
    tituloForm.textContent = "Nueva dirección";
    btnCancelar.style.display = "inline-block";
    modoEdicion = false;
    idEditando = null;
  };

  // Cancelar edición
  btnCancelar.onclick = () => {
    form.reset();
    form.classList.remove("visible");
    btnMostrarForm.style.display = "block";
    btnCancelar.style.display = "none";
    tituloForm.textContent = "Nueva dirección";
    modoEdicion = false;
    idEditando = null;
  };

  // Guardar dirección
  form.onsubmit = (ev) => {
    ev.preventDefault();
    const nueva = {
      id: modoEdicion ? idEditando : "dir" + Date.now(),
      nombre: document.getElementById("nombre-direccion").value,
      calle: document.getElementById("calle").value,
      ciudad: document.getElementById("ciudad").value,
      provincia: document.getElementById("provincia").value,
      cp: document.getElementById("codigo-postal").value
    };

    if (modoEdicion) {
      direcciones = direcciones.map(d => d.id === idEditando ? nueva : d);
    } else {
      direcciones.push(nueva);
    }

    localStorage.setItem("mutaDirecciones", JSON.stringify(direcciones));
    form.reset();
    form.classList.remove("visible");
    btnMostrarForm.style.display = "block";
    btnCancelar.style.display = "none";
    tituloForm.textContent = "Nueva dirección";
    modoEdicion = false;
    idEditando = null;
    inicializarDirecciones();
  };

  // Acciones en lista
  lista.addEventListener("click", (e) => {
    const id = e.target.dataset.id;

    if (e.target.classList.contains("seleccionar-dir")) {
      const seleccionada = direcciones.find(d => d.id === id);
      if (seleccionada) {
        localStorage.setItem("selectedDireccion", JSON.stringify(seleccionada));
        mostrarOverlay("../componentesHTML/carritoHTML/seleccion-envios.html")
          .then(() => waitForOverlayElement(".envio-modal", 4000))
          .then(() => inicializarEnvios());
      }
    }

    if (e.target.classList.contains("editar-dir")) {
      const dir = direcciones.find(d => d.id === id);
      if (!dir) return;
      document.getElementById("nombre-direccion").value = dir.nombre;
      document.getElementById("calle").value = dir.calle;
      document.getElementById("ciudad").value = dir.ciudad;
      document.getElementById("provincia").value = dir.provincia;
      document.getElementById("codigo-postal").value = dir.cp;

      form.classList.add("visible");
      btnMostrarForm.style.display = "none";
      btnCancelar.style.display = "inline-block";
      tituloForm.textContent = "Editar dirección";
      modoEdicion = true;
      idEditando = id;
    }

    if (e.target.classList.contains("eliminar-dir") || e.target.closest(".eliminar-dir")) {
      const confirmar = confirm("¿Está seguro de eliminar esta dirección?");
      if (confirmar) {
        direcciones = direcciones.filter(d => d.id !== id);
        localStorage.setItem("mutaDirecciones", JSON.stringify(direcciones));
        inicializarDirecciones();
      }
    }
  });
}

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
