async function inicializarLogicaPago() {
  const totalPagarElements = document.querySelectorAll('.total-pago');

  function actualizarTotal() {
    const subtotal = getSubtotal();
    const costoEnvio = safeParsePrice(localStorage.getItem('selectedEnvio') || 0);
    const total = subtotal + costoEnvio;
    totalPagarElements.forEach(el => el.textContent = formatCurrency(total));
  }

  actualizarTotal();
}

// NOTA: La función finalizarCompra() ahora está en checkout.js
// para manejar correctamente la integración con Mercado Pago
