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

// --- Función genérica de cálculo ---
function calcularCostoEnvioPorCP(cp) {
  // Agrupación de CP por departamentos cercanos a Mendoza Capital
  const grupos = {
    capital: {
      cps: ["5500", "5501", "5502"], // Mendoza Capital y alrededores inmediatos
      km: 1
    },
    godoyCruz: {
      cps: ["5501", "5509"],
      km: 7
    },
    guaymallen: {
      cps: ["5519", "5521", "5523"],
      km: 20
    },
    guaymallen2: {
      cps: ["5523"],
      km: 10
    },
    lasHeras: {
      cps: ["5539", "5540"],
      km: 15
    },
    maipu: {
      cps: ["5515", "5517", "5518"],
      km: 18
    },
    lujan: {
      cps: ["5507", "5509"],
      km: 12
    },
    sanMartin: {
      cps: ["5570", "5571"],
      km: 45
    },
    rivadavia: {
      cps: ["5577", "5579"],
      km: 65
    },
    junin: {
      cps: ["5582"],
      km: 75
    },
    santaRosa: {
      cps: ["5590"],
      km: 75
    },
    lavalle: {
      cps: ["5594"],
      km: 70
    }
  };
  // Buscar a qué grupo pertenece el CP
  let km = null;
  for (const depto in grupos) {
    if (grupos[depto].cps.includes(cp)) {
      km = grupos[depto].km;
      break;
    }
  }
  // Si está en la tabla → cálculo progresivo
  if (km !== null) {
    const costoBase = 2000;
    const costoPorKm = 150;
    const costo = costoBase + (km * costoPorKm);
    return Math.min(costo, 16000); // nunca supera $16.000
  }
  // Si no está en la tabla → costo fijo máximo
  return 16000;
}

window.calcularCostoEnvioPorCP = calcularCostoEnvioPorCP;

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
    document.body.addEventListener('click', async (e) => {
        const target = e.target;
        const btnCheckout = target.closest(".checkout-btn");
        const opcionEnvio = target.closest(".opcion-envio");
        const btnDirecciones = target.closest(".btn-direcciones");
        const btnVerMapaPuntos = target.closest(".ver-cambiar-mapa");
        const btnVerTienda = target.closest(".btn-ver-tienda");
        const btnVolverEnvios = target.closest(".volver-envios");
        const btnCerrarModal = target.closest(".cerrar-modal");

        // === Paso 1: abrir selección de envíos ===
        if (btnCheckout) {
            e.preventDefault();
            const cart = JSON.parse(localStorage.getItem("mutaCart")) || [];
            if (cart.length === 0) { 
                alert("Tu carrito está vacío."); 
                return; 
            }
            mostrarOverlay("/Muta/componentesHTML/carritoHTML/seleccion-envios.html", btnCheckout)
              .then(() => waitForOverlayElement(".envio-modal", 4000))
              .then(() => inicializarEnvios());
            return;
        }

        // === Paso 2: elegir método de envío ===
        if (opcionEnvio && !target.closest('.envio-accion')) {
            e.preventDefault();
            const metodo = opcionEnvio.dataset.metodo;
            localStorage.setItem("selectedMetodoEnvio", metodo);

            // Validaciones estrictas
            if (metodo === 'domicilio' || metodo === 'punto') {
              const userId = localStorage.getItem("userId");
              try {
                const res = await fetch(`backend/userController.php?action=getDirecciones&id=${userId}`);
                const direcciones = await res.json();

                if (metodo === 'domicilio') {
                  const domicilioSel = (direcciones.domicilios || []).find(d => d.seleccionada);
                  if (!domicilioSel) {
                    alert('Por favor, agrega y selecciona un domicilio.');
                    return;
                  }
                }

                if (metodo === 'punto') {
                  const puntoSel = direcciones.punto && direcciones.punto.seleccionado ? direcciones.punto : null;
                  if (!puntoSel) {
                    alert('Por favor, selecciona un punto de retiro.');
                    return;
                  }
                }
              } catch (err) {
                console.error("Error validando selección de envío:", err);
                alert("No se pudo validar la dirección seleccionada.");
                return;
              }
            }

            // 🔑 ACTUALIZAR envioSeleccionado en Mongo
            const userId = localStorage.getItem("userId");
            if (userId) {
              try {
                await fetch("backend/userController.php?action=setEnvioSeleccionado", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id_usuario: userId, metodo })
                });
              } catch (err) {
                console.error("Error actualizando envioSeleccionado:", err);
              }
            }

            // Si pasó las validaciones, avanza al pago
            localStorage.setItem("selectedEnvio", String(
                safeParsePrice(opcionEnvio.querySelector(".costo-envio")?.dataset.envio)
            ));

            mostrarOverlay("/Muta/componentesHTML/carritoHTML/seleccion-pago.html", opcionEnvio)
              .then(() => { if (typeof inicializarLogicaPago === 'function') inicializarLogicaPago(); });
            return;
        }

        // === Otros botones ===
        if (btnDirecciones) { 
            e.preventDefault(); 
            mostrarOverlay("/Muta/componentesHTML/carritoHTML/seleccion-direccion.html", btnDirecciones)
              .then(() => { if (typeof inicializarGestionDirecciones === 'function') inicializarGestionDirecciones(); }); 
            return; 
        }

        if (btnVerMapaPuntos) { 
            e.preventDefault(); 
            mostrarOverlay("/Muta/componentesHTML/mapaHTML/mapa-puntos.html", btnVerMapaPuntos)
              .then(() => { if (typeof initMapaPuntos === 'function') initMapaPuntos(); }); 
            return; 
        }

        if (btnVerTienda) { 
            e.preventDefault(); 
            mostrarOverlay("/Muta/componentesHTML/mapaHTML/mapa-tienda.html", btnVerTienda); 
            return; 
        }

        if (btnVolverEnvios) { 
            e.preventDefault(); 
            mostrarOverlay("/Muta/componentesHTML/carritoHTML/seleccion-envios.html", btnVolverEnvios)
              .then(() => waitForOverlayElement(".envio-modal", 4000))
              .then(() => inicializarEnvios());
            return; 
        }

        if (btnCerrarModal) { 
            const overlay = document.getElementById("checkout-overlay"); 
            if (overlay) overlay.innerHTML = ""; 
            document.body.classList.remove("modal-open"); 
            return; 
        }
    });
    
    document.addEventListener("submit", (e) => {
        if (e.target.id === 'payment-form') {
            e.preventDefault();
            // Buscar el botón de submit dentro del formulario
            const submitButton = e.target.querySelector('button[type="submit"]') ||
                                 e.target.querySelector('.btn-pagar') ||
                                 e.target.querySelector('.pagar-mp');
            finalizarCompra(submitButton);
        }
    });
}

// === LÓGICA DE ENVÍO DE EMAILJS ===
async function getOrderData() {
  const cart = JSON.parse(localStorage.getItem("mutaCart")) || [];
  const subtotal = getSubtotal();
  const customerName = document.getElementById("nombre-cliente")?.value || "Cliente Muta";
  const customerEmail = document.getElementById("email-cliente")?.value;
  const orderId = `MUTA-${Math.floor(Math.random() * 90000) + 10000}`;

  const itemsHtml = cart.map(item =>
    `<li>${item.quantity}x ${item.name} (Talle: ${item.size}) - $${formatCurrency(item.price * item.quantity)}</li>`
  ).join('');

  let detallesPago = "No especificado";
  const metodoActivo = document.querySelector(".pago-card.opcion-pago.activo");
  if (metodoActivo) {
    const metodo = metodoActivo.dataset.metodo;
    if (metodo === 'tarjeta') {
      const ultimosCuatroDigitos = document.getElementById("numero")?.value.slice(-4) || 'XXXX';
      detallesPago = `Tarjeta terminada en ${ultimosCuatroDigitos}`;
    } else if (metodo === 'mercadopago') {
      detallesPago = "Mercado Pago";
    }
  }

  let detallesEnvio = "No especificado";
  let detallesDireccion = "No especificado";
  let envioCosto = 0;

  const userId = localStorage.getItem("userId");
  if (userId) {
    try {
      const res = await fetch(`backend/userController.php?action=getUser&id=${userId}`);
      const data = await res.json();
      const mongo = data.mongo;
      const metodo = mongo.envioSeleccionado;

      if (metodo === "domicilio") {
        const domicilio = (mongo.direcciones?.domicilios || []).find(d => d.seleccionada);
        if (domicilio) {
          detallesEnvio = "Envío a domicilio";
          detallesDireccion = `${domicilio.calle}, ${domicilio.ciudad}, ${domicilio.provincia}`;
          envioCosto = window.calcularCostoEnvioPorCP(domicilio.cp);
        }
      } else if (metodo === "punto") {
        const punto = mongo.direcciones?.punto;
        if (punto && punto.seleccionado) {
          detallesEnvio = "Retiro en punto de entrega";
          detallesDireccion = `${punto.nombre} — ${punto.direccion}`;
          envioCosto = window.calcularCostoEnvioPorCP(punto.cp);
        }
      } else if (metodo === "tienda") {
        detallesEnvio = "Retiro en tienda MUTA";
        detallesDireccion = "Av. Colón 740, Mendoza";
        envioCosto = 0;
      }
    } catch (err) {
      console.error("Error obteniendo dirección seleccionada:", err);
    }
  }

  const total = subtotal + envioCosto;

  return {
    customer_name: customerName,
    order_id: orderId,
    items_html: `<ul>${itemsHtml}</ul>`,
    subtotal: `$${formatCurrency(subtotal)}`,
    costo_envio: `$${formatCurrency(envioCosto)}`,
    total_amount: `$${formatCurrency(total)}`,
    detalles_pago: detallesPago,
    detalles_envio: detallesEnvio,
    detalles_direccion: detallesDireccion,
    email_cliente: customerEmail
  };
}

async function finalizarCompra(finishBtn) {
  const originalText = finishBtn.textContent;
  // Validaciones iniciales
  const customerName = document.getElementById("nombre-cliente")?.value;
  const customerEmail = document.getElementById("email-cliente")?.value;
  
  if (!customerName || !customerEmail || !customerEmail.includes('@')) {
    alert("Por favor, completa tu nombre y un email válido.");
    return;
  }

  const userId = localStorage.getItem("userId");
  if (!userId) {
    alert("Debes iniciar sesión para completar la compra.");
    return;
  }

  const cart = JSON.parse(localStorage.getItem("mutaCart")) || [];
  if (cart.length === 0) {
    alert("Tu carrito está vacío.");
    return;
  }

  finishBtn.textContent = "Procesando...";
  finishBtn.disabled = true;
try {
    // 1️⃣ OBTENER DATOS DEL USUARIO Y DIRECCIÓN SELECCIONADA
    const resUser = await fetch(`backend/userController.php?action=getUser&id=${userId}`);
    const userData = await resUser.json();
    const mongo = userData.mongo;
    const metodoEnvio = mongo.envioSeleccionado;

    // 2️⃣ CONSTRUIR DIRECCIÓN DE ENVÍO
    let direccionEnvio = {
      calle: "No especificado",
      ciudad: "No especificado",
      provincia: "No especificado",
      codigo_postal: "0000",
      pais: "Argentina",
      referencia: "",
      telefono: userData.mysql?.telefono || "No especificado"
    };

    let costoEnvio = 0;

    if (metodoEnvio === "domicilio") {
      const domicilio = (mongo.direcciones?.domicilios || []).find(d => d.seleccionada);
      if (domicilio) {
        direccionEnvio = {
          calle: domicilio.calle,
          ciudad: domicilio.ciudad,
          provincia: domicilio.provincia,
          codigo_postal: domicilio.cp,
          pais: "Argentina",
          referencia: domicilio.nombre,
          telefono: userData.mysql?.telefono || "No especificado"
        };
        costoEnvio = window.calcularCostoEnvioPorCP(domicilio.cp);
      }
    } else if (metodoEnvio === "punto") {
      const punto = mongo.direcciones?.punto;
      if (punto && punto.seleccionado) {
        direccionEnvio = {
          calle: punto.direccion,
          ciudad: punto.ciudad || "Mendoza",
          provincia: "Mendoza",
          codigo_postal: punto.cp,
          pais: "Argentina",
          referencia: `Punto de retiro: ${punto.nombre}`,
          telefono: userData.mysql?.telefono || "No especificado"
        };
        costoEnvio = window.calcularCostoEnvioPorCP(punto.cp);
      }
    } else if (metodoEnvio === "tienda") {
      direccionEnvio = {
        calle: "Av. Colón 740",
        ciudad: "Mendoza",
        provincia: "Mendoza",
        codigo_postal: "5500",
        pais: "Argentina",
        referencia: "Retiro en tienda MUTA",
        telefono: userData.mysql?.telefono || "No especificado"
      };
      costoEnvio = 0;
    }

    // 3️⃣ FORMATEAR PRODUCTOS DEL CARRITO
    const productos = cart.map(item => ({
      producto_id: item.id,
      nombre: item.name,
      cantidad: item.quantity,
      precio_unitario: Number(item.price),
      talle: item.size || "N/A",
      color: item.color || "#000",
      subtotal: Number(item.price) * item.quantity
    }));

    // 4️⃣ CALCULAR TOTALES
    const subtotal = productos.reduce((sum, p) => sum + p.subtotal, 0);
    const descuento = 0; // Puedes agregar lógica de cupones aquí
    const total = subtotal + costoEnvio - descuento;

    // 5️⃣ DETECTAR MÉTODO DE PAGO
    let metodoPago = "mercadopago";
    const tarjetaActiva = document.querySelector('.opcion-pago[data-metodo="tarjeta"].activo');
    if (tarjetaActiva) {
      metodoPago = "tarjeta";
    }

    // 6️⃣ CREAR PEDIDO EN MONGODB
    const pedidoData = {
      usuario_id: userId,
      productos: productos,
      direccion_envio: direccionEnvio,
      subtotal: subtotal,
      costo_envio: costoEnvio,
      descuento: descuento,
      metodo_pago: metodoPago,
      notas_cliente: `Cliente: ${customerName} - Email: ${customerEmail}`
    };

    console.log("📦 Creando pedido en MongoDB:", pedidoData);

    const resPedido = await fetch('backend/pedidosController.php?action=crear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedidoData)
    });

    const pedidoResponse = await resPedido.json();

    if (!pedidoResponse.success) {
      throw new Error(pedidoResponse.error || "Error al crear el pedido");
    }

    console.log("✅ Pedido creado:", pedidoResponse.numero_pedido);

    // 7️⃣ SI ES MERCADO PAGO, CREAR PREFERENCIA Y REDIRIGIR
    if (metodoPago === 'mercadopago') {
      console.log("💳 Creando preferencia de Mercado Pago...");

      try {
        // Preparar datos para Mercado Pago
        const mpData = {
          items: productos.map(p => ({
            id: p.producto_id,
            nombre: p.nombre,
            cantidad: p.cantidad,
            precio_unitario: p.precio_unitario,
            talle: p.talle,
            color: p.color
          })),
          payer: {
            nombre: customerName,
            email: customerEmail,
            telefono: direccionEnvio.telefono
          },
          shipment: {
            costo: costoEnvio,
            direccion: direccionEnvio
          },
          pedido_id: pedidoResponse.pedido_id,
          usuario_id: userId,
          numero_pedido: pedidoResponse.numero_pedido
        };

        console.log("📤 Datos enviando a MP:", mpData);
        console.log("📦 Items específicamente:", mpData.items);

        // Crear preferencia en Mercado Pago
        const mpResponse = await fetch('backend/pagosController.php?action=crear_preferencia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mpData)
        });

        const mpResult = await mpResponse.json();

        if (!mpResult.success) {
          console.error('❌ Respuesta completa de MP:', mpResult);
          throw new Error(mpResult.error || "Error al crear preferencia de Mercado Pago");
        }

        console.log("✅ Preferencia creada:", mpResult.data.preferencia_id);

        // Limpiar carrito antes de redirigir
        localStorage.removeItem("mutaCart");
        localStorage.removeItem("selectedMetodoEnvio");
        localStorage.removeItem("selectedDireccion");
        localStorage.removeItem("selectedPunto");

        // Actualizar carrito en BD
        await fetch("backend/userController.php?action=updateCart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_usuario: userId, carrito: [] })
        });

        // Redirigir a Mercado Pago
        alert(`Redirigiendo a Mercado Pago para completar el pago...\n\nNúmero de pedido: ${pedidoResponse.numero_pedido}`);
        window.location.href = mpResult.data.init_point;

      } catch (mpError) {
        console.error('❌ Error con Mercado Pago:', mpError);
        alert(`Error al procesar el pago con Mercado Pago: ${mpError.message}\n\nPor favor, intenta nuevamente.`);
        throw mpError;
      }

    } else {
      // 8️⃣ PARA OTROS MÉTODOS DE PAGO (TARJETA), ENVIAR EMAIL Y FINALIZAR
      const templateParams = {
        customer_name: customerName,
        email_cliente: customerEmail,
        order_id: pedidoResponse.numero_pedido,
        items_html: productos.map(p =>
          `<li>${p.cantidad}x ${p.nombre} (Talle: ${p.talle}) - $${p.subtotal.toLocaleString('es-AR')}</li>`
        ).join(''),
        subtotal: `$${subtotal.toLocaleString('es-AR')}`,
        costo_envio: `$${costoEnvio.toLocaleString('es-AR')}`,
        total_amount: `$${total.toLocaleString('es-AR')}`,
        detalles_pago: metodoPago === 'tarjeta' ? 'Tarjeta de crédito/débito' : 'Otro método de pago',
        detalles_envio: metodoEnvio === 'domicilio' ? 'Envío a domicilio' :
                         metodoEnvio === 'punto' ? 'Retiro en punto' : 'Retiro en tienda',
        detalles_direccion: `${direccionEnvio.calle}, ${direccionEnvio.ciudad}, ${direccionEnvio.provincia}`
      };

      await emailjs.send('service_wqlyyxz', 'template_h4p8oiv', templateParams);

      // Limpiar carrito
      localStorage.removeItem("mutaCart");
      localStorage.removeItem("selectedMetodoEnvio");
      localStorage.removeItem("selectedDireccion");
      localStorage.removeItem("selectedPunto");

      // Actualizar carrito en BD
      await fetch("backend/userController.php?action=updateCart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: userId, carrito: [] })
      });

      alert(`¡Gracias por tu compra, ${customerName}!\n\nNúmero de pedido: ${pedidoResponse.numero_pedido}\n\nHemos enviado un email de confirmación.`);
      window.location.href = "index.html";
    }
     } catch (error) {
    console.error('❌ ERROR EN CHECKOUT:', error);
    alert(`Error al procesar tu compra: ${error.message}\n\nPor favor, intenta nuevamente o contacta con soporte.`);
  } finally {
    finishBtn.textContent = originalText;
    finishBtn.disabled = false;
  }
}

// === FUNCIÓN AUXILIAR PARA OBTENER DATOS DE LA ORDEN (mantener por compatibilidad) ===
async function getOrderData() {
  const cart = JSON.parse(localStorage.getItem("mutaCart")) || [];
  const subtotal = getSubtotal();
  const customerName = document.getElementById("nombre-cliente")?.value || "Cliente Muta";
  const customerEmail = document.getElementById("email-cliente")?.value;
  const orderId = `MUTA-${Math.floor(Math.random() * 90000) + 10000}`;

  const itemsHtml = cart.map(item =>
    `<li>${item.quantity}x ${item.name} (Talle: ${item.size}) - $${formatCurrency(item.price * item.quantity)}</li>`
  ).join('');

  let detallesPago = "No especificado";
  const metodoActivo = document.querySelector(".pago-card.opcion-pago.activo");
  if (metodoActivo) {
    const metodo = metodoActivo.dataset.metodo;
    if (metodo === 'tarjeta') {
      const ultimosCuatroDigitos = document.getElementById("numero")?.value.slice(-4) || 'XXXX';
      detallesPago = `Tarjeta terminada en ${ultimosCuatroDigitos}`;
    } else if (metodo === 'mercadopago') {
      detallesPago = "Mercado Pago";
    }
  }

  let detallesEnvio = "No especificado";
  let detallesDireccion = "No especificado";
  let envioCosto = 0;

  const userId = localStorage.getItem("userId");
  if (userId) {
    try {
      const res = await fetch(`backend/userController.php?action=getUser&id=${userId}`);
      const data = await res.json();
      const mongo = data.mongo;
      const metodo = mongo.envioSeleccionado;

      if (metodo === "domicilio") {
        const domicilio = (mongo.direcciones?.domicilios || []).find(d => d.seleccionada);
        if (domicilio) {
          detallesEnvio = "Envío a domicilio";
          detallesDireccion = `${domicilio.calle}, ${domicilio.ciudad}, ${domicilio.provincia}`;
          envioCosto = window.calcularCostoEnvioPorCP(domicilio.cp);
        }
      } else if (metodo === "punto") {
        const punto = mongo.direcciones?.punto;
        if (punto && punto.seleccionado) {
          detallesEnvio = "Retiro en punto de entrega";
          detallesDireccion = `${punto.nombre} — ${punto.direccion}`;
          envioCosto = window.calcularCostoEnvioPorCP(punto.cp);
        }
      } else if (metodo === "tienda") {
        detallesEnvio = "Retiro en tienda MUTA";
        detallesDireccion = "Av. Colón 740, Mendoza";
        envioCosto = 0;
      }
    } catch (err) {
      console.error("Error obteniendo dirección seleccionada:", err);
    }
  }

  const total = subtotal + envioCosto;

  return {
    customer_name: customerName,
    order_id: orderId,
    items_html: `<ul>${itemsHtml}</ul>`,
    subtotal: `$${formatCurrency(subtotal)}`,
    costo_envio: `$${formatCurrency(envioCosto)}`,
    total_amount: `$${formatCurrency(total)}`,
    detalles_pago: detallesPago,
    detalles_envio: detallesEnvio,
    detalles_direccion: detallesDireccion,
    email_cliente: customerEmail
  };
}

// === FUNCIÓN PARA INICIALIZAR LÓGICA DE PAGO ===
async function inicializarLogicaPago() {
  const totalPagarElements = document.querySelectorAll('.total-pago');
  
  function actualizarTotal() {
    const subtotal = getSubtotal();
    const costoEnvio = safeParsePrice(localStorage.getItem('selectedEnvio') || 0);
    const total = subtotal + costoEnvio;
    totalPagarElements.forEach(el => el.textContent = formatCurrency(total));
  }
  
  actualizarTotal();
  
  // Mostrar resumen de envío
  if (typeof mostrarResumenEnvio === 'function') {
    await mostrarResumenEnvio();
  }
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
async function inicializarEnvios() {
  const subtotal = getSubtotal();
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  let direcciones = {};
  try {
    const res = await fetch(`backend/userController.php?action=getDirecciones&id=${userId}`);
    direcciones = await res.json();
  } catch (err) {
    console.error("Error cargando direcciones:", err);
  }

  // Buscar domicilio seleccionado
  const domicilioSel = (direcciones.domicilios || []).find(d => d.seleccionada);
  // Buscar punto seleccionado
  const puntoSel = direcciones.punto && direcciones.punto.seleccionado ? direcciones.punto : null;

  // === 1. Dirección de envío seleccionada (domicilio) ===
  const dirLabel = document.querySelector(".opcion-envio[data-metodo='domicilio'] .direccion");
  if (dirLabel) {
    const costoEl = document.querySelector('.opcion-envio[data-metodo="domicilio"] .costo-envio');
    if (domicilioSel) {
      dirLabel.textContent = `${domicilioSel.nombre} - ${domicilioSel.calle}, ${domicilioSel.ciudad}`;
      const costo = window.calcularCostoEnvioPorCP(domicilioSel.cp);
      if (costoEl) {
        costoEl.dataset.envio = costo;
        costoEl.textContent = `Envío: $${formatCurrency(costo)}`;
      }
    } else {
      dirLabel.textContent = "No hay dirección seleccionada";
      if (costoEl) {
        costoEl.dataset.envio = 0;
        costoEl.textContent = "Envío: $0000";
      }
    }
  }

  // === 2. Punto de retiro seleccionado ===
  const puntoElement = document.querySelector('.envio-punto .punto-seleccionado');
  if (puntoElement) {
    const costoEl = document.querySelector('.opcion-envio[data-metodo="punto"] .costo-envio');
    if (puntoSel) {
      puntoElement.textContent = `${puntoSel.nombre} — ${puntoSel.direccion}`;
      const costo = window.calcularCostoEnvioPorCP(puntoSel.cp);
      if (costoEl) {
        costoEl.dataset.envio = costo;
        costoEl.textContent = `Envío: $${formatCurrency(costo)}`;
      }
    } else {
      puntoElement.textContent = "No hay punto seleccionado";
      if (costoEl) {
        costoEl.dataset.envio = 0;
        costoEl.textContent = "Envío: $0000";
      }
    }
  }

  // === 3. Retiro en tienda (siempre gratis) ===
  const tiendaCostoEl = document.querySelector('.opcion-envio[data-metodo="tienda"] .costo-envio');
  if (tiendaCostoEl) {
    tiendaCostoEl.dataset.envio = 0;
    tiendaCostoEl.textContent = "Envío: GRATIS";
  }

  // === 4. Recalcular totales ===
  document.querySelectorAll(".opcion-envio").forEach(opcion => {
    const costoEnvio = safeParsePrice(opcion.querySelector(".costo-envio")?.dataset.envio || "0");
    const totalElement = opcion.querySelector(".total-envio");
    if (totalElement) {
      totalElement.textContent = `Total: $${formatCurrency(subtotal + costoEnvio)}`;
    }
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
  mostrarResumenEnvio();
}

// === Resumen de envío en checkout ===
async function mostrarResumenEnvio() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  const contenedor = document.getElementById("resumen-envio");
  if (!contenedor) return;

  try {
    const res = await fetch(`backend/userController.php?action=getUser&id=${userId}`);
    const data = await res.json();
    const mongo = data.mongo;
    const metodo = mongo.envioSeleccionado;

    let resumen = "";
    if (metodo === "domicilio") {
      const domicilio = (mongo.direcciones?.domicilios || []).find(d => d.seleccionada);
      if (domicilio) {
        resumen = `
          <strong>Envío a domicilio</strong><br>
          ${domicilio.nombre} — ${domicilio.calle}, ${domicilio.ciudad}, ${domicilio.provincia}
        `;
      }
    } else if (metodo === "punto") {
      const punto = mongo.direcciones?.punto;
      if (punto && punto.seleccionado) {
        resumen = `
          <strong>Retiro en punto de entrega</strong><br>
          ${punto.nombre} — ${punto.direccion}
        `;
      }
    } else if (metodo === "tienda") {
      resumen = `
        <strong>Retiro en tienda MUTA</strong><br>
        Av. Colón 740, Mendoza
      `;
    }

    contenedor.innerHTML = resumen || "<em>No se ha seleccionado método de envío</em>";
  } catch (err) {
    console.error("Error mostrando resumen de envío:", err);
    contenedor.innerHTML = "<em>Error al cargar el resumen de envío</em>";
  }
}

// === Event listeners ===
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-direcciones");
  if (!btn) return;
  e.preventDefault();
  mostrarOverlay("/Muta/componentesHTML/carritoHTML/seleccion-direccion.html", btn)
    .then(() => waitForOverlayElement(".envio-modal", 4000))
    .then(() => inicializarDirecciones());
});

// Abrir selección de envíos desde botón checkout
document.addEventListener("click", (e) => {
  const btnCheckout = e.target.closest(".checkout-btn");
  if (!btnCheckout) return;
  e.preventDefault();

  // 1. Verificar sesión
  const userId = localStorage.getItem("userId");
  if (!userId) {
    document.getElementById("acceso-usuario-container").style.display = "flex";
    return;
  }

  // 2. Verificar carrito (doble seguridad)
  const cart = JSON.parse(localStorage.getItem("mutaCart")) || [];
  if (cart.length === 0) {
    alert("Tu carrito está vacío. Agregá productos antes de continuar.");
    return;
  }

  // 3. Cerrar modal de login si estaba abierto
  const modalLogin = document.getElementById("acceso-usuario-container");
  if (modalLogin) modalLogin.style.display = "none";

  // 4. Abrir overlay de envíos
  mostrarOverlay("/Muta/componentesHTML/carritoHTML/seleccion-envios.html", btnCheckout)
    .then(() => waitForOverlayElement(".envio-costos", 4000))
    .then(() => inicializarEnvios());
});

// Botón "Ver ubicación" → abrir mapa
document.addEventListener("click", (e) => {
  const btnMapa = e.target.closest(".btn-ver-tienda");
  if (!btnMapa) return;
  e.preventDefault();
  mostrarOverlay("/Muta/componentesHTML/mapaHTML/mapa-tienda.html", btnMapa);
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
  mostrarOverlay("/Muta/componentesHTML/carritoHTML/seleccion-envios.html", volver)
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

// Abrir mapa-puntos desde botón "ver o cambiar en el mapa"
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".ver-cambiar-mapa");
  if (!btn) return;
  e.preventDefault();
  mostrarOverlay("/Muta/componentesHTML/mapaHTML/mapa-puntos.html", btn)
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
  mostrarOverlay("/Muta/componentesHTML/mapaHTML/mapa-tienda.html", btn);
});

// Volver a envíos desde cualquier submodal (mapa-puntos, mapa-tienda, pago)
document.addEventListener("click", (e) => {
  const volver = e.target.closest(".volver-envios");
  if (!volver) return;
  e.preventDefault();
  mostrarOverlay("/Muta/componentesHTML/carritoHTML/seleccion-envios.html", volver)
    .then(() => waitForOverlayElement(".envio-modal", 4000))
    .then(() => inicializarEnvios());
});

// Abrir gestión de direcciones desde botón "+ Agregar o modificar domicilio"
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-direcciones");
  if (!btn) return;
  e.preventDefault();
  mostrarOverlay("/Muta/componentesHTML/carritoHTML/seleccion-direccion.html", btn)
    .then(() => waitForOverlayElement(".envio-modal", 4000))
    .then(() => inicializarDirecciones());
});

// === Lógica de gestión de direcciones ===
async function inicializarDirecciones() {
  const lista = document.querySelector(".direcciones-guardadas");
  const form = document.getElementById("form-nueva-direccion");
  const btnMostrarForm = document.getElementById("btn-mostrar-form");
  const btnCancelar = document.getElementById("cancelar-edicion");
  const tituloForm = document.getElementById("form-titulo");

  const userId = localStorage.getItem("userId");
  if (!userId) return;

  // Traer direcciones desde Mongo
  let direcciones = {};
  try {
    const res = await fetch(`backend/userController.php?action=getDirecciones&id=${userId}`);
    direcciones = await res.json();
    localStorage.setItem("mutaDirecciones", JSON.stringify(direcciones)); // cache local
  } catch (err) {
    console.error("Error cargando direcciones:", err);
  }

  // Extraer domicilios
  const domicilios = direcciones.domicilios || [];

  lista.innerHTML = "<h4>Direcciones guardadas</h4>";
  if (domicilios.length === 0) {
    const vacio = document.createElement("p");
    vacio.textContent = "No hay direcciones guardadas";
    vacio.style.color = "#666";
    lista.appendChild(vacio);
  } else {
    domicilios.forEach((dir) => {
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

  // Guardar dirección en Mongo
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const nueva = {
      id: modoEdicion ? idEditando : undefined,
      tipo: "domicilio",
      nombre: document.getElementById("nombre-direccion").value,
      calle: document.getElementById("calle").value,
      ciudad: document.getElementById("ciudad").value,
      provincia: document.getElementById("provincia").value,
      cp: document.getElementById("codigo-postal").value,
      seleccionada: false
    };

    try {
      await fetch("backend/userController.php?action=saveDomicilio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: userId, domicilio: nueva })
      });
      inicializarDirecciones(); // recargar lista
    } catch (err) {
      console.error("Error guardando dirección:", err);
    }
  };

  // Acciones en lista
  lista.addEventListener("click", async (e) => {
    const id = e.target.dataset.id;

    if (e.target.classList.contains("seleccionar-dir")) {
      try {
        // 1. Marcar domicilio como seleccionado
        await fetch("backend/userController.php?action=selectDomicilio", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_usuario: userId, id_direccion: id })
        });

        // 2. Actualizar modalidad de envío en Mongo
        await fetch("backend/userController.php?action=setEnvioSeleccionado", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_usuario: userId, metodo: "domicilio" })
        });

        // 3. Refrescar UI de envíos
        mostrarOverlay("/Muta/componentesHTML/carritoHTML/seleccion-envios.html")
          .then(() => waitForOverlayElement(".envio-modal", 4000))
          .then(() => inicializarEnvios());
      } catch (err) {
        console.error("Error seleccionando dirección:", err);
      }
    }

    if (e.target.classList.contains("editar-dir")) {
      const dir = (direcciones.domicilios || []).find(d => d.id === id);
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
        try {
          await fetch(`backend/userController.php?action=deleteDireccion&id_usuario=${userId}&id_direccion=${id}`, {
            method: "DELETE"
          });
          inicializarDirecciones();
        } catch (err) {
          console.error("Error eliminando dirección:", err);
        }
      }
    }
  });
}

// Inicializador de mapa-puntos (solo renderiza lista/iframe si hace falta)
async function inicializarMapaPuntos() {
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

      el.addEventListener("click", async () => {
        // Actualizar UI local
        window.setSelectedPuntoId && window.setSelectedPuntoId(p.id);
        info.textContent = `${p.nombre} — ${p.direccion}`;
        iframe.src = `https://www.google.com/maps?q=${p.lat},${p.lng}&z=16&output=embed`;

        // Guardar también en localStorage (opcional)
        localStorage.setItem("selectedPunto", p.id);
        localStorage.setItem("selectedPuntoName", p.nombre);
        localStorage.setItem("selectedPuntoDireccion", p.direccion);
        localStorage.setItem("selectedPuntoCP", p.cp);

        // Guardar en Mongo y actualizar método de envío
        const userId = localStorage.getItem("userId");
        if (userId) {
          try {
            await fetch("backend/userController.php?action=savePunto", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id_usuario: userId, punto: p })
            });

            await fetch("backend/userController.php?action=setEnvioSeleccionado", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id_usuario: userId, metodo: "punto" })
            });

            await inicializarEnvios(); // 🔄 refrescar UI de selección de envíos
          } catch (err) {
            console.error("Error guardando punto de retiro:", err);
          }
        }
      });

      lista.appendChild(el);

      // Si ya había un punto seleccionado, mostrarlo en el mapa
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
  mostrarOverlay("/Muta/componentesHTML/carritoHTML/seleccion-envios.html", e.currentTarget)
    .then(()=> console.log('seleccion-envios abierto'))
    .catch(err => console.error('error abrir seleccion-envios', err));
});
