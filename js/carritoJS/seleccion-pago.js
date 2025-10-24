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

// Guardar datos de pago al finalizar compra
async function finalizarCompra(finishBtn) {
  const originalText = finishBtn.textContent;
  const templateParams = await getOrderData();

  if (!templateParams.customer_name || !templateParams.email_cliente || !templateParams.email_cliente.includes('@')) {
    alert("Por favor, completa tu nombre y un email válido.");
    return;
  }

  // === Aquí sigue tu lógica de emailjs y limpieza ===
  finishBtn.textContent = "Procesando...";
  finishBtn.disabled = true;

  emailjs.send('service_wqlyyxz', 'template_h4p8oiv', templateParams)
    .then(() => {
      alert(`¡Gracias por tu compra, ${templateParams.customer_name}! Se ha enviado un email de confirmación.`);

      // Limpiar solo lo necesario
      localStorage.removeItem("mutaCart");               // carrito
      localStorage.removeItem("selectedMetodoEnvio");    // modalidad temporal
      localStorage.removeItem("selectedDireccion");      // si usabas localStorage antes
      localStorage.removeItem("selectedPunto");          // si usabas localStorage antes

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