// checkout.js

function mostrarOverlay(ruta) {
  const overlayContainer = document.getElementById("checkout-overlay");
  fetch(ruta)
    .then(r => r.text())
    .then(html => {
      overlayContainer.innerHTML = html;
      const overlay = overlayContainer.querySelector(".overlay");
      if (overlay) {
        overlay.style.display = "flex";
        document.body.classList.add("modal-open"); // 🚫 bloquea scroll del fondo
      }
    });
}

// Abrir selección de envíos desde el carrito
document.addEventListener("click", (e) => {
  if (e.target.matches(".checkout-btn")) {
    e.preventDefault();
    mostrarOverlay("../componentesHTML/carritoHTML/seleccion-envios.html");
  }
});

// Ir a selección de pago
document.addEventListener("click", (e) => {
  if (e.target.matches(".opcion-envio")) {
    e.preventDefault();
    mostrarOverlay("../componentesHTML/carritoHTML/seleccion-pago.html");
  }
});

// Ir a selección de direcciones
document.addEventListener("click", (e) => {
  if (e.target.matches(".btn-direcciones")) {
    e.preventDefault();
    mostrarOverlay("../componentesHTML/carritoHTML/seleccion-direcciones.html");
  }
});

// Cerrar modal (flecha o cualquier botón con .cerrar-modal)
document.addEventListener("click", (e) => {
  const cerrarBtn = e.target.closest(".cerrar-modal");
  if (!cerrarBtn) return;

  const overlayContainer = document.getElementById("checkout-overlay");
  const overlay = overlayContainer?.querySelector(".overlay");

  if (overlay) {
    overlay.style.display = "none";
    document.body.classList.remove("modal-open");
    // Opcional: limpia el contenido para evitar residuos de eventos/DOM
    overlayContainer.innerHTML = "";
  }
});


