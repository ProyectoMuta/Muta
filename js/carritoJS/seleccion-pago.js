async function inicializarLogicaPago() {
  const totalPagarElements = document.querySelectorAll('.total-pago');
  const cuotasSelect = document.getElementById('cuotas');
  const detalleCuotasElement = document.getElementById('detalle-cuotas');
  const pagoOpciones = document.querySelectorAll('.pago-card.opcion-pago');
  const contenidoTarjeta = document.querySelector('.contenido-tarjeta');
  const contenidoMercadoPago = document.querySelector('.contenido-mercadopago');

  // 🔑 Pre-rellenar si hay datos guardados
  const userId = localStorage.getItem("userId");
  if (userId) {
    try {
      const res = await fetch(`backend/userController.php?action=getUser&id=${userId}`);
      const data = await res.json();
      const pago = data.mongo?.pago;
      if (pago?.metodo === "tarjeta") {
        document.getElementById("titular").value = pago.titular || "";
        document.getElementById("vencimiento").value = pago.vencimiento || "";
        document.getElementById("numero").placeholder = "•••• •••• •••• " + (pago.ultimos4 || "");
      }
    } catch (err) {
      console.error("Error cargando datos de pago:", err);
    }
  }

  function actualizarTotal() {
    const subtotal = getSubtotal();
    const costoEnvio = safeParsePrice(localStorage.getItem('selectedEnvio') || 0);
    const total = subtotal + costoEnvio;
    totalPagarElements.forEach(el => el.textContent = formatCurrency(total));
    actualizarDetalleCuotas();
  }

  function actualizarDetalleCuotas() {
    if (!cuotasSelect || !detalleCuotasElement) return;
    const subtotal = getSubtotal();
    const costoEnvio = safeParsePrice(localStorage.getItem('selectedEnvio') || 0);
    const total = subtotal + costoEnvio;
    const numCuotas = parseInt(cuotasSelect.value, 10);
    if (numCuotas > 1) {
      const valorCuota = total / numCuotas;
      detalleCuotasElement.textContent = `${numCuotas} cuotas de $${formatCurrency(valorCuota)}`;
    } else {
      detalleCuotasElement.textContent = '';
    }
  }

  pagoOpciones.forEach(opcion => {
    opcion.addEventListener('click', () => {
      pagoOpciones.forEach(o => o.classList.remove('activo'));
      opcion.classList.add('activo');
      const metodo = opcion.dataset.metodo;
      if (metodo === 'tarjeta') {
        contenidoTarjeta.style.display = 'block';
        contenidoMercadoPago.style.display = 'none';
      } else {
        contenidoMercadoPago.style.display = 'block';
        contenidoTarjeta.style.display = 'none';
      }
    });
  });

  if (cuotasSelect) cuotasSelect.addEventListener('change', actualizarDetalleCuotas);
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

  const metodoActivo = document.querySelector(".pago-card.opcion-pago.activo");
  if (metodoActivo?.dataset.metodo === "tarjeta") {
    const userId = localStorage.getItem("userId");
    if (userId) {
      const pago = {
        metodo: "tarjeta",
        titular: document.getElementById("titular").value,
        ultimos4: document.getElementById("numero").value.slice(-4),
        vencimiento: document.getElementById("vencimiento").value
      };
      await fetch("backend/userController.php?action=savePago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: userId, pago })
      });
    }
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
