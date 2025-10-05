// === Función genérica para mostrar overlays ===
function mostrarOverlay(ruta) {
  const overlayContainer = document.getElementById("checkout-overlay");
  fetch(ruta)
    .then(r => r.text())
    .then(html => {
      overlayContainer.innerHTML = html;
      const overlay = overlayContainer.querySelector(".overlay");
      if (overlay) {
        overlay.style.display = "flex";
        document.body.classList.add("modal-open"); // bloquea scroll
      }
    });
}

// === Inicializar totales en selección de envíos ===
function inicializarEnvios() {
  const subtotal = parseFloat(localStorage.getItem("subtotal")) || 0;

  document.querySelectorAll(".envio-costos").forEach(costos => {
    const envio = parseFloat(costos.querySelector(".costo-envio").dataset.envio);
    const total = subtotal + envio;
    costos.querySelector(".total-envio").textContent = `Total: $${total}`;
  });
}

// === Abrir selección de envíos desde el carrito ===
document.addEventListener("click", (e) => {
  if (e.target.closest(".checkout-btn")) {
    e.preventDefault();
    mostrarOverlay("../componentesHTML/carritoHTML/seleccion-envios.html");

    // Esperar a que cargue el HTML y luego inicializar
    setTimeout(inicializarEnvios, 200);
  }
});

// === Ir a selección de pago desde selección de envíos ===
document.addEventListener("click", (e) => {
  const opcion = e.target.closest(".opcion-envio");
  if (!opcion) return;

  e.preventDefault();

  const subtotal = parseFloat(localStorage.getItem("subtotal")) || 0;
  const envio = parseFloat(opcion.querySelector(".costo-envio").dataset.envio);
  const total = subtotal + envio;

  // Guardar total con envío
  localStorage.setItem("totalConEnvio", total);

  mostrarOverlay("../componentesHTML/carritoHTML/seleccion-pago.html");

  // Esperar a que cargue el HTML de pago y luego inicializar
  setTimeout(inicializarPago, 200);
});

// === Volver de pago a selección de envíos ===
document.addEventListener("click", (e) => {
  if (e.target.closest(".volver-envios")) {
    e.preventDefault();
    mostrarOverlay("../componentesHTML/carritoHTML/seleccion-envios.html");
    setTimeout(inicializarEnvios, 200);
  }
});

// === Volver de direcciones a pago ===
document.addEventListener("click", (e) => {
  if (e.target.closest(".volver-pago")) {
    e.preventDefault();
    mostrarOverlay("../componentesHTML/carritoHTML/seleccion-pago.html");
    setTimeout(inicializarPago, 200);
  }
});

// === Cerrar modal (flecha de cerrar o botón con .cerrar-modal) ===
document.addEventListener("click", (e) => {
  const cerrarBtn = e.target.closest(".cerrar-modal");
  if (!cerrarBtn) return;

  const overlayContainer = document.getElementById("checkout-overlay");
  const overlay = overlayContainer?.querySelector(".overlay");

  if (overlay) {
    overlay.style.display = "none";
    document.body.classList.remove("modal-open");
    overlayContainer.innerHTML = ""; // limpia contenido
  }
});

// === Inicializar totales en selección de pago ===
function inicializarPago() {
  const total = parseFloat(localStorage.getItem("totalConEnvio")) || 0;
  const totalEls = document.querySelectorAll("#total-pago");
  totalEls.forEach(el => el.textContent = total);
}

// === Alternar métodos de pago (tarjeta / Mercado Pago) ===
document.addEventListener("click", (e) => {
  const opcion = e.target.closest(".opcion-pago");
  if (!opcion) return;

  // Quitar activo de todas
  document.querySelectorAll(".opcion-pago").forEach(card => card.classList.remove("activo"));

  // Activar la seleccionada
  opcion.classList.add("activo");

  // Mostrar contenido correspondiente
  const metodo = opcion.dataset.metodo;
  document.querySelector(".contenido-tarjeta").style.display = metodo === "tarjeta" ? "block" : "none";
  document.querySelector(".contenido-mercadopago").style.display = metodo === "mercadopago" ? "block" : "none";
});

// === Calcular cuotas dinámicamente en pago con tarjeta ===
document.addEventListener("change", (e) => {
  if (e.target.id === "cuotas") {
    const total = parseFloat(localStorage.getItem("totalConEnvio")) || 0;
    const cuotas = parseInt(e.target.value, 10);
    const montoPorCuota = (total / cuotas).toFixed(2);

    const detalle = document.getElementById("detalle-cuotas");
    if (detalle) {
      detalle.textContent = cuotas > 1
        ? `${cuotas} cuotas de $${montoPorCuota} (Total $${total})`
        : `1 pago de $${total}`;
    }
  }
});

/* ============================================================
   EVENTOS: MAPAS
   ============================================================ */

// --- Abrir mapa de tienda desde selección de envíos ---
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-ver-tienda");
  if (!btn) return;

  mostrarOverlay("../componentesHTML/mapaHTML/mapa-tienda.html");
});

// --- Volver de mapa de tienda a selección de envíos ---
document.addEventListener("click", (e) => {
  if (e.target.closest(".cerrar-mapa")) {
    mostrarOverlay("../componentesHTML/carritoHTML/seleccion-envios.html");
    setTimeout(inicializarEnvios, 200);
  }
});
